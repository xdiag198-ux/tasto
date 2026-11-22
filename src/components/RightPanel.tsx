import { motion } from "framer-motion";
import { TrendingUp, Hash, Search } from "lucide-react";

const trends = [
  { tag: "моушн", posts: "12,4К" },
  { tag: "тосто", posts: "8,1К" },
  { tag: "нуар", posts: "4,7К" },
  { tag: "анимации", posts: "2,3К" },
  { tag: "чёрная-тема", posts: "1,1К" },
];

export function RightPanel() {
  return (
    <aside className="hidden xl:flex w-80 shrink-0 flex-col gap-4 p-4 h-full overflow-y-auto border-l border-border">
      <div className="relative group">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-pulse transition-colors" />
        <input
          placeholder="Поиск в Tosto"
          className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-surface-1 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-pulse/50 focus:ring-2 focus:ring-pulse/15 transition"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 180, damping: 22 }}
        className="rounded-2xl bg-surface-1 border border-border overflow-hidden shadow-noir"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <TrendingUp className="w-4 h-4 text-pulse" />
          <h3 className="text-sm font-semibold text-foreground">Сейчас в тренде</h3>
        </div>
        {trends.map((t, i) => (
          <motion.button
            key={t.tag}
            type="button"
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ x: 4, backgroundColor: "oklch(0.125 0.003 260)" }}
            transition={{ delay: 0.2 + i * 0.05, type: "spring", stiffness: 260, damping: 24 }}
            className="w-full flex items-center gap-2.5 px-4 py-3 transition-colors text-left"
          >
            <Hash className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">#{t.tag}</p>
              <p className="text-xs text-muted-foreground">{t.posts} постов</p>
            </div>
          </motion.button>
        ))}
      </motion.div>

      <p className="text-xs text-muted-foreground/70 px-2">
        Tosto · О нас · Помощь · Конфиденциальность · © 2026
      </p>
    </aside>
  );
}