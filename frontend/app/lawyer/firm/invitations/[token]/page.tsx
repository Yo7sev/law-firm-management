"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Invitation = {
  firm_name: string;
  email: string;
  role: string;
  role_display: string;
  expires_at: string;
};

export default function InvitationPage() {
  const params = useParams();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    async function loadInvitation() {
      try {
        const response = await fetch(`/api/auth/firms/invitations/${token}/`, {
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.message || "This invitation is invalid or expired.");
          return;
        }

        setInvitation(data.invitation);
      } catch {
        setError("Unable to load the invitation.");
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      loadInvitation();
    }
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/auth/firms/invitations/${token}/accept/`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Unable to accept the invitation.");
        return;
      }

      window.location.href = "/lawyer";
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setAccepting(false);
    }
  }

  function handleGoogleSignIn() {
    window.location.href = `/api/auth/firms/invitations/${token}/google/`;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        Loading invitation...
      </main>
    );
  }

  if (error && !invitation) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center px-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <h1 className="text-2xl font-semibold">Invitation unavailable</h1>
          <p className="mt-3 text-slate-400">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-600/10 text-blue-400">
            ⚖
          </div>

          <h1 className="mt-6 text-2xl font-semibold">You&apos;re invited</h1>

          <p className="mt-2 text-slate-400">
            Join <span className="text-white">{invitation?.firm_name}</span>
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-sm text-slate-500">Invited email</p>

          <p className="mt-1 font-medium">{invitation?.email}</p>

          <p className="mt-4 text-sm text-slate-500">Role</p>

          <p className="mt-1 font-medium">{invitation?.role_display}</p>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="mt-6 w-full rounded-xl bg-white px-4 py-3 font-medium text-slate-900 transition hover:bg-slate-200"
        >
          Continue with Google
        </button>

        <button
          type="button"
          onClick={handleAccept}
          disabled={accepting}
          className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {accepting ? "Joining firm..." : "Accept Invitation"}
        </button>

        <p className="mt-4 text-center text-xs text-slate-500">
          Use the Google account that received this invitation.
        </p>
      </div>
    </main>
  );
}
