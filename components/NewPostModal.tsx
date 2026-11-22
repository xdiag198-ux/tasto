import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, SendHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Props = {
  show: boolean;
  onClose: () => void;
  onPosted: () => void;
};

export function NewPostModal({ show, onClose, onPosted }: Props) {
  const { user, profile } = useAuth();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const body = text.trim();
    if (!body || body.length > 500 || !user) return;
    setBusy(true);
    setError(null);
    const { error: insertError } = await supabase
      .from("posts")
      .insert({ author_id: user.id, body });
    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setText("");
    onPosted();
    onClose();
  }

  return (
    <AnimatePresence>
      {show && (
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
            className="w-full max-w-lg rounded-2xl bg-surface-1 border border-border shadow-noir p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-base font-semibold text-foreground">Новый пост</h3>
                {profile && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    от {profile.display_name} · @{profile.handle}
                  </p>
                )}
              </div>
              <motion.button
                type="button"
                whileHover={{ rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              autoFocus
              rows={4}
              placeholder="Что нового?"
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-pulse/50 focus:ring-2 focus:ring-pulse/15 transition resize-none"
            />

            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground tabular-nums">{text.length}/500</span>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={submit}
                disabled={!text.trim() || busy}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-35 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
                Опубликовать
              </motion.button>
            </div>
            {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
