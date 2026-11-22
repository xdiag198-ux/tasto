import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/types";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Ссылка, на которую Supabase возвращает пользователя после входа в приложении (Android).
// Должна быть добавлена в Supabase → Authentication → URL Configuration → Redirect URLs
// и прописана в AndroidManifest.xml (это делает scripts/patch-android.mjs).
export const NATIVE_REDIRECT = "com.tosto.app://auth-callback";

export const isNativeApp = () => Capacitor.isNativePlatform();

// Разбирает ссылку возврата и завершает вход. Поддерживает оба варианта Supabase:
// ?code=... (PKCE) и #access_token=...&refresh_token=... (implicit).
async function completeNativeSignIn(url: string): Promise<void> {
  if (!url.startsWith(NATIVE_REDIRECT)) return;
  const hashIdx = url.indexOf("#");
  const queryIdx = url.indexOf("?");
  const query =
    queryIdx >= 0 ? url.slice(queryIdx + 1, hashIdx > queryIdx ? hashIdx : undefined) : "";
  const hash = hashIdx >= 0 ? url.slice(hashIdx + 1) : "";
  const q = new URLSearchParams(query);
  const h = new URLSearchParams(hash);

  try {
    const code = q.get("code");
    const accessToken = h.get("access_token") ?? q.get("access_token");
    const refreshToken = h.get("refresh_token") ?? q.get("refresh_token");
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    } else if (accessToken && refreshToken) {
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    } else {
      console.error("[auth] В ссылке возврата нет ни code, ни токенов:", q.get("error_description") ?? "");
    }
  } catch (e) {
    console.error("[auth] Не удалось завершить вход", e);
  } finally {
    try {
      await Browser.close();
    } catch {
      // на Android метод может быть недоступен, окно закрывается само
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Приложение на Android: ловим возврат из браузера после входа через Google.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    const handle = CapApp.addListener("appUrlOpen", (event) => {
      void completeNativeSignIn(event.url);
    });
    CapApp.getLaunchUrl().then((launch) => {
      if (!cancelled && launch?.url) void completeNativeSignIn(launch.url);
    });
    return () => {
      cancelled = true;
      void handle.then((h) => h.remove());
    };
  }, []);

  const userId = session?.user.id ?? null;

  const loadProfile = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, handle, avatar_url, bio")
      .eq("id", id)
      .maybeSingle();
    return (data as Profile | null) ?? null;
  }, []);

  // Профиль грузим отдельным эффектом, не внутри onAuthStateChange (иначе возможен дедлок клиента).
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    let active = true;
    loadProfile(userId).then((p) => {
      if (active) setProfile(p);
    });
    return () => {
      active = false;
    };
  }, [userId, loadProfile]);

  // Перечитать профиль после редактирования (имя, юзернейм, аватар обновятся везде).
  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    const p = await loadProfile(userId);
    if (p) setProfile(p);
  }, [userId, loadProfile]);

  const signInWithGoogle = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      // Google запрещает вход внутри встроенного окна приложения, поэтому открываем системный браузер.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true },
      });
      if (error) return error.message;
      if (!data?.url) return "Не удалось начать вход через Google";
      await Browser.open({ url: data.url });
      return null;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    return error ? error.message : null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, user: session?.user ?? null, profile, loading, signInWithGoogle, signOut, refreshProfile }),
    [session, profile, loading, signInWithGoogle, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
