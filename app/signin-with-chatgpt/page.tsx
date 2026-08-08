import LocalSignInForm from "./local-sign-in-form";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>;
}) {
  const parameters = await searchParams;
  const returnTo = safeReturnPath(parameters.return_to);
  const emailSignInEnabled = process.env.NODE_ENV === "development";

  return (
    <main className="local-signin">
      <section className="signin-card">
        <div className="brand">
          <span className="brand-mark">K</span>
          <span><b>Kerja</b>Pro<small>WORK MADE SIMPLE</small></span>
        </div>
        <span className="eyebrow">WELCOME BACK</span>
        <h1>Sign in to KerjaPro</h1>
        <p>Access your jobs, customers and business documents securely.</p>

        {emailSignInEnabled ? (
          <LocalSignInForm returnTo={returnTo} />
        ) : (
          <div className="signin-configuration-note">
            Sign in with the email account connected to your KerjaPro workspace.
          </div>
        )}

        <div className="signin-divider"><span>More sign-in options</span></div>
        <div className="provider-list" aria-label="Future sign-in providers">
          <button className="provider-button google disabled" type="button" disabled>
            <GoogleIcon />
            <span>Continue with Google</span>
            <em>Coming soon</em>
          </button>
          <button className="provider-button apple disabled" type="button" disabled>
            <AppleIcon />
            <span>Continue with Apple</span>
            <em>Coming soon</em>
          </button>
        </div>

        <small className="signin-legal">
          By continuing, you agree to the Terms of Service and acknowledge the Privacy Policy.
        </small>
      </section>
    </main>
  );
}

function safeReturnPath(value?: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://app.local");
    return url.origin === "https://app.local"
      ? `${url.pathname}${url.search}${url.hash}`
      : "/";
  } catch {
    return "/";
  }
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.7A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.5 14a6 6 0 0 1 0-3.9V7.4H3.1A10 10 0 0 0 2 12c0 1.6.4 3.2 1.1 4.6L6.5 14Z" />
      <path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10 10 0 0 0-8.9 5.4l3.4 2.7A5.9 5.9 0 0 1 12 5.9Z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M17.1 12.7c0-2.6 2.1-3.8 2.2-3.9a4.7 4.7 0 0 0-3.7-2c-1.6-.2-3.1.9-3.9.9-.8 0-2-1-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.3 2.5 1.3-.1 1.8-.8 3.5-.8 1.6 0 2.1.8 3.5.8 1.4 0 2.4-1.3 3.2-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-3.2-1.2-3.2-4Zm-2.5-7.6A4.4 4.4 0 0 0 15.7 2a4.5 4.5 0 0 0-2.9 1.5 4.2 4.2 0 0 0-1.1 3c1.1.1 2.2-.5 2.9-1.4Z" />
    </svg>
  );
}
