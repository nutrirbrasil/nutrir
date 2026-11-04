"use client";

import { useEffect, useRef } from "react";

export type Burst = { id: number; big: boolean } | null;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
  round: boolean;
  life: number;
};

const COLORS = ["#c4a574", "#dcc9a3", "#a8875c", "#f5ecd9", "#e8c9a0", "#ffffff"];

export function Confetti({ burst }: { burst: Burst }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!burst) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    const origins = burst.big
      ? [
          [w * 0.2, h * 0.65],
          [w * 0.8, h * 0.65],
          [w * 0.5, h * 0.4],
        ]
      : [[w * 0.5, h * 0.5]];
    const perOrigin = burst.big ? 110 : 90;
    const maxSpeed = burst.big ? 15 : 11;

    for (const [ox, oy] of origins) {
      for (let i = 0; i < perOrigin; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
        const speed = 5 + Math.random() * maxSpeed;
        particlesRef.current.push({
          x: ox,
          y: oy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 5 + Math.random() * 6,
          rotation: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.3,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          round: Math.random() < 0.3,
          life: 130 + Math.random() * 90,
        });
      }
    }

    const tick = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      for (const p of particlesRef.current) {
        p.vy += 0.28;
        p.vx *= 0.992;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.spin;
        p.life -= 1;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.min(1, p.life / 40);
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      }

      particlesRef.current = particlesRef.current.filter((p) => p.life > 0 && p.y < h + 20);

      if (particlesRef.current.length > 0) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, w, h);
        frameRef.current = null;
      }
    };

    if (frameRef.current === null) frameRef.current = requestAnimationFrame(tick);
  }, [burst]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[70] h-full w-full"
    />
  );
}
