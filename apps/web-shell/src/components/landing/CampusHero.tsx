"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CampusScene, QUALITY } from "./campusScene";

const NAV = [
  { label: "Features", href: "#features" },
  { label: "Analytics", href: "#analytics" },
  { label: "Roles", href: "#roles" },
  { label: "About", href: "#about" },
];

const tierFor = (w: number): keyof typeof QUALITY =>
  w < 768 ? "mobile" : w < 1280 ? "tablet" : "desktop";

export default function CampusHero() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dashRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<CampusScene | null>(null);
  const [ready, setReady] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let scene: CampusScene;
    try {
      scene = new CampusScene(canvas, tierFor(window.innerWidth), reduced);
    } catch {
      // No WebGL — the CSS gradient fallback underneath stays visible.
      setWebglFailed(true);
      return;
    }
    sceneRef.current = scene;
    scene.start();
    setReady(true);

    let killScrollTrigger: (() => void) | undefined;
    let cancelled = false;
    let clearIntroProps: (() => void) | undefined;
    let introGuard = 0;

    // If GSAP never loads, the scene still lights up and the copy stays
    // visible — the entrance is an enhancement, never a prerequisite.
    const revealFallback = window.setTimeout(() => scene.setReveal(1), 1200);

    (async () => {
      const gsapMod = await import("gsap");
      const stMod = await import("gsap/ScrollTrigger");
      if (cancelled) return;
      window.clearTimeout(revealFallback);

      const gsap = gsapMod.gsap ?? gsapMod.default;
      const ScrollTrigger = stMod.ScrollTrigger ?? stMod.default;
      gsap.registerPlugin(ScrollTrigger);

      const heroItems = contentRef.current
        ? Array.from(contentRef.current.querySelectorAll("[data-hero-item]"))
        : [];
      const dash = dashRef.current;

      // Everything animates FROM a hidden state back to the CSS-visible
      // default, and clears its inline props on the way out. If the timeline
      // is ever interrupted, the worst case is content that simply appears.
      clearIntroProps = () => {
        if (heroItems.length) gsap.set(heroItems, { clearProps: "opacity,transform" });
        if (dash) gsap.set(dash, { clearProps: "opacity,transform" });
      };

      // ---- Entrance -------------------------------------------------
      const revealProxy = { v: 0 };
      const intro = gsap.timeline({
        defaults: { ease: "power3.out" },
        onComplete: clearIntroProps,
        onInterrupt: clearIntroProps,
      });

      intro.to(revealProxy, {
        v: 1,
        duration: reduced ? 0.4 : 3.1,
        ease: "power2.inOut",
        onUpdate: () => scene.setReveal(revealProxy.v),
        onComplete: () => scene.setReveal(1),
      });

      if (heroItems.length) {
        intro.from(
          heroItems,
          {
            y: 34,
            opacity: 0,
            duration: reduced ? 0.3 : 1.05,
            stagger: reduced ? 0 : 0.11,
            ease: "power3.out",
          },
          reduced ? 0 : 0.35
        );
      }

      if (dash) {
        intro.from(
          dash,
          {
            y: 140,
            opacity: 0,
            rotateX: 14,
            scale: 0.96,
            duration: reduced ? 0.35 : 1.6,
            // Spring-like settle rather than a linear slide.
            ease: "elastic.out(0.55, 0.65)",
          },
          reduced ? 0 : 1.0
        );
      }

      // GSAP's ticker sleeps whenever requestAnimationFrame is throttled — a
      // background tab, or an embedded/offscreen view. Because the entrance
      // animates FROM a hidden state, a sleeping ticker would otherwise leave
      // the hero permanently blank. Force it to its end state if it stalls.
      introGuard = window.setTimeout(() => {
        if (intro.progress() < 1) {
          intro.progress(1);
          scene.setReveal(1);
          clearIntroProps?.();
        }
      }, 6000);

      // ---- Scroll-driven camera flight -------------------------------
      // The sticky element holds the scene in place while this trigger
      // converts scroll distance into one continuous camera move.
      const st = ScrollTrigger.create({
        trigger: wrap,
        start: "top top",
        end: "bottom bottom",
        scrub: reduced ? true : 0.6,
        onUpdate: (self: any) => scene.setScroll(self.progress),
      });

      // Hero content and dashboard ride upward with the 3D world, so the
      // hand-off to the next section reads as one movement.
      const contentTl = gsap.timeline({
        scrollTrigger: {
          trigger: wrap,
          start: "top top",
          end: "52% bottom",
          scrub: reduced ? true : 0.6,
        },
      });

      if (contentRef.current) {
        contentTl.to(
          contentRef.current,
          { y: -170, opacity: 0, ease: "power1.in" },
          0
        );
      }
      if (dashRef.current) {
        contentTl.to(
          dashRef.current,
          { y: -230, opacity: 0, scale: 0.95, ease: "power1.in" },
          0.08
        );
      }

      killScrollTrigger = () => {
        window.clearTimeout(introGuard);
        st.kill();
        contentTl.scrollTrigger?.kill();
        contentTl.kill();
        intro.kill();
        // Leave the DOM in its plain CSS-visible state for the next mount.
        clearIntroProps?.();
      };
    })();

    // ---- Resize ------------------------------------------------------
    const onResize = () => scene.resize();
    window.addEventListener("resize", onResize);

    // ---- Pause rendering while the hero is off-screen ----------------
    const visibility = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? scene.start() : scene.stop()),
      { threshold: 0 }
    );
    visibility.observe(wrap);

    const onVisibilityChange = () =>
      document.hidden ? scene.stop() : scene.start();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearTimeout(revealFallback);
      killScrollTrigger?.();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      visibility.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  return (
    <div className="ch-wrap" ref={wrapRef}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="ch-sticky" ref={stickyRef}>
        {/* Light page ground the 3D scene sits on */}
        <div className="ch-ground" />

        <canvas
          ref={canvasRef}
          className={`ch-canvas ${ready ? "is-ready" : ""}`}
          aria-hidden="true"
        />

        {/* Fallback atmosphere if WebGL is unavailable */}
        {webglFailed && <div className="ch-fallback" aria-hidden="true" />}

        {/* Soft light wash so hero copy always stays legible over the scene */}
        <div className="ch-veil" aria-hidden="true" />

        <header className="ch-nav">
          <div className="ch-brand">
            <span className="ch-brand-mark">NgCMS ERP</span>
            <span className="ch-brand-sub">by Avani Enterprises</span>
          </div>

          <nav className="ch-nav-links">
            {NAV.map((n) => (
              <a key={n.label} href={n.href}>
                {n.label}
              </a>
            ))}
          </nav>

          <div className="ch-nav-actions">
            <Link href="/login" className="ch-btn ch-btn-ghost">
              Sign In <span aria-hidden="true">→</span>
            </Link>
            <Link href="/login" className="ch-btn ch-btn-solid">
              Get Started <span aria-hidden="true">→</span>
            </Link>
          </div>
        </header>

        <div className="ch-content" ref={contentRef}>
          <div className="ch-eyebrow" data-hero-item>
            <span className="ch-spark">✦</span> Admissions to Placements · End-to-End ERP
          </div>

          <h1 className="ch-title" data-hero-item>
            THE INTELLIGENT CAMPUS
            <br />
            <span className="ch-title-accent">OPERATING SYSTEM</span>
          </h1>

          <p className="ch-sub" data-hero-item>
            NgCMS ERP streamlines every administrative, academic, and operational workflow — from
            the first student enquiry to final placement — for modern higher education institutions.
          </p>

          <div className="ch-actions" data-hero-item>
            <Link href="/login" className="ch-btn ch-btn-solid ch-btn-lg">
              Get Started <span aria-hidden="true">→</span>
            </Link>
            <a href="#features" className="ch-btn ch-btn-outline ch-btn-lg">
              Explore Features
            </a>
          </div>
        </div>

        <div className="ch-dash-holder">
          <div className="ch-dash" ref={dashRef}>
            <div className="ch-dash-head">
              <div>
                <p className="ch-dash-brand">NgCMS ERP</p>
                <p className="ch-dash-title">Campus Intelligence</p>
              </div>
              <div className="ch-dash-live">
                <span className="ch-dot" /> Live
              </div>
            </div>

            <div className="ch-dash-stats">
              {[
                { v: "24,892", l: "Students", t: "blue" },
                { v: "94.2%", l: "Attendance", t: "green" },
                { v: "1,284", l: "Faculty", t: "violet" },
                { v: "126", l: "Active Events", t: "amber" },
              ].map((s) => (
                <div key={s.l} className={`ch-stat ch-stat-${s.t}`}>
                  <p className="ch-stat-v">{s.v}</p>
                  <p className="ch-stat-l">{s.l}</p>
                </div>
              ))}
            </div>

            <div className="ch-dash-grid">
              <div className="ch-panel">
                <p className="ch-panel-title">Enrollment Trend</p>
                <Sparkline />
              </div>

              <div className="ch-panel ch-panel-insight">
                <p className="ch-panel-title ch-insight-title">
                  <span className="ch-spark">✦</span> AI Campus Insight
                </p>
                <p className="ch-insight-head">Attendance anomaly detected</p>
                <p className="ch-insight-body">32 students may require attention.</p>
                <div className="ch-insight-bar">
                  <span style={{ width: "68%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/** Static analytics sparkline — pure SVG, no chart dependency. */
function Sparkline() {
  const series = [
    { color: "#2563eb", points: "0,38 28,30 56,33 84,20 112,24 140,12 168,16" },
    { color: "#06b6d4", points: "0,44 28,40 56,42 84,33 112,36 140,27 168,24" },
    { color: "#f59e0b", points: "0,49 28,47 56,44 84,46 112,39 140,41 168,34" },
  ];

  return (
    <svg viewBox="0 0 168 56" className="ch-spark-svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[14, 28, 42].map((y) => (
        <line key={y} x1="0" x2="168" y1={y} y2={y} stroke="#e8eef7" strokeWidth="1" />
      ))}
      <polygon points="0,38 28,30 56,33 84,20 112,24 140,12 168,16 168,56 0,56" fill="url(#chFill)" />
      {series.map((s) => (
        <polyline
          key={s.color}
          points={s.points}
          fill="none"
          stroke={s.color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

const CSS = `
.ch-wrap{position:relative;height:175vh;background:#F7F9FC}
.ch-sticky{position:sticky;top:0;height:100vh;overflow:hidden;
  display:flex;flex-direction:column;align-items:center}

/* Light page ground the 3D horizon sits against */
.ch-ground{position:absolute;inset:0;
  background:
    radial-gradient(120% 70% at 50% 4%, #FFFFFF 0%, #F7F9FC 42%, #EEF3FA 72%, #E4ECF7 100%);
  z-index:0}

.ch-canvas{position:absolute;inset:0;width:100%;height:100%;
  z-index:1;opacity:0;transition:opacity 1.1s ease;pointer-events:none}
.ch-canvas.is-ready{opacity:1}

.ch-fallback{position:absolute;left:50%;bottom:-42%;transform:translateX(-50%);
  width:150%;aspect-ratio:1;border-radius:50%;z-index:1;pointer-events:none;
  background:
    radial-gradient(circle at 28% 40%, rgba(255,179,71,.85) 0%, rgba(255,179,71,0) 55%),
    radial-gradient(circle at 72% 40%, rgba(47,127,255,.85) 0%, rgba(47,127,255,0) 55%),
    radial-gradient(circle at 50% 38%, rgba(255,255,255,.95) 0%, rgba(255,255,255,0) 32%),
    radial-gradient(circle at 50% 50%, #0b1630 0%, #060c1c 70%);
  filter:blur(1px)}

/* Keeps text legible over the brightest part of the scene */
.ch-veil{position:absolute;inset:0;z-index:2;pointer-events:none;
  background:linear-gradient(180deg,
    rgba(247,249,252,.94) 0%,
    rgba(247,249,252,.70) 22%,
    rgba(247,249,252,.18) 42%,
    rgba(247,249,252,0) 58%)}

/* ── Navigation ─────────────────────────────── */
.ch-nav{position:relative;z-index:5;width:100%;max-width:1280px;
  display:flex;align-items:center;justify-content:space-between;gap:1.5rem;
  padding:1.6rem 2rem 0}
.ch-brand{display:flex;flex-direction:column;line-height:1.1}
.ch-brand-mark{font-size:1.02rem;font-weight:800;letter-spacing:-.02em;color:#111827}
.ch-brand-sub{font-size:.64rem;font-weight:600;letter-spacing:.12em;
  text-transform:uppercase;color:#8A97AC;margin-top:.18rem}

.ch-nav-links{display:flex;align-items:center;gap:.35rem;
  background:rgba(255,255,255,.72);backdrop-filter:blur(14px);
  border:1px solid rgba(17,24,39,.07);border-radius:999px;padding:.4rem .5rem;
  box-shadow:0 4px 18px rgba(17,24,39,.05)}
.ch-nav-links a{font-size:.83rem;font-weight:600;color:#475467;
  padding:.42rem .95rem;border-radius:999px;text-decoration:none;transition:.18s}
.ch-nav-links a:hover{color:#111827;background:rgba(17,24,39,.05)}

.ch-nav-actions{display:flex;align-items:center;gap:.6rem}

.ch-btn{display:inline-flex;align-items:center;gap:.42rem;border-radius:999px;
  font-weight:650;font-size:.84rem;text-decoration:none;transition:.2s;
  padding:.62rem 1.15rem;white-space:nowrap;cursor:pointer;border:1px solid transparent}
.ch-btn-ghost{color:#475467}
.ch-btn-ghost:hover{color:#111827;background:rgba(17,24,39,.05)}
.ch-btn-solid{background:linear-gradient(135deg,#111827 0%,#1E2A44 100%);color:#fff;
  box-shadow:0 6px 20px rgba(17,24,39,.22)}
.ch-btn-solid:hover{transform:translateY(-1px);box-shadow:0 10px 26px rgba(17,24,39,.28)}
.ch-btn-outline{background:rgba(255,255,255,.78);color:#111827;
  border-color:rgba(17,24,39,.12);backdrop-filter:blur(10px)}
.ch-btn-outline:hover{border-color:rgba(17,24,39,.28);transform:translateY(-1px)}
.ch-btn-lg{padding:.84rem 1.6rem;font-size:.92rem}

/* ── Hero copy ──────────────────────────────── */
.ch-content{position:relative;z-index:5;text-align:center;
  max-width:860px;padding:0 1.5rem;margin-top:clamp(2rem,6vh,4.5rem)}

.ch-eyebrow{display:inline-flex;align-items:center;gap:.45rem;
  background:rgba(255,255,255,.8);backdrop-filter:blur(12px);
  border:1px solid rgba(37,99,235,.16);border-radius:999px;
  padding:.4rem 1.05rem;font-size:.73rem;font-weight:650;color:#2563EB;
  letter-spacing:.02em;box-shadow:0 3px 14px rgba(37,99,235,.08)}
.ch-spark{color:#7C6AF5}

.ch-title{margin:1.4rem 0 0;font-weight:800;color:#111827;
  font-size:clamp(2.1rem,5.4vw,4.15rem);line-height:1.03;letter-spacing:-.038em}
.ch-title-accent{background:linear-gradient(100deg,#2563EB 0%,#5B7CF5 38%,#8B5CF6 78%,#A78BFA 100%);
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}

.ch-sub{margin:1.35rem auto 0;max-width:610px;color:#475467;
  font-size:clamp(.93rem,1.4vw,1.045rem);line-height:1.72}

.ch-actions{display:flex;flex-wrap:wrap;gap:.8rem;justify-content:center;margin-top:2rem}

/* ── Glass dashboard ────────────────────────── */
/* margin-top:auto pushes the panel to the bottom on tall screens, but
   collapses to zero on short ones — the padding guarantees the CTAs always
   keep clear air above the dashboard. */
.ch-dash-holder{position:relative;z-index:5;width:100%;
  display:flex;justify-content:center;margin-top:auto;
  padding:clamp(2.25rem,7vh,5rem) 1.5rem 0;perspective:1400px}

.ch-dash{width:min(980px,100%);transform-origin:50% 100%;
  background:linear-gradient(165deg,rgba(255,255,255,.92) 0%,rgba(247,250,255,.82) 100%);
  backdrop-filter:blur(26px);-webkit-backdrop-filter:blur(26px);
  border:1px solid rgba(255,255,255,.9);
  border-radius:20px 20px 0 0;
  padding:1.15rem 1.35rem 1.5rem;
  box-shadow:
    0 -1px 0 rgba(255,255,255,.95) inset,
    0 24px 70px rgba(15,35,80,.20),
    0 6px 22px rgba(15,35,80,.10);
  position:relative;overflow:hidden}
/* Subtle specular sheen across the glass */
.ch-dash::before{content:'';position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(112deg,rgba(255,255,255,.55) 0%,rgba(255,255,255,0) 34%);
  border-radius:inherit}

.ch-dash-head{display:flex;align-items:flex-start;justify-content:space-between;
  gap:1rem;margin-bottom:1.05rem}
.ch-dash-brand{font-size:.62rem;font-weight:800;letter-spacing:.18em;
  text-transform:uppercase;color:#8A97AC}
.ch-dash-title{font-size:1.02rem;font-weight:750;color:#111827;margin-top:.12rem;letter-spacing:-.015em}
.ch-dash-live{display:inline-flex;align-items:center;gap:.4rem;font-size:.66rem;
  font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#16A34A;
  background:rgba(22,163,74,.08);border:1px solid rgba(22,163,74,.16);
  border-radius:999px;padding:.28rem .7rem}
.ch-dot{width:6px;height:6px;border-radius:50%;background:#16A34A;
  box-shadow:0 0 0 0 rgba(22,163,74,.5);animation:chPulse 2.2s infinite}
@keyframes chPulse{
  0%{box-shadow:0 0 0 0 rgba(22,163,74,.5)}
  70%{box-shadow:0 0 0 7px rgba(22,163,74,0)}
  100%{box-shadow:0 0 0 0 rgba(22,163,74,0)}}

.ch-dash-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.7rem;margin-bottom:.85rem}
.ch-stat{border-radius:13px;padding:.75rem .85rem;border:1px solid rgba(17,24,39,.055);
  background:rgba(255,255,255,.72)}
.ch-stat-v{font-size:1.22rem;font-weight:800;letter-spacing:-.03em;color:#111827;line-height:1.15}
.ch-stat-l{font-size:.63rem;font-weight:650;letter-spacing:.08em;text-transform:uppercase;
  color:#8A97AC;margin-top:.22rem}
.ch-stat-blue{background:linear-gradient(160deg,rgba(37,99,235,.09),rgba(37,99,235,.02))}
.ch-stat-green{background:linear-gradient(160deg,rgba(22,163,74,.09),rgba(22,163,74,.02))}
.ch-stat-violet{background:linear-gradient(160deg,rgba(124,106,245,.10),rgba(124,106,245,.02))}
.ch-stat-amber{background:linear-gradient(160deg,rgba(245,158,11,.11),rgba(245,158,11,.02))}

.ch-dash-grid{display:grid;grid-template-columns:1.35fr 1fr;gap:.7rem}
.ch-panel{border:1px solid rgba(17,24,39,.055);border-radius:13px;
  background:rgba(255,255,255,.74);padding:.8rem .9rem}
.ch-panel-title{font-size:.62rem;font-weight:800;letter-spacing:.14em;
  text-transform:uppercase;color:#8A97AC;margin-bottom:.55rem}
.ch-spark-svg{width:100%;height:56px;display:block}

.ch-panel-insight{background:linear-gradient(160deg,rgba(124,106,245,.09),rgba(37,99,235,.03));
  border-color:rgba(124,106,245,.16)}
.ch-insight-title{color:#7C6AF5;display:flex;align-items:center;gap:.35rem}
.ch-insight-head{font-size:.84rem;font-weight:700;color:#111827;letter-spacing:-.01em}
.ch-insight-body{font-size:.75rem;color:#475467;margin-top:.2rem;line-height:1.5}
.ch-insight-bar{margin-top:.7rem;height:4px;border-radius:99px;background:rgba(17,24,39,.07);overflow:hidden}
.ch-insight-bar span{display:block;height:100%;border-radius:99px;
  background:linear-gradient(90deg,#2563EB,#8B5CF6)}

/* ── Responsive ─────────────────────────────── */
@media (max-width:1100px){
  .ch-nav-links{display:none}
}
@media (max-width:860px){
  .ch-wrap{height:158vh}
  .ch-nav{padding:1.1rem 1.15rem 0}
  .ch-brand-sub{display:none}
  .ch-btn-ghost{display:none}
  .ch-content{margin-top:clamp(1.4rem,4vh,2.6rem)}
  .ch-title{font-size:clamp(1.85rem,8.2vw,2.7rem)}
  .ch-sub{font-size:.89rem;max-width:430px}
  .ch-actions{margin-top:1.5rem}
  .ch-dash-holder{padding-top:clamp(1.75rem,5vh,3rem)}
  .ch-dash{border-radius:16px 16px 0 0;padding:.9rem .9rem 1.1rem}
  .ch-dash-stats{grid-template-columns:repeat(2,1fr);gap:.5rem}
  .ch-dash-grid{grid-template-columns:1fr;gap:.5rem}
  .ch-stat-v{font-size:1.05rem}
}
@media (max-width:520px){
  .ch-dash-head{margin-bottom:.8rem}
  .ch-dash-live{display:none}
}

@media (prefers-reduced-motion:reduce){
  .ch-dot{animation:none}
  .ch-canvas{transition:none}
}
`;
