# -*- coding: utf-8 -*-
"""Generate a feature-documentation PDF for the NgCMS ERP project."""
from fpdf import FPDF

# ---- palette ----
NAVY = (24, 39, 75)
BLUE = (37, 99, 235)
LIGHT = (239, 244, 255)
GREY = (90, 96, 110)
DARK = (33, 37, 41)
ACCENT = (16, 185, 129)
TAG_BG = (224, 231, 255)


def s(t):
    """Sanitize text to latin-1 (core fonts only)."""
    repl = {
        "’": "'", "‘": "'", "“": '"', "”": '"',
        "–": "-", "—": "-", "…": "...", "→": "->",
        "≥": ">=", "≤": "<=", "•": "-", "×": "x",
        "✅": "", "✔": "", "₹": "Rs.",
    }
    for k, v in repl.items():
        t = t.replace(k, v)
    return t.encode("latin-1", "replace").decode("latin-1")


class PDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*GREY)
        self.cell(0, 6, "NgCMS ERP - Feature Documentation", align="L")
        self.cell(0, 6, "", align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*TAG_BG)
        self.line(self.l_margin, 18, self.w - self.r_margin, 18)
        self.ln(6)

    def footer(self):
        if self.page_no() == 1:
            return
        self.set_y(-15)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*GREY)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

    # ---- building blocks ----
    def h1(self, text):
        if self.get_y() > self.h - 60:
            self.add_page()
        self.ln(2)
        self.set_fill_color(*NAVY)
        self.set_text_color(255, 255, 255)
        self.set_font("Helvetica", "B", 15)
        self.cell(0, 11, s("  " + text), fill=True, new_x="LMARGIN", new_y="NEXT")
        self.ln(4)

    def h2(self, text):
        if self.get_y() > self.h - 45:
            self.add_page()
        self.set_text_color(*BLUE)
        self.set_font("Helvetica", "B", 12)
        self.cell(0, 8, s(text), new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*BLUE)
        self.set_line_width(0.4)
        self.line(self.l_margin, self.get_y(), self.l_margin + 40, self.get_y())
        self.ln(3)

    def para(self, text):
        self.set_text_color(*DARK)
        self.set_font("Helvetica", "", 10)
        self.multi_cell(0, 5.2, s(text))
        self.ln(1.5)

    def tag(self, label):
        self.set_font("Helvetica", "B", 8)
        w = self.get_string_width(s(label)) + 6
        if self.get_x() + w > self.w - self.r_margin:
            self.ln(6)
        self.set_fill_color(*TAG_BG)
        self.set_text_color(*NAVY)
        self.cell(w, 6, s(label), fill=True, align="C")
        self.cell(2, 6, "")

    def roles(self, label, items):
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*GREY)
        self.cell(self.get_string_width(label) + 2, 6, s(label))
        for it in items:
            self.tag(it)
        self.ln(8)

    def bullets(self, items):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*DARK)
        for it in items:
            if self.get_y() > self.h - 25:
                self.add_page()
            x = self.get_x()
            self.set_text_color(*BLUE)
            self.cell(5, 5.2, s("-"))
            self.set_text_color(*DARK)
            self.multi_cell(0, 5.2, s(it))
            self.set_x(x)
        self.ln(2)


pdf = PDF()
pdf.set_auto_page_break(auto=True, margin=18)
pdf.set_margins(18, 18, 18)

# ============ COVER ============
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, pdf.w, pdf.h, "F")
EPW = pdf.epw


def center(y, h, txt, font, size, color):
    pdf.set_xy(pdf.l_margin, y)
    pdf.set_font("Helvetica", font, size)
    pdf.set_text_color(*color)
    pdf.multi_cell(EPW, h, s(txt), align="C")


center(55, 13, "NgCMS ERP", "B", 30, (255, 255, 255))
center(pdf.get_y(), 9, "Intelligent Campus Operating System", "B", 16, TAG_BG)
pdf.ln(6)
pdf.set_draw_color(*ACCENT)
pdf.set_line_width(1)
pdf.line(pdf.w / 2 - 30, pdf.get_y(), pdf.w / 2 + 30, pdf.get_y())
pdf.ln(10)
center(pdf.get_y(), 7, "Complete Feature Documentation", "", 13, (255, 255, 255))
pdf.ln(2)
center(pdf.get_y(), 6, "A comprehensive, AI-powered College Management System covering academics, attendance, exams, finance, library, admissions and communication across six role-based portals.", "", 10, TAG_BG)
center(pdf.h - 40, 5, "Generated: 18 June 2026  |  Roles: Super Admin - College Admin - Teacher - Student - Parent - Librarian", "", 9, TAG_BG)

# ============ 1. OVERVIEW ============
pdf.add_page()
pdf.h1("1. Platform Overview")
pdf.para("NgCMS ERP is an integrated, multi-tenant platform that streamlines every operation within an educational institution. A single Super Admin oversees many colleges; each college runs independently with isolated data and its own branding. The system delivers a tailored portal to each stakeholder group, all sharing a consistent design language, real-time updates and role-based security.")
pdf.h2("Technology Stack")
pdf.bullets([
    "Frontend: Next.js 16 (App Router, Turbopack), React 18+, TypeScript, TailwindCSS, Lucide icons.",
    "Backend: Node.js + Express.js in TypeScript, MongoDB with Mongoose ODM.",
    "Authentication: JWT tokens with role-based access control and bcrypt password hashing.",
    "Real-time: Socket.io for live notifications, messaging and dashboard updates.",
    "File storage: Cloudinary integration (profile photos, documents, materials, attachments).",
    "Payments: Razorpay payment gateway integration for online fee collection.",
    "Reporting: PDF (jsPDF) and CSV/Excel export across registries and reports.",
])
pdf.h2("The Six Roles at a Glance")
pdf.bullets([
    "Super Admin - platform owner; manages all colleges, users, system settings and audit logs.",
    "College Admin - runs a single college end-to-end: students, faculty, academics, fees, exams.",
    "Teacher - marks attendance, enters marks, creates assignments and materials, messages students.",
    "Student - views attendance, results, timetable, fees; submits assignments; uses the library.",
    "Parent - monitors their child's attendance, results, timetable and fees; messages teachers.",
    "Librarian - manages the book catalogue, issues/returns, reservations and overdue fines.",
])

# ============ 2. ROLES & CREDENTIALS ============
pdf.add_page()
pdf.h1("2. Roles & Demo Credentials")
pdf.para("The seed script provisions one account per role for the demo college 'Global Institute of Technology'. Every seeded account shares the password password123. (Reseeding wipes existing data.)")

cred_rows = [
    ("Super Admin", "Global Super Admin", "superadmin@ngcms.edu"),
    ("College Admin", "Dr. Rajesh Khanna", "admin@git.edu"),
    ("Teacher", "Prof. Alan Turing", "teacher@git.edu"),
    ("Student", "Harsh Kumar", "student@git.edu"),
    ("Parent", "Mr. Sharma", "parent@git.edu"),
    ("Librarian", "Margaret Hamilton", "librarian@git.edu"),
]
# table header
pdf.set_font("Helvetica", "B", 9)
pdf.set_fill_color(*NAVY)
pdf.set_text_color(255, 255, 255)
widths = (38, 50, 56, 30)
heads = ("Role", "Name", "Email", "Password")
for w, hd in zip(widths, heads):
    pdf.cell(w, 8, s(hd), border=1, fill=True, align="L")
pdf.ln(8)
pdf.set_font("Helvetica", "", 9)
pdf.set_text_color(*DARK)
alt = False
for role, name, email in cred_rows:
    pdf.set_fill_color(*(LIGHT if alt else (255, 255, 255)))
    pdf.cell(widths[0], 7.5, s(role), border=1, fill=True)
    pdf.cell(widths[1], 7.5, s(name), border=1, fill=True)
    pdf.cell(widths[2], 7.5, s(email), border=1, fill=True)
    pdf.cell(widths[3], 7.5, s("password123"), border=1, fill=True)
    pdf.ln(7.5)
    alt = not alt
pdf.ln(3)
pdf.para("Additional demo data: 9 more students (e.g. ananya@gmail.com, rohan@gmail.com) and a matching parent for each (prefixed 'p.', e.g. p.ananya@gmail.com), plus four more teachers (hopper@, feynman@, tesla@, varun@). All use password123.")

# ============ 3. FUNCTIONAL MODULES ============
modules = [
    ("Authentication & Access Control",
     "Secure sign-in, session handling and role-based authorization for every user type.",
     ["Login with email or registration ID plus password, with JWT session tokens.",
      "Role-based access control across all six roles; case-insensitive role checks.",
      "Forced password change on a College Admin's first login.",
      "Failed-login tracking with account lockout; multi-session support with revocation (logout / logout-all).",
      "Two-factor authentication framework (email, SMS, authenticator app) and per-user notification preferences.",
      "Profile photo and asset uploads via Cloudinary (10 MB limit)."],
     ["All roles"]),

    ("Student Information System",
     "Central registry for student enrollment, profiles and academic tracking.",
     ["Enrollment with auto-generated unique student and enrollment IDs.",
      "Bulk CSV import with validation/deduplication; CSV export and downloadable template.",
      "Full profiles: personal, academic and parent/guardian info, plus document uploads.",
      "Batch and section assignment; category classification (GEN/SC/ST/OBC).",
      "Status tracking (active, graduated, dropped) and soft-delete.",
      "Searchable directory with multi-filter (course, batch, status) and statistics."],
     ["College Admin", "Super Admin", "Teacher (view)", "Student (own)", "Parent (child)"]),

    ("Faculty Management",
     "Recruit, profile and assign teaching staff.",
     ["Faculty profiles with employee IDs, qualifications and joining details.",
      "Assign subjects and batches to each teacher (the core teaching-load mapping).",
      "Faculty attendance statistics and account/password management.",
      "Status tracking (Active, On-Leave, Resigned)."],
     ["College Admin", "Super Admin", "Teacher (own)"]),

    ("Academics & Curriculum",
     "Define the academic structure: departments, courses, subjects and batches.",
     ["Create and manage departments, courses (code, duration, seats) and subjects (credit hours).",
      "Course-to-department and subject-to-course mapping.",
      "Create batches per academic year with sections (A, B, ...) and semester progression.",
      "Assign teachers to sections and enroll students into batches."],
     ["College Admin", "Super Admin", "Teacher (view)", "Student (view)"]),

    ("Attendance Management",
     "Record, monitor and audit student attendance with shortage alerts.",
     ["Bulk lecture-wise marking by teachers (Present / Absent / Leave) per class, subject and date.",
      "Student-wise, monthly and batch-wise reports with percentage calculation.",
      "Shortage alerts flagging students below the 75% threshold (colour-coded).",
      "Admin override / rectification with history logs.",
      "Student leave requests with date range, reason and supporting documents; approval workflow.",
      "PDF and Excel export of attendance reports."],
     ["Teacher", "College Admin", "Student", "Parent"]),

    ("Exams & Results",
     "Schedule exams, capture marks, grade and publish results.",
     ["Create exams (Internal / External / Practical) with schedule, venue and multiple subjects.",
      "Define total/passing marks and a grade-point scheme (A+ to F).",
      "Per-student marks entry and bulk CSV import; automatic grade and CGPA calculation.",
      "Result publication / unpublication with student notifications; hall-ticket generation.",
      "Exam analysis, pass-rate analytics and result archive.",
      "Marks-entry verification workflow (teacher submits, admin reviews/publishes)."],
     ["Teacher", "College Admin", "Student", "Parent"]),

    ("Fees & Payments",
     "Configure fee structures, collect payments and manage scholarships.",
     ["Fee structures per course/batch/semester with component breakdown (tuition, lab, library, etc.).",
      "Installment plans, due dates and per-day fine settings.",
      "Payments via cash, cheque, online and Razorpay; receipt generation and status tracking.",
      "Scholarships (percentage or fixed) with category applicability; fee adjustments.",
      "Per-student ledger, financial summary and analytics."],
     ["College Admin", "Super Admin", "Student", "Parent"]),

    ("Timetable Management",
     "Build and publish class schedules with conflict detection.",
     ["Create entries mapping teacher-subject-batch-section to day, period and room.",
      "Conflict detection for teacher or room double-booking.",
      "Copy timetables across sections; update and delete entries.",
      "Role-aware views: teacher schedule, student batch schedule and 'today's classes'."],
     ["College Admin", "Teacher", "Student", "Parent"]),

    ("Assignments & Submissions",
     "Distribute coursework and manage student submissions.",
     ["Teachers create assignments with description, attachments, due date and max marks.",
      "Section-wise distribution; automatic late marking after the deadline.",
      "Student file/text submission with resubmission support and status tracking.",
      "Grading with marks and feedback; submission history per student."],
     ["Teacher", "Student", "College Admin (oversight)"]),

    ("Library Management",
     "Manage the catalogue, circulation and overdue fines.",
     ["Book catalogue (title, author, ISBN, category, location) with total/available copy tracking.",
      "Issue and return workflow with configurable per-day overdue fines.",
      "Student reservations with librarian approval; transaction status (issued/returned/overdue/reserved).",
      "Student library dashboard, search/filter and inventory statistics."],
     ["Librarian", "College Admin", "Student", "Teacher (view)"]),

    ("Admissions Management",
     "Run the funnel from enquiry through application to enrollment.",
     ["Enquiry capture with source and status pipeline (New -> Contacted -> ... -> Admitted).",
      "Application submission with document uploads and approval workflow.",
      "Seat-matrix configuration and availability tracking per course/category.",
      "Enrollment from approved applications - auto-creates the student's User account.",
      "Admissions reports."],
     ["College Admin", "Super Admin", "Admissions Staff"]),

    ("Communication & Notifications",
     "Announcements, direct messaging and real-time alerts.",
     ["Targeted announcements (all / students / parents) with priority (Normal / Important / Urgent) and scheduling.",
      "One-to-one messaging with conversation threads, read/unread status and attachments.",
      "Real-time WebSocket notifications with unread counts and deep-link action URLs.",
      "Notification types: assignments, announcements, exam results and library events."],
     ["All roles"]),

    ("NAAC Compliance & Governance",
     "Track accreditation documentation and quality metrics.",
     ["Criterion-wise document upload and organization (criteria 1-7) by academic year.",
      "Document status workflow (Draft / Review / Approved) with metadata.",
      "Compliance statistics and criterion-based filtering."],
     ["College Admin", "Super Admin", "Governance Committee"]),

    ("Super Admin & System Administration",
     "Platform-level control across all colleges and users.",
     ["College CRUD with subscription plans (basic / premium / enterprise) and per-college analytics.",
      "Cross-college user management: create, bulk import/export, role assignment, password reset.",
      "System-wide analytics, user-activity tracking and audit-log viewing/export.",
      "Global settings: rate limits, session timeout, grading scale, academic year, batch defaults."],
     ["Super Admin"]),

    ("Analytics, Reporting & AI",
     "Insight dashboards, exports and proactive risk detection.",
     ["AI early-warning system flags at-risk students (low attendance, grade drops, overdue fees).",
      "Attendance trends, exam performance, fee collection and enrollment analytics.",
      "College comparison and user analytics for the Super Admin.",
      "CSV/Excel exports and printable PDF reports (transcripts, certificates, receipts)."],
     ["Super Admin", "College Admin", "Teacher"]),
]

pdf.add_page()
pdf.h1("3. Functional Modules")
pdf.para("The following modules make up the system's capabilities. Each lists what it does, the specific actions it supports, and the roles that use it.")
for i, (title, desc, feats, who) in enumerate(modules, 1):
    pdf.h2(f"3.{i}  {title}")
    pdf.para(desc)
    pdf.bullets(feats)
    pdf.roles("Used by:  ", who)

# ============ 4. PORTAL WALKTHROUGH ============
portals = [
    ("Super Admin Portal", "/super-admin", [
        ("Dashboard", "Platform-wide KPIs: total colleges, users, students, teachers, system health and active sessions, with college-status and user-role breakdown charts."),
        ("Colleges", "Register, edit, activate/suspend and remove colleges; monitor resource usage per institution."),
        ("Users", "List, create and edit users across all colleges; enable/disable accounts; bulk operations."),
        ("Analytics", "System-wide enrollment, attendance, exam and fee trends with custom reporting."),
        ("Audit Logs", "Searchable, exportable log of every system modification with user and timestamp."),
        ("Settings & Profile", "Global platform configuration, integrations and the admin's own profile/security."),
    ]),
    ("College Admin Portal", "/admin", [
        ("Dashboard", "Enrollment, faculty headcount, revenue and at-risk-student KPIs, enrollment trend chart, critical alerts and the AI early-warning panel."),
        ("Student Registry", "Search/filter, add/edit/remove students, CSV import/export and enrollment-ID management."),
        ("Academic Assignments", "Configure teacher-subject-batch mappings - the core academic wiring."),
        ("Faculty", "Faculty directory: add/edit staff, view teaching load and assignments."),
        ("Academics & Batches", "Manage courses, subjects, departments and student cohorts/batches."),
        ("Attendance", "Institution-wide ledger, shortage alerts and per-student drill-down with PDF/Excel export."),
        ("Exams", "Exam lifecycle control: create cycles, manage marks, publish results, view pass-rate analytics."),
        ("Fees", "Fee-structure configuration, payment tracking, receipts and financial dashboards."),
        ("Admissions", "Process applications and enquiries, manage seat allocation and view statistics."),
        ("Timetable", "Create and publish schedules with conflict detection."),
        ("Communication", "Broadcast prioritized announcements to batches/courses and track delivery."),
        ("NAAC / Governance", "Manage accreditation documents and compliance reporting."),
        ("Settings", "College profile, academic calendar, grading scale and notification settings."),
    ]),
    ("Teacher Portal", "/teacher", [
        ("Dashboard", "KPIs for student reach, assigned batches, sessions marked today and modules; academic mapping, today's schedule with live-session indicator and priority actions."),
        ("Attendance", "Tabbed view of today's classes and session history; full-roster marking modal (Present/Absent/Leave) with re-submission lock."),
        ("Marks", "Grid-based marks entry per exam/subject with validation, CGPA/percentage calculation, draft save and submit-for-review."),
        ("Students", "Roster of taught students with batch/section filters and per-student detail pages (attendance, performance, history)."),
        ("Timetable", "Weekly schedule grid with time, subject, batch, room and section details."),
        ("Uploads / Materials", "Upload and organize course materials by subject/topic for students."),
        ("Communication", "Send announcements to batches and direct messages to students."),
    ]),
    ("Student Portal", "/ (student)", [
        ("Dashboard", "Attendance %, CGPA and latest exam KPIs; announcement banner; assignment widget with colour-coded due dates; upcoming tests; subject-wise attendance; today's schedule; active library issues."),
        ("Attendance", "Overall and subject-wise attendance with absence/leave details and trends."),
        ("Results", "All published exam results with subject breakdown, percentage, CGPA and transcript generation."),
        ("Timetable", "Weekly schedule with teacher, room and venue details."),
        ("Assignments", "View, download, submit and resubmit coursework; see status and teacher feedback."),
        ("Communication", "Announcements feed plus direct messaging with faculty (read receipts, unread badge)."),
        ("Library", "Search the catalogue, reserve books and view personal issue history and dues."),
    ]),
    ("Parent Portal", "/ (parent)", [
        ("Dashboard", "Multi-child selector; per-child KPIs for attendance, average CGPA, academic status and pending fees; recent attendance, latest results and today's schedule."),
        ("Attendance", "Monitor the child's overall and subject-wise attendance with shortage notifications."),
        ("Results", "View the child's published results, transcripts and trends vs. class average."),
        ("Timetable", "The child's full weekly schedule with teacher and room details."),
        ("Fees", "Fee breakdown, payment history, outstanding dues and online payment."),
        ("Communication", "Receive batch announcements and message teachers."),
    ]),
    ("Librarian Portal", "/librarian", [
        ("Dashboard", "KPIs for total titles, issued books, overdue count and on-time return rate; quick actions (Issue / Return / Add Book) and recent-activity feed."),
        ("Books", "Add/edit/delete catalogue entries, manage copies, search/filter, and issue/return with fine calculation."),
        ("Transactions", "Full circulation history with status, fine management, filtering and overdue reminders."),
    ]),
]

pdf.add_page()
pdf.h1("4. Portal Walkthrough by Role")
pdf.para("Each role lands in a dedicated portal. The screens below summarize what each user sees and can do.")
for i, (name, route, screens) in enumerate(portals, 1):
    pdf.h2(f"4.{i}  {name}   ({route})")
    for scr, d in screens:
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*NAVY)
        x = pdf.get_x()
        if pdf.get_y() > pdf.h - 30:
            pdf.add_page()
        pdf.cell(5, 5.2, s("-"))
        label = scr + ":  "
        pdf.cell(pdf.get_string_width(s(label)) + 1, 5.2, s(label))
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(*DARK)
        pdf.multi_cell(0, 5.2, s(d))
        pdf.set_x(x)
    pdf.ln(3)

# ============ 5. CROSS-CUTTING ============
pdf.add_page()
pdf.h1("5. Cross-Cutting Capabilities")
pdf.h2("Shared Experience")
pdf.bullets([
    "Role-based redirection from a single login to the correct portal.",
    "Universal settings/profile page and self-service password change.",
    "Real-time updates via Socket.io: attendance, results, announcements, messages, library and fees.",
    "Global search and multi-criteria filtering across registries and lists.",
    "Data export everywhere: CSV/Excel registries and printable PDF reports.",
    "Centralized Cloudinary file management for photos, documents, materials and attachments.",
])
pdf.h2("Design & Accessibility")
pdf.bullets([
    "Responsive, mobile-first layouts with collapsible navigation and an app-shell header/sidebar.",
    "Dark-mode support and consistent status colour-coding (green safe, amber caution, red critical).",
    "Status badges, progress bars, loading and empty states, and toast feedback throughout.",
    "Keyboard navigation and accessibility-minded interactions.",
])
pdf.h2("Architecture Highlights")
pdf.bullets([
    "Multi-tenant: complete data isolation per college with per-college branding and configuration.",
    "Security: JWT auth, RBAC, bcrypt hashing, session expiry and account lockout.",
    "Audit trails on major actions for compliance.",
    "Integrations: Cloudinary (files), Razorpay (payments), Socket.io (real-time).",
])
pdf.ln(4)
pdf.set_draw_color(*TAG_BG)
pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
pdf.ln(4)
pdf.set_font("Helvetica", "I", 9)
pdf.set_text_color(*GREY)
pdf.multi_cell(0, 5, s("End of document - NgCMS ERP Feature Documentation. Generated from a source-code review of the backend (Express/Mongoose) and frontend (Next.js) on 18 June 2026."), align="C")

out = r"d:\Avani Projects\CMS\NgCMS_Feature_Documentation.pdf"
pdf.output(out)
print("PDF written to:", out)
