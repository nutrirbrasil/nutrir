"use client";

import { useEffect, useState } from "react";
import { FiMoon, FiSun } from "react-icons/fi";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("pauli-theme", next ? "dark" : "light");
    setDark(next);
  }

  if (!mounted) {
    return <span className="inline-block h-9 w-9 shrink-0" aria-hidden />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={dark ? "Modo claro" : "Modo escuro"}
      className="burgundy-text flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-pauli-burgundy/25 bg-white/80 transition hover:bg-pauli-burgundy/10 dark:border-pauli-sand/25 dark:bg-[#1a1816] dark:hover:bg-pauli-burgundy/10"
    >
      {dark ? <FiSun className="text-lg" /> : <FiMoon className="text-lg" />}
    </button>
  );
}
