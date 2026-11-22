import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  PenSquare,
  Send,
  Smile,
  Paperclip,
  Loader2,
  Plus,
  X,
  ArrowLeft,
  LogOut,
  Users,
  Check,
  User as UserIcon,
} from "lucide-react";
import type { ChatItem, ChatRow, Message, Profile } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "./UserAvatar";

function msgTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function chatTitle(chat: ChatItem, meId: string) {
  if (chat.type === "group") return chat.name || "Группа";
  const other = chat.members.find((m) => m.id !== meId);
  return other?.display_name ?? "Собеседник";
}

function chatAvatarUrl(chat: ChatItem, meId: string) {
  if (chat.type === "group") return null;
  return chat.members.find((m) => m.id !== meId)?.avatar_url ?? null;
}

type MembershipRow = {
  chat_id: string;
  profiles: Profile | null;
};

/* ───────────── Окно «Новый чат / Новая группа» ───────────── */

function NewChatModal({
  open,
  meId,
  onClose,
  onCreated,
}: {
  open: boolean;
  meId: string;
  onClose: () => void;
  onCreated: (chatId: string) => void;
}) {
  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Profile[]>([]);
  const [groupName, setGroupName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMode("direct");
      setQuery("");
      setSelected([]);
      setGroupName("");
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim().replace(/[%,()*\\]/g, "");
    const timer = setTimeout(async () => {
      setSearching(true);
      let req = supabase
        .from("profiles")
        .select("id, display_name, handle, avatar_url")
        .neq("id", meId)
        .order("display_name")
        .limit(20);
      if (q) req = req.or(`display_name.ilike.%${q}%,handle.ilike.%${q}%`);
      const { data } = await req;
      setResults((data ?? []) as Profile[]);
      setSearching(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, open, meId]);

  async function openDirect(user: Profile) {
    setBusy(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("create_direct_chat", {
      other_user: user.id,
    });
    setBusy(false);
    if (rpcError || !data) {
      setError(rpcError?.message ?? "Не удалось создать чат");
      return;
    }
    onCreated(data as string);
  }

  async function createGroup() {
    if (!groupName.trim() || selected.length === 0) return;
    setBusy(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("create_group_chat", {
      group_name: groupName.trim(),
      member_ids: selected.map((u) => u.id),
    });
    setBusy(false);
    if (rpcError || !data) {
      setError(rpcError?.message ?? "Не удалось создать группу");
      return;
    }
    onCreated(data as string);
  }

  function toggle(user: Profile) {
    setSelected((prev) =>
      prev.some((u) => u.id === user.id) ? prev.filter((u) => u.id !== user.id) : [...prev, user],
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
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
            className="w-full max-w-sm max-h-[85vh] flex flex-col rounded-2xl bg-surface-1 border border-border shadow-noir p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base font-semibold text-foreground">Новый чат</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-1 p-1 rounded-xl bg-background border border-border mb-3">
              {(["direct", "group"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                    mode === m
                      ? "bg-surface-2 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "direct" ? <UserIcon className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                  {m === "direct" ? "Личный" : "Группа"}
                </button>
              ))}
            </div>

            {mode === "group" && (
              <>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value.slice(0, 60))}
                  placeholder="Название группы"
                  className="w-full mb-3 px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-pulse/50 focus:ring-2 focus:ring-pulse/15 transition"
                />
                {selected.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {selected.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggle(u)}
                        className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-surface-2 border border-border text-xs text-foreground"
                      >
                        {u.display_name}
                        <X className="w-3 h-3 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="relative group mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-pulse transition-colors" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Найти по имени или @нику"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-pulse/50 focus:ring-2 focus:ring-pulse/15 transition"
              />
            </div>

            <div className="flex-1 min-h-[120px] overflow-y-auto -mx-1 px-1 space-y-1">
              {searching && results.length === 0 ? (
                <div className="flex justify-center py-6 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : results.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-6">Никого не найдено</p>
              ) : (
                results.map((u) => {
                  const picked = selected.some((s) => s.id === u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      disabled={busy}
                      onClick={() => (mode === "direct" ? openDirect(u) : toggle(u))}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-surface-2 transition-colors text-left disabled:opacity-50"
                    >
                      <UserAvatar name={u.display_name} url={u.avatar_url} size="w-9 h-9" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{u.display_name}</p>
                        <p className="text-xs text-muted-foreground truncate">@{u.handle}</p>
                      </div>
                      {mode === "group" && picked && <Check className="w-4 h-4 text-pulse" />}
                    </button>
                  );
                })
              )}
            </div>

            {mode === "group" && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={createGroup}
                disabled={busy || !groupName.trim() || selected.length === 0}
                className="w-full mt-3 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-35 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Создать группу
              </motion.button>
            )}
            {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───────────── Основной экран ───────────── */

export function Chats({ onConversationChange }: { onConversationChange?: (open: boolean) => void } = {}) {
  const { user } = useAuth();
  const meId = user?.id ?? "";

  const [chats, setChats] = useState<ChatItem[]>([]);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, Message[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Сообщаем родителю, открыт ли диалог: на телефоне тогда прячем нижнюю панель, чтобы она не закрывала поле ввода.
  useEffect(() => {
    onConversationChange?.(mobileOpen);
    return () => onConversationChange?.(false);
  }, [mobileOpen, onConversationChange]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const chatsRef = useRef<ChatItem[]>([]);
  chatsRef.current = chats;

  const loadChats = useCallback(async () => {
    if (!meId) return;
    const { data: mine, error } = await supabase
      .from("chat_members")
      .select("chat_id")
      .eq("user_id", meId);
    if (error) {
      setLoading(false);
      return;
    }
    const ids = (mine ?? []).map((m) => m.chat_id);
    if (ids.length === 0) {
      setChats([]);
      setLoading(false);
      return;
    }
    const [chatRes, memberRes] = await Promise.all([
      supabase
        .from("chats")
        .select("*")
        .in("id", ids)
        .order("last_message_at", { ascending: false }),
      supabase
        .from("chat_members")
        .select("chat_id, profiles(id, display_name, handle, avatar_url)")
        .in("chat_id", ids),
    ]);
    if (chatRes.error) {
      setLoading(false);
      return;
    }
    const membersByChat = new Map<string, Profile[]>();
    for (const row of (memberRes.data ?? []) as unknown as MembershipRow[]) {
      if (!row.profiles) continue;
      const list = membersByChat.get(row.chat_id) ?? [];
      list.push(row.profiles);
      membersByChat.set(row.chat_id, list);
    }
    const items: ChatItem[] = ((chatRes.data ?? []) as unknown as ChatRow[]).map((c) => ({
      ...c,
      members: membersByChat.get(c.id) ?? [],
    }));
    setChats(items);
    setLoading(false);
  }, [meId]);

  const loadMessages = useCallback(async (chatId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) return;
    setMessagesByChat((prev) => ({ ...prev, [chatId]: (data ?? []) as Message[] }));
  }, []);

  /** Добавить сообщение в открытый диалог и поднять чат в списке. */
  const applyMessage = useCallback(
    (m: Message) => {
      setMessagesByChat((prev) => {
        const current = prev[m.chat_id];
        if (!current || current.some((item) => item.id === m.id)) return prev;
        return { ...prev, [m.chat_id]: [...current, m] };
      });
      if (!chatsRef.current.some((c) => c.id === m.chat_id)) {
        loadChats();
        return;
      }
      setChats((prev) => {
        const idx = prev.findIndex((c) => c.id === m.chat_id);
        if (idx === -1) return prev;
        const updated = { ...prev[idx], last_message: m.body, last_message_at: m.created_at };
        return [updated, ...prev.filter((_, i) => i !== idx)];
      });
    },
    [loadChats],
  );

  useEffect(() => {
    if (!meId) return;
    loadChats();
    // RLS отдаёт события только по чатам, где я участник.
    const channel = supabase
      .channel(`tosto-chats-${meId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) =>
        applyMessage(payload.new as Message),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_members", filter: `user_id=eq.${meId}` },
        () => loadChats(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [meId, loadChats, applyMessage]);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
  }, [activeId, loadMessages]);

  const messages = activeId ? (messagesByChat[activeId] ?? []) : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activeId]);

  async function send() {
    const text = draft.trim();
    if (!text || !activeId || !meId) return;
    setDraft("");
    setSendError(null);
    const { data, error } = await supabase
      .from("messages")
      .insert({ chat_id: activeId, sender_id: meId, body: text })
      .select()
      .single();
    if (error) {
      setDraft(text);
      setSendError(error.message);
      return;
    }
    applyMessage(data as Message);
  }

  async function leaveGroup(chatId: string) {
    if (!window.confirm("Выйти из группы?")) return;
    const { error } = await supabase
      .from("chat_members")
      .delete()
      .eq("chat_id", chatId)
      .eq("user_id", meId);
    if (error) return;
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    setActiveId(null);
    setMobileOpen(false);
  }

  async function handleCreated(chatId: string) {
    setCreating(false);
    await loadChats();
    setActiveId(chatId);
    setMobileOpen(true);
  }

  const filtered = useMemo(
    () => chats.filter((c) => chatTitle(c, meId).toLowerCase().includes(search.toLowerCase())),
    [chats, search, meId],
  );
  const activeChat = chats.find((c) => c.id === activeId);
  const memberById = useMemo(() => {
    const map = new Map<string, Profile>();
    activeChat?.members.forEach((m) => map.set(m.id, m));
    return map;
  }, [activeChat]);

  return (
    <div className="flex-1 flex h-full min-h-0">
      <div
        className={`${
          mobileOpen ? "hidden sm:flex" : "flex"
        } w-full sm:w-80 shrink-0 flex-col border-r border-border min-h-0 bg-background`}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">Чаты</h2>
            <motion.button
              type="button"
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setCreating(true)}
              aria-label="Новый чат"
              className="w-9 h-9 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border flex items-center justify-center text-foreground transition-colors"
            >
              <PenSquare className="w-4 h-4" />
            </motion.button>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-pulse transition-colors" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск чатов"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-1 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-pulse/50 focus:ring-2 focus:ring-pulse/15 transition"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center px-4">
              <p className="text-foreground text-sm font-medium mb-1">Чатов пока нет</p>
              <p className="text-muted-foreground text-xs">
                Нажмите на иконку выше, найдите человека и начните диалог.
              </p>
            </div>
          ) : (
            filtered.map((c, i) => {
              const title = chatTitle(c, meId);
              const isActive = activeId === c.id;
              return (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{
                    delay: Math.min(i * 0.04, 0.25),
                    type: "spring",
                    stiffness: 220,
                    damping: 22,
                  }}
                  className={`relative flex items-center gap-3 px-3 py-3 rounded-2xl transition-colors cursor-pointer border ${
                    isActive
                      ? "bg-surface-2 border-border shadow-noir"
                      : "border-transparent hover:bg-surface-1"
                  }`}
                  onClick={() => {
                    setActiveId(c.id);
                    setMobileOpen(true);
                  }}
                >
                  <UserAvatar name={title} url={chatAvatarUrl(c, meId)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-foreground truncate flex items-center gap-1.5">
                        {c.type === "group" && <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                        {title}
                      </span>
                      {c.last_message && (
                        <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                          {msgTime(c.last_message_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {c.last_message ?? "Нет сообщений"}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      <div className={`${mobileOpen ? "flex" : "hidden sm:flex"} flex-1 flex-col min-h-0`}>
        {activeChat ? (
          <>
            <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-border noir-glass">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="К списку чатов"
                className="sm:hidden w-8 h-8 rounded-lg hover:bg-surface-2 flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <UserAvatar
                name={chatTitle(activeChat, meId)}
                url={chatAvatarUrl(activeChat, meId)}
                size="w-10 h-10"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">
                  {chatTitle(activeChat, meId)}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {activeChat.type === "group"
                    ? `${activeChat.members.length} участн.`
                    : `@${activeChat.members.find((m) => m.id !== meId)?.handle ?? ""}`}
                </p>
              </div>
              {activeChat.type === "group" && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => leaveGroup(activeChat.id)}
                  aria-label="Выйти из группы"
                  className="w-9 h-9 rounded-xl hover:bg-surface-2 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors"
                >
                  <LogOut className="w-[17px] h-[17px]" />
                </motion.button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3 noir-grid">
              {messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center"
                >
                  <UserAvatar
                    name={chatTitle(activeChat, meId)}
                    url={chatAvatarUrl(activeChat, meId)}
                    size="w-20 h-20"
                    className="text-xl mb-4"
                  />
                  <p className="text-foreground font-medium">{chatTitle(activeChat, meId)}</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Напишите первое сообщение, чтобы начать беседу.
                  </p>
                </motion.div>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((m) => {
                    const mine = m.sender_id === meId;
                    const sender = memberById.get(m.sender_id);
                    const senderName = sender?.display_name ?? "Участник";
                    return (
                      <motion.div
                        key={m.id}
                        layout
                        initial={{ opacity: 0, y: 16, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 320, damping: 24 }}
                        className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}
                      >
                        {!mine && (
                          <UserAvatar name={senderName} url={sender?.avatar_url} size="w-7 h-7" />
                        )}
                        <div
                          className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed shadow-noir ${
                            mine
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-surface-2 text-foreground rounded-bl-sm border border-border"
                          }`}
                        >
                          {!mine && activeChat.type === "group" && (
                            <p className="text-[11px] font-semibold text-pulse mb-0.5">{senderName}</p>
                          )}
                          <p className="whitespace-pre-line break-words">{m.body}</p>
                          <div
                            className={`flex items-center gap-1 mt-1 ${
                              mine ? "justify-end text-primary-foreground/60" : "text-muted-foreground"
                            }`}
                          >
                            <span className="text-[10px] tabular-nums">{msgTime(m.created_at)}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="px-4 py-3 border-t border-border noir-glass">
              {sendError && <p className="mb-2 text-xs text-destructive">{sendError}</p>}
              <div className="flex items-end gap-2">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  aria-label="Прикрепить"
                  className="w-10 h-10 rounded-xl hover:bg-surface-2 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <Paperclip className="w-5 h-5" />
                </motion.button>
                <div className="flex-1 flex items-end gap-2 bg-surface-1 border border-border rounded-2xl px-3 py-2 focus-within:border-pulse/50 focus-within:ring-2 focus-within:ring-pulse/15 transition">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.slice(0, 4000))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    rows={1}
                    placeholder="Сообщение…"
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none max-h-28"
                  />
                  <button
                    type="button"
                    aria-label="Эмодзи"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                </div>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={send}
                  disabled={!draft.trim()}
                  aria-label="Отправить"
                  className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-noir shrink-0 disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-surface-1 border border-border flex items-center justify-center text-muted-foreground mb-4">
              <PenSquare className="w-6 h-6" />
            </div>
            <p className="text-foreground font-medium">Выберите чат</p>
            <p className="text-muted-foreground text-sm mt-1">
              или найдите человека и создайте новый, чтобы начать общение.
            </p>
          </div>
        )}
      </div>

      <NewChatModal
        open={creating}
        meId={meId}
        onClose={() => setCreating(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
