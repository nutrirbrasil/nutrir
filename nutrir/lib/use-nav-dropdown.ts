"use client";

import { useEffect, useRef, useState } from "react";

export function useNavDropdown(variant: "desktop" | "mobile") {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  function cancelClose() {
    clearTimeout(closeTimerRef.current);
  }

  function scheduleClose() {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setOpen(false), 120);
  }

  function openMenu() {
    cancelClose();
    setOpen(true);
  }

  useEffect(() => () => cancelClose(), []);

  useEffect(() => {
    if (variant !== "mobile") return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [variant]);

  return {
    open,
    setOpen,
    rootRef,
    openMenu,
    scheduleClose,
    close: () => setOpen(false),
  };
}
