import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Camera, Check, AlertCircle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { invalidateProfile } from "@/lib/profiles";
import { UserAvatar } from "./UserAvatar";

type Props = {
  show: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const BUCKET = "avatars";

type HandleState = "idle" | "checking" | "free" | "taken" | "invalid";

/** Сжимает фото до квадрата 256x256 (JPEG), чтобы аватарки были лёгкими. */
async function resizeToSquare(file: File, size = 256): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Не удалось прочитать картинку"));
      el.src = url;
    });
    const side = Math.min(img.width, img.height);
    const sx = (img.width - side) / 2;
    const sy = (img.height - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas недоступен");
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Не удалось сжать фото"))), "image/jpeg", 0.85),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ProfileModal({ show, onClose, onSaved }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [handleState, setHandleState] = useState<HandleState>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Заполняем форму текущими данными при каждом открытии.
  useEffect(() => {
    if (!show || !profile) return;
    setName(profile.display_name);
    setHandle(profile.handle);
    setBio(profile.bio ?? "");
    setAvatarUrl(profile.avatar_url);
    setAvatarFile(null);
    setAvatarPreview(null);
    setHandleState("idle");
    setError(null);
  }, [show, profile]);

  // Проверка занятости юзернейма с задержкой, пока человек печатает.
  useEffect(() => {
    if (!show || !profile) return;
    const h = handle.trim().toLowerCase();
    if (h === profile.handle) {
      setHandleState("idle");
      return;
    }
    if (!HANDLE_RE.test(h)) {
      setHandleState("invalid");
      return;
    }
    setHandleState("checking");
    let active = true;
    const t = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("id").eq("handle", h).maybeSingle();
      if (active) setHandleState(data ? "taken" : "free");
    }, 400);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [handle, show, profile]);

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Выбери картинку (JPG, PNG, WebP)");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("Файл слишком большой (максимум 15 МБ)");
      return;
    }
    try {
      setError(null);
      const blob = await resizeToSquare(file);
      setAvatarFile(blob);
      setAvatarPreview(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось обработать фото");
    }
  }

  function removeAvatar() {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarUrl(null);
  }

  const trimmedName = name.trim();
  const cleanHandle = handle.trim().toLowerCase();
  const canSave =
    !busy &&
    trimmedName.length >= 1 &&
    trimmedName.length <= 40 &&
    (handleState === "idle" || handleState === "free");

  async function save() {
    if (!user || !profile || !canSave) return;
    setBusy(true);
    setError(null);
    try {
      let nextAvatar = avatarUrl;

      if (avatarFile) {
        const path = `${user.id}/avatar-${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, avatarFile, { contentType: "image/jpeg", cacheControl: "3600" });
        if (upErr) throw new Error("Не удалось загрузить аватар: " + upErr.message);
        nextAvatar = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

        // Убираем старые аватарки пользователя, оставляем только новую (не критично, если не выйдет).
        try {
          const { data: files } = await supabase.storage.from(BUCKET).list(user.id);
          const old = (files ?? [])
            .map((f) => `${user.id}/${f.name}`)
            .filter((p) => p !== path);
          if (old.length) await supabase.storage.from(BUCKET).remove(old);
        } catch {
          // игнорируем
        }
      }

      const { error: updErr } = await supabase
        .from("profiles")
        .update({
          display_name: trimmedName,
          handle: cleanHandle,
          bio: bio.trim() || null,
          avatar_url: nextAvatar,
        })
        .eq("id", user.id);

      if (updErr) {
        if (updErr.code === "23505") throw new Error("Этот юзернейм уже занят");
        if (updErr.code === "23514") throw new Error("Юзернейм: 3–20 символов, только a-z, 0-9 и _");
        throw new Error(updErr.message);
      }

      invalidateProfile(user.id);
      await refreshProfile();
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  const shownAvatar = avatarPreview ?? avatarUrl;

  return (
    <AnimatePresence>
      {show && profile && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-surface-1 border border-border shadow-noir p-5 my-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-base font-semibold text-foreground">Редактировать профиль</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Аватар */}
            <div className="flex items-center gap-4 mb-5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative group rounded-full"
                aria-label="Сменить аватар"
              >
                <UserAvatar name={trimmedName || "?"} url={shownAvatar} size="w-20 h-20" className="text-xl" />
                <span className="absolute inset-0 rounded-full bg-background/60 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-5 h-5 text-foreground" />
                </span>
              </button>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-surface-2 border border-border text-sm font-medium text-foreground hover:border-pulse/40 transition-colors flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Выбрать фото
                </button>
                {shownAvatar && (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="px-3.5 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Убрать фото
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} className="hidden" />
            </div>

            {/* Имя */}
            <label className="block text-xs text-muted-foreground mb-1.5">Имя</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 40))}
              placeholder="Как тебя зовут"
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-pulse/50 focus:ring-2 focus:ring-pulse/15 transition mb-4"
            />

            {/* Юзернейм */}
            <label className="block text-xs text-muted-foreground mb-1.5">Юзернейм</label>
            <div className="relative mb-1.5">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="username"
                className="w-full pl-8 pr-10 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-pulse/50 focus:ring-2 focus:ring-pulse/15 transition"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
                {handleState === "checking" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                {handleState === "free" && <Check className="w-4 h-4 text-pulse" />}
                {(handleState === "taken" || handleState === "invalid") && (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                )}
              </span>
            </div>
            <p
              className={`text-xs mb-4 ${
                handleState === "taken" || handleState === "invalid" ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {handleState === "taken"
                ? "Этот юзернейм уже занят"
                : handleState === "invalid"
                  ? "3–20 символов: латинские буквы, цифры и _"
                  : handleState === "free"
                    ? "Свободен"
                    : "Латинские буквы, цифры и _, от 3 до 20 символов"}
            </p>

            {/* О себе */}
            <label className="block text-xs text-muted-foreground mb-1.5">О себе</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 160))}
              rows={3}
              placeholder="Пара слов о себе"
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-pulse/50 focus:ring-2 focus:ring-pulse/15 transition resize-none"
            />
            <p className="text-right text-xs text-muted-foreground tabular-nums mt-1">{bio.length}/160</p>

            {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
              >
                Отмена
              </button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={save}
                disabled={!canSave}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-35 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Сохранить
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
