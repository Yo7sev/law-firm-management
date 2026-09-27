"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NotificationBell from "@/components/lawyer/NotificationBell";
import { useCallback, useEffect, useMemo, useState } from "react";

type Client = {
  id: number;
  full_name: string;
};

type CaseItem = {
  id: number;
  case_number: string;
  title: string;
  client_id: number;
};

type FinancialTransaction = {
  id: number;
  transaction_type: string;
  transaction_type_display: string;
  amount: string | number;
  description: string;
  transaction_date: string;
  reference: string;
  client: Client | null;
  case: {
    id: number;
    case_number: string;
    title: string;
  } | null;
  created_at: string;
  updated_at: string;
};

type TransactionsResponse = {
  success: boolean;
  transactions: FinancialTransaction[];
};

type ClientsResponse = {
  success: boolean;
  clients: Client[];
};

type CasesResponse = {
  success: boolean;
  cases: CaseItem[];
};

type ApiErrorResponse = {
  detail?: string;
  message?: string;
  error?: string;
};

type TransactionForm = {
  transaction_type: string;
  amount: string;
  description: string;
  transaction_date: string;
  reference: string;
  client_id: string;
  case_id: string;
};

type MonthlyGroup = {
  key: string;
  label: string;
  transactions: FinancialTransaction[];
};

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function createEmptyForm(): TransactionForm {
  return {
    transaction_type: "invoice",
    amount: "",
    description: "",
    transaction_date: getToday(),
    reference: "",
    client_id: "",
    case_id: "",
  };
}

function formatMoney(value: string | number) {
  const amount = Number(value) || 0;

  return new Intl.NumberFormat("en-JO", {
    style: "currency",
    currency: "JOD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDay(value: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
  });
}

function formatShortMonth(value: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-GB", {
    month: "short",
  });
}

function getTransactionTypeLabel(type: string) {
  switch (type) {
    case "invoice":
      return "Invoice";
    case "payment":
      return "Payment";
    case "expense":
      return "Expense";
    case "refund":
      return "Refund";
    default:
      return type;
  }
}

function getTransactionTypeClasses(type: string) {
  switch (type) {
    case "invoice":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "payment":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "expense":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "refund":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    default:
      return "bg-slate-800 text-slate-300 border-slate-700";
  }
}

function getTransactionAmountClasses(type: string) {
  switch (type) {
    case "invoice":
    case "payment":
      return "text-emerald-400";
    case "expense":
    case "refund":
      return "text-red-400";
    default:
      return "text-white";
  }
}

function getTransactionAmountPrefix(type: string) {
  switch (type) {
    case "invoice":
    case "payment":
      return "+";
    case "expense":
    case "refund":
      return "-";
    default:
      return "";
  }
}

function monthKey(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

function monthLabel(key: string) {
  if (key === "unknown") {
    return "Unknown Date";
  }

  const [year, month] = key.split("-").map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function groupByMonth(transactions: FinancialTransaction[]): MonthlyGroup[] {
  const groups = new Map<string, FinancialTransaction[]>();

  for (const transaction of transactions) {
    const key = monthKey(transaction.transaction_date);
    const current = groups.get(key) ?? [];

    current.push(transaction);
    groups.set(key, current);
  }

  return Array.from(groups.entries())
    .map(([key, items]) => {
      const sorted = [...items].sort(
        (a, b) =>
          new Date(b.transaction_date).getTime() -
          new Date(a.transaction_date).getTime(),
      );

      return {
        key,
        label: monthLabel(key),
        transactions: sorted,
      };
    })
    .sort((a, b) => b.key.localeCompare(a.key));
}

export default function FinancePage() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<FinancialTransaction | null>(null);

  const [form, setForm] = useState<TransactionForm>(createEmptyForm());

  const [collapsedMonths, setCollapsedMonths] = useState<
    Record<string, boolean>
  >({});

  const filteredCasesForForm = useMemo(() => {
    if (!form.client_id) {
      return cases;
    }

    return cases.filter(
      (caseItem) => String(caseItem.client_id) === form.client_id,
    );
  }, [cases, form.client_id]);

  const monthlyGroups = useMemo(
    () => groupByMonth(transactions),
    [transactions],
  );

  const loadInitialData = useCallback(async () => {
    try {
      const [clientsResponse, casesResponse] = await Promise.all([
        fetch("/api/auth/finance/clients/", {
          credentials: "include",
        }),
        fetch("/api/auth/finance/cases/", {
          credentials: "include",
        }),
      ]);

      if (clientsResponse.status === 401 || casesResponse.status === 401) {
        router.push("/login");
        return;
      }

      if (!clientsResponse.ok) {
        throw new Error("Failed to load clients.");
      }

      if (!casesResponse.ok) {
        throw new Error("Failed to load cases.");
      }

      const clientsData = (await clientsResponse.json()) as ClientsResponse;

      const casesData = (await casesResponse.json()) as CasesResponse;

      setClients(clientsData.clients ?? []);
      setCases(casesData.cases ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load finance data.",
      );
    }
  }, [router]);

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (typeFilter) {
        params.set("type", typeFilter);
      }

      if (clientFilter) {
        params.set("client", clientFilter);
      }

      const query = params.toString();

      const response = await fetch(
        `/api/auth/finance/${query ? `?${query}` : ""}`,
        {
          credentials: "include",
          cache: "no-store",
        },
      );

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const data = (await response
          .json()
          .catch(() => null)) as ApiErrorResponse | null;

        throw new Error(
          data?.detail ||
            data?.message ||
            data?.error ||
            "Failed to load financial transactions.",
        );
      }

      const data = (await response.json()) as TransactionsResponse;

      setTransactions(data.transactions ?? []);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load financial transactions.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [clientFilter, router, search, typeFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadInitialData();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadInitialData]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTransactions();
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadTransactions]);

  function toggleMonth(key: string) {
    setCollapsedMonths((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function openCreateModal() {
    setEditingTransaction(null);
    setForm(createEmptyForm());
    setError("");
    setIsModalOpen(true);
  }

  function openEditModal(transaction: FinancialTransaction) {
    setEditingTransaction(transaction);

    setForm({
      transaction_type: transaction.transaction_type,
      amount: String(transaction.amount),
      description: transaction.description || "",
      transaction_date: transaction.transaction_date
        ? transaction.transaction_date.split("T")[0]
        : getToday(),
      reference: transaction.reference || "",
      client_id: transaction.client ? String(transaction.client.id) : "",
      case_id: transaction.case ? String(transaction.case.id) : "",
    });

    setError("");
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
    setEditingTransaction(null);
    setForm(createEmptyForm());
  }

  function updateForm(field: keyof TransactionForm, value: string) {
    setForm((current) => {
      const next = {
        ...current,
        [field]: value,
      };

      if (field === "client_id") {
        next.case_id = "";
      }

      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.client_id) {
      setError("Please select a client.");
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const payload = {
        transaction_type: form.transaction_type,
        amount: Number(form.amount),
        description: form.description,
        transaction_date: form.transaction_date,
        reference: form.reference,
        client_id: Number(form.client_id),
        case_id: form.case_id ? Number(form.case_id) : null,
      };

      const url = editingTransaction
        ? `/api/auth/finance/${editingTransaction.id}/`
        : "/api/auth/finance/";

      const response = await fetch(url, {
        method: editingTransaction ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const data = (await response
          .json()
          .catch(() => null)) as ApiErrorResponse | null;

        throw new Error(
          data?.detail ||
            data?.message ||
            data?.error ||
            "Failed to save transaction.",
        );
      }

      closeModal();
      await loadTransactions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save transaction.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(transaction: FinancialTransaction) {
    const confirmed = window.confirm(
      `Delete this ${getTransactionTypeLabel(
        transaction.transaction_type,
      ).toLowerCase()} of ${formatMoney(transaction.amount)}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await fetch(`/api/auth/finance/${transaction.id}/`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const data = (await response
          .json()
          .catch(() => null)) as ApiErrorResponse | null;

        throw new Error(
          data?.detail ||
            data?.message ||
            data?.error ||
            "Failed to delete transaction.",
        );
      }

      await loadTransactions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete transaction.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-950 lg:block">
          <div className="flex h-full flex-col">
            <div className="flex h-20 items-center border-b border-slate-800 px-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold">
                LF
              </div>

              <div className="ml-3 min-w-0">
                <p className="text-sm font-semibold">LawFirm</p>
                <p className="truncate text-xs text-slate-500">
                  Management System
                </p>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-6">
              <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Workspace
              </p>

              <div className="space-y-1">
                <Link
                  href="/lawyer"
                  className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
                >
                  Dashboard
                </Link>

                <Link
                  href="/lawyer/clients"
                  className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
                >
                  Clients
                </Link>

                <Link
                  href="/lawyer/cases"
                  className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
                >
                  Cases
                </Link>

                <Link
                  href="/lawyer/hearings"
                  className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
                >
                  Hearings
                </Link>

                <Link
                  href="/lawyer/documents"
                  className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
                >
                  Documents
                </Link>

                <Link
                  href="/lawyer/tasks"
                  className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
                >
                  Tasks
                </Link>

                <Link
                  href="/lawyer/finance"
                  className="block rounded-lg bg-blue-600/10 px-3 py-2.5 text-sm font-medium text-blue-400"
                >
                  Finance
                </Link>
              </div>
            </nav>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="mx-auto w-full max-w-7xl px-6 py-8">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="mb-1 text-sm text-blue-400">
                  Financial Management
                </p>

                <h1 className="text-3xl font-bold tracking-tight">Finance</h1>

                <p className="mt-2 text-sm text-slate-400">
                  Financial activity organized by month.
                </p>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <NotificationBell />

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
                >
                  Add Transaction
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label
                    htmlFor="finance-search"
                    className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500"
                  >
                    Search
                  </label>

                  <input
                    id="finance-search"
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search transactions..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="finance-type"
                    className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500"
                  >
                    Type
                  </label>

                  <select
                    id="finance-type"
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="invoice">Invoice</option>
                    <option value="payment">Payment</option>
                    <option value="expense">Expense</option>
                    <option value="refund">Refund</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="finance-client"
                    className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500"
                  >
                    Client
                  </label>

                  <select
                    id="finance-client"
                    value={clientFilter}
                    onChange={(event) => setClientFilter(event.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-500"
                  >
                    <option value="">All Clients</option>

                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {isLoading ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-16 text-center text-sm text-slate-500">
                  Loading transactions...
                </div>
              ) : monthlyGroups.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-16 text-center">
                  <p className="text-sm font-medium text-slate-300">
                    No transactions found
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Add your first financial transaction to get started.
                  </p>
                </div>
              ) : (
                monthlyGroups.map((month) => {
                  const isCollapsed = collapsedMonths[month.key] ?? false;

                  return (
                    <section
                      key={month.key}
                      className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50"
                    >
                      <button
                        type="button"
                        onClick={() => toggleMonth(month.key)}
                        className="flex w-full items-center justify-between px-5 py-5 text-left transition hover:bg-slate-900"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-400">
                            <span className="text-lg">
                              {isCollapsed ? "›" : "⌄"}
                            </span>
                          </div>

                          <div>
                            <h2 className="text-lg font-semibold text-white">
                              {month.label}
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                              {month.transactions.length}{" "}
                              {month.transactions.length === 1
                                ? "transaction"
                                : "transactions"}
                            </p>
                          </div>
                        </div>

                        <span className="text-xs text-slate-500">
                          {isCollapsed
                            ? "Show transactions"
                            : "Hide transactions"}
                        </span>
                      </button>

                      {!isCollapsed && (
                        <div className="border-t border-slate-800">
                          {month.transactions.map((transaction) => (
                            <div
                              key={transaction.id}
                              className="group border-b border-slate-800 px-5 py-4 last:border-b-0 transition hover:bg-slate-900"
                            >
                              <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                                <div className="flex min-w-[100px] items-center gap-3">
                                  <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-950">
                                    <span className="text-sm font-semibold text-white">
                                      {formatDay(transaction.transaction_date)}
                                    </span>

                                    <span className="text-[9px] uppercase text-slate-600">
                                      {formatShortMonth(
                                        transaction.transaction_date,
                                      )}
                                    </span>
                                  </div>

                                  <div className="hidden xl:block">
                                    <p className="text-xs text-slate-500">
                                      {formatDate(transaction.transaction_date)}
                                    </p>
                                  </div>
                                </div>

                                <div className="min-w-[110px]">
                                  <span
                                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getTransactionTypeClasses(
                                      transaction.transaction_type,
                                    )}`}
                                  >
                                    {getTransactionTypeLabel(
                                      transaction.transaction_type,
                                    )}
                                  </span>
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <p className="text-sm font-medium text-white">
                                      {transaction.client?.full_name ||
                                        "No Client"}
                                    </p>

                                    {transaction.case && (
                                      <>
                                        <span className="text-slate-700">
                                          /
                                        </span>

                                        <p className="text-xs text-slate-500">
                                          {transaction.case.case_number}
                                        </p>
                                      </>
                                    )}
                                  </div>

                                  <p className="mt-1 truncate text-xs text-slate-500">
                                    {transaction.description ||
                                      "No description"}
                                  </p>

                                  {transaction.reference && (
                                    <p className="mt-1 text-[11px] text-slate-600">
                                      Ref: {transaction.reference}
                                    </p>
                                  )}
                                </div>

                                {transaction.case && (
                                  <div className="hidden min-w-[180px] lg:block">
                                    <p className="text-xs uppercase tracking-wide text-slate-600">
                                      Case
                                    </p>

                                    <p className="mt-1 truncate text-sm text-slate-400">
                                      {transaction.case.title}
                                    </p>
                                  </div>
                                )}

                                <div className="flex items-center justify-between gap-4 xl:min-w-[230px] xl:justify-end">
                                  <p
                                    className={`text-base font-semibold ${getTransactionAmountClasses(
                                      transaction.transaction_type,
                                    )}`}
                                  >
                                    {getTransactionAmountPrefix(
                                      transaction.transaction_type,
                                    )}
                                    {formatMoney(transaction.amount)}
                                  </p>

                                  <div className="flex gap-2 opacity-100 transition xl:opacity-0 xl:group-hover:opacity-100">
                                    <button
                                      type="button"
                                      onClick={() => openEditModal(transaction)}
                                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
                                    >
                                      Edit
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleDelete(transaction)
                                      }
                                      className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/10"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingTransaction ? "Edit Transaction" : "Add Transaction"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Record financial activity for the law firm.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg px-3 py-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="transaction-type"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Transaction Type
                  </label>

                  <select
                    id="transaction-type"
                    value={form.transaction_type}
                    onChange={(event) =>
                      updateForm("transaction_type", event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  >
                    <option value="invoice">Invoice</option>
                    <option value="payment">Payment</option>
                    <option value="expense">Expense</option>
                    <option value="refund">Refund</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="transaction-amount"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Amount
                  </label>

                  <input
                    id="transaction-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) =>
                      updateForm("amount", event.target.value)
                    }
                    placeholder="0.00"
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="transaction-date"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Date
                  </label>

                  <input
                    id="transaction-date"
                    type="date"
                    value={form.transaction_date}
                    onChange={(event) =>
                      updateForm("transaction_date", event.target.value)
                    }
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="transaction-reference"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Reference Number
                  </label>

                  <input
                    id="transaction-reference"
                    type="text"
                    value={form.reference}
                    onChange={(event) =>
                      updateForm("reference", event.target.value)
                    }
                    placeholder="Optional"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="transaction-client"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Client
                  </label>

                  <select
                    id="transaction-client"
                    value={form.client_id}
                    onChange={(event) =>
                      updateForm("client_id", event.target.value)
                    }
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  >
                    <option value="">Select Client</option>

                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="transaction-case"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Case
                  </label>

                  <select
                    id="transaction-case"
                    value={form.case_id}
                    onChange={(event) =>
                      updateForm("case_id", event.target.value)
                    }
                    disabled={!form.client_id}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-50 focus:border-blue-500"
                  >
                    <option value="">
                      {form.client_id ? "No Case" : "Select a client first"}
                    </option>

                    {filteredCasesForForm.map((caseItem) => (
                      <option key={caseItem.id} value={caseItem.id}>
                        {caseItem.case_number} — {caseItem.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="transaction-description"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Description
                  </label>

                  <textarea
                    id="transaction-description"
                    value={form.description}
                    onChange={(event) =>
                      updateForm("description", event.target.value)
                    }
                    rows={4}
                    placeholder="Enter transaction details..."
                    className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-800 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving
                    ? "Saving..."
                    : editingTransaction
                      ? "Save Changes"
                      : "Add Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
