"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Client = {
  id: number;
  full_name: string;
};

type CaseItem = {
  id: number;
  case_number: string;
  title: string;
  client_id?: number | null;
};

type FinancialTransaction = {
  id: number;
  client_id: number;
  client_name: string;
  case_id: number | null;
  case_number: string | null;
  case_title: string | null;
  transaction_type: "invoice" | "payment" | "expense" | "refund";
  transaction_type_display: string;
  amount: string;
  transaction_date: string;
  description: string;
  reference: string;
  recorded_by: string;
  created_at: string;
  updated_at: string;
};

type Statistics = {
  total_transactions: number;
  total_invoices: string;
  total_payments: string;
  total_expenses: string;
  total_refunds: string;
  outstanding_balance: string;
};

type TransactionsResponse = {
  success: boolean;
  transactions: FinancialTransaction[];
  statistics: Statistics;
  message?: string;
};

type ClientsResponse = {
  success: boolean;
  clients: Client[];
  message?: string;
};

type CasesResponse = {
  success: boolean;
  cases: CaseItem[];
  message?: string;
};

type TransactionForm = {
  client_id: string;
  case_id: string;
  transaction_type: "invoice" | "payment" | "expense" | "refund";
  amount: string;
  transaction_date: string;
  description: string;
  reference: string;
};

const emptyStatistics: Statistics = {
  total_transactions: 0,
  total_invoices: "0.00",
  total_payments: "0.00",
  total_expenses: "0.00",
  total_refunds: "0.00",
  outstanding_balance: "0.00",
};

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function createEmptyForm(): TransactionForm {
  return {
    client_id: "",
    case_id: "",
    transaction_type: "invoice",
    amount: "",
    transaction_date: getToday(),
    description: "",
    reference: "",
  };
}

function formatMoney(value: string | number): string {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return "0.00 JOD";
  }

  return `${number.toFixed(2)} JOD`;
}

function formatDate(value: string): string {
  if (!value) {
    return "—";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTransactionTypeLabel(
  type: FinancialTransaction["transaction_type"],
): string {
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

function getTransactionTypeClasses(
  type: FinancialTransaction["transaction_type"],
): string {
  switch (type) {
    case "invoice":
      return "bg-blue-500/10 text-blue-300 ring-1 ring-inset ring-blue-500/20";

    case "payment":
      return "bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/20";

    case "expense":
      return "bg-amber-500/10 text-amber-300 ring-1 ring-inset ring-amber-500/20";

    case "refund":
      return "bg-purple-500/10 text-purple-300 ring-1 ring-inset ring-purple-500/20";

    default:
      return "bg-slate-500/10 text-slate-300 ring-1 ring-inset ring-slate-500/20";
  }
}

export default function FinancePage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);

  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);

  const [statistics, setStatistics] = useState<Statistics>(emptyStatistics);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingInitialData, setLoadingInitialData] = useState(true);

  const [error, setError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<FinancialTransaction | null>(null);

  const [form, setForm] = useState<TransactionForm>(createEmptyForm());

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formCases, setFormCases] = useState<CaseItem[]>([]);

  /*
   * Redirect the user through Next.js router.
   *
   * This replaces window.location.href and avoids the
   * @next/next/no-location-assign-relative-destination ESLint error.
   */
  const redirectToLogin = () => {
    router.push("/login");
  };

  /*
   * Load clients and cases needed by the finance page.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      setLoadingInitialData(true);

      try {
        const [clientsResponse, casesResponse] = await Promise.all([
          fetch("/api/auth/finance/clients/", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/auth/finance/cases/", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),
        ]);

        if (clientsResponse.status === 401 || casesResponse.status === 401) {
          if (!cancelled) {
            redirectToLogin();
          }

          return;
        }

        const clientsData = (await clientsResponse.json()) as ClientsResponse;

        const casesData = (await casesResponse.json()) as CasesResponse;

        if (!clientsResponse.ok) {
          throw new Error(clientsData.message || "Failed to load clients.");
        }

        if (!casesResponse.ok) {
          throw new Error(casesData.message || "Failed to load cases.");
        }

        if (cancelled) {
          return;
        }

        setClients(clientsData.clients || []);
        setCases(casesData.cases || []);
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error("Finance initial data error:", err);

        setError(
          err instanceof Error ? err.message : "Failed to load finance data.",
        );
      } finally {
        if (!cancelled) {
          setLoadingInitialData(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [router]);

  /*
   * Load transactions whenever the filters change.
   *
   * A small debounce prevents unnecessary requests while typing.
   */
  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      async function loadFilteredTransactions() {
        setLoading(true);
        setError("");

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

          const queryString = params.toString();

          const response = await fetch(
            `/api/auth/finance/${queryString ? `?${queryString}` : ""}`,
            {
              method: "GET",
              credentials: "include",
              cache: "no-store",
            },
          );

          if (response.status === 401) {
            if (!cancelled) {
              redirectToLogin();
            }

            return;
          }

          const data = (await response.json()) as TransactionsResponse;

          if (!response.ok) {
            throw new Error(data.message || "Failed to load transactions.");
          }

          if (cancelled) {
            return;
          }

          setTransactions(data.transactions || []);
          setStatistics(data.statistics || emptyStatistics);
        } catch (err) {
          if (cancelled) {
            return;
          }

          console.error("Finance transactions error:", err);

          setError(
            err instanceof Error ? err.message : "Failed to load transactions.",
          );

          setTransactions([]);
          setStatistics(emptyStatistics);
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      }

      void loadFilteredTransactions();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [router, search, typeFilter, clientFilter]);

  async function reloadTransactions() {
    setLoading(true);
    setError("");

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

      const queryString = params.toString();

      const response = await fetch(
        `/api/auth/finance/${queryString ? `?${queryString}` : ""}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      );

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      const data = (await response.json()) as TransactionsResponse;

      if (!response.ok) {
        throw new Error(data.message || "Failed to reload transactions.");
      }

      setTransactions(data.transactions || []);
      setStatistics(data.statistics || emptyStatistics);
    } catch (err) {
      console.error("Finance reload error:", err);

      setError(
        err instanceof Error ? err.message : "Failed to reload transactions.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadCasesForClient(clientId: string) {
    if (!clientId) {
      setFormCases([]);
      return;
    }

    const clientCases = cases.filter(
      (caseItem) => String(caseItem.client_id) === clientId,
    );

    setFormCases(clientCases);
  }

  function handleClientChange(clientId: string) {
    setForm((previous) => ({
      ...previous,
      client_id: clientId,
      case_id: "",
    }));

    void loadCasesForClient(clientId);
  }

  function openCreateModal() {
    setEditingTransaction(null);

    const newForm = createEmptyForm();

    setForm(newForm);
    setFormCases([]);

    setIsModalOpen(true);
  }

  function openEditModal(transaction: FinancialTransaction) {
    setEditingTransaction(transaction);

    const editForm: TransactionForm = {
      client_id: String(transaction.client_id),
      case_id: transaction.case_id ? String(transaction.case_id) : "",
      transaction_type: transaction.transaction_type,
      amount: transaction.amount,
      transaction_date: transaction.transaction_date,
      description: transaction.description || "",
      reference: transaction.reference || "",
    };

    setForm(editForm);

    const clientCases = cases.filter(
      (caseItem) => String(caseItem.client_id) === editForm.client_id,
    );

    setFormCases(clientCases);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setIsModalOpen(false);
    setEditingTransaction(null);
    setForm(createEmptyForm());
    setFormCases([]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.client_id) {
      setError("Please select a client.");
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    if (!form.transaction_date) {
      setError("Please select a transaction date.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        client_id: Number(form.client_id),
        case_id: form.case_id ? Number(form.case_id) : null,
        transaction_type: form.transaction_type,
        amount: form.amount,
        transaction_date: form.transaction_date,
        description: form.description.trim(),
        reference: form.reference.trim(),
      };

      const url = editingTransaction
        ? `/api/auth/finance/${editingTransaction.id}/`
        : "/api/auth/finance/";

      const method = editingTransaction ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.message ||
            (editingTransaction
              ? "Failed to update transaction."
              : "Failed to create transaction."),
        );
      }

      setIsModalOpen(false);
      setEditingTransaction(null);
      setForm(createEmptyForm());
      setFormCases([]);

      await reloadTransactions();
    } catch (err) {
      console.error("Finance save error:", err);

      setError(
        err instanceof Error ? err.message : "Failed to save transaction.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(transaction: FinancialTransaction) {
    const confirmed = window.confirm(
      `Are you sure you want to delete this ${getTransactionTypeLabel(
        transaction.transaction_type,
      ).toLowerCase()} of ${formatMoney(transaction.amount)}?`,
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/auth/finance/${transaction.id}/`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete transaction.");
      }

      await reloadTransactions();
    } catch (err) {
      console.error("Finance delete error:", err);

      setError(
        err instanceof Error ? err.message : "Failed to delete transaction.",
      );
    } finally {
      setDeleting(false);
    }
  }

  const filteredCasesForForm = useMemo(() => {
    if (!form.client_id) {
      return [];
    }

    return formCases;
  }, [form.client_id, formCases]);

  const hasTransactions = transactions.length > 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
              <span>Lawyer</span>
              <span>/</span>
              <span>Finance</span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">Finance</h1>

            <p className="mt-2 text-sm text-slate-400">
              Manage invoices, payments, expenses, refunds, and client balances.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            disabled={loadingInitialData}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="mr-2 text-lg">+</span>
            Add Transaction
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-300 transition hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* Statistics */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Invoices"
            value={formatMoney(statistics.total_invoices)}
            subtitle={`${statistics.total_transactions} total transactions`}
            icon="INV"
          />

          <SummaryCard
            title="Payments"
            value={formatMoney(statistics.total_payments)}
            subtitle="Received from clients"
            icon="PAY"
          />

          <SummaryCard
            title="Expenses"
            value={formatMoney(statistics.total_expenses)}
            subtitle="Recorded expenses"
            icon="EXP"
          />

          <SummaryCard
            title="Outstanding Balance"
            value={formatMoney(statistics.outstanding_balance)}
            subtitle="Based on current filters"
            icon="BAL"
          />
        </div>

        {/* Filters */}
        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Transactions</h2>
              <p className="text-sm text-slate-400">
                Search and filter financial records.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void reloadTransactions()}
              disabled={loading}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <label
                htmlFor="finance-search"
                className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400"
              >
                Search
              </label>

              <input
                id="finance-search"
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Client, reference, description..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="finance-type"
                className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400"
              >
                Transaction Type
              </label>

              <select
                id="finance-type"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
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
                className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400"
              >
                Client
              </label>

              <select
                id="finance-client"
                value={clientFilter}
                onChange={(event) => setClientFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
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
        </section>

        {/* Transaction table */}
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-950/60">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Date
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Client
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Case
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Type
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Amount
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Reference
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-sm text-slate-500"
                    >
                      Loading transactions...
                    </td>
                  </tr>
                ) : !hasTransactions ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <div className="mx-auto max-w-md">
                        <div className="mb-3 text-3xl">💰</div>

                        <h3 className="text-base font-semibold text-slate-200">
                          No transactions found
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          Add a financial transaction or change the current
                          filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="transition hover:bg-slate-800/30"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-300">
                        {formatDate(transaction.transaction_date)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="max-w-[220px] truncate text-sm font-medium text-slate-200">
                          {transaction.client_name}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {transaction.case_number ? (
                          <div className="max-w-[220px]">
                            <div className="truncate text-sm text-slate-300">
                              {transaction.case_number}
                            </div>

                            {transaction.case_title && (
                              <div className="truncate text-xs text-slate-500">
                                {transaction.case_title}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-600">
                            Not linked
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getTransactionTypeClasses(
                            transaction.transaction_type,
                          )}`}
                        >
                          {getTransactionTypeLabel(
                            transaction.transaction_type,
                          )}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <span className="text-sm font-semibold text-slate-100">
                          {formatMoney(transaction.amount)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="max-w-[180px] truncate text-sm text-slate-400">
                          {transaction.reference || "—"}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(transaction)}
                            className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-300"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDelete(transaction)}
                            disabled={deleting}
                            className="rounded-lg border border-red-500/20 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {editingTransaction ? "Edit Transaction" : "Add Transaction"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Record financial activity for a client.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-xl text-slate-500 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid gap-5 md:grid-cols-2">
                {/* Client */}
                <div>
                  <label
                    htmlFor="transaction-client"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Client *
                  </label>

                  <select
                    id="transaction-client"
                    value={form.client_id}
                    onChange={(event) => handleClientChange(event.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                  >
                    <option value="">Select client</option>

                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Case */}
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
                      setForm((previous) => ({
                        ...previous,
                        case_id: event.target.value,
                      }))
                    }
                    disabled={!form.client_id}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">
                      {form.client_id
                        ? "No case / General"
                        : "Select client first"}
                    </option>

                    {filteredCasesForForm.map((caseItem) => (
                      <option key={caseItem.id} value={caseItem.id}>
                        {caseItem.case_number} — {caseItem.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Transaction type */}
                <div>
                  <label
                    htmlFor="transaction-type"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Transaction Type *
                  </label>

                  <select
                    id="transaction-type"
                    value={form.transaction_type}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        transaction_type: event.target
                          .value as TransactionForm["transaction_type"],
                      }))
                    }
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                  >
                    <option value="invoice">Invoice</option>
                    <option value="payment">Payment</option>
                    <option value="expense">Expense</option>
                    <option value="refund">Refund</option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label
                    htmlFor="transaction-amount"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Amount (JOD) *
                  </label>

                  <input
                    id="transaction-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        amount: event.target.value,
                      }))
                    }
                    placeholder="0.00"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />
                </div>

                {/* Date */}
                <div>
                  <label
                    htmlFor="transaction-date"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Transaction Date *
                  </label>

                  <input
                    id="transaction-date"
                    type="date"
                    value={form.transaction_date}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        transaction_date: event.target.value,
                      }))
                    }
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                  />
                </div>

                {/* Reference */}
                <div>
                  <label
                    htmlFor="transaction-reference"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Reference
                  </label>

                  <input
                    id="transaction-reference"
                    type="text"
                    value={form.reference}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        reference: event.target.value,
                      }))
                    }
                    placeholder="Invoice #, receipt #, etc."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />
                </div>

                {/* Description */}
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
                      setForm((previous) => ({
                        ...previous,
                        description: event.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Add additional details..."
                    className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Form actions */}
              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || loadingInitialData}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingTransaction
                      ? "Save Changes"
                      : "Create Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
            {value}
          </p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold tracking-wide text-slate-400">
          {icon}
        </div>
      </div>

      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}
