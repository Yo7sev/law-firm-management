"use client";

import { FormEvent, useEffect, useState } from "react";

type Firm = {
  id: number;
  name: string;
};

type Membership = {
  role: string;
  role_display?: string;
};

type Member = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  role_display: string;
  status: string;
};

const roles = [
  { value: "lawyer", label: "Lawyer" },
  { value: "secretary", label: "Secretary" },
  { value: "accountant", label: "Accountant" },
  { value: "receptionist", label: "Receptionist" },
  { value: "viewer", label: "Viewer" },
];

export default function FirmPage() {
  const [firm, setFirm] = useState<Firm | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("lawyer");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadFirm() {
    try {
      const response = await fetch("/api/auth/firms/", {
        credentials: "include",
      });

      const data = await response.json();

      console.log("Invitation response:", response.status, data);

      if (!response.ok || !data.success) {
        setError(data.message || "Unable to load firm.");
        return;
      }

      setFirm(data.firm);
      setMembership(data.membership);

      if (data.firm) {
        const teamResponse = await fetch("/api/auth/firms/team/", {
          credentials: "include",
        });

        const teamData = await teamResponse.json();

        if (teamResponse.ok && teamData.success) {
          setMembers(teamData.members);
        }
      }
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function fetchFirm() {
      await loadFirm();
    }

    fetchFirm();
  }, []);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSending(true);
    setMessage("");
    setError("");

    try {
      const csrfResponse = await fetch("/api/auth/csrf/", {
        credentials: "include",
      });

      const csrfData = await csrfResponse.json();

      const response = await fetch("/api/auth/firms/invitations/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfData.csrfToken,
        },
        body: JSON.stringify({
          email: email.trim(),
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Unable to send invitation.");
        return;
      }

      setMessage("Invitation sent successfully.");
      setEmail("");
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading firm...
      </main>
    );
  }

  if (!firm) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white md:p-8">
        <div className="mx-auto max-w-xl">
          <h1 className="text-3xl font-semibold">Create Your Firm</h1>

          <p className="mt-2 text-slate-400">
            Create your law firm to start inviting lawyers and staff.
          </p>

          <form
            onSubmit={async (event) => {
              event.preventDefault();

              const form = event.currentTarget;
              const formData = new FormData(form);
              const name = String(formData.get("name") || "").trim();

              if (!name) return;

              const csrfResponse = await fetch("/api/auth/csrf/", {
                credentials: "include",
              });

              const csrfData = await csrfResponse.json();

              const response = await fetch("/api/auth/firms/create/", {
                method: "POST",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                  "X-CSRFToken": csrfData.csrfToken,
                },
                body: JSON.stringify({ name }),
              });

              const data = await response.json();

              if (!response.ok || !data.success) {
                setError(data.message || "Unable to create firm.");
                return;
              }

              window.location.reload();
            }}
            className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"
          >
            <label className="mb-2 block text-sm text-slate-300">
              Firm Name
            </label>

            <input
              name="name"
              required
              placeholder="Your Law Firm"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
            />

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-medium hover:bg-blue-700"
            >
              Create Firm
            </button>
          </form>
        </div>
      </main>
    );
  }

  const isOwner = membership?.role === "owner";

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm text-blue-400">Firm Management</p>

          <h1 className="mt-1 text-3xl font-semibold">{firm.name}</h1>

          <p className="mt-2 text-slate-400">
            Manage your firm and team members.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-xl border border-green-900 bg-green-950/40 p-4 text-sm text-green-300">
            {message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Team Members</h2>

                <p className="mt-1 text-sm text-slate-400">
                  {members.length} active member
                  {members.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {members.map((member) => {
                const name = `${member.first_name} ${member.last_name}`.trim();

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <div>
                      <p className="font-medium">{name || member.email}</p>

                      <p className="mt-1 text-sm text-slate-500">
                        {member.email}
                      </p>
                    </div>

                    <span className="rounded-full bg-blue-600/10 px-3 py-1 text-xs font-medium text-blue-400">
                      {member.role_display}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {isOwner && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold">Invite Member</h2>

              <p className="mt-2 text-sm text-slate-400">
                Send an invitation to join your firm.
              </p>

              <form onSubmit={handleInvite} className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="lawyer@gmail.com"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Role
                  </label>

                  <select
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  >
                    {roles.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send Invitation"}
                </button>
              </form>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
