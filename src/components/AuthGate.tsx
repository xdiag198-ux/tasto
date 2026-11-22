import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth, isNativeApp } from "@/lib/auth";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.1 5.5c4.2-3.9 7.2-9.6 7.2-16.9z" />
      <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.4-4.6 2.3-8.8 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background noir-mesh text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background noir-mesh text-foreground px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 24 }}
          className="w-full max-w-sm rounded-2xl bg-surface-1 border border-border shadow-noir p-8 text-center"
        >
          <Logo className="w-14 h-14 mx-auto" />
          <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-platinum">Tosto</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Войдите, чтобы переписываться с друзьями и читать ленту.
          </p>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              const err = await signInWithGoogle();
              if (err) {
                setError(err);
                setBusy(false);
              } else if (isNativeApp()) {
                // Браузер открылся поверх приложения; кнопка снова доступна, если вход отменили.
                setBusy(false);
              }
            }}
            className="mt-6 w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
            Войти через Google
          </motion.button>
          {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
