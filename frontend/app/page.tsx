import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(30,64,175,0.25),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(14,116,144,0.18),transparent_35%)]" />

        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 sm:px-10 lg:px-12">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-950 shadow-lg">
                <span className="text-xl font-bold">LF</span>
              </div>

              <div>
                <p className="text-lg font-semibold tracking-tight">
                  LawFirm
                </p>
                <p className="text-xs text-slate-400">
                  Management System
                </p>
              </div>
            </div>

            <Link
              href="/login"
              className="rounded-lg border border-slate-700 bg-slate-900/70 px-5 py-2.5 text-sm font-medium text-white transition hover:border-slate-500 hover:bg-slate-800"
            >
              Sign in
            </Link>
          </header>

          <div className="flex flex-1 items-center">
            <div className="grid w-full gap-16 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
              <div>
                <div className="mb-6 inline-flex items-center rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-300">
                  Professional Legal Practice Management
                </div>

                <h1 className="max-w-4xl text-5xl font-semibold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
                  Manage your law firm with
                  <span className="block text-slate-400">
                    clarity and control.
                  </span>
                </h1>

                <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-400">
                  A centralized platform for managing clients, cases,
                  hearings, documents, tasks, finances, staff, and
                  notifications from one secure workspace.
                </p>

                <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                  >
                    Access your workspace
                  </Link>

                  <a
                    href="#features"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-6 py-3.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-900"
                  >
                    Explore features
                  </a>
                </div>
              </div>

              <div
                id="features"
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl backdrop-blur"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-400">
                      Workspace overview
                    </p>
                    <h2 className="mt-1 text-xl font-semibold">
                      Everything in one place
                    </h2>
                  </div>

                  <div className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      title: "Clients",
                      description: "Centralized client records",
                    },
                    {
                      title: "Cases",
                      description: "Track every legal matter",
                    },
                    {
                      title: "Hearings",
                      description: "Never miss an important date",
                    },
                    {
                      title: "Documents",
                      description: "Organize legal documents",
                    },
                    {
                      title: "Tasks",
                      description: "Coordinate firm activities",
                    },
                    {
                      title: "Finance",
                      description: "Monitor payments and expenses",
                    },
                  ].map((feature) => (
                    <div
                      key={feature.title}
                      className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                    >
                      <h3 className="font-medium text-white">
                        {feature.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">
                      Secure role-based access
                    </span>

                    <span className="text-sm font-medium text-emerald-400">
                      Active
                    </span>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full w-4/5 rounded-full bg-slate-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer className="border-t border-slate-800 pt-6 text-sm text-slate-500">
            © {new Date().getFullYear()} LawFirm Management System
          </footer>
        </div>
      </section>
    </main>
  );
}