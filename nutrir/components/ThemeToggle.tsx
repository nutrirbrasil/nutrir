"use client";

import { FiMoon, FiSun } from "react-icons/fi";
import { useTheme } from "@/lib/theme-context";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg transition hover:bg-black/5 dark:hover:bg-white/10 ${className}`}
    >
      {isDark ? <FiSun /> : <FiMoon />}
    </button>
  );
}
