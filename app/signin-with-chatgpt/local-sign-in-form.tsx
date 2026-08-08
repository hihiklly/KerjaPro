"use client";

import { FormEvent, useState } from "react";

export default function LocalSignInForm({ returnTo }: { returnTo: string }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/local", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, email }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Sign-in failed");
      window.location.assign(returnTo);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed");
      setSubmitting(false);
    }
  }

  return (
    <form className="local-account-form" onSubmit={submit}>
      <div className="local-account-fields">
        <label>
          Your name
          <input required value={displayName} onChange={event => setDisplayName(event.target.value)} autoComplete="name" />
        </label>
        <label>
          Email address
          <input required type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" />
        </label>
      </div>
      {error && <div className="local-signin-error" role="alert">{error}</div>}
      <button className="primary" disabled={submitting}>
        {submitting ? "Signing in…" : "Continue with email"}
      </button>
    </form>
  );
}
