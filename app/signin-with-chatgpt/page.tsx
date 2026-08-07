"use client";

import { FormEvent, useState } from "react";

export default function LocalSignInPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/local", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName, email }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Sign-in failed");
      const returnTo = new URLSearchParams(window.location.search).get("return_to");
      window.location.assign(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed");
      setSubmitting(false);
    }
  }

  return <main className="local-signin"><section>
    <div className="brand"><span className="brand-mark">K</span><span><b>Kerja</b>Pro<small>LOCAL DEVELOPMENT</small></span></div>
    <span className="eyebrow">LOCAL ACCOUNT</span>
    <h1>Sign in to KerjaPro</h1>
    <p>Use the same email each time to reopen the same local D1 workspace.</p>
    <form onSubmit={submit}>
      <label>Your name<input required value={displayName} onChange={event => setDisplayName(event.target.value)} autoComplete="name" /></label>
      <label>Email address<input required type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label>
      {error && <div className="local-signin-error">{error}</div>}
      <button className="primary" disabled={submitting}>{submitting ? "Signing in…" : "Continue"}</button>
    </form>
    <small>This development-only session is available on localhost. Hosted deployments continue to use authenticated OpenAI user headers.</small>
  </section></main>;
}
