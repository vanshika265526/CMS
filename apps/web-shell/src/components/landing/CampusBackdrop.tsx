"use client";

import React, { useEffect, useRef, useState } from "react";
import { CampusScene, QUALITY } from "./campusScene";

const tierFor = (w: number): keyof typeof QUALITY =>
  w < 768 ? "mobile" : w < 1280 ? "tablet" : "desktop";

/**
 * Ambient version of the hero's WebGL scene, for pages that want the same
 * campus horizon behind them without the scroll-driven camera flight.
 * Renders behind its siblings and is inert to pointer input.
 */
export default function CampusBackdrop({ className = "" }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let scene: CampusScene;
    try {
      scene = new CampusScene(canvas, tierFor(window.innerWidth), reduced);
    } catch {
      // No WebGL — the CSS gradient underneath carries the page on its own.
      return;
    }

    scene.setScroll(0);
    scene.start();
    setReady(true);

    // Ease the horizon up rather than snapping it on.
    let raf = 0;
    const startedAt = performance.now();
    const duration = reduced ? 200 : 2600;
    const tick = (now: number) => {
      const t = Math.min((now - startedAt) / duration, 1);
      // easeOutCubic
      scene.setReveal(1 - Math.pow(1 - t, 3));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // rAF can be throttled (background tab); make sure the scene still lights up.
    const revealGuard = window.setTimeout(() => scene.setReveal(1), 3200);

    const onResize = () => scene.resize();
    window.addEventListener("resize", onResize);

    const visibility = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? scene.start() : scene.stop()),
      { threshold: 0 }
    );
    visibility.observe(host);

    const onVisibilityChange = () => (document.hidden ? scene.stop() : scene.start());
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(revealGuard);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      visibility.disconnect();
      scene.dispose();
    };
  }, []);

  return (
    <div ref={hostRef} className={`cb-host ${className}`} aria-hidden="true">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="cb-ground" />
      <canvas ref={canvasRef} className={`cb-canvas ${ready ? "is-ready" : ""}`} />
      <div className="cb-veil" />
    </div>
  );
}

const CSS = `
.cb-host{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.cb-ground{position:absolute;inset:0;
  background:radial-gradient(120% 70% at 50% 4%, #FFFFFF 0%, #F7F9FC 42%, #EEF3FA 72%, #E4ECF7 100%)}
.cb-canvas{position:absolute;inset:0;width:100%;height:100%;
  opacity:0;transition:opacity 1.2s ease}
.cb-canvas.is-ready{opacity:1}
/* Keeps foreground copy legible over the brightest part of the scene */
.cb-veil{position:absolute;inset:0;
  background:linear-gradient(180deg,
    rgba(247,249,252,.92) 0%,
    rgba(247,249,252,.62) 26%,
    rgba(247,249,252,.12) 48%,
    rgba(247,249,252,0) 64%)}
@media (prefers-reduced-motion:reduce){.cb-canvas{transition:none}}
`;
