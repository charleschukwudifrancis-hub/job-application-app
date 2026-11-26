"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, BriefcaseBusiness, LockKeyhole } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not sign in.");
      window.location.assign("/");
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
        <h1>A more considered<br />way to find your next role.</h1>
        <p className="login-copy">One private workspace for your CV, real opportunities, and applications you approve.</p>
        <form className="login-form" onSubmit={submit}>
          <label htmlFor="password">Workspace password</label>
          <div className="password-field"><LockKeyhole size={17} /><input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button login-submit" disabled={loading}>{loading ? "Signing in…" : "Enter workspace"} <ArrowRight size={16} /></button>
        </form>
        <p className="login-foot">Private workspace · Your CV is never submitted automatically</p>
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
