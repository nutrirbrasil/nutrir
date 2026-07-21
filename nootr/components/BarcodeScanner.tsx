"use client";

import { useEffect, useRef, useState } from "react";

// A API BarcodeDetector ainda não está nos tipos padrão do TS/DOM.
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}

/**
 * Escaneia um código de barras pela câmera (traseira, quando disponível).
 * Só deve ser montado em contexto mobile com suporte a BarcodeDetector,
 * o chamador é responsável por essa checagem (ver lib/device.ts).
 */
export function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stopped = false;
    let rafId: number;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const Detector = window.BarcodeDetector;
        if (!Detector) {
          setError("Seu navegador não suporta leitura automática de código de barras.");
          return;
        }
        const detector = new Detector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
        });

        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              onDetected(codes[0].rawValue);
              return; // para o loop; o chamador fecha o scanner
            }
          } catch {
            // frame ilegível, ignora e tenta o próximo
          }
          rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
      } catch {
        setError("Não foi possível acessar a câmera. Verifique a permissão do navegador.");
      }
    }

    void start();
    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetected]);

  return (
    <div className="rounded-xl border border-nootr-line bg-nootr-black p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-caps text-nootr-muted">Aponte para o código de barras</p>
        <button type="button" onClick={onClose} className="text-xs text-nootr-muted hover:text-nootr-bordoSoft">
          cancelar
        </button>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-nootr-bordoSoft">{error}</p>
      ) : (
        <video ref={videoRef} className="mt-3 aspect-video w-full rounded-lg bg-black object-cover" muted playsInline />
      )}
    </div>
  );
}
