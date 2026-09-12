"use client";

import React, { useEffect, useRef } from "react";
import {
  GraduationCap,
  Users,
  CalendarDays,
  ClipboardCheck,
  FileText,
  BookOpen,
  CreditCard,
  Library,
  Home,
  Briefcase,
} from "lucide-react";

const MODULES = [
  {
    icon: GraduationCap,
    name: "Admissions",
    desc: "Enquiry capture, applications, merit lists and seat allotment in one funnel.",
    tone: "blue",
  },
  {
    icon: Users,
    name: "Student Records",
    desc: "A single verified profile per student, from enrollment through to alumni status.",
    tone: "violet",
  },
  {
    icon: CalendarDays,
    name: "Timetable",
    desc: "Clash-free scheduling across faculty, rooms, sections and lab slots.",
    tone: "cyan",
  },
  {
    icon: ClipboardCheck,
    name: "Attendance",
    desc: "Lecture-wise marking with live shortage tracking against the 75% rule.",
    tone: "green",
  },
  {
    icon: FileText,
    name: "Examinations",
    desc: "Marks entry, credit-weighted SGPA and CGPA, and QR-verified hall tickets.",
    tone: "amber",
  },
  {
    icon: BookOpen,
    name: "Learning",
    desc: "Course material, reference reading and assignment submission with grading.",
    tone: "blue",
  },
  {
    icon: CreditCard,
    name: "Finance & Fees",
    desc: "Structures, instalments, scholarships, receipts and collection analytics.",
    tone: "green",
  },
  {
    icon: Library,
    name: "Digital Library",
    desc: "Catalogue, issue and return workflows with automated overdue handling.",
    tone: "cyan",
  },
  {
    icon: Home,
    name: "Hostel",
    desc: "Block and bed allocation, mess planning and approved digital gate passes.",
    tone: "amber",
  },
  {
    icon: Briefcase,
    name: "Placements",
    desc: "Drives, eligibility matching, application tracking and offer outcomes.",
    tone: "violet",
  },
];

export default function ModulesSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      section.querySelectorAll(".mod-card").forEach((el) => el.classList.add("is-in"));
      return;
    }

    // Cards settle in as the section arrives, continuing the upward motion
    // the hero's data particles establish.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );

    section.querySelectorAll(".mod-card").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="mod-section" id="features" ref={sectionRef}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Carries the hero's glow down into this section so the seam is soft */}
      <div className="mod-bleed" aria-hidden="true" />

      <div className="mod-inner">
        <header className="mod-head">
          <div className="mod-eyebrow">
            <span className="mod-spark">✦</span> Ten Integrated Modules
          </div>
          <h2 className="mod-title">Everything your campus needs.</h2>
          <p className="mod-sub">
            One connected system replacing the spreadsheets, registers and disconnected tools that
            institutional teams work around every day.
          </p>
        </header>

        <div className="mod-grid">
          {MODULES.map((m, i) => {
            const Icon = m.icon;
            return (
              <article
                key={m.name}
                className={`mod-card mod-${m.tone}`}
                style={{ transitionDelay: `${(i % 5) * 70}ms` }}
              >
                <div className="mod-icon">
                  <Icon size={19} strokeWidth={2} />
                </div>
                <h3 className="mod-name">{m.name}</h3>
                <p className="mod-desc">{m.desc}</p>
                <span className="mod-index">{String(i + 1).padStart(2, "0")}</span>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const CSS = `
.mod-section{position:relative;z-index:2;
  background:
    radial-gradient(72% 340px at 22% 0%, rgba(255,179,71,.13) 0%, rgba(255,179,71,0) 100%),
    radial-gradient(72% 340px at 78% 0%, rgba(47,127,255,.15) 0%, rgba(47,127,255,0) 100%),
    radial-gradient(46% 250px at 50% 0%, rgba(255,255,255,.85) 0%, rgba(255,255,255,0) 100%),
    #F7F9FC;
  /* Rides up over the tail of the pinned hero so the 3D scene hands off to
     this section continuously instead of leaving a blank pinned frame. */
  margin-top:-68vh;
  padding:clamp(3.5rem,9vw,7rem) 1.5rem clamp(2rem,4vw,3.25rem);overflow:hidden}

/* Soft glow bleeding down from the hero so there is no visible seam */
.mod-bleed{position:absolute;top:0;left:50%;transform:translateX(-50%);
  width:160%;height:420px;pointer-events:none;
  background:
    radial-gradient(50% 55% at 30% 50%, rgba(255,179,71,.14) 0%, rgba(255,179,71,0) 70%),
    radial-gradient(50% 55% at 70% 50%, rgba(47,127,255,.16) 0%, rgba(47,127,255,0) 70%),
    radial-gradient(38% 45% at 50% 48%, rgba(255,255,255,.55) 0%, rgba(255,255,255,0) 70%);
  filter:blur(22px)}

.mod-inner{position:relative;z-index:1;max-width:1320px;margin:0 auto}

.mod-head{text-align:center;max-width:660px;margin:0 auto clamp(2.5rem,5vw,3.8rem)}
.mod-eyebrow{display:inline-flex;align-items:center;gap:.45rem;
  background:#fff;border:1px solid rgba(37,99,235,.16);border-radius:999px;
  padding:.38rem 1rem;font-size:.71rem;font-weight:700;color:#2563EB;
  letter-spacing:.05em;text-transform:uppercase;
  box-shadow:0 3px 14px rgba(37,99,235,.07)}
.mod-spark{color:#7C6AF5}

.mod-title{margin:1.15rem 0 0;font-size:clamp(1.85rem,4.2vw,3rem);font-weight:800;
  letter-spacing:-.035em;color:#111827;line-height:1.1}
.mod-sub{margin:1rem auto 0;color:#475467;font-size:clamp(.92rem,1.3vw,1.02rem);
  line-height:1.72;max-width:540px}

.mod-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:1rem}

.mod-card{position:relative;background:#fff;border:1px solid rgba(17,24,39,.07);
  border-radius:17px;padding:1.35rem 1.2rem 1.5rem;overflow:hidden;
  box-shadow:0 1px 3px rgba(17,24,39,.045);
  opacity:0;transform:translateY(26px);
  transition:opacity .7s cubic-bezier(.2,.7,.3,1),transform .7s cubic-bezier(.2,.7,.3,1),
             box-shadow .25s ease,border-color .25s ease}
.mod-card.is-in{opacity:1;transform:translateY(0)}
.mod-card:hover{box-shadow:0 14px 36px rgba(17,24,39,.1);border-color:rgba(17,24,39,.13)}

/* Top accent that picks up the hero palette */
.mod-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;
  opacity:.85;transition:.25s}
.mod-blue::before{background:linear-gradient(90deg,#2563EB,#60A5FA)}
.mod-violet::before{background:linear-gradient(90deg,#7C6AF5,#A78BFA)}
.mod-cyan::before{background:linear-gradient(90deg,#0891B2,#22D3EE)}
.mod-green::before{background:linear-gradient(90deg,#16A34A,#4ADE80)}
.mod-amber::before{background:linear-gradient(90deg,#D97706,#FBBF24)}

.mod-icon{width:38px;height:38px;border-radius:11px;display:flex;
  align-items:center;justify-content:center;margin-bottom:.9rem}
.mod-blue .mod-icon{background:rgba(37,99,235,.09);color:#2563EB}
.mod-violet .mod-icon{background:rgba(124,106,245,.10);color:#7C6AF5}
.mod-cyan .mod-icon{background:rgba(8,145,178,.09);color:#0891B2}
.mod-green .mod-icon{background:rgba(22,163,74,.09);color:#16A34A}
.mod-amber .mod-icon{background:rgba(217,119,6,.10);color:#D97706}

.mod-name{font-size:.97rem;font-weight:750;color:#111827;letter-spacing:-.015em;margin:0}
.mod-desc{font-size:.805rem;line-height:1.62;color:#475467;margin:.45rem 0 0}

.mod-index{position:absolute;top:1.1rem;right:1.15rem;font-size:.64rem;
  font-weight:800;letter-spacing:.1em;color:rgba(17,24,39,.13)}

@media (max-width:1180px){.mod-grid{grid-template-columns:repeat(3,1fr)}}
@media (max-width:820px){.mod-grid{grid-template-columns:repeat(2,1fr);gap:.8rem}}
@media (max-width:520px){
  .mod-grid{grid-template-columns:1fr}
  .mod-card{padding:1.15rem 1.05rem 1.25rem}
}
`;
