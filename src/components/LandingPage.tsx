import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  DatabaseBackup,
  FileText,
  Menu,
  NotebookPen,
  ShieldCheck,
  TrendingUp,
  X,
} from "lucide-react";
import phoneUrl from "../assets/Showcase/OJTLogbook.webp";
import "./landing/landing.css";

type Props = {
  isLeaving?: boolean;
  isReturning?: boolean;
  onNavigateToLogin: () => void;
};
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
const heroHighlights = [
  {
    icon: CalendarDays,
    title: "Daily activity records",
    text: "Log training tasks in seconds.",
  },
  {
    icon: Clock3,
    title: "Automatic hour totals",
    text: "Keep rendered hours accurate.",
  },
  {
    icon: FileText,
    title: "3 report formats",
    text: "Prepare PDF or Word reports.",
  },
  {
    icon: ShieldCheck,
    title: "Organized and private",
    text: "Your records stay on your device.",
  },
  {
    icon: TrendingUp,
    title: "Progress at a glance",
    text: "See how close you are to completion.",
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
          <div className="lp-tour-details">
            <h3>Your training, in perspective.</h3>
            <p>
              Check your hours, revisit active days and keep your next milestone
              in sight.
            </p>
            <ul>
              {[
                "Completed and remaining training hours",
                "Interactive OJT activity calendar",
                "Recent records and completion estimate",
              ].map((text) => (
                <li key={text}>
                  <Check size={16} aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <figure className="lp-tour-visual">
          <img
            src={phoneUrl}
            alt="OJT Logbook phone preview showing training statistics, activity calendar and progress"
            loading="lazy"
          />
          <figcaption>Dashboard / OJT Logbook</figcaption>
        </figure>
      </div>
    </section>
  );
}

export function LandingPage({
  isLeaving = false,
  isReturning = false,
  onNavigateToLogin,
}: Props) {
  const [menuState, setMenuState] = useState<
    "closed" | "opening" | "open" | "closing"
  >("closed");
  const [activeSection, setActiveSection] = useState("home");
  const [timelineProgress, setTimelineProgress] = useState(0);
  const shell = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const processSection = useRef<HTMLDivElement>(null);
  const processPanel = useRef<HTMLDivElement>(null);
  const processPath = useRef<SVGPathElement>(null);
  const stepNumberRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const menuCloseTimer = useRef<number | null>(null);
  const [mobileStepCenters, setMobileStepCenters] = useState([
    30, 145, 260, 375,
  ]);

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
    let frame = 0;
    const updateTimeline = () => {
      frame = 0;
      const scroller = processSection.current;
      const panel = processPanel.current;
      if (!scroller || !panel) return;
      const stickyTop = Number.parseFloat(window.getComputedStyle(panel).top);
      const safeStickyTop = Number.isFinite(stickyTop) ? stickyTop : 0;
      const sectionTop = scroller.getBoundingClientRect().top + window.scrollY;
      const travelDistance = scroller.offsetHeight - panel.offsetHeight;
      if (travelDistance <= 0) {
        setTimelineProgress(
          window.scrollY >= sectionTop - safeStickyTop ? 1 : 0,
        );
        return;
      }
      const startScroll = sectionTop - safeStickyTop;
      const endScroll = startScroll + travelDistance;
      if (window.scrollY >= endScroll) {
        setTimelineProgress(1);
        return;
      }
      if (window.scrollY <= startScroll) {
        setTimelineProgress(0);
        return;
      }
      const travelled = window.scrollY - startScroll;
      const progress = Math.min(1, Math.max(0, travelled / travelDistance));
      setTimelineProgress(progress);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateTimeline);
    };
    updateTimeline();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useLayoutEffect(() => {
    const updateMobileStepCenters = () => {
      const panel = processPanel.current;
      if (!panel) return;
      const panelTop = panel.getBoundingClientRect().top;
      const centers = stepNumberRefs.current
        .map((step) => {
          if (!step) return null;
          const rect = step.getBoundingClientRect();
          return rect.top - panelTop + rect.height / 2;
        })
        .filter((center): center is number => center !== null);
      if (centers.length === steps.length) setMobileStepCenters(centers);
    };

    updateMobileStepCenters();
    window.addEventListener("resize", updateMobileStepCenters);
    window.addEventListener("orientationchange", updateMobileStepCenters);
    return () => {
      window.removeEventListener("resize", updateMobileStepCenters);
      window.removeEventListener("orientationchange", updateMobileStepCenters);
    };
  }, []);

  const timelinePoint = (() => {
    const path = processPath.current;
    if (!path) return { x: 12, y: 126 };
    const length = path.getTotalLength();
    return path.getPointAtLength(length * timelineProgress);
  })();

  const stepRevealPoints = [0.04, 0.34, 0.64, 0.9];
  const mobileTimelineStart = mobileStepCenters[0] ?? 30;
  const mobileTimelineEnd =
    mobileStepCenters[mobileStepCenters.length - 1] ?? mobileTimelineStart;

  const mobileTimelinePosition = (() => {
    const progressPoints = stepRevealPoints;
    const linePositions = mobileStepCenters;
    const nextIndex = progressPoints.findIndex(
      (point) => timelineProgress <= point,
    );
    if (nextIndex <= 0) return linePositions[0];
    if (nextIndex === -1) return linePositions[linePositions.length - 1];
    const previousIndex = nextIndex - 1;
    const progressRange =
      progressPoints[nextIndex] - progressPoints[previousIndex];
    const segmentProgress =
      (timelineProgress - progressPoints[previousIndex]) / progressRange;
    return (
      linePositions[previousIndex] +
      (linePositions[nextIndex] - linePositions[previousIndex]) *
        segmentProgress
    );
  })();
  const mobileTimelineProgressHeight = Math.max(
    0,
    mobileTimelinePosition - mobileTimelineStart,
  );
  const isTimelineComplete = timelineProgress >= stepRevealPoints[3];
  const mobileTimelineFillHeight = isTimelineComplete
    ? Math.max(0, mobileTimelineEnd - mobileTimelineStart)
    : mobileTimelineProgressHeight;

  useEffect(() => {
    if (menuState === "closed") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileMenu(true);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuState]);

  useEffect(() => {
    return () => {
      if (menuCloseTimer.current) window.clearTimeout(menuCloseTimer.current);
    };
  }, []);

  function closeMobileMenu(restoreFocus = false) {
    if (menuState === "closed" || menuState === "closing") return;
    setMenuState("closing");
    if (menuCloseTimer.current) window.clearTimeout(menuCloseTimer.current);
    menuCloseTimer.current = window.setTimeout(() => {
      setMenuState("closed");
      if (restoreFocus) menuButton.current?.focus();
    }, 190);
  }

  function toggleMobileMenu() {
    if (menuState === "open" || menuState === "opening") {
      closeMobileMenu();
      return;
    }
    if (menuCloseTimer.current) window.clearTimeout(menuCloseTimer.current);
    setMenuState("opening");
    window.requestAnimationFrame(() => setMenuState("open"));
  }

  function navigate(id: string) {
    closeMobileMenu();
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
    onNavigateToLogin();
  }

  return (
    <div
      className={`lp${isLeaving ? " is-leaving" : ""}${isReturning ? " is-returning" : ""}`}
      ref={shell}
    >
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
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="lp-menu-toggle"
              ref={menuButton}
              aria-label={
                menuState === "open" || menuState === "opening"
                  ? "Close navigation"
                  : "Open navigation"
              }
              aria-expanded={menuState === "open" || menuState === "opening"}
              aria-controls="lp-mobile-nav"
              onClick={toggleMobileMenu}
            >
              {menuState === "open" || menuState === "opening" ? (
                <X size={22} />
              ) : (
                <Menu size={22} />
              )}
            </button>
          </div>
        </div>
        {menuState !== "closed" && (
          <nav
            id="lp-mobile-nav"
            className={`lp-mobile-links is-${menuState}`}
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
                <ChevronRight size={18} aria-hidden="true" />
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
              <div
                className="lp-hero-kicker"
                aria-label="For students: a smarter way to track your OJT"
              >
                <strong>For students</strong>
                <ChevronRight size={15} aria-hidden="true" />
                <span>A smarter way to track your OJT</span>
              </div>
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
                  <ArrowUpRight size={18} aria-hidden="true" />
                </button>
                <a
                  className="lp-text-link lp-hero-secondary"
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
              <div className="lp-hero-trust" aria-label="OJT Logbook benefits">
                <span>
                  <Check size={16} aria-hidden="true" />
                  Made for students
                </span>
                <span>
                  <Check size={16} aria-hidden="true" />
                  Works in your browser
                </span>
                <span>
                  <Check size={16} aria-hidden="true" />
                  Simple and reliable
                </span>
              </div>
            </div>
            <div className="lp-hero-visual">
              <div className="lp-hero-visual-grid" aria-hidden="true" />
              <img
                className="lp-hero-phone"
                src={phoneUrl}
                width="1162"
                height="1515"
                alt="OJT Logbook dashboard on a phone, showing training hours, activity and progress"
                fetchPriority="high"
              />
              <div className="lp-hero-float" aria-hidden="true">
                <span>
                  <TrendingUp size={20} />
                </span>
                <p>
                  <strong>Track progress</strong>Stay on schedule
                </p>
              </div>
            </div>
            <div
              className="lp-hero-metrics"
              aria-label="OJT Logbook highlights"
            >
              {heroHighlights.map(({ icon: Icon, title, text }) => (
                <div className="lp-hero-metric" key={title}>
                  <span className="lp-hero-metric-icon">
                    <Icon size={23} aria-hidden="true" />
                  </span>
                  <p>
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </p>
                </div>
              ))}
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
            <div className="lp-process-scroller" ref={processSection}>
              <div
                className="lp-process"
                ref={processPanel}
                style={
                  {
                    "--lp-mobile-line-top": `${mobileTimelineStart}px`,
                    "--lp-mobile-line-height": `${Math.max(
                      0,
                      mobileTimelineEnd - mobileTimelineStart,
                    )}px`,
                  } as CSSProperties
                }
              >
                <svg
                  className="lp-process-line"
                  viewBox="0 0 1120 250"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    className="lp-process-line-shadow"
                    d="M12 126 C175 210 250 20 390 76 S620 206 760 84 S955 23 1108 82"
                  />
                  <path
                    ref={processPath}
                    className="lp-process-line-base"
                    d="M12 126 C175 210 250 20 390 76 S620 206 760 84 S955 23 1108 82"
                  />
                  <path
                    className="lp-process-line-progress"
                    pathLength="1"
                    style={{ strokeDasharray: `${timelineProgress} 1` }}
                    d="M12 126 C175 210 250 20 390 76 S620 206 760 84 S955 23 1108 82"
                  />
                  <g
                    transform={`translate(${timelinePoint.x} ${timelinePoint.y})`}
                  >
                    <g
                      transform={`rotate(${timelineProgress * 720})`}
                      className="lp-process-wheel"
                    >
                      <circle className="lp-process-wheel-tire" r="12" />
                      <circle className="lp-process-wheel-hub" r="3" />
                      <path
                        className="lp-process-wheel-spokes"
                        d="M0 -7V7 M-7 0H7 M-5 -5L5 5 M5 -5L-5 5"
                      />
                    </g>
                  </g>
                </svg>
                <span
                  className="lp-process-mobile-progress"
                  style={{
                    height: `${mobileTimelineFillHeight}px`,
                    top: `${mobileTimelineStart}px`,
                  }}
                  aria-hidden="true"
                />
                <svg
                  className={`lp-process-mobile-wheel${
                    isTimelineComplete ? " is-locked" : ""
                  }`}
                  viewBox="-14 -14 28 28"
                  style={{
                    top: `${mobileTimelinePosition}px`,
                    transform: `translate(-50%, -50%) rotate(${timelineProgress * 720}deg)`,
                  }}
                  aria-hidden="true"
                >
                  <circle className="lp-process-wheel-tire" r="12" />
                  <circle className="lp-process-wheel-hub" r="3" />
                  <path
                    className="lp-process-wheel-spokes"
                    d="M0 -7V7 M-7 0H7 M-5 -5L5 5 M5 -5L-5 5"
                  />
                </svg>
                <ol className="lp-steps">
                  {steps.map(([title, text], index) => (
                    <li
                      className={
                        timelineProgress >= stepRevealPoints[index]
                          ? "is-revealed"
                          : ""
                      }
                      key={title}
                    >
                      <span
                        className={`lp-step-number${
                          isTimelineComplete && index === steps.length - 1
                            ? " has-mobile-wheel"
                            : ""
                        }`}
                        ref={(node) => {
                          stepNumberRefs.current[index] = node;
                        }}
                      >
                        0{index + 1}
                        {isTimelineComplete && index === steps.length - 1 ? (
                          <svg
                            className="lp-process-step-wheel"
                            viewBox="-14 -14 28 28"
                            aria-hidden="true"
                          >
                            <circle className="lp-process-wheel-tire" r="12" />
                            <circle className="lp-process-wheel-hub" r="3" />
                            <path
                              className="lp-process-wheel-spokes"
                              d="M0 -7V7 M-7 0H7 M-5 -5L5 5 M5 -5L-5 5"
                            />
                          </svg>
                        ) : null}
                      </span>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
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
