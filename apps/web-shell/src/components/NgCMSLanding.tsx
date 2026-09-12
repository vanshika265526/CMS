"use client";

/**
 * NgCMS ERP Landing Page — Audience-Friendly Redesign
 *
 * Dependencies:
 *   npm install framer-motion
 *   Fonts: loaded via @import in GLOBAL_CSS
 */

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";

// ─────────────────────────────────────────
// CSS
// ─────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');

*,::after,::before{box-sizing:border-box;margin:0;padding:0}
:root{
  --blue:#2563EB;--blue-light:#EFF6FF;--blue-mid:#DBEAFE;--blue-dark:#1D4ED8;
  --green:#16A34A;--green-light:#F0FDF4;
  --amber:#D97706;--amber-light:#FFFBEB;
  --slate:#0F172A;--slate-mid:#334155;--slate-soft:#64748B;
  --border:#E2E8F0;--bg:#F8FAFC;--white:#FFFFFF;
  --shadow-sm:0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.04);
  --shadow-md:0 4px 16px rgba(0,0,0,.08),0 2px 6px rgba(0,0,0,.04);
  --shadow-lg:0 20px 48px rgba(0,0,0,.1),0 8px 20px rgba(0,0,0,.06);
  --radius:14px;--radius-lg:22px;
  --nav-bg:rgba(248,250,252,0.92);
  --hero-bg:linear-gradient(160deg, #EFF6FF 0%, #F8FAFC 50%, #F0FDF4 100%);
}
html.theme-dark {
  --blue:#3B82F6;--blue-light:rgba(59,130,246,0.15);--blue-mid:rgba(59,130,246,0.25);--blue-dark:#60A5FA;
  --green:#22C55E;--green-light:rgba(34,197,94,0.15);
  --amber:#F59E0B;--amber-light:rgba(245,158,11,0.15);
  --slate:#F1F5F9;--slate-mid:#94A3B8;--slate-soft:#94A3B8;
  --border:#1E293B;--bg:#020617;--white:#0F172A;
  --shadow-sm:0 1px 3px rgba(0,0,0,.3);
  --shadow-md:0 4px 16px rgba(0,0,0,.4);
  --shadow-lg:0 20px 48px rgba(0,0,0,.5);
  --nav-bg:rgba(15,23,42,0.92);
  --hero-bg:linear-gradient(160deg, #0f172a 0%, #020617 50%, #064e3b 100%);
}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--slate);font-family:'Plus Jakarta Sans',sans-serif;overflow-x:hidden;-webkit-font-smoothing:antialiased;line-height:1.6}

/* ── Nav ── */
.nav{align-items:center;background:var(--nav-bg);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);display:flex;justify-content:space-between;left:0;padding:1rem 5%;position:fixed;right:0;top:0;transition:box-shadow .3s;z-index:200}
.nav.nav-scrolled{box-shadow:var(--shadow-sm)}
.nav-logo{align-items:center;display:flex;gap:.65rem}
.nav-logo-icon{background:var(--blue);border-radius:10px;color:#fff;display:grid;font-size:.95rem;font-weight:700;height:36px;place-items:center;width:36px}
.nav-logo-text{font-size:1rem;font-weight:700;color:var(--slate);line-height:1.2}
.nav-logo-text span{color:var(--blue)}
.nav-logo-sub{color:var(--slate-soft);font-size:.62rem;font-weight:500;letter-spacing:.03em}
.nav-links{display:flex;gap:2rem;list-style:none}
.nav-links a{color:var(--slate-soft);font-size:.9rem;font-weight:500;text-decoration:none;transition:color .2s}
.nav-links a:hover{color:var(--blue)}
.nav-cta{background:var(--blue);border-radius:50px;color:#fff;font-size:.88rem;font-weight:600;padding:.55rem 1.4rem;text-decoration:none;transition:background .2s,transform .15s}
.nav-cta:hover{background:var(--blue-dark)}
.theme-toggle{background:none;border:none;border-radius:50%;color:var(--slate);cursor:pointer;display:flex;font-size:1.2rem;height:38px;padding:0;place-items:center;justify-content:center;transition:background .2s;width:38px}
.theme-toggle:hover{background:var(--border)}

/* ── Hero ── */
.hero{align-items:center;display:flex;justify-content:center;min-height:100vh;overflow:hidden;padding:9rem 5% 6rem;position:relative;background:var(--hero-bg)}
.hero-blob{position:absolute;border-radius:50%;pointer-events:none;filter:blur(80px);opacity:.55}
.hero-blob-1{background:#BFDBFE;height:520px;width:520px;top:-10%;left:-8%}
.hero-blob-2{background:#BBF7D0;height:380px;width:380px;bottom:-5%;right:-5%}
.hero-content{max-width:820px;position:relative;text-align:center;z-index:1}
.hero-badge{align-items:center;background:var(--white);border:1.5px solid var(--border);border-radius:50px;color:var(--blue);display:inline-flex;font-size:.78rem;font-weight:600;gap:.45rem;letter-spacing:.06em;margin-bottom:1.8rem;padding:.38rem 1.1rem;text-transform:uppercase;box-shadow:var(--shadow-sm)}
.badge-dot{background:var(--green);border-radius:50%;display:inline-block;height:7px;width:7px;animation:pulse 2.2s infinite}
@keyframes pulse{0%,to{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}
.hero-h1{color:var(--slate);font-size:clamp(2.5rem,6vw,4.6rem);font-weight:800;letter-spacing:-.035em;line-height:1.08;margin-bottom:1.5rem}
.hero-h1 .accent{color:var(--blue)}
.hero-h1 .serif{font-family:'Lora',serif;font-style:italic;font-weight:400;color:var(--slate-mid)}
.hero-sub{color:var(--slate-soft);font-size:1.08rem;line-height:1.8;margin:0 auto 2.4rem;max-width:540px}
.hero-actions{display:flex;flex-wrap:wrap;gap:.9rem;justify-content:center;margin-bottom:3rem}
.btn-primary{align-items:center;background:var(--blue);border-radius:50px;box-shadow:0 4px 20px rgba(37,99,235,.35);color:#fff;display:inline-flex;font-size:.98rem;font-weight:600;gap:.45rem;padding:.85rem 2rem;text-decoration:none;transition:background .2s,transform .15s,box-shadow .2s}
.btn-primary:hover{background:var(--blue-dark);transform:translateY(-1px);box-shadow:0 8px 28px rgba(37,99,235,.4)}
.btn-ghost{background:var(--white);border:1.5px solid var(--border);border-radius:50px;color:var(--slate);display:inline-block;font-size:.98rem;font-weight:600;padding:.85rem 2rem;text-decoration:none;transition:border-color .2s,transform .15s}
.btn-ghost:hover{border-color:var(--blue);color:var(--blue);transform:translateY(-1px)}
.hero-stats{border-top:1.5px solid var(--border);display:flex;gap:2.5rem;justify-content:center;padding-top:1.5rem}
.hero-stat{text-align:center}
.hero-stat strong{color:var(--blue);display:block;font-size:1.5rem;font-weight:800}
.hero-stat span{color:var(--slate-soft);font-size:.72rem;font-weight:500;letter-spacing:.07em;text-transform:uppercase}

/* ── Marquee ── */
.marquee-wrap{background:var(--white);border-bottom:1px solid var(--border);border-top:1px solid var(--border);overflow:hidden;padding:.85rem 0}
.marquee-track{animation:marquee 30s linear infinite;display:flex;white-space:nowrap}
@keyframes marquee{0%{transform:translateX(0)}to{transform:translateX(-50%)}}
.marquee-item{color:var(--slate-soft);flex-shrink:0;font-size:.78rem;font-weight:500;letter-spacing:.04em;padding:0 2rem;text-transform:uppercase}
.marquee-dot{color:var(--blue)}

/* ── Stats Row ── */
.stats-row{background:var(--white);display:flex;flex-wrap:wrap;justify-content:center;border-bottom:1px solid var(--border)}
.stat-item{border-right:1px solid var(--border);flex:1 1;min-width:150px;padding:2rem 1.5rem;text-align:center}
.stat-item:last-child{border-right:none}
.stat-num{color:var(--blue);font-size:2.6rem;font-weight:800;letter-spacing:-.04em}
.stat-label{color:var(--slate-soft);font-size:.78rem;font-weight:500;margin-top:.35rem}

/* ── Section helpers ── */
.section-tag{color:var(--blue);font-size:.74rem;font-weight:700;letter-spacing:.14em;margin-bottom:.5rem;text-transform:uppercase}
.section-title{color:var(--slate);font-size:clamp(1.7rem,3.5vw,2.7rem);font-weight:800;letter-spacing:-.03em;line-height:1.1}
.section-title .accent{color:var(--blue)}

/* ── Mockup ── */
.mockup-section{background:var(--bg);padding:6rem 5%}
.mockup-inner{margin:0 auto;max-width:1200px}
.mockup-label{margin-bottom:3rem}
.mockup-wrapper{border-radius:var(--radius-lg);box-shadow:var(--shadow-lg),0 0 0 1px var(--border);overflow:hidden}
.screen-wrap{background:#F1F5F9;border-radius:var(--radius-lg);overflow:hidden}
.screen-bar{align-items:center;background:var(--white);border-bottom:1px solid var(--border);display:flex;gap:.5rem;padding:.65rem 1rem}
.screen-dot{border-radius:50%;height:10px;width:10px}
.screen-dot.d1{background:#FF5F57}.screen-dot.d2{background:#FEBC2E}.screen-dot.d3{background:#28C840}
.screen-url{background:#F8FAFC;border:1px solid var(--border);border-radius:6px;color:var(--slate-soft);flex:1;font-family:monospace;font-size:.7rem;margin:0 .5rem;padding:.22rem .7rem}
.screen-inner{display:grid;grid-template-columns:200px 1fr;min-height:380px}
.m-sidebar{background:var(--white);border-right:1px solid var(--border);display:flex;flex-direction:column;gap:.2rem;padding:1rem .75rem}
.m-brand{color:var(--blue);font-size:.8rem;font-weight:700;padding:.4rem .5rem .9rem}
.m-brand small{display:block;color:var(--slate-soft);font-size:.58rem;font-weight:500;letter-spacing:.07em}
.m-item{align-items:center;border-radius:8px;display:flex;font-size:.72rem;font-weight:500;gap:.45rem;padding:.42rem .55rem;color:var(--slate-soft);transition:background .15s,color .15s;cursor:default}
.m-item:hover{background:var(--blue-light);color:var(--blue)}
.m-item.active{background:var(--blue-light);color:var(--blue);font-weight:600}
.m-item-icon{background:currentColor;border-radius:3px;flex-shrink:0;height:11px;opacity:.35;width:11px}
.m-section{color:#94A3B8;font-size:.56rem;font-weight:700;letter-spacing:.1em;padding:.7rem .55rem .2rem;text-transform:uppercase}
.m-avatar{align-items:center;border-top:1px solid var(--border);display:flex;gap:.5rem;margin-top:auto;padding:.6rem .5rem}
.m-av-circle{background:var(--blue);border-radius:50%;color:#fff;display:grid;flex-shrink:0;font-size:.62rem;font-weight:700;height:26px;place-items:center;width:26px}
.m-av-info{font-size:.64rem;font-weight:500;line-height:1.4;color:var(--slate)}
.m-av-info small{color:var(--green);display:block;font-size:.54rem;font-weight:600}
.m-content{background:#F8FAFC;padding:1.3rem}
.m-header{align-items:flex-start;display:flex;justify-content:space-between;margin-bottom:.9rem}
.m-role-label{color:var(--blue);font-size:.58rem;font-weight:700;letter-spacing:.1em;margin-bottom:.12rem;text-transform:uppercase}
.m-title{color:var(--slate);font-size:.9rem;font-weight:700}
.m-title span{color:var(--blue)}
.m-subtitle{color:var(--slate-soft);font-size:.6rem;margin-top:.1rem}
.m-date{color:var(--slate-soft);font-size:.6rem;line-height:1.5;text-align:right}
.m-cards{display:grid;gap:.5rem;grid-template-columns:repeat(4,1fr);margin-bottom:.7rem}
.m-card{background:var(--white);border:1.5px solid var(--border);border-radius:10px;padding:.7rem}
.m-card-ico{border-radius:6px;height:20px;margin-bottom:.35rem;width:20px;background:var(--blue-mid)}
.m-card-ico.red{background:#FEE2E2}
.m-card-label{color:var(--slate-soft);font-size:.54rem;font-weight:500;letter-spacing:.04em;text-transform:uppercase}
.m-card-num{color:var(--slate);font-size:1.05rem;font-weight:700;margin:.15rem 0}
.m-card-sub{color:var(--green);font-size:.5rem;font-weight:600}
.m-card-sub.grey{color:var(--slate-soft)}
.m-card-sub.alert{color:#EF4444}
.m-bottom{display:grid;gap:.6rem;grid-template-columns:1fr 1fr}
.m-panel{background:var(--white);border:1.5px solid var(--border);border-radius:10px;padding:.75rem}
.m-panel-title{color:var(--slate);font-size:.66rem;font-weight:600;margin-bottom:.35rem}
.m-panel-empty{color:var(--slate-soft);font-size:.6rem;padding:.3rem 0}
.m-action-card{background:var(--blue-light);border:1.5px solid var(--blue-mid);border-radius:10px;padding:.75rem}
.m-action-title{color:var(--blue-dark);font-size:.66rem;font-weight:700;margin-bottom:.2rem}
.m-action-desc{color:var(--slate-mid);font-size:.58rem;line-height:1.55}
.m-action-btn{background:var(--blue);border-radius:5px;color:#fff;display:inline-block;font-size:.56rem;font-weight:600;margin-top:.45rem;padding:.22rem .6rem}

/* ── Charts Section ── */
.charts-section{background:var(--white);padding:6rem 5%}
.charts-inner{margin:0 auto;max-width:1100px}
.charts-label{margin-bottom:3rem}
.charts-grid{display:grid;gap:1.4rem;grid-template-columns:1.5fr 1fr 1fr}
.chart-card{background:var(--bg);border:1.5px solid var(--border);border-radius:var(--radius);padding:1.5rem}
.chart-card-title{color:var(--slate);font-size:.82rem;font-weight:700;margin-bottom:.25rem}
.chart-card-sub{color:var(--slate-soft);font-size:.7rem;margin-bottom:1.1rem}
.chart-bar-wrap{align-items:flex-end;display:flex;gap:.55rem;height:120px;padding-bottom:0}
.chart-bar-col{align-items:center;display:flex;flex-direction:column;flex:1;gap:.3rem;height:100%}
.chart-bar-track{background:var(--border);border-radius:4px;flex:1;overflow:hidden;position:relative;width:100%}
.chart-bar-fill{border-radius:4px;bottom:0;left:0;position:absolute;right:0;transition:height 1s cubic-bezier(.34,1.56,.64,1)}
.chart-bar-label{color:var(--slate-soft);font-size:.58rem;font-weight:600;text-align:center}
.chart-bar-val{color:var(--slate);font-size:.6rem;font-weight:700}
/* Donut */
.donut-wrap{display:flex;align-items:center;gap:1.2rem}
.donut-svg{flex-shrink:0}
.donut-circle-bg{fill:none;stroke:#E2E8F0;stroke-width:10}
.donut-circle-fill{fill:none;stroke-width:10;stroke-linecap:round;transition:stroke-dasharray 1.2s ease}
.donut-center-text{font-size:.9rem;font-weight:800;fill:#0F172A;text-anchor:middle;dominant-baseline:middle}
.donut-center-sub{font-size:.38rem;fill:#64748B;text-anchor:middle;dominant-baseline:middle}
.donut-legend{display:flex;flex-direction:column;gap:.5rem;flex:1}
.donut-leg-item{align-items:center;display:flex;gap:.45rem;font-size:.68rem;color:var(--slate-mid);font-weight:500}
.donut-leg-dot{border-radius:50%;flex-shrink:0;height:8px;width:8px}
.donut-leg-pct{color:var(--slate-soft);font-size:.62rem;margin-left:auto}
/* Sparkline */
.spark-wrap{position:relative}
.spark-svg{width:100%;overflow:visible}
.spark-area{opacity:.15}
.spark-line{fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.spark-labels{display:flex;justify-content:space-between;margin-top:.4rem}
.spark-label{color:var(--slate-soft);font-size:.6rem}
.spark-highlight{align-items:center;background:var(--blue);border-radius:6px;color:#fff;display:inline-flex;font-size:.68rem;font-weight:700;gap:.3rem;margin-bottom:.7rem;padding:.25rem .65rem}
@keyframes bar-grow{from{height:0}to{height:var(--h)}}
@media(max-width:900px){.charts-grid{grid-template-columns:1fr 1fr}}
@media(max-width:600px){.charts-grid{grid-template-columns:1fr}}

/* ── Features ── */
.features-section{background:var(--white);padding:6rem 5%}
.features-inner{margin:0 auto;max-width:1100px}
.features-label{margin-bottom:3rem}
.features-grid{display:grid;gap:1.2rem;grid-template-columns:repeat(3,1fr)}
.feat-card{background:var(--bg);border:1.5px solid var(--border);border-radius:var(--radius);padding:1.8rem;position:relative;transition:border-color .22s,box-shadow .22s,transform .22s;overflow:hidden}
.feat-card:hover{border-color:var(--blue);box-shadow:var(--shadow-md);transform:translateY(-3px)}
.feat-card-accent{bottom:0;height:3px;left:0;position:absolute;right:0;border-radius:0 0 var(--radius) var(--radius);opacity:0;transition:opacity .22s}
.feat-card:hover .feat-card-accent{opacity:1}
.feat-icon{border-radius:12px;display:grid;font-size:1.4rem;height:48px;margin-bottom:1.1rem;place-items:center;width:48px}
.feat-num{color:var(--border);font-size:2.2rem;font-weight:800;line-height:1;margin-bottom:.5rem}
.feat-title{color:var(--slate);font-size:1rem;font-weight:700;margin-bottom:.5rem}
.feat-desc{color:var(--slate-soft);font-size:.875rem;line-height:1.7}

/* ── Roles ── */
.roles-section{background:var(--bg);padding:6rem 5%}
.roles-inner{margin:0 auto;max-width:1100px}
.roles-tabs{display:flex;flex-wrap:wrap;gap:.7rem;margin:2.5rem 0}
.role-tab{align-items:center;background:var(--white);border:1.5px solid var(--border);border-radius:50px;color:var(--slate-soft);cursor:pointer;display:flex;font-family:'Plus Jakarta Sans',sans-serif;font-size:.9rem;font-weight:600;gap:.5rem;padding:.55rem 1.3rem;transition:all .22s}
.role-tab:hover{border-color:var(--blue);color:var(--blue)}
.role-tab.active{background:var(--blue-light);border-color:var(--blue);color:var(--blue)}
.role-tab-emoji{font-size:1.05rem}
.role-panel{background:var(--white);border:1.5px solid var(--border);border-top:3px solid var(--col,var(--blue));border-radius:var(--radius-lg);display:grid;gap:3rem;grid-template-columns:1fr 1fr;padding:2.8rem}
.role-big-emoji{display:block;font-size:3rem;margin-bottom:.8rem}
.role-tag-badge{border-radius:50px;display:inline-block;font-size:.72rem;font-weight:700;letter-spacing:.06em;margin-bottom:.9rem;padding:.28rem .85rem;text-transform:uppercase}
.role-panel-name{color:var(--slate);font-size:1.5rem;font-weight:800;margin-bottom:.6rem}
.role-panel-desc{color:var(--slate-soft);font-size:.9rem;line-height:1.75}
.role-perks-title{color:var(--slate-soft);font-size:.72rem;font-weight:600;letter-spacing:.09em;margin-bottom:1rem;text-transform:uppercase}
.role-perk{align-items:center;border-bottom:1px solid var(--border);color:var(--slate-mid);display:flex;font-size:.9rem;font-weight:500;gap:.7rem;padding:.75rem 0}
.role-perk:last-child{border-bottom:none}
.perk-check{flex-shrink:0;font-size:.95rem}

/* ── CTA ── */
.cta-section{display:flex;justify-content:center;padding:5rem 5%;background:var(--white)}
.cta-box{background:linear-gradient(135deg,var(--blue) 0%,#1E40AF 60%,#1D4ED8 100%);border-radius:var(--radius-lg);box-shadow:0 30px 80px rgba(37,99,235,.3);max-width:860px;overflow:hidden;padding:5rem;position:relative;text-align:center;width:100%}
.cta-orb{border-radius:50%;pointer-events:none;position:absolute}
.cta-orb1{background:rgba(255,255,255,.06);height:460px;right:-12%;top:-35%;width:460px}
.cta-orb2{background:rgba(255,255,255,.04);bottom:-30%;height:320px;left:-6%;width:320px}
.cta-inner{position:relative;z-index:1}
.cta-eyebrow{color:rgba(255,255,255,.7);font-size:.75rem;font-weight:600;letter-spacing:.14em;margin-bottom:.5rem;text-transform:uppercase}
.cta-h2{color:#fff;font-size:clamp(1.8rem,3.2vw,2.6rem);font-weight:800;letter-spacing:-.03em;line-height:1.15;margin:0 0 1rem}
.cta-sub{color:rgba(255,255,255,.8);font-size:.95rem;line-height:1.75;margin:0 auto 2.4rem;max-width:480px}
.cta-actions{display:flex;flex-wrap:wrap;gap:1rem;justify-content:center}
.cta-btn{background:#fff;border-radius:50px;color:var(--blue);display:inline-block;font-size:.98rem;font-weight:700;padding:.85rem 2.2rem;text-decoration:none;transition:transform .15s,box-shadow .2s}
.cta-btn:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,0,0,.15)}
.cta-ghost{border:1.5px solid rgba(255,255,255,.4);border-radius:50px;color:rgba(255,255,255,.9);display:inline-block;font-size:.98rem;font-weight:500;padding:.85rem 2rem;text-decoration:none;transition:border-color .2s}
.cta-ghost:hover{border-color:#fff}

/* ── Footer ── */
.footer{background:var(--white);border-top:1px solid var(--border);padding:2rem 5%}
.footer-inner{align-items:center;display:flex;flex-wrap:wrap;gap:1rem;justify-content:space-between;margin:0 auto;max-width:1200px}
.footer-brand{align-items:center;display:flex;gap:.65rem}
.footer-name{font-size:.9rem;font-weight:700;color:var(--slate)}
.footer-name span{color:var(--blue)}
.footer-tagline{color:var(--slate-soft);font-size:.72rem}
.footer-copy{color:var(--slate-soft);font-size:.78rem}
.footer-links{display:flex;gap:1.5rem}
.footer-links a{color:var(--slate-soft);font-size:.78rem;font-weight:500;text-decoration:none;transition:color .2s}
.footer-links a:hover{color:var(--blue)}

/* ── Scroll reveal hint ── */
.hero-scroll-hint{align-items:center;bottom:2.5rem;color:var(--slate-soft);display:flex;flex-direction:column;font-size:.68rem;font-weight:500;gap:.4rem;left:50%;letter-spacing:.1em;position:absolute;transform:translateX(-50%);z-index:1;text-transform:uppercase}
.scroll-line{background:linear-gradient(to bottom,transparent,var(--blue));height:32px;width:1.5px;border-radius:1px}

/* ── Responsive ── */
@media(max-width:900px){
  .nav-links{display:none}
  .screen-inner{grid-template-columns:160px 1fr}
  .m-cards{grid-template-columns:1fr 1fr}
  .features-grid{grid-template-columns:1fr 1fr}
  .role-panel{gap:2rem;grid-template-columns:1fr}
}
@media(max-width:600px){
  .m-sidebar{display:none}
  .screen-inner{grid-template-columns:1fr}
  .features-grid{grid-template-columns:1fr 1fr}
  .feat-card{padding:1rem .85rem}
  .feat-num{font-size:1.3rem;margin-bottom:.3rem}
  .feat-icon{height:34px;width:34px;font-size:1rem;border-radius:8px;margin-bottom:.55rem}
  .feat-title{font-size:.8rem;margin-bottom:.35rem}
  .feat-desc{font-size:.7rem;line-height:1.55}
  .stats-row{flex-direction:row;flex-wrap:nowrap}
  .stat-item{border-right:1px solid var(--border);border-bottom:none;flex:1 1 0;min-width:0;padding:1.2rem .5rem}
  .stat-item:last-child{border-right:none}
  .stat-num{font-size:1.6rem}
  .stat-label{font-size:.65rem}
  .cta-box{padding:3rem 1.5rem}
  .hero-stats{gap:1.5rem}
}
`;

// ─────────────────────────────────────────
// Animated Counter
// ─────────────────────────────────────────
export const Counter: React.FC<{ to: number; suffix?: string }> = ({ to, suffix = "" }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(0);
  const animated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !animated.current) {
        animated.current = true;
        let v = 0;
        const tick = () => {
          v += 0.09 * (to - v) + 0.3;
          setCount(Math.min(Math.floor(v), to));
          if (v < to) requestAnimationFrame(tick);
        };
        tick();
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to]);

  return <span ref={ref}>{count}{suffix}</span>;
};

// ─────────────────────────────────────────
// Marquee
// ─────────────────────────────────────────
export const Marquee: React.FC = () => {
  const items = ["Admissions", "Student Records", "Academics & Timetable", "Attendance", "Exams & Results", "Fees & Payments", "Communication", "NAAC Compliance", "Library", "Placements"];
  return (
    <div className="marquee-wrap">
      <div className="marquee-track">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="marquee-item">
            <span className="marquee-dot">✦</span> {item}
          </span>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Navbar
// ─────────────────────────────────────────
export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler);

    // Theme sync
    const storedTheme = localStorage.getItem("portal_theme");
    const initialTheme = storedTheme === "dark" ? "dark" : "light";
    setTheme(initialTheme);
    document.documentElement.classList.toggle("theme-dark", initialTheme === "dark");

    return () => window.removeEventListener("scroll", handler);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("portal_theme", nextTheme);
    document.documentElement.classList.toggle("theme-dark", nextTheme === "dark");
  };

  return (
    <motion.nav className={`nav${scrolled ? " nav-scrolled" : ""}`}
      initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
      <div className="nav-logo">
        <div className="nav-logo-icon">✦</div>
        <div>
          <div className="nav-logo-text">NgCMS <span>ERP</span></div>
          <div className="nav-logo-sub">by Avani Enterprises</div>
        </div>
      </div>
      <ul className="nav-links">
        {["Features", "Analytics", "Roles", "About"].map(item => (
          <li key={item}><a href={`#${item.toLowerCase()}`}>{item}</a></li>
        ))}
      </ul>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <motion.a href="/login" className="nav-cta"
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
          Sign In →
        </motion.a>
      </div>
    </motion.nav>
  );
};

// ─────────────────────────────────────────
// Hero Section
// ─────────────────────────────────────────
export const HeroSection: React.FC = () => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, 120]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);

  return (
    <section className="hero">
      <div className="hero-blob hero-blob-1" />
      <div className="hero-blob hero-blob-2" />
      <motion.div className="hero-content" style={{ y, opacity }}>
        <motion.div className="hero-badge"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}>
          <span className="badge-dot" /> Admissions to Placements · End-to-End ERP
        </motion.div>
        <motion.h1 className="hero-h1"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}>
          The <span className="accent">Intelligent</span> Campus{" "}
          <span className="serif">Operating System</span>
        </motion.h1>
        <motion.p className="hero-sub"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}>
          NgCMS ERP streamlines every administrative, academic, and operational workflow — from the first student enquiry to final placement — for modern higher education institutions.
        </motion.p>
        <motion.div className="hero-actions"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}>
          <motion.a href="/login" className="btn-primary" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            Get Started <span>→</span>
          </motion.a>
          <motion.a href="#features" className="btn-ghost" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            Explore Features
          </motion.a>
        </motion.div>
      </motion.div>
    </section>
  );
};

// ─────────────────────────────────────────
// Stats Bar
// ─────────────────────────────────────────
export const StatsBar: React.FC = () => (
  <div>
    <Marquee />
    <div className="stats-row">
      {[
        { to: 4, suffix: "", label: "Role Portals" },
        { to: 10, suffix: "+", label: "Core Modules" },
        { to: 99, suffix: "%", label: "Uptime SLA" },
        { to: 100, suffix: "%", label: "NAAC Ready" },
      ].map((s, i) => (
        <motion.div key={i} className="stat-item"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ delay: 0.1 * i, duration: 0.5 }}>
          <div className="stat-num"><Counter to={s.to} suffix={s.suffix} /></div>
          <div className="stat-label">{s.label}</div>
        </motion.div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────
// Mockup Section
// ─────────────────────────────────────────
export const MockupSection: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const rotateX = useTransform(scrollYProgress, [0, 0.4, 1], [10, 0, -4]);
  const scale = useTransform(scrollYProgress, [0, 0.25], [0.92, 1]);

  const cards = [
    { label: "Total Students", num: "60", sub: "↑ Active Roll", cls: "" },
    { label: "Pending Admissions", num: "4", sub: "Awaiting Approval", cls: "grey" },
    { label: "Shortage Alerts", num: "3", sub: "Below 75%", cls: "alert" },
    { label: "Fee Defaulters", num: "2", sub: "Overdue This Month", cls: "grey" },
  ];

  return (
    <div ref={ref} className="mockup-section">
      <div className="mockup-inner">
        <div className="mockup-label">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="section-tag">Live Preview</div>
            <h2 className="section-title">See it in <span className="accent">action</span></h2>
          </motion.div>
        </div>
        <motion.div className="mockup-wrapper" style={{ y, rotateX, scale, transformPerspective: 1400 }}>
        <div className="screen-wrap">
          <div className="screen-bar">
            <div className="screen-dot d1" /><div className="screen-dot d2" /><div className="screen-dot d3" />
            <div className="screen-url">ngcms.xaviers.edu/dashboard</div>
          </div>
          <div className="screen-inner">
            {/* Sidebar */}
            <div className="m-sidebar">
              <div className="m-brand">NgCMS ERP<small>AI POWERED ERP</small></div>
              {["Dashboard", "Students", "Admissions"].map(item => (
                <div key={item} className={`m-item${item === "Dashboard" ? " active" : ""}`}>
                  <div className="m-item-icon" />{item}
                </div>
              ))}
              <div className="m-section">ACADEMIC HUB</div>
              {["Academics", "Attendance", "Exams", "Fees"].map(item => (
                <div key={item} className="m-item"><div className="m-item-icon" />{item}</div>
              ))}
              <div className="m-section">CAMPUS</div>
              {["Library", "Placements", "NAAC"].map(item => (
                <div key={item} className="m-item"><div className="m-item-icon" />{item}</div>
              ))}
              <div className="m-avatar">
                <div className="m-av-circle">P</div>
                <div className="m-av-info">Prof. Alan Turing<small>Teacher ●</small></div>
              </div>
            </div>
            {/* Content */}
            <div className="m-content">
              <div className="m-header">
                <div>
                  <div className="m-role-label">TEACHER</div>
                  <div className="m-title">PORTAL <span>OVERVIEW</span></div>
                  <div className="m-subtitle">Spring Semester 2024</div>
                </div>
                <div className="m-date">MONDAY<br />APRIL 6, 2026</div>
              </div>
              <div className="m-cards">
                {cards.map((c, i) => (
                  <motion.div key={i} className="m-card"
                    initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ delay: 0.3 + 0.08 * i }}>
                    <div className={`m-card-ico${c.cls === "alert" ? " red" : ""}`} />
                    <div className="m-card-label">{c.label}</div>
                    <div className="m-card-num">{c.num}</div>
                    <div className={`m-card-sub ${c.cls}`}>{c.sub}</div>
                  </motion.div>
                ))}
              </div>
              <div className="m-bottom">
                <div className="m-panel">
                  <div className="m-panel-title">Immediate Schedule</div>
                  <div className="m-panel-empty">No classes for remainder of today.</div>
                </div>
                <div className="m-action-card">
                  <div className="m-action-title">Publish Results</div>
                  <div className="m-action-desc">Admin reviewed Mark Records for Spring Internal. Ready for portal publishing?</div>
                  <div className="m-action-btn">VERIFY INTERNAL 01</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Attendance Bar Chart
// ─────────────────────────────────────────
const AttendanceBar: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const data = [
    { label: "Jan", val: 88, color: "#2563EB" },
    { label: "Feb", val: 76, color: "#2563EB" },
    { label: "Mar", val: 92, color: "#2563EB" },
    { label: "Apr", val: 85, color: "#2563EB" },
    { label: "May", val: 79, color: "#2563EB" },
    { label: "Jun", val: 95, color: "#16A34A" },
    { label: "Jul", val: 70, color: "#D97706" },
  ];

  return (
    <div className="chart-card" ref={ref} style={{ gridColumn: "span 1" }}>
      <div className="chart-card-title">Monthly Attendance Rate</div>
      <div className="chart-card-sub">Average across all students (%)</div>
      <div className="chart-bar-wrap">
        {data.map((d) => (
          <div key={d.label} className="chart-bar-col">
            <div className="chart-bar-val">{visible ? d.val : 0}%</div>
            <div className="chart-bar-track">
              <div
                className="chart-bar-fill"
                style={{
                  height: visible ? `${d.val}%` : "0%",
                  background: d.color,
                  transition: "height 0.9s cubic-bezier(.34,1.2,.64,1)",
                }}
              />
            </div>
            <div className="chart-bar-label">{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Module Usage Donut
// ─────────────────────────────────────────
const ModuleDonut: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const r = 36, cx = 48, cy = 48, circ = 2 * Math.PI * r;
  const segments = [
    { label: "Attendance", pct: 34, color: "#2563EB" },
    { label: "Exams", pct: 26, color: "#7C3AED" },
    { label: "Library", pct: 18, color: "#0EA5E9" },
    { label: "Placement", pct: 22, color: "#16A34A" },
  ];
  let offset = 0;

  return (
    <div className="chart-card" ref={ref}>
      <div className="chart-card-title">Module Usage</div>
      <div className="chart-card-sub">Active sessions by module</div>
      <div className="donut-wrap">
        <svg className="donut-svg" width="96" height="96" viewBox="0 0 96 96">
          <circle className="donut-circle-bg" cx={cx} cy={cy} r={r} />
          {segments.map((s) => {
            const dash = visible ? (s.pct / 100) * circ : 0;
            const gap = circ - dash;
            const el = (
              <circle
                key={s.label}
                className="donut-circle-fill"
                cx={cx} cy={cy} r={r}
                stroke={s.color}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-offset}
                style={{ transition: "stroke-dasharray 1.1s ease, stroke-dashoffset 1.1s ease" }}
              />
            );
            offset += (s.pct / 100) * circ;
            return el;
          })}
          <text className="donut-center-text" x={cx} y={cy - 5}>100%</text>
          <text className="donut-center-sub" x={cx} y={cx + 9} style={{ fontSize: "7px", fill: "#64748B", textAnchor: "middle" }}>coverage</text>
        </svg>
        <div className="donut-legend">
          {segments.map((s) => (
            <div key={s.label} className="donut-leg-item">
              <span className="donut-leg-dot" style={{ background: s.color }} />
              {s.label}
              <span className="donut-leg-pct">{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Results Trend Sparkline
// ─────────────────────────────────────────
const ResultsTrend: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const pts = [58, 65, 61, 72, 69, 78, 82, 79, 88];
  const W = 200, H = 90, pad = 8;
  const minV = Math.min(...pts), maxV = Math.max(...pts);
  const toX = (i: number) => pad + (i / (pts.length - 1)) * (W - 2 * pad);
  const toY = (v: number) => H - pad - ((v - minV) / (maxV - minV + 1)) * (H - 2 * pad);
  const polyline = pts.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const area = `${toX(0)},${H} ` + polyline + ` ${toX(pts.length - 1)},${H}`;
  const totalLen = 350;

  return (
    <div className="chart-card" ref={ref}>
      <div className="chart-card-title">Exam Pass Rate</div>
      <div className="chart-card-sub">Semester trend (%)</div>
      <div className="spark-highlight">↑ +30pp this year</div>
      <div className="spark-wrap">
        <svg className="spark-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" height={H}>
          <defs>
            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon className="spark-area" points={area} fill="url(#sparkGrad)" />
          <polyline
            className="spark-line"
            points={polyline}
            stroke="#2563EB"
            strokeDasharray={totalLen}
            strokeDashoffset={visible ? 0 : totalLen}
            style={{ transition: "stroke-dashoffset 1.4s ease" }}
          />
          {pts.map((v, i) => (
            <circle key={i} cx={toX(i)} cy={toY(v)} r="3" fill="#2563EB"
              opacity={visible ? 1 : 0}
              style={{ transition: `opacity 0.3s ease ${0.1 * i + 1}s` }} />
          ))}
        </svg>
        <div className="spark-labels">
          {["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9"].map(l => (
            <span key={l} className="spark-label">{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Charts Section
// ─────────────────────────────────────────
export const ChartsSection: React.FC = () => (
  <section className="charts-section" id="analytics">
    <div className="charts-inner">
      <motion.div className="charts-label"
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }} transition={{ duration: 0.6 }}>
        <div className="section-tag">Analytics</div>
        <h2 className="section-title">Data-driven insights, <span className="accent">at a glance</span></h2>
      </motion.div>
      <div className="charts-grid">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.5, delay: 0 }}>
          <AttendanceBar />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}>
          <ModuleDonut />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}>
          <ResultsTrend />
        </motion.div>
      </div>
    </div>
  </section>
);

// ─────────────────────────────────────────
// Features Section (grid, no GSAP)
// ─────────────────────────────────────────
export const FeaturesSection: React.FC = () => {
  const features = [
    { icon: "🏫", title: "Admissions Management", desc: "Capture enquiries, manage customizable application forms with Cloudinary document uploads, and automate seat & batch allocation workflows.", color: "#2563EB" },
    { icon: "🎒", title: "Student Information System", desc: "Centralized profiles with unique IDs, parent linking, document storage, and bulk CSV imports. Full lifecycle tracking with advanced search & filters.", color: "#7C3AED" },
    { icon: "🗓️", title: "Academics & Timetable", desc: "Configure courses, subjects, and batch systems. Schedule faculty with built-in conflict detection — zero overlapping sessions guaranteed.", color: "#0EA5E9" },
    { icon: "📋", title: "Attendance Management", desc: "Daily subject-wise attendance with automatic percentage calculation, shortage alerts below 75%, leave request processing, and monthly reports.", color: "#16A34A" },
    { icon: "📝", title: "Exams & Results", desc: "Configure internal/external exams, generate hall tickets, enter marks, auto-calculate grades, track backlogs, and publish official transcripts.", color: "#D97706" },
    { icon: "💰", title: "Fees & Payments", desc: "Course-wise fee structures, payment processing with Razorpay integration, receipt generation, financial reports, and automated fine calculation for defaulters.", color: "#EC4899" },
    { icon: "💬", title: "Communication System", desc: "System-wide announcements, event alerts, in-app notifications, and direct messaging — keeping admins, faculty, students, and parents fully connected.", color: "#F97316" },
    { icon: "🏛️", title: "NAAC & Compliance", desc: "Multi-year repositories for student data, faculty qualifications, course outcomes, and attendance. Export compliance reports as Excel or PDF for audits.", color: "#8B5CF6" },
    { icon: "📖", title: "Library Management", desc: "Digitize book inventory with ISBN/metadata, manage issue & return workflows, track fines, and generate category-wise distribution reports for NAAC.", color: "#0D9488" },
    { icon: "🤝", title: "Training & Placements", desc: "Onboard corporate partners, manage recruitment drives, coordinate interviews, track placed vs. unplaced students, and export placement analytics for NAAC.", color: "#BE185D" },
  ];

  return (
    <section className="features-section" id="features">
      <div className="features-inner">
        <motion.div className="features-label"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <div className="section-tag">10 Core Modules</div>
          <h2 className="section-title">Everything your <span className="accent">campus needs</span></h2>
        </motion.div>
        <div className="features-grid">
          {features.map((f, i) => (
            <motion.div key={i} className="feat-card"
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: 0.06 * i, duration: 0.5 }}>
              <div className="feat-num">{String(i + 1).padStart(2, '0')}</div>
              <div className="feat-icon" style={{ background: f.color + "18" }}>{f.icon}</div>
              <h3 className="feat-title">{f.title}</h3>
              <p className="feat-desc">{f.desc}</p>
              <div className="feat-card-accent" style={{ background: f.color }} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────
// Roles Section
// ─────────────────────────────────────────
export const RolesSection: React.FC = () => {
  const [active, setActive] = useState(0);
  const roles = [
    { emoji: "🏛️", name: "Administrator", tag: "Full Access", color: "#2563EB", desc: "Complete institutional control — manage admissions, approve results, configure fee structures, oversee NAAC compliance, and monitor the entire campus ecosystem from a unified dashboard.", perks: ["Admissions & Seat Allocation", "Result Approval Workflow", "Fee & Defaulter Management", "NAAC Compliance Exports", "Full Module Configuration"] },
    { emoji: "👨‍🏫", name: "Teacher", tag: "Academic Access", color: "#7C3AED", desc: "Your classroom, digitized. Mark subject-wise attendance, enter exam marks, grade assignments, upload study materials, and publish verified results — all from one portal.", perks: ["Subject-wise Attendance Marking", "Marks Entry & Grade Calculation", "Material & Syllabus Uploads", "Hall Ticket Generation", "Timetable & Schedule View"] },
    { emoji: "🎒", name: "Student", tag: "Student Portal", color: "#0EA5E9", desc: "Everything you need, in one place. Monitor your attendance, download study materials, check results, request library books, and apply to placement drives directly.", perks: ["Attendance & Shortage Alerts", "Results & Transcript Access", "Library Book Requests", "Placement Drive Applications", "Fee Receipts & History"] },
    { emoji: "👨‍👩‍👧", name: "Parent", tag: "Guardian View", color: "#16A34A", desc: "Stay connected with your child's academic journey. Receive real-time shortage notifications, monitor results, and track fee status — without a single office visit.", perks: ["Real-time Attendance Monitoring", "Result & Grade Viewing", "Shortage Alerts (< 75%)", "Fee Payment Status", "Direct Communication Channel"] },
    { emoji: "📚", name: "Librarian", tag: "Library Access", color: "#0D9488", desc: "Manage the entire library digitally. Add and catalog books with full metadata, approve student issue requests, track returns and overdue items, collect fines, and generate NAAC-ready usage reports.", perks: ["Book Inventory Management", "Issue & Return Approval", "Overdue & Fine Tracking", "Category & Search Management", "NAAC Usage Reports Export"] },
  ];

  return (
    <section className="roles-section" id="roles">
      <div className="roles-inner">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <div className="section-tag">Access Control</div>
          <h2 className="section-title">One platform, <span className="accent">every role</span></h2>
        </motion.div>
        <div className="roles-tabs">
          {roles.map((r, i) => (
            <motion.button key={i} className={`role-tab${active === i ? " active" : ""}`}
              onClick={() => setActive(i)}
              style={{ "--col": r.color } as React.CSSProperties}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <span className="role-tab-emoji">{r.emoji}</span>
              <span>{r.name}</span>
            </motion.button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={active} className="role-panel"
            style={{ "--col": roles[active].color } as React.CSSProperties}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
            <div>
              <motion.div className="role-big-emoji"
                animate={{ rotate: [0, 6, -6, 0] }} transition={{ duration: 0.45 }}>
                {roles[active].emoji}
              </motion.div>
              <div className="role-tag-badge"
                style={{ color: roles[active].color, background: roles[active].color + "15", border: `1.5px solid ${roles[active].color}33` }}>
                {roles[active].tag}
              </div>
              <h3 className="role-panel-name">{roles[active].name}</h3>
              <p className="role-panel-desc">{roles[active].desc}</p>
            </div>
            <div>
              <div className="role-perks-title">Capabilities</div>
              {roles[active].perks.map((perk, i) => (
                <motion.div key={perk} className="role-perk"
                  initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 * i, duration: 0.3 }}>
                  <span className="perk-check" style={{ color: roles[active].color }}>✓</span>
                  {perk}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────
// CTA Section
// ─────────────────────────────────────────
export const CTASection: React.FC = () => (
  <section className="cta-section" id="login">
    <motion.div className="cta-box"
      initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
      <div className="cta-orb cta-orb1" />
      <div className="cta-orb cta-orb2" />
      <div className="cta-inner">
        <div className="cta-eyebrow">Ready to get started?</div>
        <h2 className="cta-h2">Digitize your campus.<br />Unify your institution.</h2>
        <p className="cta-sub">Join faculty, students, and staff on NgCMS ERP — the secure, AI-powered platform built for modern education.</p>
        <div className="cta-actions">
          <motion.a href="/login" className="cta-btn"
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            Get Started →
          </motion.a>
          <a href="#" className="cta-ghost">Request a Demo</a>
        </div>
      </div>
    </motion.div>
  </section>
);

// ─────────────────────────────────────────
// Footer
// ─────────────────────────────────────────
export const Footer: React.FC = () => (
  <footer className="footer">
    <div className="footer-inner">
      <div className="footer-brand">
        <div className="nav-logo-icon" style={{ width: 28, height: 28, fontSize: ".85rem" }}>✦</div>
        <div>
          <div className="footer-name">NgCMS <span>ERP</span></div>
          <div className="footer-tagline">by Avani Enterprises</div>
        </div>
      </div>
      <div className="footer-copy">© 2026 NgCMS ERP. All rights reserved.</div>
      <div className="footer-links">
        {["Privacy", "Terms", "Support"].map(l => <a key={l} href="#">{l}</a>)}
      </div>
    </div>
  </footer>
);

// ─────────────────────────────────────────
// Style Injector
// ─────────────────────────────────────────
export const NgCMSStyles: React.FC = () => (
  <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
);

// ─────────────────────────────────────────
// Root App Component
// ─────────────────────────────────────────
const NgCMSLandingPage: React.FC = () => (
  <>
    <NgCMSStyles />
    <Navbar />
    <HeroSection />
    <StatsBar />
    <MockupSection />
    <ChartsSection />
    <FeaturesSection />
    <RolesSection />
    <CTASection />
    <Footer />
  </>
);

export default NgCMSLandingPage;
