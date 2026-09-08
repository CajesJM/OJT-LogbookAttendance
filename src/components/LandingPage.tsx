import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  DatabaseBackup,
  FileText,
  LayoutDashboard,
  Menu,
  NotebookPen,
  TrendingUp,
  X,
} from "lucide-react";
import phoneUrl from "../assets/Showcase/OJTLogbook.png";
import reportUrl from "../assets/BSIT-TMC-OJT-FORMAT-page-1.png";
import "./landing/landing.css";

type Props = { onNavigateToLogin: () => void };
const links = [
  ["home", "Home"],
  ["features", "Features"],
  ["overview", "Overview"],
  ["how-it-works", "How it works"],
  ["about", "About"],
] as const;
const features = [
  {
    icon: NotebookPen,
    title: "A record of every training day",
    text: "Keep your tasks, time in and time out together. Add a reflection or signature whenever you need one.",
  },
  {
    icon: Clock3,
    title: "Hours, already added up",
    text: "Daily totals are calculated from your recorded times, with completed and remaining hours on your dashboard.",
  },
  {
    icon: CalendarDays,
    title: "Your activity at a glance",
    text: "See your training days on the activity calendar. Find past entries by title, weekday, month or date.",
  },
  {
    icon: TrendingUp,
    title: "A clearer finish line",
    text: "Follow your progress toward your required hours and view an estimated completion date based on your records.",
  },
  {
    icon: FileText,
    title: "Reports that fit your needs",
    text: "Choose a detailed report, Work Log or TMC daily time record. Preview your format, then print or download PDF or Word.",
  },
  {
    icon: DatabaseBackup,
    title: "Your logbook, backed up",
    text: "Export a backup from your profile and import it on another device. Backup reminders help you keep a recent copy.",
  },
];
const steps = [
  [
    "Make it yours",
    "Open Login to create a local account or sign in. Add your student details, company and required hours.",
  ],
  [
    "Record your day",
    "Add a task and your time in and out. Include an optional reflection or signature.",
  ],
  [
    "See your progress",
    "Review your rendered hours, activity history and estimated completion date.",
  ],
  [
    "Prepare your report",
    "Choose your report and paper size, then print or download. Export a separate backup for safekeeping.",
  ],
];

function Brand() {
  return (
    <>
      <img
        src={`${import.meta.env.BASE_URL}favicon.svg`}
        width="40"
        height="40"
        alt=""
      />
      <span>
        OJT<span className="lp-brand-light">Logbook</span>
      </span>
    </>
  );
}

function ProductTour() {
  const [view, setView] = useState("dashboard");
  const isDashboard = view === "dashboard";
  return (
    <section
      className="lp-tour lp-section"
      id="overview"
      tabIndex={-1}
      aria-labelledby="lp-tour-heading"
    >
      <div className="lp-container lp-tour-grid">
        <div className="lp-tour-copy">
          <p className="lp-eyebrow">A closer look</p>
          <h2 id="lp-tour-heading">
            From your first day
            <br />
            to your final report.
          </h2>
          <p>
            One place to see the work you have done and the hours still ahead.
          </p>
          <div
            className="lp-view-switch"
            role="group"
            aria-label="Product preview"
          >
            <button
              type="button"
              aria-pressed={isDashboard}
              onClick={() => setView("dashboard")}
            >
              <LayoutDashboard size={17} />
              Dashboard
            </button>
            <button
              type="button"
              aria-pressed={!isDashboard}
              onClick={() => setView("report")}
            >
              <FileText size={17} />
              Report
            </button>
          </div>
          <div className="lp-tour-details" key={view} aria-live="polite">
            <h3>
              {isDashboard
                ? "Your training, in perspective."
                : "A familiar form. Less paperwork."}
            </h3>
            <p>
              {isDashboard
                ? "Check your hours, revisit active days and keep your next milestone in sight."
                : "The TMC monthly form brings your attendance and accomplishments into a structured report."}
            </p>
            <ul>
              {(isDashboard
                ? [
                    "Completed and remaining training hours",
                    "Interactive OJT activity calendar",
                    "Recent records and completion estimate",
                  ]
                : [
                    "Monthly attendance and task entries",
                    "Student and company details from your profile",
                    "PDF, Word and direct printing",
                  ]
              ).map((text) => (
                <li key={text}>
                  <Check size={16} aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <p className="lp-caption">
            Illustrative preview. Your account shows your own records.
          </p>
        </div>
        <figure
          className={`lp-tour-visual ${isDashboard ? "" : "lp-tour-report"}`}
        >
          <img
            key={view}
            src={isDashboard ? phoneUrl : reportUrl}
            alt={
              isDashboard
                ? "OJT Logbook phone preview showing training statistics, activity calendar and progress"
                : "TMC BSIT daily time record and accomplishment report template"
            }
            loading="lazy"
          />
          <figcaption>
            {isDashboard
              ? "Dashboard / OJT Logbook"
              : "TMC / Monthly time record"}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

export function LandingPage({ onNavigateToLogin }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const shell = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-15% 0px -55% 0px" },
    );
    shell.current
      ?.querySelectorAll("main section[id]")
      .forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function navigate(id: string) {
    setMenuOpen(false);
    setActiveSection(id);
    const target = document.getElementById(id);
    target?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
    target?.focus({ preventScroll: true });
  }

  function login() {
    window.scrollTo({ top: 0, behavior: "instant" });
    onNavigateToLogin();
  }

  return (
    <div className="lp" ref={shell}>
      <a className="lp-skip" href="#lp-main">
        Skip to content
      </a>
      <header className="lp-header">
        <div className="lp-container lp-nav">
          <a
            href="#home"
            className="lp-brand"
            aria-label="OJT Logbook home"
            onClick={(e) => {
              e.preventDefault();
              navigate("home");
            }}
          >
            <Brand />
          </a>
          <nav className="lp-desktop-links" aria-label="Main navigation">
            {links.map(([id, label]) => (
              <a
                href={`#${id}`}
                key={id}
                aria-current={activeSection === id ? "location" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(id);
                }}
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="lp-nav-actions">
            <button
              type="button"
              className="lp-button lp-button-primary lp-nav-login"
              onClick={login}
            >
              Login
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="lp-menu-toggle"
              ref={menuButton}
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={menuOpen}
              aria-controls="lp-mobile-nav"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav
            id="lp-mobile-nav"
            className="lp-mobile-links"
            aria-label="Mobile navigation"
          >
            {links.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                aria-current={activeSection === id ? "location" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(id);
                }}
              >
                {label}
                <ArrowRight size={15} />
              </a>
            ))}
          </nav>
        )}
      </header>

      <main id="lp-main" tabIndex={-1}>
        <section
          id="home"
          tabIndex={-1}
          className="lp-hero"
          aria-labelledby="lp-title"
        >
          <div className="lp-container lp-hero-stage">
            <div className="lp-hero-copy">
              <p className="lp-eyebrow">
                <span className="lp-status-dot" />
                Your personal training companion
              </p>
              <h1 id="lp-title">
                OJT Logbook<span>Every day counts.</span>
              </h1>
              <p className="lp-hero-description">
                Turn your on-the-job training into a clear record of progress.
                Log your work, track your hours and prepare your reports, all in
                one place.
              </p>
              <div className="lp-actions">
                <button
                  type="button"
                  className="lp-button lp-button-primary"
                  onClick={login}
                >
                  Login to your logbook
                  <ArrowRight size={18} />
                </button>
                <a
                  className="lp-text-link"
                  href="#features"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("features");
                  }}
                >
                  Explore features
                  <ArrowDown size={17} />
                </a>
              </div>
              <p className="lp-hero-note">
                <Check size={16} />
                Made for students. Kept in your browser.
              </p>
            </div>
            <img
              className="lp-hero-phone"
              src={phoneUrl}
              alt="OJT Logbook on a phone, with training hours, an activity calendar and a progress tracker"
              fetchPriority="high"
            />
            <div className="lp-hero-foot">
              <span>LESS PAPERWORK. MORE PROGRESS.</span>
              <span>
                Daily records<small>/</small>Training hours<small>/</small>
                Ready-to-print reports
              </span>
            </div>
          </div>
        </section>

        <section
          className="lp-section lp-features"
          id="features"
          tabIndex={-1}
          aria-labelledby="lp-features-heading"
        >
          <div className="lp-container">
            <div className="lp-section-heading">
              <div>
                <p className="lp-eyebrow">Built around your training</p>
                <h2 id="lp-features-heading">The details, taken care of.</h2>
              </div>
              <p>
                Spend less time piecing your logbook together and more time
                learning on the job.
              </p>
            </div>
            <div className="lp-feature-grid">
              {features.map(({ icon: Icon, title, text }) => (
                <article className="lp-feature" key={title}>
                  <span className="lp-feature-icon">
                    <Icon size={23} strokeWidth={1.6} aria-hidden="true" />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <ProductTour />

        <section
          className="lp-section"
          id="how-it-works"
          tabIndex={-1}
          aria-labelledby="lp-steps-heading"
        >
          <div className="lp-container">
            <div className="lp-section-heading">
              <div>
                <p className="lp-eyebrow">A simple daily routine</p>
                <h2 id="lp-steps-heading">Start small. Keep going.</h2>
              </div>
              <p>
                From setting up your profile to preparing your last report,
                every step stays together.
              </p>
            </div>
            <ol className="lp-steps">
              {steps.map(([title, text], index) => (
                <li key={title}>
                  <span className="lp-step-number">0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          className="lp-about lp-section"
          id="about"
          tabIndex={-1}
          aria-labelledby="lp-about-heading"
        >
          <div className="lp-container lp-about-grid">
            <div>
              <p className="lp-eyebrow">Made for your OJT journey</p>
              <h2 id="lp-about-heading">
                Your work deserves
                <br />a good record.
              </h2>
            </div>
            <div>
              <p>
                OJT Logbook is a personal web app for students who want to keep
                their attendance, training activities and reports organized
                without an admin dashboard.
              </p>
              <p>
                Your account and records are stored in this browser. Export
                backups regularly: clearing browser data can remove them, and
                another device needs an imported backup to access your records.
              </p>
              <a
                className="lp-text-link"
                href="#how-it-works"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("how-it-works");
                }}
              >
                See how to get started
                <ArrowRight size={17} />
              </a>
            </div>
          </div>
        </section>

        <section className="lp-cta">
          <div className="lp-container lp-cta-content">
            <div>
              <p className="lp-eyebrow">Ready for your next training day?</p>
              <h2>Keep your progress moving.</h2>
              <p>Your tasks, hours and reports. A little more organized.</p>
            </div>
            <button
              type="button"
              className="lp-button lp-button-light"
              onClick={login}
            >
              Login to OJT Logbook
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
      </main>
      <footer className="lp-footer lp-container">
        <div>
          <a
            className="lp-brand"
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              navigate("home");
            }}
          >
            <Brand />
          </a>
          <p>A personal record of your professional beginning.</p>
        </div>
        <nav aria-label="Footer navigation">
          <a
            href="#features"
            onClick={(e) => {
              e.preventDefault();
              navigate("features");
            }}
          >
            Features
          </a>
          <a
            href="#about"
            onClick={(e) => {
              e.preventDefault();
              navigate("about");
            }}
          >
            About
          </a>
          <button type="button" onClick={login}>
            Login
            <ArrowRight size={14} />
          </button>
        </nav>
        <small>&copy; {new Date().getFullYear()} OJT Logbook</small>
      </footer>
    </div>
  );
}
