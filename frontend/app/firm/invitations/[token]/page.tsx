"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Invitation = {
  firm_name: string;
  email: string;
  role: string;
  expires_at: string;
};

export default function InvitationPage() {
  const params = useParams();
  const router = useRouter();

  const rawToken = params?.token;

  const token =
    typeof rawToken === "string" ? decodeURIComponent(rawToken).trim() : "";

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [message, setMessage] = useState(
    token ? "" : "This invitation link is missing its invitation token.",
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    async function loadInvitation() {
      try {
        const response = await fetch(
          `/api/auth/firms/invitations/${encodeURIComponent(token)}/`,
          {
            credentials: "include",
          },
        );

        const data = await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setMessage(data.message || "This invitation is invalid or expired.");
          return;
        }

        if (!data.invitation) {
          setMessage("Invitation details could not be found.");
          return;
        }

        setInvitation(data.invitation);
      } catch {
        if (!cancelled) {
          setMessage("Unable to load the invitation.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInvitation();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleAccept() {
    if (!token) {
      setMessage("This invitation link is missing its invitation token.");
      return;
    }

    try {
      const csrfResponse = await fetch("/api/auth/csrf/", {
        credentials: "include",
      });

      if (!csrfResponse.ok) {
        setMessage("Unable to prepare the invitation acceptance.");
        return;
      }

      const csrfData = await csrfResponse.json();

      const response = await fetch(
        `/api/auth/firms/invitations/${encodeURIComponent(token)}/accept/`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfData.csrfToken,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to accept invitation.");
        return;
      }

      router.push("/lawyer");
    } catch {
      setMessage("Something went wrong while accepting the invitation.");
    }
  }

  function handleGoogleLogin() {
    if (!token) {
      setMessage("This invitation link is missing its invitation token.");
      return;
    }

    window.location.href = `/api/auth/firms/invitations/${encodeURIComponent(
      token,
    )}/google/`;
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading invitation...{" "}
      </main>
    );
  }

  if (!invitation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        {" "}
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          {" "}
          <h1 className="mb-3 text-2xl font-semibold">
            Invitation unavailable{" "}
          </h1>
          <p className="text-sm text-slate-400">
            {message || "This invitation is invalid or expired."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      {" "}
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        {" "}
        <h1 className="text-2xl font-semibold">Youve been invited </h1>
        <p className="mt-3 text-slate-400">You have been invited to join:</p>
        <p className="mt-2 text-xl font-semibold">{invitation.firm_name}</p>
        <div className="mt-6 space-y-2 rounded-lg bg-slate-800 p-4 text-sm">
          <p>
            <span className="text-slate-400">Email:</span> {invitation.email}
          </p>

          <p>
            <span className="text-slate-400">Role:</span> {invitation.role}
          </p>

          <p>
            <span className="text-slate-400">Expires:</span>{" "}
            {new Date(invitation.expires_at).toLocaleString()}
          </p>
        </div>
        {message && (
          <div className="mt-4 rounded-lg bg-red-950/50 p-3 text-sm text-red-300">
            {message}
          </div>
        )}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="mt-6 w-full rounded-lg bg-white px-4 py-3 font-medium text-slate-900 transition hover:bg-slate-200"
        >
          Continue with Google
        </button>
        <button
          type="button"
          onClick={handleAccept}
          className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-500"
        >
          Accept Invitation
        </button>
      </div>
    </main>
  );
}
