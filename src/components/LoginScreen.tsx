import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, Info, LockKeyhole, ShieldCheck, Trash2, UserRound } from "lucide-react";
import logoUrl from "../assets/ojt-logbook-logo.svg";
import { AccountHelpModal } from "./ui/AccountHelpModal";
import { ClearBrowserDataModal } from "./ui/ClearBrowserDataModal";

type Props = {
  onLogin: (username: string, password: string) => Promise<boolean>;
  onError: (message: string) => void;
  hasLocalAccount: boolean;
  onClearData: () => Promise<boolean>;
};

export function LoginScreen({ onLogin, onError, hasLocalAccount, onClearData }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAccountHelp, setShowAccountHelp] = useState(false);
  const [showClearData, setShowClearData] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
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
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-brand-panel">
          <div className="login-brand-copy">
            <p className="login-brand-kicker">Your OJT companion</p>
            <h1>Keep every training day accounted for.</h1>
            <p>Build a clear, reliable record of your attendance and daily experience.</p>
          </div>
          <div className="login-brand-note">
            <ShieldCheck size={18} aria-hidden="true" />
            <span>Private and stored on your device</span>
          </div>
        </div>
        <div className="login-form-panel">
          <div className="login-panel-actions">
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
          <img className="login-logo" src={logoUrl} alt="OJT Logbook" />
          <div className="login-heading">
            <p className="eyebrow">Welcome</p>
            <h2>Sign in to your logbook</h2>
            <p className="muted">Continue where you left off or create your local account.</p>
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
            <button className="button primary login-submit" type="submit" disabled={submitting}>
              <span>{submitting ? "Signing in..." : "Sign in"}</span>
              {!submitting && <ArrowRight size={18} aria-hidden="true" />}
            </button>
          </form>
          <p className="login-storage-note">Your records stay in this browser unless you export a backup.</p>
        </div>
      </section>
      <AccountHelpModal open={showAccountHelp} onClose={() => setShowAccountHelp(false)} />
      <ClearBrowserDataModal open={showClearData} onClose={() => setShowClearData(false)} onClear={onClearData} />
    </main>
  );
}
