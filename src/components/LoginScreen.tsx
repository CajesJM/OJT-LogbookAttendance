import { FormEvent, useEffect, useRef, useState } from "react";
import { BookOpenCheck, Mail } from "lucide-react";
import { parseGoogleCredential } from "../lib/format";
import type { UserAccount } from "../types";

type Props = {
  googleClientId?: string;
  onLogin: (account: UserAccount) => Promise<void>;
  onError: (message: string) => void;
};

export function LoginScreen({ googleClientId, onLogin, onError }: Props) {
  const [email, setEmail] = useState("");
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    const renderButton = () => {
      const google = (window as Window & { google?: any }).google;
      if (!google?.accounts?.id || !googleButtonRef.current) return;
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response: { credential: string }) => {
          const account = parseGoogleCredential(response.credential);
          if (account) await onLogin(account);
          else onError("Google sign-in could not be completed.");
        },
      });
      google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
      });
    };

    const existing = document.getElementById(
      "google-identity-services",
    ) as HTMLScriptElement | null;
    if (existing) {
      if ((window as Window & { google?: any }).google) renderButton();
      else existing.addEventListener("load", renderButton, { once: true });
      return () => existing.removeEventListener("load", renderButton);
    }

    const script = document.createElement("script");
    script.id = "google-identity-services";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", renderButton, { once: true });
    document.body.appendChild(script);
    return () => script.removeEventListener("load", renderButton);
  }, [googleClientId, onError, onLogin]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith("@gmail.com")) {
      onError("Please enter a valid Gmail address.");
      return;
    }
    await onLogin({
      id: cleanEmail,
      name: cleanEmail.split("@")[0],
      email: cleanEmail,
    });
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="brand-mark">
          <BookOpenCheck size={28} aria-hidden="true" />
        </div>
        <div>
          <p className="eyebrow">Personal OJT Logbook</p>
          <h1>Your training days, organized.</h1>
          <p className="muted">
            Record attendance, capture daily learning, and keep a print-ready
            OJT history on this device.
          </p>
        </div>
        {googleClientId ? (
          <div className="google-box" ref={googleButtonRef} />
        ) : (
          <form className="login-form" onSubmit={submit}>
            <label htmlFor="login-email">Gmail account</label>
            <div className="input-with-icon">
              <Mail size={19} aria-hidden="true" />
              <input
                id="login-email"
                type="email"
                placeholder="yourname@gmail.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <button className="button primary" type="submit">
              Continue with Gmail
            </button>
            <p className="tiny">
              Your records stay in this browser unless you export a backup.
            </p>
          </form>
        )}
      </section>
    </main>
  );
}
