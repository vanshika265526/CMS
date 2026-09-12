"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CampusScene, QUALITY } from "./campusScene";
import CampusPreview from "./CampusPreview";

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
      (window as any).__dbg = { gsap, ScrollTrigger, scene };

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
        // The scroll tweens resolve their distances from layout once. Re-measure
        // after the entrance settles so the panel's travel is based on its real
        // resting position rather than a mid-animation one.
        ScrollTrigger.refresh();
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

      // Layout offset of an element inside an ancestor. offsetTop/offsetHeight
      // ignore transforms, so this stays correct even while the entrance
      // animation still has the panel translated.
      const offsetWithin = (el: HTMLElement, ancestor: HTMLElement) => {
        let y = 0;
        let node: HTMLElement | null = el;
        while (node && node !== ancestor) {
          y += node.offsetTop;
          node = node.offsetParent as HTMLElement | null;
        }
        return y;
      };

      // How far the panel must rise for its whole height to clear the fold.
      // GSAP resolves function-based values once, so this must not depend on
      // whatever transform happens to be applied at that moment.
      const dashLift = () => {
        const sticky = stickyRef.current;
        if (!dash || !sticky) return 0;
        const restingTop = offsetWithin(dash, sticky);
        const hiddenBelowFold = restingTop + dash.offsetHeight - sticky.offsetHeight;
        // Clearance kept below the nav; tighter on short laptop screens so the
        // preview can still clear the fold completely.
        const clearance = window.innerHeight < 780 ? 74 : 96;
        return Math.max(0, Math.min(hiddenBelowFold + 28, restingTop - clearance));
      };

      // Three phases across the pinned hero, as one continuous move:
      //   0.00–0.32  headline clears while the dashboard rises into full view
      //   0.32–0.55  the whole panel sits on screen
      //   0.55–0.90  panel and scene exit upward as the next section arrives
      const contentTl = gsap.timeline({
        scrollTrigger: {
          trigger: wrap,
          start: "top top",
          end: "bottom bottom",
          scrub: reduced ? true : 0.6,
          invalidateOnRefresh: true,
        },
      });

      if (contentRef.current) {
        contentTl.to(
          contentRef.current,
          { y: -190, opacity: 0, ease: "power1.in", duration: 0.32 },
          0
        );
      }
      if (dash) {
        contentTl.to(
          dash,
          { y: () => -dashLift(), ease: "power2.out", duration: 0.32 },
          0
        );
        contentTl.to(
          dash,
          {
            y: () => -dashLift() - 300,
            opacity: 0,
            scale: 0.95,
            ease: "power1.in",
            duration: 0.35,
          },
          0.55
        );
      }
      // Pad the timeline to a full unit so the positions above map directly
      // onto scroll fractions of the hero.
      contentTl.set({}, {}, 1);

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
            <CampusPreview />
          </div>
        </div>

      </div>
    </div>
  );
}

const CSS = `
.ch-wrap{position:relative;height:200vh;background:#F7F9FC}
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

/* ── Product preview panel ──────────────────── */
.ch-dash-holder{position:relative;z-index:5;width:100%;
  display:flex;justify-content:center;margin-top:auto;
  padding:clamp(2.25rem,7vh,5rem) 1.5rem 0;perspective:1400px}

/* A glass bezel wrapped around the live product preview. */
.ch-dash{width:min(1140px,100%);transform-origin:50% 100%;
  background:linear-gradient(165deg,rgba(255,255,255,.92) 0%,rgba(247,250,255,.82) 100%);
  backdrop-filter:blur(26px);-webkit-backdrop-filter:blur(26px);
  border:1px solid rgba(255,255,255,.9);
  border-radius:20px;
  padding:10px;
  box-shadow:
    0 -1px 0 rgba(255,255,255,.95) inset,
    0 24px 70px rgba(15,35,80,.20),
    0 6px 22px rgba(15,35,80,.10);
  position:relative}

/* Compact the preview so the whole panel still clears the fold on laptop
   heights once the scroll lifts it into view. */
.ch-dash .screen-wrap{border-radius:12px}
.ch-dash .screen-inner{min-height:0}
.ch-dash .screen-bar{padding:.5rem .8rem}
.ch-dash .m-sidebar{padding:.75rem .6rem}
.ch-dash .m-item{padding:.3rem .5rem;font-size:.68rem}
.ch-dash .m-section{padding:.5rem .5rem .12rem}
.ch-dash .m-brand{padding:.3rem .45rem .6rem}
.ch-dash .m-content{padding:.95rem}
.ch-dash .m-analytics{min-height:96px}

/* Short laptop heights: trim the preview so its full height still fits
   on screen once the scroll lifts it. */
@media (max-height:780px){
  .ch-dash{padding:7px}
  .ch-dash .m-content{padding:.72rem}
  .ch-dash .m-sidebar{padding:.55rem .5rem}
  .ch-dash .m-item{padding:.22rem .45rem;font-size:.64rem}
  .ch-dash .m-section{padding:.38rem .45rem .1rem;font-size:.52rem}
  .ch-dash .m-cards{gap:.4rem;margin-bottom:.45rem}
  .ch-dash .m-card{padding:.5rem}
  .ch-dash .m-card-num{font-size:.92rem}
  .ch-dash .m-analytics{min-height:72px;margin-top:.45rem}
  .ch-dash .m-chart-svg{min-height:54px}
  .ch-dash .m-avatar{padding:.45rem .45rem}
}


/* ── Responsive ─────────────────────────────── */
@media (max-width:1100px){
  .ch-nav-links{display:none}
}
@media (max-width:860px){
  .ch-wrap{height:185vh}
  .ch-nav{padding:1.1rem 1.15rem 0}
  .ch-brand-sub{display:none}
  .ch-btn-ghost{display:none}
  .ch-content{margin-top:clamp(1.4rem,4vh,2.6rem)}
  .ch-title{font-size:clamp(1.85rem,8.2vw,2.7rem)}
  .ch-sub{font-size:.89rem;max-width:430px}
  .ch-actions{margin-top:1.5rem}
  .ch-dash-holder{padding-top:clamp(1.75rem,5vh,3rem)}
  .ch-dash{border-radius:14px;padding:6px}
}
@media (max-width:520px){
}

@media (prefers-reduced-motion:reduce){
  .ch-dot{animation:none}
  .ch-canvas{transition:none}
}
`;
