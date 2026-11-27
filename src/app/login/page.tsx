"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, BriefcaseBusiness, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const creatingAccount = mode === "signup";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (creatingAccount && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const endpoint = creatingAccount ? "/api/auth/register" : "/api/auth/login";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creatingAccount ? { name, email, password } : { email, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || (creatingAccount ? "Could not create your account." : "Could not sign in."));
      router.replace("/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand"><span className="brand-icon"><BriefcaseBusiness size={19} /></span> CareerDesk</div>
        <div className="login-kicker">YOUR CAREER, IN FOCUS</div>
        <h1>{creatingAccount ? <>Create your account.<br />Make your next move.</> : <>A more considered<br />way to find your next role.</>}</h1>
        <p className="login-copy">{creatingAccount ? "Set up your own CV and keep your job applications in one place." : "Sign in to your CV, real opportunities, and applications you approve."}</p>
        <form className="login-form" onSubmit={submit}>
          {creatingAccount && <><label htmlFor="name">Your name</label><input className="account-input" id="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required /></>}
          <label htmlFor="email">Email address</label>
          <input className="account-input" id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required />
          <label htmlFor="password">{creatingAccount ? "Create a password" : "Password"}</label>
          <div className="password-field"><LockKeyhole size={17} /><input id="password" type="password" autoComplete={creatingAccount ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={creatingAccount ? 12 : 1} maxLength={128} required /></div>
          {creatingAccount && <><label htmlFor="confirm-password">Confirm password</label><div className="password-field"><LockKeyhole size={17} /><input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={12} maxLength={128} required /></div><p className="account-note">Use at least 12 characters. Email verification is not configured yet.</p></>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button login-submit" disabled={loading}>{loading ? (creatingAccount ? "Creating account…" : "Signing in…") : (creatingAccount ? "Create account" : "Sign in")} <ArrowRight size={16} /></button>
          {!creatingAccount && <><button type="button" className="forgot-password-link" aria-expanded={showRecovery} aria-controls="password-recovery" onClick={() => setShowRecovery((visible) => !visible)}>Forgot your password?</button>{showRecovery && <p className="password-recovery" id="password-recovery" role="status">Password reset emails are not configured. Contact the site administrator to recover your account.</p>}</>}
          <button type="button" className="auth-mode-toggle" onClick={() => { setError(""); setShowRecovery(false); setMode(creatingAccount ? "signin" : "signup"); }}>{creatingAccount ? "Already have an account? Sign in" : "New to CareerDesk? Create an account"}</button>
        </form>
        <p className="login-foot">Your account is yours · Your CV is never submitted automatically</p>
      </section>
      <aside className="login-aside">
        <div className="aside-glow" />
        <div className="aside-caption">A CLEARER NEXT STEP</div>
        <blockquote>“The right opportunity deserves a thoughtful application.”</blockquote>
        <div className="aside-note">Real listings. Your story. Your final say.</div>
        <div className="aside-orbit orbit-a" /><div className="aside-orbit orbit-b" />
      </aside>
    </main>
  );
}
