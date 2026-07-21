"use client";

import { useEffect, useState } from "react";

/**
 * true só depois da hidratação, em telas de toque/estreitas (celular).
 * Usado para só oferecer "escanear código de barras" em mobile, em desktop
 * não há câmera traseira nem sentido em digitar o código à mão.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 768px)").matches;
    const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setIsMobile(narrow && touch);
  }, []);

  return isMobile;
}

export function hasBarcodeDetector(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}
