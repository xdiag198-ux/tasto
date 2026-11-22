import { motion } from "framer-motion";
import { Home, MessageCircle, Search, Bell, LogOut, Plus, Sparkles } from "lucide-react";
import { Logo } from "./Logo";
import { UserAvatar } from "./UserAvatar";
import { useAuth } from "@/lib/auth";

export type View = "feed" | "chats";

type SidebarProps = {
  view: View;
  setView: (v: View) => void;
  onNewPost: () => void;
  onEditProfile: () => void;
};

const navItems: { id: View; label: string; icon: typeof Home }[] = [
  { id: "feed", label: "Лента", icon: Home },
  { id: "chats", label: "Чаты", icon: MessageCircle },
];

export function Sidebar({ view, setView, onNewPost, onEditProfile }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const displayName = profile?.display_name ?? "Вы";
  return (
    <aside className="hidden md:flex w-20 lg:w-64 shrink-0 flex-col border-r border-border noir-glass h-full">
      <motion.div
        whileHover={{ x: 2 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className="p-5 flex items-center gap-3 cursor-pointer select-none"
        onClick={() => setView("feed")}
      >
        <Logo className="w-9 h-9 shrink-0" />
        <span className="hidden lg:block font-display text-xl font-bold tracking-tight text-platinum">
          Tosto
        </span>
      </motion.div>

      <nav className="flex flex-col gap-1 px-3 mt-1">
        {navItems.map((item) => {
          const active = view === item.id;
          const Icon = item.icon;
          return (
            <motion.button
              key={item.id}
              type="button"
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              onClick={() => setView(item.id)}
              className="relative flex items-center gap-3.5 px-3 lg:px-4 py-3 rounded-xl transition-colors group"
            >
              {active && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-xl bg-surface-2 border border-border shadow-noir"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              {active && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full bg-pulse shadow-pulse-glow"
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                />
              )}
              <Icon
                className={`relative z-10 w-5 h-5 transition-colors ${
                  active ? "text-pulse" : "text-muted-foreground group-hover:text-foreground"
                }`}
              />
              <span
                className={`relative z-10 hidden lg:block text-sm font-medium transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}

        {[
          { label: "Поиск", icon: Search },
          { label: "Уведомления", icon: Bell },
          { label: "Рекомендации", icon: Sparkles },
        ].map(({ label, icon: Icon }) => (
          <motion.button
            key={label}
            type="button"
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.97 }}
            className="hidden lg:flex relative items-center gap-3.5 px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-1 transition-colors"
          >
            <Icon className="w-5 h-5" />
            <span className="text-sm font-medium">{label}</span>
          </motion.button>
        ))}
      </nav>

      <motion.button
        type="button"
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 24 }}
        onClick={onNewPost}
        className="mt-5 mx-3 hidden lg:flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-noir hover:opacity-95 transition-opacity"
      >
        <Plus className="w-4 h-4" />
        Новый пост
      </motion.button>
      <motion.button
        type="button"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={onNewPost}
        aria-label="Новый пост"
        className="hidden md:flex lg:hidden mx-auto mt-5 w-11 h-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-noir"
      >
        <Plus className="w-5 h-5" />
      </motion.button>

      <div className="mt-auto p-3">
        <div className="hidden lg:flex items-center gap-3 p-2.5 rounded-xl border border-transparent">
          <button
            type="button"
            onClick={onEditProfile}
            aria-label="Редактировать профиль"
            className="flex flex-1 min-w-0 items-center gap-3 text-left rounded-lg hover:bg-surface-2 transition-colors -m-1 p-1"
          >
            <UserAvatar name={displayName} url={profile?.avatar_url} size="w-9 h-9" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {profile ? `@${profile.handle}` : ""}
              </p>
            </div>
          </button>
          <button
            type="button"
            aria-label="Выйти"
            onClick={signOut}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <button
          type="button"
          aria-label="Редактировать профиль"
          onClick={onEditProfile}
          className="hidden md:flex lg:hidden mx-auto mb-2"
        >
          <UserAvatar name={displayName} url={profile?.avatar_url} size="w-9 h-9" />
        </button>
        <button
          type="button"
          aria-label="Выйти"
          onClick={signOut}
          className="hidden md:flex lg:hidden mx-auto w-10 h-10 items-center justify-center rounded-xl hover:bg-surface-2 transition-colors"
        >
          <LogOut className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </aside>
  );
}