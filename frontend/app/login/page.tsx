"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type LoginResponse = {
  success: boolean;
  message: string;
  redirect?: string;
  approval_status?: string;
  user?: {
    id: number;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
    approval_status: string;
  };
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
          remember_me: rememberMe,
        }),
      });

      const data: LoginResponse = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Unable to sign in.");
        return;
      }

      if (data.redirect) {
        router.push(data.redirect);
        router.refresh();
      }
    } catch {
      setError(
        "Unable to connect to the server. Please make sure the Django backend is running.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    setError("");
    setGoogleLoading(true);

    window.location.href = "http://127.0.0.1:8000/accounts/google/login/";
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        {/* Left branding panel */}
        <section className="relative hidden w-1/2 overflow-hidden border-r border-slate-800 bg-slate-950 lg:flex">
          <div className="absolute inset-0">
            <div className="absolute left-[-160px] top-[-160px] h-[420px] w-[420px] rounded-full bg-blue-600/10 blur-3xl" />
            <div className="absolute bottom-[-180px] right-[-120px] h-[420px] w-[420px] rounded-full bg-indigo-600/10 blur-3xl" />
          </div>

          <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-lg font-bold text-blue-400">
                  LF
                </div>

                <div>
                  <p className="text-sm font-semibold tracking-wide text-white">
                    LawFirm
                  </p>
                  <p className="text-xs text-slate-500">Management System</p>
                </div>
              </div>
            </div>

            <div className="max-w-xl">
              <div className="mb-6 inline-flex rounded-full border border-slate-800 bg-slate-900/70 px-4 py-2 text-xs font-medium text-slate-400">
                Professional Legal Practice Management
              </div>

              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white xl:text-5xl">
                Everything your law firm needs, in one secure workspace.
              </h1>

              <p className="mt-6 max-w-lg text-base leading-7 text-slate-400">
                Manage clients, cases, hearings, documents, tasks and financial
                activity from a centralized platform designed for modern legal
                practices.
              </p>

              <div className="mt-10 grid grid-cols-2 gap-3">
                {[
                  "Client Management",
                  "Case Management",
                  "Hearings & Calendar",
                  "Documents & Files",
                ].map((feature) => (
                  <div
                    key={feature}
                    className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm text-slate-300"
                  >
                    <span className="mr-2 text-blue-400">✓</span>
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Secure access • Role-based permissions • Centralized management
            </p>
          </div>
        </section>

        {/* Login panel */}
        <section className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-lg font-bold text-blue-400">
                LF
              </div>

              <div>
                <p className="text-sm font-semibold tracking-wide text-white">
                  LawFirm
                </p>
                <p className="text-xs text-slate-500">Management System</p>
              </div>
            </div>

            <div className="mb-8">
              <p className="mb-3 text-sm font-medium text-blue-400">
                Welcome back
              </p>

              <h2 className="text-3xl font-semibold tracking-tight text-white">
                Sign in to your account
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Enter your credentials to access your law firm workspace.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm leading-6 text-red-300"
                >
                  {error}
                </div>
              )}

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Email address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  disabled={loading || googleLoading}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {/* Password */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-300"
                  >
                    Password
                  </label>

                  <button
                    type="button"
                    className="text-xs font-medium text-slate-500 transition hover:text-blue-400"
                    onClick={() => {
                      setError(
                        "Please contact your administrator to reset your password.",
                      );
                    }}
                  >
                    Forgot password?
                  </button>
                </div>

                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  disabled={loading || googleLoading}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {/* Remember me */}
              <div className="flex items-center">
                <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-400">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    disabled={loading || googleLoading}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 accent-blue-500"
                  />
                  Remember me
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-800" />
              <span className="text-xs text-slate-600">OR</span>
              <div className="h-px flex-1 bg-slate-800" />
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:border-slate-700 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {googleLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-white" />
                  Connecting to Google...
                </>
              ) : (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fill="#4285F4"
                      d="M21.35 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.22Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 21.5c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.93-3.31.93-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.75 9.75 0 0 0 12 21.5Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M6.54 13.6a5.86 5.86 0 0 1 0-3.74V7.33H3.3a9.75 9.75 0 0 0 0 8.8l3.24-2.53Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.83c1.43 0 2.72.49 3.73 1.46l2.8-2.8C16.84 2.87 14.63 2 12 2a9.75 9.75 0 0 0-8.7 5.33l3.24 2.53C7.31 7.55 9.46 5.83 12 5.83Z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <div className="mt-8 border-t border-slate-900 pt-6 text-center">
              <p className="text-xs leading-5 text-slate-600">
                Access is restricted to authorized law firm personnel.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
