import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "./Logo";

type IntroProps = {
  show: boolean;
};

const LETTERS = ["T", "o", "s", "t", "o"];

export function Intro({ show }: IntroProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background noir-grid overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: "blur(10px)" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="absolute inset-0 noir-mesh pointer-events-none" />

          <motion.div
            className="absolute w-[520px] h-[520px] rounded-full border border-border/60 pointer-events-none"
            initial={{ scale: 0.6, opacity: 0, rotate: -30 }}
            animate={{ scale: [0.85, 1.08, 1], opacity: [0, 0.45, 0.25], rotate: 45 }}
            transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className="absolute w-[340px] h-[340px] rounded-full border border-pulse/25 pointer-events-none"
            initial={{ scale: 0.4, opacity: 0, rotate: 20 }}
            animate={{ scale: [0.7, 1.05, 1], opacity: [0, 0.65, 0.3], rotate: -40 }}
            transition={{ duration: 2, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          />

          <motion.div
            className="absolute inset-y-0 w-64 bg-gradient-to-r from-transparent via-foreground/[0.04] to-transparent skew-x-[-20deg] pointer-events-none"
            initial={{ x: "-120vw" }}
            animate={{ x: "120vw" }}
            transition={{ duration: 1.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          />

          <div className="relative flex flex-col items-center gap-7">
            <motion.div
              initial={{ scale: 0.5, rotate: -14, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 160, damping: 16, delay: 0.08 }}
              className="relative"
            >
              <motion.div
                className="absolute -inset-6 rounded-full blur-3xl bg-pulse/20 pointer-events-none"
                animate={{ scale: [0.9, 1.2, 0.95], opacity: [0.35, 0.75, 0.4] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
              <Logo className="relative w-24 h-24 drop-shadow-2xl" animated />
            </motion.div>

            <div className="flex items-center overflow-hidden py-1">
              {LETTERS.map((ch, idx) => (
                <motion.span
                  key={idx}
                  className="font-display text-5xl sm:text-6xl font-bold tracking-tight text-platinum inline-block"
                  initial={{ y: "120%", opacity: 0, rotateX: -65 }}
                  animate={{ y: "0%", opacity: 1, rotateX: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 170,
                    damping: 18,
                    delay: 0.28 + idx * 0.06,
                  }}
                >
                  {ch}
                </motion.span>
              ))}
            </div>

            <motion.p
              className="text-muted-foreground text-xs tracking-[0.34em] uppercase"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              Соцсеть · Мессенджер · Живой
            </motion.p>

            <motion.div
              className="h-[2px] w-44 rounded-full bg-surface-3 overflow-hidden"
              initial={{ opacity: 0, scaleX: 0.7 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.78, duration: 0.3 }}
            >
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary via-pulse to-primary"
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                transition={{ duration: 1.45, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}