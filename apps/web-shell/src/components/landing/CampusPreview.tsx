"use client";

import React from "react";

const CARDS = [
  { label: "Total Students", num: "60", sub: "↑ Active Roll", cls: "" },
  { label: "Pending Admissions", num: "4", sub: "Awaiting Approval", cls: "grey" },
  { label: "Shortage Alerts", num: "3", sub: "Below 75%", cls: "alert" },
  { label: "Fee Defaulters", num: "2", sub: "Overdue This Month", cls: "grey" },
];

const FEED = [
  { c: "#2563EB", t: "Internal 01 marks", s: "uploaded for CSE-A" },
  { c: "#16A34A", t: "12 fee receipts", s: "reconciled today" },
  { c: "#D97706", t: "Hostel gate pass", s: "awaiting approval" },
  { c: "#7C6AF5", t: "NAAC criterion 3", s: "evidence added" },
];

/**
 * The product preview shown inside the hero: browser chrome around a live-looking
 * teacher portal. Presentational only — the `screen-*` / `m-*` styles live in the
 * landing page's global stylesheet.
 */
export default function CampusPreview() {
  return (
    <div className="screen-wrap">
      <div className="screen-bar">
        <div className="screen-dot d1" />
        <div className="screen-dot d2" />
        <div className="screen-dot d3" />
        <div className="screen-url">ngcms.xaviers.edu/dashboard</div>
      </div>

      <div className="screen-inner">
        <div className="m-sidebar">
          <div className="m-brand">
            NgCMS ERP<small>AI POWERED ERP</small>
          </div>
          {["Dashboard", "Students", "Admissions"].map((item) => (
            <div key={item} className={`m-item${item === "Dashboard" ? " active" : ""}`}>
              <div className="m-item-icon" />
              {item}
            </div>
          ))}
          <div className="m-section">ACADEMIC HUB</div>
          {["Academics", "Attendance", "Exams", "Fees"].map((item) => (
            <div key={item} className="m-item">
              <div className="m-item-icon" />
              {item}
            </div>
          ))}
          <div className="m-section">CAMPUS</div>
          {["Library", "Placements", "NAAC"].map((item) => (
            <div key={item} className="m-item">
              <div className="m-item-icon" />
              {item}
            </div>
          ))}
          <div className="m-avatar">
            <div className="m-av-circle">P</div>
            <div className="m-av-info">
              Prof. Alan Turing<small>Teacher ●</small>
            </div>
          </div>
        </div>

        <div className="m-content">
          <div className="m-header">
            <div>
              <div className="m-role-label">TEACHER</div>
              <div className="m-title">
                PORTAL <span>OVERVIEW</span>
              </div>
              <div className="m-subtitle">Spring Semester 2024</div>
            </div>
            <div className="m-date">
              MONDAY
              <br />
              APRIL 6, 2026
            </div>
          </div>

          <div className="m-cards">
            {CARDS.map((c) => (
              <div key={c.label} className="m-card">
                <div className={`m-card-ico${c.cls === "alert" ? " red" : ""}`} />
                <div className="m-card-label">{c.label}</div>
                <div className="m-card-num">{c.num}</div>
                <div className={`m-card-sub ${c.cls}`}>{c.sub}</div>
              </div>
            ))}
          </div>

          <div className="m-bottom">
            <div className="m-panel">
              <div className="m-panel-title">Immediate Schedule</div>
              <div className="m-panel-empty">No classes for remainder of today.</div>
            </div>
            <div className="m-action-card">
              <div className="m-action-title">Publish Results</div>
              <div className="m-action-desc">
                Admin reviewed Mark Records for Spring Internal. Ready for portal publishing?
              </div>
              <div className="m-action-btn">VERIFY INTERNAL 01</div>
            </div>
          </div>

          <div className="m-analytics">
            <div className="m-panel">
              <div className="m-chart-head">
                <div className="m-panel-title">Attendance This Week</div>
                <div className="m-chart-val">94.2%</div>
              </div>
              <svg className="m-chart-svg" viewBox="0 0 200 60" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="cpFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[15, 30, 45].map((y) => (
                  <line key={y} x1="0" x2="200" y1={y} y2={y} stroke="#E2E8F0" strokeWidth="1" />
                ))}
                <polygon
                  points="0,42 33,34 66,37 100,22 133,27 166,14 200,18 200,60 0,60"
                  fill="url(#cpFill)"
                />
                <polyline
                  points="0,42 33,34 66,37 100,22 133,27 166,14 200,18"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points="0,50 33,47 66,49 100,41 133,44 166,36 200,33"
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.75"
                />
              </svg>
            </div>

            <div className="m-panel">
              <div className="m-panel-title">Recent Activity</div>
              <div className="m-feed">
                {FEED.map((f) => (
                  <div key={f.t} className="m-feed-row">
                    <span className="m-feed-dot" style={{ background: f.c }} />
                    <span className="m-feed-txt">
                      <b>{f.t}</b> {f.s}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
