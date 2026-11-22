import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Home, MessageCircle, Plus, LogOut } from "lucide-react";
import { Intro } from "@/components/Intro";
import { Sidebar, type View } from "@/components/Sidebar";
import { Feed } from "@/components/Feed";
import { Chats } from "@/components/Chats";
import { RightPanel } from "@/components/RightPanel";
import { NewPostModal } from "@/components/NewPostModal";
import { Logo } from "@/components/Logo";
import { AuthGate } from "@/components/AuthGate";
import { ProfileModal } from "@/components/ProfileModal";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tosto — Мессенджер и лента" },
      {
        name: "description",
        content: "Tosto — минималистичный чёрный мессенджер и социальная лента в реальном времени.",
      },
      { property: "og:title", content: "Tosto — Мессенджер и лента" },
      {
        property: "og:description",
        content: "Tosto — минималистичный чёрный мессенджер и социальная лента в реальном времени.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function MobileNav({ view, setView }: { view: View; setView: (v: View) => void }) {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 noir-glass border-t border-border flex items-center justify-around py-2 pb-[env(safe-area-inset-bottom)]">
      {(
        [
          { id: "feed" as const, label: "Лента", icon: Home },
          { id: "chats" as const, label: "Чаты", icon: MessageCircle },
        ]
      ).map((item) => {
        const active = view === item.id;
        const Icon = item.icon;
        return (
          <motion.button
            key={item.id}
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => setView(item.id)}
            className="relative flex flex-col items-center gap-0.5 px-6 py-1.5"
          >
            {active && (
              <motion.div
                layoutId="mobile-nav"
                className="absolute -top-0.5 w-8 h-[2px] rounded-full bg-pulse shadow-pulse-glow"
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
              />
            )}
            <Icon className={`w-5 h-5 ${active ? "text-pulse" : "text-muted-foreground"}`} />
            <span className={`text-[10px] ${active ? "text-foreground" : "text-muted-foreground"}`}>
              {item.label}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
}

function MobileHeader({ onNewPost, onEditProfile }: { onNewPost: () => void; onEditProfile: () => void }) {
  const { signOut, profile } = useAuth();
  return (
    <header className="md:hidden sticky top-0 z-20 noir-glass border-b border-border px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <Logo className="w-7 h-7" />
        <span className="font-display text-lg font-bold tracking-tight text-platinum">Tosto</span>
      </div>
      <div className="flex items-center gap-2">
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={onEditProfile}
          aria-label="Профиль"
          className="rounded-full"
        >
          <UserAvatar name={profile?.display_name ?? "Вы"} url={profile?.avatar_url} size="w-8 h-8" />
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={signOut}
          aria-label="Выйти"
          className="w-8 h-8 rounded-xl text-muted-foreground flex items-center justify-center"
        >
          <LogOut className="w-4 h-4" />
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={onNewPost}
          aria-label="Новый пост"
          className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center"
        >
          <Plus className="w-4 h-4" />
        </motion.button>
      </div>
    </header>
  );
}

function AppShell() {
  const [feedKey, setFeedKey] = useState(0);
  const [intro, setIntro] = useState(true);
  const [view, setView] = useState<View>("feed");
  const [showNewPost, setShowNewPost] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 2400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="h-dvh w-screen flex bg-background noir-mesh text-foreground overflow-hidden">
      <Intro show={intro} />

      <Sidebar view={view} setView={setView} onNewPost={() => setShowNewPost(true)} onEditProfile={() => setShowProfile(true)} />

      <main className="flex-1 flex flex-col min-w-0 h-full">
        <MobileHeader onNewPost={() => setShowNewPost(true)} onEditProfile={() => setShowProfile(true)} />
        <div
          className={`flex-1 flex min-h-0 md:pb-0 ${
            view === "chats" && chatOpen ? "pb-[env(safe-area-inset-bottom)]" : "pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
          }`}
        >
          <AnimatePresence mode="wait">
            {view === "feed" ? (
              <motion.div
                key="feed"
                initial={{ opacity: 0, x: -18, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: -18, filter: "blur(4px)" }}
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                className="flex-1 flex min-w-0"
              >
                <div className="flex-1 flex flex-col min-w-0 max-w-2xl mx-auto w-full">
                  <Feed key={feedKey} />
                </div>
                <RightPanel />
              </motion.div>
            ) : (
              <motion.div
                key="chats"
                initial={{ opacity: 0, x: 18, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: 18, filter: "blur(4px)" }}
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                className="flex-1 flex min-w-0"
              >
                <Chats onConversationChange={setChatOpen} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {!(view === "chats" && chatOpen) && <MobileNav view={view} setView={setView} />}

      <ProfileModal
        show={showProfile}
        onClose={() => setShowProfile(false)}
        onSaved={() => setFeedKey((k) => k + 1)}
      />

      <NewPostModal show={showNewPost} onClose={() => setShowNewPost(false)} onPosted={() => setFeedKey((k) => k + 1)} />
    </div>
  );
}

function Index() {
  return (
    <AuthGate>
      <AppShell />
    </AuthGate>
  );
}
