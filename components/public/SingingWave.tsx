"use client";

import { useEffect, useRef } from "react";

type Props = {
  active: boolean;
  trackKey: string;
};

type Orb = {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  driftX: number;
  driftY: number;
  speed: number;
  phase: number;
  hue: number;
  alpha: number;
  rotation: number;
};

type Scene = {
  bpm: number;
  beatOffset: number;
  melodyOffset: number;
  orbs: Orb[];
  mainHue: number;
  warmHue: number;
};

function hashString(value: string) {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createRandom(seed: number) {
  let value = seed || 1;

  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function createScene(trackKey: string): Scene {
  const random = createRandom(hashString(trackKey));
  const mainHue = 286 + random() * 48;
  const warmHue = 350 + random() * 34;

  const orbs = Array.from({ length: 7 }, (_, index): Orb => {
    const palette = [
      mainHue,
      mainHue + 24,
      warmHue,
      mainHue + 66,
      318 + random() * 18,
      warmHue + 10,
      mainHue - 18,
    ];

    return {
      x: 0.04 + random() * 0.92,
      y: 0.08 + random() * 0.84,
      radiusX: 0.22 + random() * 0.25,
      radiusY: 0.72 + random() * 0.9,
      driftX: 0.025 + random() * 0.055,
      driftY: 0.12 + random() * 0.2,
      speed: 0.22 + random() * 0.42,
      phase: random() * Math.PI * 2,
      hue: palette[index] % 360,
      alpha: 0.22 + random() * 0.14,
      rotation: (random() - 0.5) * 0.7,
    };
  });

  return {
    bpm: 88 + random() * 38,
    beatOffset: random(),
    melodyOffset: random() * Math.PI * 2,
    orbs,
    mainHue,
    warmHue,
  };
}

function drawOrb(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  hue: number,
  alpha: number,
  rotation: number,
) {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.scale(Math.max(1, radiusX), Math.max(1, radiusY));

  const gradient = context.createRadialGradient(-0.16, -0.18, 0.015, 0, 0, 1);
  gradient.addColorStop(
    0,
    "hsla(" + hue + ", 100%, 69%, " + Math.min(0.9, alpha * 1.55) + ")",
  );
  gradient.addColorStop(
    0.28,
    "hsla(" + (hue + 5) % 360 + ", 98%, 59%, " + alpha + ")",
  );
  gradient.addColorStop(
    0.62,
    "hsla(" + (hue + 18) % 360 + ", 94%, 51%, " + alpha * 0.48 + ")",
  );
  gradient.addColorStop(1, "hsla(" + hue + ", 90%, 48%, 0)");

  context.fillStyle = gradient;
  context.beginPath();
  context.arc(0, 0, 1, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

export function SingingWave({ active, trackKey }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const scene = createScene(trackKey);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let frame = 0;
    let startedAt = 0;
    let disposed = false;
    let pixelRatio = 1;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.65);

      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const draw = (time: number) => {
      if (!width || !height) return;

      context.clearRect(0, 0, width, height);

      const background = context.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, "rgba(54, 12, 39, 0.2)");
      background.addColorStop(0.5, "rgba(75, 12, 75, 0.16)");
      background.addColorStop(1, "rgba(22, 12, 49, 0.22)");
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      const beat = ((time * scene.bpm) / 60 + scene.beatOffset) % 1;
      const kick = Math.pow(Math.max(0, 1 - beat * 6.2), 3.2);
      const offBeat = (beat + 0.5) % 1;
      const snare = Math.pow(Math.max(0, 1 - offBeat * 7.5), 3) * 0.42;

      const melody =
        Math.sin(time * 1.35 + scene.melodyOffset) * 0.5 +
        Math.sin(time * 2.17 + scene.melodyOffset * 1.7) * 0.28 +
        Math.sin(time * 0.63 + scene.melodyOffset * 0.45) * 0.22;

      const shimmer =
        Math.pow(
          Math.max(
            0,
            Math.sin(time * 5.1 + scene.melodyOffset * 2.1),
          ),
          8,
        ) * 0.16;

      const bassEnergy = kick + snare;
      const musicalEnergy = 0.24 + bassEnergy * 0.75 + shimmer;

      context.globalCompositeOperation = "screen";

      for (const orb of scene.orbs) {
        const phase = time * orb.speed + orb.phase;
        const driftX =
          Math.sin(phase) + Math.sin(phase * 0.53 + orb.phase) * 0.34;
        const driftY =
          Math.cos(phase * 0.82) + Math.sin(phase * 0.41) * 0.32;

        const x =
          width *
          (orb.x +
            driftX * orb.driftX +
            melody * 0.018 * Math.sin(orb.phase));
        const y =
          height *
          (orb.y +
            driftY * orb.driftY +
            melody * 0.055 +
            kick * 0.025 * Math.sin(orb.phase * 1.8));

        const pulse = 1 + bassEnergy * (0.12 + orb.alpha * 0.2);
        const radiusX =
          width * orb.radiusX * pulse * (1 + melody * 0.035);
        const radiusY =
          height * orb.radiusY * (1 + bassEnergy * 0.17 + shimmer);
        const hue = orb.hue + melody * 7 + shimmer * 22;
        const alpha = Math.min(
          0.68,
          orb.alpha + musicalEnergy * (0.11 + shimmer * 0.35),
        );

        drawOrb(
          context,
          x,
          y,
          radiusX,
          radiusY,
          hue,
          alpha,
          orb.rotation + melody * 0.08,
        );
      }

      // A broad low-frequency bloom: it expands on every kick instead of
      // drawing literal equalizer bars or outlined wave paths.
      drawOrb(
        context,
        width * (0.5 + melody * 0.045),
        height * (0.53 + Math.sin(time * 0.72) * 0.055),
        width * (0.2 + kick * 0.075 + snare * 0.025),
        height * (0.82 + kick * 0.42 + snare * 0.15),
        scene.mainHue + melody * 13,
        0.16 + kick * 0.25 + snare * 0.09,
        melody * 0.12,
      );

      // Warm accents flicker on the beat to make the animation feel musical.
      drawOrb(
        context,
        width * (0.28 + Math.sin(time * 0.9 + scene.melodyOffset) * 0.08),
        height * (0.28 + melody * 0.12),
        width * (0.12 + kick * 0.045),
        height * (0.7 + kick * 0.25),
        scene.warmHue + shimmer * 16,
        0.12 + kick * 0.23 + shimmer * 0.3,
        -0.18 + melody * 0.1,
      );

      context.globalCompositeOperation = "source-over";

      const vignette = context.createLinearGradient(0, 0, 0, height);
      vignette.addColorStop(0, "rgba(8, 5, 12, 0.14)");
      vignette.addColorStop(0.45, "rgba(8, 5, 12, 0)");
      vignette.addColorStop(1, "rgba(8, 5, 12, 0.22)");
      context.fillStyle = vignette;
      context.fillRect(0, 0, width, height);
    };

    const animate = (now: number) => {
      if (disposed) return;
      if (!document.hidden) {
        if (!startedAt) startedAt = now;
        draw((now - startedAt) / 1000);
      }
      frame = window.requestAnimationFrame(animate);
    };

    const handleVisibility = () => {
      window.cancelAnimationFrame(frame);
      if (!document.hidden && !reducedMotion.matches) {
        startedAt = 0;
        frame = window.requestAnimationFrame(animate);
      }
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    document.addEventListener("visibilitychange", handleVisibility);

    if (reducedMotion.matches) {
      draw(0);
    } else {
      frame = window.requestAnimationFrame(animate);
    }

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [active, trackKey]);

  return (
    <div
      className="singing-wave"
      data-active={active ? "true" : "false"}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="singing-wave__canvas" />
      <div className="singing-wave__tint" />
    </div>
  );
}
