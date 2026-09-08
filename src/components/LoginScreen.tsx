import { FormEvent, useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  House,
  Info,
  LockKeyhole,
  ShieldCheck,
  Trash2,
  TrendingUp,
  UserRound,
} from "lucide-react";
import logoUrl from "../assets/ojt-logbook-logo.svg";
import lightLogoUrl from "../assets/ojt-logbook-logo-light.svg";
import loginVisualUrl from "../assets/Showcase/OJT-Laptop-Hero.webp";
import { AccountHelpModal } from "./ui/AccountHelpModal";
import { ClearBrowserDataModal } from "./ui/ClearBrowserDataModal";

type Props = {
  isLeaving?: boolean;
  onLogin: (username: string, password: string) => Promise<boolean>;
  onError: (message: string) => void;
  hasLocalAccount: boolean;
  lockedUntil: number | null;
  onClearData: () => Promise<boolean>;
  onBackToHome?: () => void;
};

export function LoginScreen({
  isLeaving = false,
  onLogin,
  onError,
  hasLocalAccount,
  lockedUntil,
  onClearData,
  onBackToHome,
}: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAccountHelp, setShowAccountHelp] = useState(false);
  const [showClearData, setShowClearData] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!lockedUntil || lockedUntil <= Date.now()) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [lockedUntil]);

  const remainingSeconds = lockedUntil
    ? Math.max(0, Math.ceil((lockedUntil - now) / 1000))
    : 0;
  const isRateLimited = remainingSeconds > 0;
  const countdown = `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (isRateLimited) {
      onError(`Sign-in is temporarily paused. Try again in ${countdown}.`);
      return;
    }
    const cleanUsername = username.trim();
    if (cleanUsername.length < 3) {
      onError("Username must contain at least 3 characters.");
      return;
    }
    if (password.length < 6) {
      onError("Password must contain at least 6 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await onLogin(cleanUsername, password);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={`login-shell${isLeaving ? " is-leaving" : ""}`}>
      <header className="login-page-header">
        {onBackToHome ? (
          <button
            className="login-page-brand"
            type="button"
            onClick={onBackToHome}
            aria-label="Return to the OJT Logbook landing page"
          >
            <img src={logoUrl} alt="" aria-hidden="true" />
          </button>
        ) : (
          <img
            className="login-page-brand-image"
            src={logoUrl}
            alt="OJT Logbook"
          />
        )}
      </header>
      <section className="login-panel">
        <div className="login-brand-panel">
          <img
            className="login-brand-visual"
            src={loginVisualUrl}
            alt=""
            aria-hidden="true"
          />
          <img className="login-brand-logo" src={lightLogoUrl} alt="OJT Logbook" />
          <header className="login-mobile-card-header">
            {onBackToHome ? (
              <button
                className="login-mobile-brand-button"
                type="button"
                onClick={onBackToHome}
                aria-label="Return to the OJT Logbook landing page"
              >
                <img src={lightLogoUrl} alt="" aria-hidden="true" />
              </button>
            ) : (
              <img src={lightLogoUrl} alt="OJT Logbook" />
            )}
          </header>
          <div className="login-mobile-heading">
            <p>Welcome back</p>
            <h2>Sign in to your logbook</h2>
            <span>
              Continue where you left off or create your local account.
            </span>
          </div>
          <div className="login-brand-copy">
            <p className="login-brand-kicker">Your OJT companion</p>
            <h1>
              Keep every training day <span>accounted for.</span>
            </h1>
            <p>
              Build a clear, reliable record of your attendance and daily
              experience.
            </p>
          </div>
          <div className="login-benefits" aria-label="Logbook features">
            <div>
              <CalendarDays size={19} aria-hidden="true" />
              <span>
                Track<strong>Attendance</strong>
              </span>
            </div>
            <div>
              <FileText size={19} aria-hidden="true" />
              <span>
                Log<strong>Daily activities</strong>
              </span>
            </div>
            <div>
              <TrendingUp size={19} aria-hidden="true" />
              <span>
                Monitor<strong>Your progress</strong>
              </span>
            </div>
          </div>
          <div className="login-brand-note">
            <ShieldCheck size={18} aria-hidden="true" />
            <span>Private and stored on your device</span>
          </div>
        </div>
        <div className="login-form-panel">
          <div className="login-panel-actions">
            {onBackToHome && (
              <button
                className="icon-button login-home-button"
                type="button"
                onClick={onBackToHome}
                aria-label="Back to Landing Page"
                title="Back to Landing Page"
              >
                <House size={17} />
              </button>
            )}
            {hasLocalAccount && (
              <button
                className="icon-button login-reset-button"
                type="button"
                onClick={() => setShowClearData(true)}
                aria-label="Delete local account and browser data"
                title="Delete local account and browser data"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              className="icon-button account-help-button"
              type="button"
              onClick={() => setShowAccountHelp(true)}
              aria-label="Account and backup information"
              title="Account and backup information"
            >
              <Info size={17} />
            </button>
          </div>
          <div className="login-heading">
            <p className="eyebrow">Welcome back</p>
            <h2>Sign in to your logbook</h2>
            <p className="muted">
              Continue where you left off or create your local account.
            </p>
          </div>
          <form className="login-form" onSubmit={submit}>
            <div className="login-field">
              <label htmlFor="login-username">Username</label>
              <div className="input-with-icon">
                <UserRound size={18} aria-hidden="true" />
                <input
                  id="login-username"
                  autoComplete="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </div>
            </div>
            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <div className="input-with-icon input-with-action">
                <LockKeyhole size={18} aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            {isRateLimited && (
              <p className="login-rate-limit" role="status">
                <Clock3 size={16} aria-hidden="true" />
                <span>
                  Too many incorrect attempts. Try again in{" "}
                  <strong>{countdown}</strong>.
                </span>
              </p>
            )}
            <button
              className="button primary login-submit"
              type="submit"
              disabled={submitting || isRateLimited}
            >
              <span>
                {submitting
                  ? "Signing in..."
                  : isRateLimited
                    ? `Try again in ${countdown}`
                    : "Sign in"}
              </span>
              {!submitting && !isRateLimited && (
                <ArrowRight size={18} aria-hidden="true" />
              )}
            </button>
          </form>
          <p className="login-storage-note">
            <LockKeyhole size={15} aria-hidden="true" />
            <span>
              Your records stay in this browser unless you export a backup.
            </span>
          </p>
          <div className="login-mobile-benefits" aria-label="Logbook features">
            <div>
              <CalendarDays size={18} aria-hidden="true" />
              <span>Track attendance</span>
            </div>
            <div>
              <FileText size={18} aria-hidden="true" />
              <span>Log activities</span>
            </div>
            <div>
              <TrendingUp size={18} aria-hidden="true" />
              <span>View progress</span>
            </div>
          </div>
        </div>
      </section>
      <AccountHelpModal
        open={showAccountHelp}
        onClose={() => setShowAccountHelp(false)}
      />
      <ClearBrowserDataModal
        open={showClearData}
        onClose={() => setShowClearData(false)}
        onClear={onClearData}
      />
    </main>
  );
}
