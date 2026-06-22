"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

export type ScrollRevealAnimation =
  | "fade-up"
  | "fade-down"
  | "fade-left"
  | "fade-right"
  | "fade-in"
  | "scale-up";

type Props = {
  children: ReactNode;
  animation?: ScrollRevealAnimation;
  delay?: number;
  duration?: number;
  className?: string;
  as?: ElementType;
  /** Anima ao montar (hero), sem esperar o scroll. */
  eager?: boolean;
  threshold?: number;
};

const animationClass: Record<ScrollRevealAnimation, string> = {
  "fade-up": "scroll-reveal-fade-up",
  "fade-down": "scroll-reveal-fade-down",
  "fade-left": "scroll-reveal-fade-left",
  "fade-right": "scroll-reveal-fade-right",
  "fade-in": "scroll-reveal-fade-in",
  "scale-up": "scroll-reveal-scale-up",
};

export function ScrollReveal({
  children,
  animation = "fade-up",
  delay = 0,
  duration = 700,
  className = "",
  as: Tag = "div",
  eager = false,
  threshold = 0.12,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (eager) {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -6% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [eager, threshold]);

  const style = {
    "--reveal-delay": `${delay}ms`,
    "--reveal-duration": `${duration}ms`,
  } as CSSProperties;

  return (
    <Tag
      ref={ref}
      className={`scroll-reveal ${animationClass[animation]} ${
        visible ? "scroll-reveal-visible" : ""
      } ${className}`}
      style={style}
    >
      {children}
    </Tag>
  );
}
