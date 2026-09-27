"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import NotificationBell from "@/components/lawyer/NotificationBell";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

type Tab =
  | "overview"
  | "cases"
  | "hearings"
  | "documents"
  | "tasks"
  | "finance"
  | "activity";

type Client = {
  id: number;
  full_name: string;
  national_id: string;
  phone: string;
  alternative_phone?: string | null;
  client_type?: string | null;
  client_type_display?: string | null;
  email?: string | null;
  address?: string | null;
  date_of_birth?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: unknown;
};

type CaseType = {
  id: number;
  name: string;
  description?: string | null;
  is_active?: boolean;
};

type CaseItem = {
  id: number;
  case_number: string;
  title: string;
  client_id?: number | null;
  client?: {
    id: number;
    full_name: string;
  };
  case_type?: CaseType | string | null;
  case_type_id?: number | null;
  case_type_name?: string | null;
  status?: string | null;
  status_display?: string | null;
  priority?: string | null;
  priority_display?: string | null;
  court?: string | null;
  court_number?: string | null;
  judge?: string | null;
  opposing_party?: string | null;
  opposing_lawyer?: string | null;
  description?: string | null;
  opening_date?: string | null;
  closing_date?: string | null;
  assigned_lawyer?: {
    id: number;
    email?: string;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  assigned_lawyer_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type HearingItem = {
  id?: number;
  hearing_date?: string | null;
  date?: string | null;
  scheduled_date?: string | null;
  hearing_time?: string | null;
  time?: string | null;
  purpose?: string | null;
  type?: string | null;
  hearing_type?: string | null;
  status?: string | null;
  court?: string | null;
  judge?: string | null;
  result?: string | null;
  next_action?: string | null;
  notes?: string | null;
  case?: {
    id?: number;
    case_number?: string;
    title?: string;
  } | null;
  [key: string]: unknown;
};

type DocumentItem = {
  id?: number;
  name?: string | null;
  file_name?: string | null;
  title?: string | null;
  document_type?: string | null;
  type?: string | null;
  created_at?: string | null;
  uploaded_at?: string | null;
  [key: string]: unknown;
};

type TaskItem = {
  id?: number;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  deadline?: string | null;
  due_date?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
};

type FinancialTransaction = {
  id: number;
  description?: string | null;
  title?: string | null;
  transaction_type?: string | null;
  transaction_type_display?: string | null;
  type?: string | null;
  transaction_date?: string | null;
  date?: string | null;
  amount?: number | string | null;
  value?: number | string | null;
  client?: {
    id?: number;
    full_name?: string;
  } | null;
  case?: {
    id?: number;
    case_number?: string;
    title?: string;
  } | null;
  reference?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
};

type ActivityItem = {
  id?: number;
  title?: string | null;
  action?: string | null;
  event?: string | null;
  description?: string | null;
  created_at?: string | null;
  timestamp?: string | null;
  date?: string | null;
  [key: string]: unknown;
};

type Statistics = {
  cases?: number | null;
  hearings?: number | null;
  documents?: number | null;
  tasks?: number | null;
  transactions?: number | null;
  transaction_count?: number | null;
  total_invoiced?: number | string | null;
  total_paid?: number | string | null;
  total_expenses?: number | string | null;
  total_refunds?: number | string | null;
  balance?: number | string | null;
  total_cases?: number | null;
  active_cases?: number | null;
  total_hearings?: number | null;
  total_documents?: number | null;
  pending_tasks?: number | null;
  total_remaining?: number | null;
};

type ClientProfile = {
  client: Client;
  cases: CaseItem[];
  hearings: HearingItem[];
  documents: DocumentItem[];
  tasks: TaskItem[];
  transactions: FinancialTransaction[];
  financial_transactions: FinancialTransaction[];
  statistics: Statistics;
  activity: ActivityItem[];
};

type CaseForm = {
  case_number: string;
  title: string;
  case_type_id: string;
  status: string;
  priority: string;
  court: string;
  court_number: string;
  judge: string;
  opposing_party: string;
  opposing_lawyer: string;
  opening_date: string;
  closing_date: string;
  description: string;
  expense_amount: string;
  expense_description: string;
};

type EditForm = {
  full_name: string;
  national_id: string;
  phone: string;
  alternative_phone: string;
  client_type: string;
  email: string;
  address: string;
  date_of_birth: string;
  notes: string;
};

type FinanceForm = {
  transaction_type: string;
  case_id: string;
  amount: string;
  transaction_date: string;
  description: string;
  reference: string;
};

type UnknownRecord = Record<string, unknown>;

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "O" },
  { id: "cases", label: "Cases", icon: "C" },
  { id: "hearings", label: "Hearings", icon: "H" },
  { id: "documents", label: "Documents", icon: "D" },
  { id: "tasks", label: "Tasks", icon: "T" },
  { id: "finance", label: "Finance", icon: "$" },
  { id: "activity", label: "Activity", icon: "A" },
];

const emptyCaseForm: CaseForm = {
  case_number: "",
  title: "",
  case_type_id: "",
  status: "new",
  priority: "medium",
  court: "",
  court_number: "",
  judge: "",
  opposing_party: "",
  opposing_lawyer: "",
  opening_date: new Date().toISOString().slice(0, 10),
  closing_date: "",
  description: "",
  expense_amount: "",
  expense_description: "",
};

const emptyFinanceForm: FinanceForm = {
  transaction_type: "invoice",
  case_id: "",
  amount: "",
  transaction_date: new Date().toISOString().slice(0, 10),
  description: "",
  reference: "",
};

const sidebarItems = [
  { label: "Dashboard", href: "/lawyer" },
  { label: "Clients", href: "/lawyer/clients", active: true },
  { label: "Cases", href: "/lawyer/cases" },
  { label: "Hearings", href: "/lawyer/hearings" },
  { label: "Documents", href: "/lawyer/documents" },
  { label: "Tasks", href: "/lawyer/tasks" },
  { label: "Finance", href: "/lawyer/finance" },
];

export default function ClientProfilePage() {
  const params = useParams();
  const clientId = String(params.id);

  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editOpen, setEditOpen] = useState(false);

  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [caseEditMode, setCaseEditMode] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState<number | null>(null);
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);

  const [caseTypes, setCaseTypes] = useState<CaseType[]>([]);
  const [caseTypesLoading, setCaseTypesLoading] = useState(false);
  const [caseForm, setCaseForm] = useState<CaseForm>(emptyCaseForm);
  const [caseSaving, setCaseSaving] = useState(false);
  const [caseError, setCaseError] = useState("");
  const [caseSuccess, setCaseSuccess] = useState("");

  const [financeModalOpen, setFinanceModalOpen] = useState(false);
  const [financeForm, setFinanceForm] = useState<FinanceForm>(emptyFinanceForm);
  const [financeSaving, setFinanceSaving] = useState(false);
  const [financeError, setFinanceError] = useState("");
  const [financeSuccess, setFinanceSuccess] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/auth/clients/${clientId}/profile/`, {
        credentials: "include",
        cache: "no-store",
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          getApiMessage(data) || "Unable to load the client profile.",
        );
      }

      setProfile(normalizeProfile(data));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load the client profile.",
      );
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    let cancelled = false;

    const fetchInitialProfile = async () => {
      try {
        const response = await fetch(`/api/auth/clients/${clientId}/profile/`, {
          credentials: "include",
          cache: "no-store",
        });

        const data: unknown = await response.json();

        if (!response.ok || isApiFailure(data)) {
          throw new Error(
            getApiMessage(data) || "Failed to load the client profile.",
          );
        }

        const normalized = normalizeProfile(data);

        if (!cancelled) {
          setProfile(normalized);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Failed to load the client profile.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchInitialProfile();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const reloadProfile = useCallback(async () => {
    try {
      const response = await fetch(`/api/auth/clients/${clientId}/profile/`, {
        credentials: "include",
        cache: "no-store",
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          getApiMessage(data) || "Unable to refresh the client profile.",
        );
      }

      const normalized = normalizeProfile(data);
      setProfile(normalized);

      if (selectedCase) {
        const refreshedCase = normalized.cases.find(
          (item) => item.id === selectedCase.id,
        );

        setSelectedCase(refreshedCase || null);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to refresh the client profile.",
      );
    }
  }, [clientId, selectedCase]);

  const loadCaseTypes = useCallback(async () => {
    if (caseTypes.length > 0) {
      return;
    }

    setCaseTypesLoading(true);

    try {
      const response = await fetch("/api/auth/cases/types/", {
        credentials: "include",
        cache: "no-store",
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        throw new Error(getApiMessage(data) || "Unable to load case types.");
      }

      setCaseTypes(getCaseTypesFromResponse(data));
    } catch (requestError) {
      setCaseError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load case types.",
      );
    } finally {
      setCaseTypesLoading(false);
    }
  }, [caseTypes.length]);

  const openNewCaseModal = () => {
    setCaseEditMode(false);
    setEditingCaseId(null);
    setSelectedCase(null);
    setCaseForm({
      ...emptyCaseForm,
      opening_date: new Date().toISOString().slice(0, 10),
    });
    setCaseError("");
    setCaseSuccess("");
    setCaseModalOpen(true);

    if (caseTypes.length === 0) {
      void loadCaseTypes();
    }
  };

  const openEditCaseModal = (caseItem: CaseItem) => {
    setCaseEditMode(true);
    setEditingCaseId(caseItem.id);
    setSelectedCase(null);

    setCaseForm({
      case_number: caseItem.case_number || "",
      title: caseItem.title || "",
      case_type_id: caseItem.case_type_id ? String(caseItem.case_type_id) : "",
      status: caseItem.status || "new",
      priority: caseItem.priority || "medium",
      court: caseItem.court || "",
      court_number: caseItem.court_number || "",
      judge: caseItem.judge || "",
      opposing_party: caseItem.opposing_party || "",
      opposing_lawyer: caseItem.opposing_lawyer || "",
      opening_date: caseItem.opening_date || "",
      closing_date: caseItem.closing_date || "",
      description: caseItem.description || "",
      expense_amount: "",
      expense_description: "",
    });

    setCaseError("");
    setCaseSuccess("");
    setCaseModalOpen(true);

    if (caseTypes.length === 0) {
      void loadCaseTypes();
    }
  };

  const saveCase = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setCaseError("");
    setCaseSuccess("");

    if (!caseForm.case_number.trim()) {
      setCaseError("Case number is required.");
      return;
    }

    if (!caseForm.title.trim()) {
      setCaseError("Case title is required.");
      return;
    }

    if (!caseForm.opening_date) {
      setCaseError("Opening date is required.");
      return;
    }

    if (caseEditMode && !editingCaseId) {
      setCaseError("The case being edited could not be identified.");
      return;
    }

    if (!caseEditMode && caseForm.expense_amount.trim()) {
      const expenseAmount = Number(caseForm.expense_amount);

      if (!Number.isFinite(expenseAmount) || expenseAmount <= 0) {
        setCaseError("Expense amount must be greater than 0.");
        return;
      }
    }

    setCaseSaving(true);

    try {
      const payload = {
        case_number: caseForm.case_number.trim(),
        title: caseForm.title.trim(),
        client_id: Number(clientId),
        case_type_id: caseForm.case_type_id
          ? Number(caseForm.case_type_id)
          : null,
        status: caseEditMode ? caseForm.status : "new",
        priority: caseForm.priority,
        court: caseForm.court.trim(),
        court_number: caseForm.court_number.trim(),
        judge: caseForm.judge.trim(),
        opposing_party: caseForm.opposing_party.trim(),
        opposing_lawyer: caseForm.opposing_lawyer.trim(),
        opening_date: caseForm.opening_date,
        closing_date: caseForm.closing_date || null,
        description: caseForm.description.trim(),
      };

      const endpoint = caseEditMode
        ? `/api/auth/cases/${editingCaseId}/`
        : "/api/auth/cases/";

      const response = await fetch(endpoint, {
        method: caseEditMode ? "PUT" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data: unknown = await response.json();

      if (!response.ok || isApiFailure(data)) {
        throw new Error(
          getApiMessage(data) ||
            `Unable to ${caseEditMode ? "update" : "create"} the case.`,
        );
      }

      /*
       * Only create an expense when creating a NEW case.
       * Editing an existing case never creates a new finance transaction.
       */
      if (!caseEditMode && caseForm.expense_amount.trim()) {
        const createdCase =
          typeof data === "object" &&
          data !== null &&
          "case" in data &&
          typeof data.case === "object" &&
          data.case !== null
            ? data.case
            : null;

        const createdCaseId =
          createdCase &&
          "id" in createdCase &&
          typeof createdCase.id === "number"
            ? createdCase.id
            : null;

        if (!createdCaseId) {
          throw new Error(
            "Case was created, but the new case ID was not returned. The expense was not recorded.",
          );
        }

        const expenseResponse = await fetch("/api/auth/finance/", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: Number(clientId),
            case_id: createdCaseId,
            transaction_type: "expense",
            amount: Number(caseForm.expense_amount),
            transaction_date: caseForm.opening_date,
            description: caseForm.expense_description.trim(),
            reference: "",
          }),
        });

        const expenseData: unknown = await expenseResponse.json();

        if (!expenseResponse.ok || isApiFailure(expenseData)) {
          throw new Error(
            `Case created successfully, but the expense was not recorded. ${
              getApiMessage(expenseData) || ""
            }`.trim(),
          );
        }
      }

      setCaseSuccess(
        caseEditMode
          ? "Case updated successfully."
          : caseForm.expense_amount.trim()
            ? "Case and expense created successfully."
            : "Case created successfully.",
      );

      await reloadProfile();
      setActiveTab("cases");

      window.setTimeout(() => {
        setCaseModalOpen(false);
        setCaseSuccess("");
      }, 700);
    } catch (requestError) {
      setCaseError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save the case.",
      );
    } finally {
      setCaseSaving(false);
    }
  };

  const openFinanceModal = () => {
    setFinanceForm({
      ...emptyFinanceForm,
      transaction_date: new Date().toISOString().slice(0, 10),
    });
    setFinanceError("");
    setFinanceSuccess("");
    setFinanceModalOpen(true);
  };

  const saveFinanceTransaction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setFinanceError("");
    setFinanceSuccess("");

    if (!financeForm.transaction_type) {
      setFinanceError("Transaction type is required.");
      return;
    }

    if (!financeForm.amount || Number(financeForm.amount) <= 0) {
      setFinanceError("Enter an amount greater than zero.");
      return;
    }

    if (!financeForm.transaction_date) {
      setFinanceError("Transaction date is required.");
      return;
    }

    setFinanceSaving(true);

    try {
      const response = await fetch("/api/auth/finance/transactions/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: Number(clientId),
          case_id: financeForm.case_id ? Number(financeForm.case_id) : null,
          transaction_type: financeForm.transaction_type,
          amount: financeForm.amount,
          transaction_date: financeForm.transaction_date,
          description: financeForm.description.trim(),
          reference: financeForm.reference.trim(),
        }),
      });

      const data: unknown = await response.json();

      if (!response.ok || isApiFailure(data)) {
        throw new Error(
          getApiMessage(data) || "Unable to save the transaction.",
        );
      }

      setFinanceSuccess("Transaction added successfully.");

      await reloadProfile();

      window.setTimeout(() => {
        setFinanceModalOpen(false);
        setFinanceSuccess("");
      }, 700);
    } catch (requestError) {
      setFinanceError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save the transaction.",
      );
    } finally {
      setFinanceSaving(false);
    }
  };

  const updateClient = async (form: EditForm) => {
    const response = await fetch(`/api/auth/clients/${clientId}/`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        full_name: form.full_name.trim(),
        national_id: form.national_id.trim(),
        phone: form.phone.trim(),
        alternative_phone: form.alternative_phone.trim(),
        client_type: form.client_type,
        email: form.email.trim(),
        address: form.address.trim(),
        date_of_birth: form.date_of_birth || null,
        notes: form.notes.trim(),
      }),
    });

    const data: unknown = await response.json();

    if (!response.ok || isApiFailure(data)) {
      throw new Error(getApiMessage(data) || "Unable to update the client.");
    }

    if (!isClient(data)) {
      const record = asRecord(data);
      const updatedClient = record?.client;

      if (!isClient(updatedClient)) {
        throw new Error("The server returned an invalid client.");
      }

      setProfile((current) =>
        current
          ? {
              ...current,
              client: updatedClient,
            }
          : current,
      );
    } else {
      setProfile((current) =>
        current
          ? {
              ...current,
              client: data,
            }
          : current,
      );
    }

    setEditOpen(false);
  };

  if (loading) {
    return <LoadingState />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Sidebar />

        <div className="lg:pl-64">
          <TopHeader title="Client Profile" />

          <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-6">
              <p className="text-sm font-semibold text-red-300">
                {error || "Client profile could not be loaded."}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void loadProfile()}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  Try Again
                </button>

                <Link
                  href="/lawyer/clients"
                  className="rounded-xl border border-slate-300 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-400 transition hover:bg-slate-800"
                >
                  Back to Clients
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const { client, cases, hearings, documents, tasks, statistics, activity } =
    profile;

  const transactions = profile.transactions || profile.financial_transactions;

  const activeCases =
    statistics.active_cases ??
    cases.filter((item) => String(item.status || "").toLowerCase() === "active")
      .length;

  const balance = Number(statistics.total_remaining ?? statistics.balance ?? 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />

      <div className="lg:pl-64">
        <TopHeader title="Client Profile" />

        <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto max-w-[1600px] space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Link
                href="/lawyer/clients"
                className="text-slate-500 transition hover:text-blue-400"
              >
                Clients
              </Link>

              <span className="text-slate-500">/</span>

              <span className="max-w-[280px] truncate font-medium text-slate-400">
                {client.full_name}
              </span>
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl shadow-black/10">
              <div className="h-1.5 bg-blue-600" />

              <div className="p-5 sm:p-6 lg:p-7">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex min-w-0 items-center gap-4 sm:gap-5">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-600/10 text-xl font-bold text-blue-400">
                      {getInitials(client.full_name)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h1 className="truncate text-2xl font-bold tracking-tight text-white sm:text-3xl">
                          {client.full_name}
                        </h1>

                        <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-400">
                          Active Client
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
                        <span>
                          National ID:{" "}
                          <span className="text-slate-500">
                            {client.national_id || "Not provided"}
                          </span>
                        </span>

                        <span>
                          Phone:{" "}
                          <span className="text-slate-500">
                            {client.phone || "Not provided"}
                          </span>
                        </span>

                        <span>
                          Type:{" "}
                          <span className="text-slate-500">
                            {client.client_type_display ||
                              client.client_type ||
                              "Individual"}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/lawyer/clients"
                      className="rounded-xl border border-slate-300 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
                    >
                      Back
                    </Link>

                    <button
                      type="button"
                      onClick={() => setEditOpen(true)}
                      className="rounded-xl border border-slate-300 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-400 transition hover:border-blue-500/50 hover:bg-slate-800 hover:text-white"
                    >
                      Edit Client
                    </button>

                    <button
                      type="button"
                      onClick={openNewCaseModal}
                      className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
                    >
                      + New Case
                    </button>

                    <button
                      type="button"
                      onClick={openFinanceModal}
                      className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm font-semibold text-blue-400 transition hover:bg-blue-500/20"
                    >
                      + Transaction
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {error && (
              <div className="rounded-2xl border border-red-900/60 bg-red-950/30 px-5 py-4">
                <p className="text-sm font-medium text-red-300">{error}</p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              <MetricCard
                label="Total Cases"
                value={statistics.total_cases ?? cases.length}
                description="Cases associated with this client"
                icon="C"
              />

              <MetricCard
                label="Active Cases"
                value={activeCases}
                description="Currently active matters"
                icon="A"
              />

              <MetricCard
                label="Hearings"
                value={statistics.total_hearings ?? hearings.length}
                description="Court hearings and events"
                icon="H"
              />

              <MetricCard
                label="Documents"
                value={statistics.total_documents ?? documents.length}
                description="Client-related documents"
                icon="D"
              />

              <MetricCard
                label="Pending Tasks"
                value={statistics.pending_tasks ?? tasks.length}
                description="Tasks requiring attention"
                icon="T"
              />

              <MetricCard
                label="Balance"
                value={formatCurrency(balance)}
                description="Current financial balance"
                icon="$"
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <div className="flex overflow-x-auto border-b border-slate-800">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex min-w-fit items-center gap-2 border-b-2 px-4 py-4 text-sm font-semibold transition sm:px-5 ${
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-400"
                        : "border-transparent text-slate-500 hover:bg-slate-800 hover:text-slate-400"
                    }`}
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-md border border-current text-[10px] font-bold">
                      {tab.icon}
                    </span>
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-5 sm:p-6 lg:p-7">
                {activeTab === "overview" && (
                  <OverviewTab
                    client={client}
                    cases={cases}
                    hearings={hearings}
                    tasks={tasks}
                  />
                )}

                {activeTab === "cases" && (
                  <CasesTab
                    cases={cases}
                    onNewCase={openNewCaseModal}
                    onEditCase={openEditCaseModal}
                    onSelectCase={setSelectedCase}
                  />
                )}

                {activeTab === "hearings" && (
                  <HearingsTab hearings={hearings} />
                )}

                {activeTab === "documents" && (
                  <DocumentsTab documents={documents} />
                )}

                {activeTab === "tasks" && <TasksTab tasks={tasks} />}

                {activeTab === "finance" && (
                  <FinanceTab
                    transactions={transactions}
                    statistics={statistics}
                    onAddTransaction={openFinanceModal}
                  />
                )}

                {activeTab === "activity" && (
                  <ActivityTab activity={activity} />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {editOpen && (
        <EditClientModal
          client={client}
          onClose={() => setEditOpen(false)}
          onSave={updateClient}
        />
      )}

      {caseModalOpen && (
        <CaseModal
          form={caseForm}
          setForm={setCaseForm}
          editMode={caseEditMode}
          saving={caseSaving}
          error={caseError}
          success={caseSuccess}
          caseTypes={caseTypes}
          caseTypesLoading={caseTypesLoading}
          onClose={() => setCaseModalOpen(false)}
          onSubmit={saveCase}
        />
      )}

      {financeModalOpen && (
        <FinanceTransactionModal
          form={financeForm}
          setForm={setFinanceForm}
          cases={cases}
          saving={financeSaving}
          error={financeError}
          success={financeSuccess}
          onClose={() => setFinanceModalOpen(false)}
          onSubmit={saveFinanceTransaction}
        />
      )}

      {selectedCase && (
        <CaseDetailsModal
          caseItem={selectedCase}
          onClose={() => setSelectedCase(null)}
          onEdit={() => openEditCaseModal(selectedCase)}
        />
      )}
    </div>
  );
}

/* =========================================================
   SIDEBAR / HEADER
========================================================= */

function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-800 bg-slate-950 lg:flex lg:flex-col">
      <div className="flex h-20 items-center border-b border-slate-800 px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">
            LF
          </div>

          <div>
            <p className="font-bold text-white">LawFirm</p>
            <p className="text-[11px] text-slate-500">Management System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {sidebarItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              item.active
                ? "bg-blue-600/10 text-blue-400"
                : "text-slate-500 hover:bg-slate-900 hover:text-slate-100"
            }`}
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold ${
                item.active
                  ? "bg-blue-600 text-white"
                  : "border border-slate-800 bg-slate-900 text-slate-500"
              }`}
            >
              {getNavIcon(item.label)}
            </span>

            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
          <p className="text-xs font-semibold text-slate-500">
            Lawyer Workspace
          </p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            Manage clients, cases, hearings, documents and finances.
          </p>
        </div>
      </div>
    </aside>
  );
}

function TopHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 min-h-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="flex min-h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            Lawyer Workspace
          </p>

          <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationBell />

          <div className="hidden rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-500 sm:block">
            Secure Legal Management
          </div>
        </div>
      </div>
    </header>
  );
}

/* =========================================================
   OVERVIEW
========================================================= */

function OverviewTab({
  client,
  cases,
  hearings,
  tasks,
}: {
  client: Client;
  cases: CaseItem[];
  hearings: HearingItem[];
  tasks: TaskItem[];
}) {
  return (
    <div className="space-y-8">
      <SectionHeading
        title="Client overview"
        description="Personal information, case activity and current client status."
      />

      <div className="grid gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
          <h3 className="font-bold text-white">Personal Information</h3>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem label="Full Name" value={client.full_name} />
            <InfoItem label="National ID" value={client.national_id} />
            <InfoItem label="Phone" value={client.phone} />
            <InfoItem
              label="Alternative Phone"
              value={client.alternative_phone}
            />
            <InfoItem label="Email" value={client.email} />
            <InfoItem
              label="Client Type"
              value={client.client_type_display || client.client_type}
            />
            <InfoItem label="Date of Birth" value={client.date_of_birth} />
            <InfoItem label="Address" value={client.address} />
            <InfoItem label="Created" value={formatDate(client.created_at)} />
          </div>
        </div>


      </div>

      {client.notes && (
        <div className="rounded-2xl border border-blue-900/60 bg-blue-950/30 p-5">
          <h3 className="font-bold text-blue-400">Client Notes</h3>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-500">
            {client.notes}
          </p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <PreviewCases cases={cases} />
        <PreviewHearings hearings={hearings} />
      </div>

      <PreviewTasks tasks={tasks} />
    </div>
  );
}

/* =========================================================
   CASES
========================================================= */

function CasesTab({
  cases,
  onNewCase,
  onEditCase,
  onSelectCase,
}: {
  cases: CaseItem[];
  onNewCase: () => void;
  onEditCase: (caseItem: CaseItem) => void;
  onSelectCase: (caseItem: CaseItem) => void;
}) {
  return (
    <div>
      <SectionHeading
        title="Client cases"
        description="All legal matters associated with this client."
        action={
          <button
            type="button"
            onClick={onNewCase}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            + New Case
          </button>
        }
      />

      {cases.length === 0 ? (
        <EmptyState
          icon="C"
          title="No cases"
          description="This client does not have any cases yet."
          action={
            <button
              type="button"
              onClick={onNewCase}
              className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Create First Case
            </button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left">
              <thead className="bg-slate-950">
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4 font-semibold">Case</th>
                  <th className="px-5 py-4 font-semibold">Type</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Priority</th>
                  <th className="px-5 py-4 font-semibold">Court</th>
                  <th className="px-5 py-4 font-semibold">Opening</th>
                  <th className="px-5 py-4 text-right font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {cases.map((caseItem) => (
                  <tr
                    key={caseItem.id}
                    className="bg-slate-900/30 transition hover:bg-slate-900"
                  >
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => onSelectCase(caseItem)}
                        className="text-left"
                      >
                        <p className="font-semibold text-white hover:text-blue-400">
                          {caseItem.case_number}
                        </p>
                        <p className="mt-1 max-w-[260px] truncate text-xs text-slate-500">
                          {caseItem.title}
                        </p>
                      </button>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-500">
                      {getCaseTypeName(caseItem) || "Not specified"}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge
                        value={caseItem.status_display || caseItem.status}
                      />
                    </td>

                    <td className="px-5 py-4">
                      <PriorityBadge
                        value={caseItem.priority_display || caseItem.priority}
                      />
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-500">
                      {caseItem.court || "Not specified"}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-500">
                      {formatDate(caseItem.opening_date)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => onEditCase(caseItem)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-blue-500/50 hover:bg-slate-800 hover:text-white"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   HEARINGS
========================================================= */

function HearingsTab({ hearings }: { hearings: HearingItem[] }) {
  return (
    <div>
      <SectionHeading
        title="Hearings"
        description="Court hearings and scheduled events connected to this client."
      />

      {hearings.length === 0 ? (
        <EmptyState
          icon="H"
          title="No hearings"
          description="No hearings have been recorded for this client yet."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {hearings.map((hearing, index) => {
            const hearingDate =
              hearing.hearing_date || hearing.date || hearing.scheduled_date;

            const hearingTime = hearing.hearing_time || hearing.time;

            return (
              <div
                key={hearing.id ?? index}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
              >
                <div className="flex gap-4">
                  <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900">
                    {hearingDate ? (
                      <>
                        <span className="text-[10px] font-bold uppercase text-blue-400">
                          {formatMonth(hearingDate)}
                        </span>
                        <span className="text-xl font-bold text-white">
                          {formatDay(hearingDate)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] font-bold uppercase text-amber-400">
                          DATE
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          Pending
                        </span>
                      </>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-white">
                          {hearing.purpose ||
                            hearing.type ||
                            hearing.hearing_type ||
                            "Court Hearing"}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {hearing.case?.case_number
                            ? `${hearing.case.case_number} — ${
                                hearing.case.title || ""
                              }`
                            : "Client hearing"}
                        </p>
                      </div>

                      <StatusBadge value={hearing.status} />
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <InfoItem label="Date" value={formatDate(hearingDate)} />

                      <InfoItem
                        label="Time"
                        value={hearingTime || "Not scheduled"}
                      />

                      <InfoItem label="Court" value={hearing.court} />

                      <InfoItem label="Judge" value={hearing.judge} />
                    </div>
                  </div>
                </div>

                {(hearing.result || hearing.next_action || hearing.notes) && (
                  <div className="mt-5 space-y-3 border-t border-slate-800 pt-4">
                    {hearing.result && (
                      <InfoItem label="Result" value={hearing.result} />
                    )}

                    {hearing.next_action && (
                      <InfoItem
                        label="Next Action"
                        value={hearing.next_action}
                      />
                    )}

                    {hearing.notes && (
                      <InfoItem label="Notes" value={hearing.notes} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   DOCUMENTS
========================================================= */

function DocumentsTab({ documents }: { documents: DocumentItem[] }) {
  return (
    <div>
      <SectionHeading
        title="Documents"
        description="Documents and files associated with this client."
        action={
          <button
            type="button"
            className="rounded-xl border border-slate-300 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:border-blue-500/50 hover:bg-slate-800 hover:text-white"
          >
            + Upload Document
          </button>
        }
      />

      {documents.length === 0 ? (
        <EmptyState
          icon="D"
          title="No documents"
          description="No documents have been uploaded for this client yet."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {documents.map((document, index) => {
            const name =
              document.name ||
              document.file_name ||
              document.title ||
              `Document #${document.id ?? index + 1}`;

            return (
              <div
                key={document.id ?? index}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm transition hover:border-slate-300 hover:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-sm font-bold text-blue-400">
                    D
                  </div>

                  <span className="rounded-full border border-slate-300 bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-500">
                    {document.document_type || document.type || "Document"}
                  </span>
                </div>

                <h3 className="mt-5 truncate font-semibold text-white">
                  {name}
                </h3>

                <p className="mt-2 text-xs text-slate-500">
                  {formatDate(document.created_at || document.uploaded_at)}
                </p>

                <button
                  type="button"
                  className="mt-5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-800 hover:text-white"
                >
                  View Document
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   TASKS
========================================================= */

function TasksTab({ tasks }: { tasks: TaskItem[] }) {
  return (
    <div>
      <SectionHeading
        title="Tasks"
        description="Tasks and follow-up work associated with this client."
      />

      {tasks.length === 0 ? (
        <EmptyState
          icon="T"
          title="No tasks"
          description="No tasks have been recorded for this client yet."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tasks.map((task, index) => (
            <div
              key={task.id ?? index}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-white">
                  {task.title || task.name || `Task #${task.id ?? index + 1}`}
                </h3>

                <PriorityBadge value={task.priority} />
              </div>

              <div className="mt-3">
                <StatusBadge value={task.status} />
              </div>

              {task.description && (
                <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-500">
                  {task.description}
                </p>
              )}

              <div className="mt-5 border-t border-slate-800 pt-4">
                <InfoItem
                  label="Deadline"
                  value={formatDate(task.deadline || task.due_date)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   FINANCE
========================================================= */

function FinanceTab({
  transactions,
  statistics,
  onAddTransaction,
}: {
  transactions: FinancialTransaction[];
  statistics: Statistics;
  onAddTransaction: () => void;
}) {
  const totalInvoiced = Number(statistics.total_invoiced || 0);
  const totalPaid = Number(statistics.total_paid || 0);
  const totalExpenses = Number(statistics.total_expenses || 0);
  const totalRefunds = Number(statistics.total_refunds || 0);
  const balance = Number(statistics.total_remaining ?? statistics.balance ?? 0);

  return (
    <div>
      <SectionHeading
        title="Financial overview"
        description="Invoices, payments, expenses and refunds for this client."
        action={
          <button
            type="button"
            onClick={onAddTransaction}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            + Add Transaction
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <FinanceCard label="Invoiced" value={formatCurrency(totalInvoiced)} />

        <FinanceCard label="Paid" value={formatCurrency(totalPaid)} />

        <FinanceCard label="Expenses" value={formatCurrency(totalExpenses)} />

        <FinanceCard label="Refunds" value={formatCurrency(totalRefunds)} />

        <FinanceCard label="Outstanding" value={formatCurrency(balance)} />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800">
        <div className="border-b border-slate-800 bg-slate-950 px-5 py-4">
          <h3 className="font-bold text-white">Transactions</h3>
        </div>

        {transactions.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon="$"
              title="No transactions"
              description="No financial transactions have been recorded for this client."
              action={
                <button
                  type="button"
                  onClick={onAddTransaction}
                  className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  Add First Transaction
                </button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left">
              <thead className="bg-slate-950">
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4 font-semibold">Description</th>
                  <th className="px-5 py-4 font-semibold">Type</th>
                  <th className="px-5 py-4 font-semibold">Case</th>
                  <th className="px-5 py-4 font-semibold">Date</th>
                  <th className="px-5 py-4 text-right font-semibold">Amount</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {transactions.map((transaction, index) => {
                  const type =
                    transaction.transaction_type_display ||
                    transaction.transaction_type ||
                    transaction.type ||
                    "Transaction";

                  const amount = Number(
                    transaction.amount ?? transaction.value ?? 0,
                  );

                  return (
                    <tr
                      key={transaction.id ?? index}
                      className="bg-slate-900/30 transition hover:bg-slate-900"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-white">
                          {transaction.description ||
                            transaction.title ||
                            "Financial transaction"}
                        </p>

                        {transaction.reference && (
                          <p className="mt-1 text-xs text-slate-500">
                            Ref: {transaction.reference}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <TransactionBadge value={type} />
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-500">
                        {transaction.case?.case_number ? (
                          <div>
                            <p className="font-medium text-slate-500">
                              {transaction.case.case_number}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {transaction.case.title}
                            </p>
                          </div>
                        ) : (
                          "Client-level"
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-500">
                        {formatDate(
                          transaction.transaction_date ||
                            transaction.date ||
                            transaction.created_at,
                        )}
                      </td>

                      <td className="px-5 py-4 text-right font-semibold text-white">
                        {formatCurrency(amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   ACTIVITY
========================================================= */

function ActivityTab({ activity }: { activity: ActivityItem[] }) {
  return (
    <div>
      <SectionHeading
        title="Activity timeline"
        description="Recent activity and changes related to this client."
      />

      {activity.length === 0 ? (
        <EmptyState
          icon="A"
          title="No activity"
          description="No activity has been recorded for this client yet."
        />
      ) : (
        <div className="relative ml-3 border-l border-slate-800 pl-7">
          <div className="space-y-8">
            {activity.map((item, index) => (
              <div key={item.id ?? index} className="relative">
                <span className="absolute -left-[35px] top-1.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-blue-500" />

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-semibold text-white">
                      {item.title || item.action || item.event || "Activity"}
                    </h3>

                    <span className="text-xs text-slate-500">
                      {formatDateTime(
                        item.created_at || item.timestamp || item.date,
                      )}
                    </span>
                  </div>

                  {item.description && (
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   PREVIEWS
========================================================= */

function PreviewCases({ cases }: { cases: CaseItem[] }) {
  const preview = cases.slice(0, 4);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
      <h3 className="font-bold text-white">Recent Cases</h3>

      <p className="mt-1 text-xs text-slate-500">
        Latest cases associated with the client.
      </p>

      <div className="mt-5 space-y-3">
        {preview.length === 0 ? (
          <p className="text-sm text-slate-500">No cases available.</p>
        ) : (
          preview.map((item, index) => (
            <div
              key={item.id ?? index}
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">
                  {item.case_number || `Case #${item.id ?? index + 1}`}
                </p>

                <p className="mt-1 truncate text-xs text-slate-500">
                  {getCaseTypeName(item) || "Legal case"}
                </p>
              </div>

              <StatusBadge value={item.status_display || item.status} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PreviewHearings({ hearings }: { hearings: HearingItem[] }) {
  const preview = hearings.slice(0, 4);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
      <h3 className="font-bold text-white">Upcoming Hearings</h3>

      <p className="mt-1 text-xs text-slate-500">
        Scheduled hearings and court events.
      </p>

      <div className="mt-5 space-y-3">
        {preview.length === 0 ? (
          <p className="text-sm text-slate-500">No hearings available.</p>
        ) : (
          preview.map((hearing, index) => {
            const date =
              hearing.hearing_date || hearing.date || hearing.scheduled_date;

            return (
              <div
                key={hearing.id ?? index}
                className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-slate-300 bg-slate-950">
                  {date ? (
                    <>
                      <span className="text-[9px] font-bold uppercase text-blue-400">
                        {formatMonth(date)}
                      </span>

                      <span className="text-sm font-bold text-white">
                        {formatDay(date)}
                      </span>
                    </>
                  ) : (
                    <span className="text-[8px] font-bold uppercase text-amber-400">
                      Pending
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {hearing.purpose || hearing.type || "Court Hearing"}
                  </p>

                  <p className="mt-1 truncate text-xs text-slate-500">
                    {hearing.court || "Court not specified"}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function PreviewTasks({ tasks }: { tasks: TaskItem[] }) {
  const preview = tasks.slice(0, 4);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
      <h3 className="font-bold text-white">Open Tasks</h3>

      <p className="mt-1 text-xs text-slate-500">Tasks requiring attention.</p>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {preview.length === 0 ? (
          <p className="text-sm text-slate-500">No tasks available.</p>
        ) : (
          preview.map((task, index) => (
            <div
              key={task.id ?? index}
              className="rounded-xl border border-slate-800 bg-slate-950 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-white">
                  {task.title || task.name || `Task #${task.id ?? index + 1}`}
                </p>

                <PriorityBadge value={task.priority} />
              </div>

              <div className="mt-3">
                <StatusBadge value={task.status} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* =========================================================
   EDIT CLIENT MODAL
========================================================= */

function EditClientModal({
  client,
  onClose,
  onSave,
}: {
  client: Client;
  onClose: () => void;
  onSave: (form: EditForm) => Promise<void>;
}) {
  const [form, setForm] = useState<EditForm>({
    full_name: client.full_name || "",
    national_id: client.national_id || "",
    phone: client.phone || "",
    alternative_phone: client.alternative_phone || "",
    client_type: client.client_type || "individual",
    email: client.email || "",
    address: client.address || "",
    date_of_birth: client.date_of_birth || "",
    notes: client.notes || "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateField = <K extends keyof EditForm>(
    field: K,
    value: EditForm[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!form.full_name.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!form.national_id.trim()) {
      setError("National ID is required.");
      return;
    }

    if (!form.phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    setSaving(true);

    try {
      await onSave(form);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update the client.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Edit Client"
      description="Update the client's personal and contact information."
      onClose={onClose}
      wide
    >
      <form onSubmit={submit}>
        <div className="p-6">
          {error && <ModalError message={error} />}

          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Full Name"
              required
              value={form.full_name}
              onChange={(value) => updateField("full_name", value)}
              placeholder="Client full name"
            />

            <FormField
              label="National ID"
              required
              value={form.national_id}
              onChange={(value) => updateField("national_id", value)}
              placeholder="National ID"
            />

            <FormField
              label="Phone"
              required
              value={form.phone}
              onChange={(value) => updateField("phone", value)}
              placeholder="Phone number"
            />

            <FormField
              label="Alternative Phone"
              value={form.alternative_phone}
              onChange={(value) => updateField("alternative_phone", value)}
              placeholder="Alternative phone"
            />

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-500">
                Client Type
              </label>

              <select
                value={form.client_type}
                onChange={(event) =>
                  updateField("client_type", event.target.value)
                }
                className={darkInputClass}
              >
                <option value="individual">Individual</option>
                <option value="company">Company</option>
              </select>
            </div>

            <FormField
              label="Email"
              type="email"
              value={form.email}
              onChange={(value) => updateField("email", value)}
              placeholder="client@example.com"
            />

            <FormField
              label="Date of Birth"
              type="date"
              value={form.date_of_birth}
              onChange={(value) => updateField("date_of_birth", value)}
            />

            <FormField
              label="Address"
              value={form.address}
              onChange={(value) => updateField("address", value)}
              placeholder="Client address"
            />

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-500">
                Notes
              </label>

              <textarea
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                rows={5}
                placeholder="Additional client notes..."
                className={darkTextareaClass}
              />
            </div>
          </div>
        </div>

        <ModalFooter
          onClose={onClose}
          saving={saving}
          submitLabel="Save Changes"
        />
      </form>
    </ModalShell>
  );
}

/* =========================================================
   CASE MODAL
========================================================= */

function CaseModal({
  form,
  setForm,
  editMode,
  saving,
  error,
  success,
  caseTypes,
  caseTypesLoading,
  onClose,
  onSubmit,
}: {
  form: CaseForm;
  setForm: React.Dispatch<React.SetStateAction<CaseForm>>;
  editMode: boolean;
  saving: boolean;
  error: string;
  success: string;
  caseTypes: CaseType[];
  caseTypesLoading: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const updateField = <K extends keyof CaseForm>(
    field: K,
    value: CaseForm[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <ModalShell
      title={editMode ? "Edit Case" : "Create New Case"}
      description={
        editMode
          ? "Update the legal matter information."
          : "Create a new legal matter for this client."
      }
      onClose={onClose}
      wide
    >
      <form onSubmit={onSubmit}>
        <div className="p-6">
          {error && <ModalError message={error} />}

          {success && <ModalSuccess message={success} />}

          <div className="mb-6 rounded-xl border border-blue-900/60 bg-blue-950/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
              Client
            </p>

            <p className="mt-1 font-semibold text-white">
              This case will be associated with the selected client.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Case Number"
              required
              value={form.case_number}
              onChange={(value) => updateField("case_number", value)}
              placeholder="e.g. CASE-2026-001"
            />

            <FormField
              label="Case Title"
              required
              value={form.title}
              onChange={(value) => updateField("title", value)}
              placeholder="Case title"
            />

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-500">
                Case Type
              </label>

              <select
                value={form.case_type_id}
                onChange={(event) =>
                  updateField("case_type_id", event.target.value)
                }
                disabled={caseTypesLoading}
                className={darkInputClass}
              >
                <option value="">
                  {caseTypesLoading
                    ? "Loading case types..."
                    : "Select case type"}
                </option>

                {caseTypes.map((caseType) => (
                  <option key={caseType.id} value={caseType.id}>
                    {caseType.name}
                  </option>
                ))}
              </select>
            </div>

            {editMode ? (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-500">
                  Status
                </label>

                <select
                  value={form.status}
                  onChange={(event) =>
                    updateField("status", event.target.value)
                  }
                  className={darkInputClass}
                >
                  <option value="new">New</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="closed">Closed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-500">
                  Initial Status
                </label>

                <div className="flex h-[43px] items-center rounded-xl border border-slate-300 bg-slate-900 px-3 text-sm text-slate-500">
                  New
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-500">
                Priority
              </label>

              <select
                value={form.priority}
                onChange={(event) =>
                  updateField("priority", event.target.value)
                }
                className={darkInputClass}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <FormField
              label="Court"
              value={form.court}
              onChange={(value) => updateField("court", value)}
              placeholder="Court name"
            />

            <FormField
              label="Court Number"
              value={form.court_number}
              onChange={(value) => updateField("court_number", value)}
              placeholder="Court number"
            />

            <FormField
              label="Judge"
              value={form.judge}
              onChange={(value) => updateField("judge", value)}
              placeholder="Judge name"
            />

            <FormField
              label="Opposing Party"
              value={form.opposing_party}
              onChange={(value) => updateField("opposing_party", value)}
              placeholder="Opposing party"
            />

            <FormField
              label="Opposing Lawyer"
              value={form.opposing_lawyer}
              onChange={(value) => updateField("opposing_lawyer", value)}
              placeholder="Opposing lawyer"
            />

            <FormField
              label="Opening Date"
              required
              type="date"
              value={form.opening_date}
              onChange={(value) => updateField("opening_date", value)}
            />

            <FormField
              label="Closing Date"
              type="date"
              value={form.closing_date}
              onChange={(value) => updateField("closing_date", value)}
            />

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-500">
                Description / Notes
              </label>

              <textarea
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                rows={5}
                placeholder="Describe the case..."
                className={darkTextareaClass}
              />
            </div>
            {!editMode && (
              <div className="md:col-span-2 mt-2 rounded-2xl border border-emerald-900/50 bg-emerald-950/10 p-5">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-emerald-400">
                    Expenses
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Optional. If you enter an amount, the expense will
                    automatically be added to Finance and linked to this new
                    case.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <FormField
                    label="Amount"
                    type="number"
                    value={form.expense_amount}
                    onChange={(value) => updateField("expense_amount", value)}
                    placeholder="e.g. 150.00"
                  />

                  <FormField
                    label="Description"
                    value={form.expense_description}
                    onChange={(value) =>
                      updateField("expense_description", value)
                    }
                    placeholder="e.g. Court filing fee"
                  />
                </div>

                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <p className="text-xs text-slate-500">
                    The expense will use the case opening date and appear in the
                    corresponding month in Finance.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <ModalFooter
          onClose={onClose}
          saving={saving}
          submitLabel={editMode ? "Save Case" : "Create Case"}
        />
      </form>
    </ModalShell>
  );
}

/* =========================================================
   FINANCE MODAL
========================================================= */

function FinanceTransactionModal({
  form,
  setForm,
  cases,
  saving,
  error,
  success,
  onClose,
  onSubmit,
}: {
  form: FinanceForm;
  setForm: React.Dispatch<React.SetStateAction<FinanceForm>>;
  cases: CaseItem[];
  saving: boolean;
  error: string;
  success: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const updateField = <K extends keyof FinanceForm>(
    field: K,
    value: FinanceForm[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <ModalShell
      title="Add Financial Transaction"
      description="Record an invoice, payment, expense or refund."
      onClose={onClose}
      wide
    >
      <form onSubmit={onSubmit}>
        <div className="p-6">
          {error && <ModalError message={error} />}

          {success && <ModalSuccess message={success} />}

          <div className="mb-6 rounded-xl border border-blue-900/60 bg-blue-950/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
              Client
            </p>

            <p className="mt-1 font-semibold text-white">
              Transaction will be recorded against this client.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-500">
                Transaction Type
              </label>

              <select
                value={form.transaction_type}
                onChange={(event) =>
                  updateField("transaction_type", event.target.value)
                }
                className={darkInputClass}
              >
                <option value="invoice">Invoice</option>
                <option value="payment">Payment</option>
                <option value="expense">Expense</option>
                <option value="refund">Refund</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-500">
                Case
              </label>

              <select
                value={form.case_id}
                onChange={(event) => updateField("case_id", event.target.value)}
                className={darkInputClass}
              >
                <option value="">No case</option>

                {cases.map((caseItem) => (
                  <option key={caseItem.id} value={caseItem.id}>
                    {caseItem.case_number} — {caseItem.title}
                  </option>
                ))}
              </select>
            </div>

            <FormField
              label="Amount"
              required
              type="number"
              value={form.amount}
              onChange={(value) => updateField("amount", value)}
              placeholder="0.00"
              min="0"
              step="0.01"
            />

            <FormField
              label="Transaction Date"
              required
              type="date"
              value={form.transaction_date}
              onChange={(value) => updateField("transaction_date", value)}
            />

            <div className="md:col-span-2">
              <FormField
                label="Reference"
                value={form.reference}
                onChange={(value) => updateField("reference", value)}
                placeholder="Receipt number, invoice number, or other reference"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-500">
                Description
              </label>

              <textarea
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                rows={4}
                placeholder="Describe this financial transaction..."
                className={darkTextareaClass}
              />
            </div>
          </div>
        </div>

        <ModalFooter
          onClose={onClose}
          saving={saving}
          submitLabel="Add Transaction"
        />
      </form>
    </ModalShell>
  );
}

/* =========================================================
   CASE DETAILS MODAL
========================================================= */

function CaseDetailsModal({
  caseItem,
  onClose,
  onEdit,
}: {
  caseItem: CaseItem;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <ModalShell
      title={caseItem.case_number}
      description={caseItem.title}
      onClose={onClose}
      wide
      headerAction={
        <button
          type="button"
          onClick={onEdit}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          Edit Case
        </button>
      }
    >
      <div className="p-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge value={caseItem.status_display || caseItem.status} />

          <PriorityBadge
            value={caseItem.priority_display || caseItem.priority}
          />

          {getCaseTypeName(caseItem) && (
            <span className="inline-flex rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[11px] font-bold text-blue-400">
              {getCaseTypeName(caseItem)}
            </span>
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DarkInfoCard label="Case Number" value={caseItem.case_number} />

          <DarkInfoCard label="Case Type" value={getCaseTypeName(caseItem)} />

          <DarkInfoCard
            label="Status"
            value={caseItem.status_display || caseItem.status}
          />

          <DarkInfoCard
            label="Priority"
            value={caseItem.priority_display || caseItem.priority}
          />

          <DarkInfoCard label="Court" value={caseItem.court} />

          <DarkInfoCard label="Court Number" value={caseItem.court_number} />

          <DarkInfoCard label="Judge" value={caseItem.judge} />

          <DarkInfoCard
            label="Opposing Party"
            value={caseItem.opposing_party}
          />

          <DarkInfoCard
            label="Opposing Lawyer"
            value={caseItem.opposing_lawyer}
          />

          <DarkInfoCard
            label="Opening Date"
            value={formatDate(caseItem.opening_date)}
          />

          <DarkInfoCard
            label="Closing Date"
            value={formatDate(caseItem.closing_date)}
          />

          <DarkInfoCard
            label="Assigned Lawyer"
            value={getLawyerName(caseItem.assigned_lawyer)}
          />
        </div>

        {caseItem.description && (
          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Description / Notes
            </p>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-500">
              {caseItem.description}
            </p>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

/* =========================================================
   SHARED UI
========================================================= */

const darkInputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50";

const darkTextareaClass =
  "w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10";

function LoadingState() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <div className="lg:pl-64">
        <TopHeader title="Client Profile" />

        <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto max-w-[1600px] space-y-6">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-800" />

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
              <div className="flex items-center gap-5">
                <div className="h-16 w-16 animate-pulse rounded-2xl bg-slate-800" />

                <div className="space-y-3">
                  <div className="h-7 w-64 animate-pulse rounded bg-slate-800" />
                  <div className="h-4 w-96 max-w-full animate-pulse rounded bg-slate-800" />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-32 animate-pulse rounded-2xl border border-slate-800 bg-slate-900"
                />
              ))}
            </div>

            <div className="h-96 animate-pulse rounded-2xl border border-slate-800 bg-slate-900" />
          </div>
        </main>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm transition hover:border-slate-300 hover:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>

          <p className="mt-2 truncate text-2xl font-bold tracking-tight text-white">
            {value}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-slate-950 text-xs font-bold text-blue-400">
          {icon}
        </div>
      </div>

      <p className="mt-2 truncate text-xs text-slate-500">{description}</p>
    </div>
  );
}

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-white">{title}</h2>

        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      {action}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  const displayValue =
    value && value !== "None" && value !== "null" ? value : "Not provided";

  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-1.5 break-words text-sm font-medium text-slate-500">
        {displayValue}
      </p>
    </div>
  );
}

function SnapshotRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-slate-500">{label}</span>

      <span className="font-semibold text-slate-400">{value}</span>
    </div>
  );
}

function FinanceCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold tracking-tight text-white">
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-900 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-300 bg-slate-900 text-sm font-bold text-slate-500">
        {icon}
      </div>

      <h3 className="mt-4 font-semibold text-white">{title}</h3>

      <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>

      {action}
    </div>
  );
}

function StatusBadge({ value }: { value?: string | null }) {
  const normalized = String(value || "").toLowerCase();

  let className = "border-slate-300 bg-slate-800 text-slate-500";

  if (
    ["active", "approved", "completed", "closed", "paid"].includes(normalized)
  ) {
    className = "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
  } else if (
    ["pending", "new", "in_progress", "in-progress", "scheduled"].includes(
      normalized,
    )
  ) {
    className = "border-amber-500/20 bg-amber-500/10 text-amber-400";
  } else if (
    ["rejected", "cancelled", "canceled", "overdue"].includes(normalized)
  ) {
    className = "border-red-500/20 bg-red-500/10 text-red-400";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize ${className}`}
    >
      {value ? String(value).replace(/_/g, " ") : "Not specified"}
    </span>
  );
}

function PriorityBadge({ value }: { value?: string | null }) {
  const normalized = String(value || "").toLowerCase();

  let className = "border-slate-300 bg-slate-800 text-slate-500";

  if (normalized === "urgent") {
    className = "border-red-500/20 bg-red-500/10 text-red-400";
  } else if (normalized === "high") {
    className = "border-orange-500/20 bg-orange-500/10 text-orange-400";
  } else if (normalized === "medium") {
    className = "border-amber-500/20 bg-amber-500/10 text-amber-400";
  } else if (normalized === "low") {
    className = "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize ${className}`}
    >
      {value ? String(value) : "Normal"}
    </span>
  );
}

function TransactionBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase();

  let className = "border-slate-300 bg-slate-800 text-slate-500";

  if (normalized.includes("invoice")) {
    className = "border-blue-500/20 bg-blue-500/10 text-blue-400";
  } else if (normalized.includes("payment")) {
    className = "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
  } else if (normalized.includes("expense")) {
    className = "border-orange-500/20 bg-orange-500/10 text-orange-400";
  } else if (normalized.includes("refund")) {
    className = "border-amber-500/20 bg-amber-500/10 text-amber-400";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize ${className}`}
    >
      {value}
    </span>
  );
}

function FormField({
  label,
  required,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  step,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-500">
        {label}

        {required && <span className="ml-1 text-blue-400">*</span>}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        min={min}
        step={step}
        className={darkInputClass}
      />
    </div>
  );
}

function ModalShell({
  title,
  description,
  onClose,
  children,
  wide = false,
  headerAction,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  headerAction?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 backdrop-blur-sm sm:p-6">
      <div
        className={`mx-auto my-4 w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl ${
          wide ? "max-w-4xl" : "max-w-2xl"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 bg-slate-900 px-6 py-5">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white">{title}</h2>

            {description && (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {headerAction}

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-lg text-slate-500 transition hover:bg-slate-800 hover:text-white"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}

function ModalFooter({
  onClose,
  saving,
  submitLabel,
}: {
  onClose: () => void;
  saving: boolean;
  submitLabel: string;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-slate-800 bg-slate-950 px-6 py-4 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onClose}
        disabled={saving}
        className="rounded-xl border border-slate-300 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-800 disabled:opacity-50"
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}

function ModalError({ message }: { message: string }) {
  return (
    <div className="mb-5 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3">
      <p className="text-sm font-medium text-red-300">{message}</p>
    </div>
  );
}

function ModalSuccess({ message }: { message: string }) {
  return (
    <div className="mb-5 rounded-xl border border-emerald-900/60 bg-emerald-950/30 px-4 py-3">
      <p className="text-sm font-medium text-emerald-300">{message}</p>
    </div>
  );
}

function DarkInfoCard({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-semibold text-slate-400">
        {value && value !== "Not provided" ? value : "Not provided"}
      </p>
    </div>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function getNavIcon(label: string) {
  const icons: Record<string, string> = {
    Dashboard: "D",
    Clients: "C",
    Cases: "C",
    Hearings: "H",
    Documents: "D",
    Tasks: "T",
    Finance: "$",
  };

  return icons[label] || "•";
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "CL";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatCurrency(value: number | string | null | undefined) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMonth(value?: string | null) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
  }).format(date);
}

function formatDay(value?: string | null) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
  }).format(date);
}

function getCaseTypeName(caseItem: CaseItem) {
  if (caseItem.case_type_name) {
    return caseItem.case_type_name;
  }

  if (caseItem.case_type && typeof caseItem.case_type === "object") {
    return caseItem.case_type.name;
  }

  if (typeof caseItem.case_type === "string") {
    return caseItem.case_type;
  }

  return "";
}

function getLawyerName(lawyer: CaseItem["assigned_lawyer"]) {
  if (!lawyer) {
    return "Not assigned";
  }

  const name = [lawyer.first_name, lawyer.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || lawyer.email || "Assigned lawyer";
}

function asRecord(value: unknown): UnknownRecord | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as UnknownRecord;
  }

  return null;
}

function getString(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return null;
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return null;
}

function getOptionalNumber(value: unknown) {
  return getNumber(value);
}

function getNumberOrString(value: unknown): number | string | null {
  if (typeof value === "number" || typeof value === "string") {
    return value;
  }

  return null;
}

function getStatisticNumber(...values: unknown[]): number {
  for (const value of values) {
    const number = getNumber(value);

    if (number !== null) {
      return number;
    }
  }

  return 0;
}

function isClient(value: unknown): value is Client {
  const record = asRecord(value);

  return (
    record !== null &&
    typeof record.id === "number" &&
    typeof record.full_name === "string"
  );
}

function isApiFailure(value: unknown) {
  const record = asRecord(value);

  return record?.success === false;
}

function getApiMessage(value: unknown) {
  const record = asRecord(value);

  if (!record) {
    return "";
  }

  if (typeof record.message === "string") {
    return record.message;
  }

  if (typeof record.error === "string") {
    return record.error;
  }

  if (typeof record.detail === "string") {
    return record.detail;
  }

  return "";
}

function getCaseTypesFromResponse(value: unknown): CaseType[] {
  if (Array.isArray(value)) {
    return value.filter(isCaseType);
  }

  const record = asRecord(value);

  if (!record) {
    return [];
  }

  const possibleTypes = [record.case_types, record.types, record.results];

  for (const possible of possibleTypes) {
    if (Array.isArray(possible)) {
      return possible.filter(isCaseType);
    }
  }

  return [];
}

function isCaseType(value: unknown): value is CaseType {
  const record = asRecord(value);

  return (
    record !== null &&
    typeof record.id === "number" &&
    typeof record.name === "string"
  );
}

/* =========================================================
   PROFILE NORMALIZATION
========================================================= */

function normalizeProfile(data: unknown): ClientProfile {
  const record = asRecord(data);

  if (!record) {
    throw new Error("Invalid client profile response.");
  }

  const clientValue = record.client;

  if (!isClient(clientValue)) {
    throw new Error("The server returned an invalid client profile.");
  }

  const rawStatistics = asRecord(record.statistics) || {};

  const rawCases = Array.isArray(record.cases) ? record.cases : [];

  const cases = rawCases
    .map(normalizeCase)
    .filter((item): item is CaseItem => item !== null);

  const hearings = Array.isArray(record.hearings)
    ? record.hearings
        .map(normalizeHearing)
        .filter((item): item is HearingItem => item !== null)
    : [];

  const documents = Array.isArray(record.documents)
    ? record.documents
        .map(normalizeDocument)
        .filter((item): item is DocumentItem => item !== null)
    : [];

  const tasks = Array.isArray(record.tasks)
    ? record.tasks
        .map(normalizeTask)
        .filter((item): item is TaskItem => item !== null)
    : [];

  const transactionsSource = Array.isArray(record.transactions)
    ? record.transactions
    : Array.isArray(record.financial_transactions)
      ? record.financial_transactions
      : [];

  const transactions = transactionsSource
    .map(normalizeTransaction)
    .filter((item): item is FinancialTransaction => item !== null);

  const activity = Array.isArray(record.activity)
    ? record.activity
        .map(normalizeActivity)
        .filter((item): item is ActivityItem => item !== null)
    : [];

  const activeCases = cases.filter(
    (item) => String(item.status || "").toLowerCase() === "active",
  ).length;

  return {
    client: clientValue,
    cases,
    hearings,
    documents,
    tasks,
    transactions,
    financial_transactions: transactions,
    activity,
    statistics: {
      cases: getOptionalNumber(rawStatistics.cases),
      hearings: getOptionalNumber(rawStatistics.hearings),
      documents: getOptionalNumber(rawStatistics.documents),
      tasks: getOptionalNumber(rawStatistics.tasks),
      transactions: getOptionalNumber(
        rawStatistics.transactions ?? rawStatistics.transaction_count,
      ),
      transaction_count: getOptionalNumber(
        rawStatistics.transaction_count ?? rawStatistics.transactions,
      ),
      total_invoiced: getNumberOrString(rawStatistics.total_invoiced),
      total_paid: getNumberOrString(rawStatistics.total_paid),
      total_expenses: getNumberOrString(rawStatistics.total_expenses),
      total_refunds: getNumberOrString(rawStatistics.total_refunds),
      balance: getNumberOrString(rawStatistics.balance),
      total_cases: getStatisticNumber(
        rawStatistics.cases,
        rawStatistics.total_cases,
        cases.length,
      ),
      active_cases: getStatisticNumber(rawStatistics.active_cases, activeCases),
      total_hearings: getStatisticNumber(
        rawStatistics.hearings,
        rawStatistics.total_hearings,
        hearings.length,
      ),
      total_documents: getStatisticNumber(
        rawStatistics.documents,
        rawStatistics.total_documents,
        documents.length,
      ),
      pending_tasks: getStatisticNumber(
        rawStatistics.tasks,
        rawStatistics.pending_tasks,
        tasks.length,
      ),
      total_remaining: Number(
        rawStatistics.balance ?? rawStatistics.total_remaining ?? 0,
      ),
    },
  };
}

function normalizeCase(value: unknown): CaseItem | null {
  const record = asRecord(value);

  if (!record || typeof record.id !== "number") {
    return null;
  }

  const rawCaseType = record.case_type;

  let normalizedCaseType: CaseItem["case_type"] | null = null;

  let normalizedCaseTypeName = "";

  if (
    rawCaseType &&
    typeof rawCaseType === "object" &&
    !Array.isArray(rawCaseType)
  ) {
    const caseTypeRecord = rawCaseType as UnknownRecord;

    normalizedCaseType = {
      id: Number(caseTypeRecord.id),
      name: String(caseTypeRecord.name || ""),
    };

    normalizedCaseTypeName = String(caseTypeRecord.name || "");
  } else if (typeof rawCaseType === "string") {
    normalizedCaseType = rawCaseType;
    normalizedCaseTypeName = rawCaseType;
  }

  return {
    id: record.id,
    case_number:
      typeof record.case_number === "string"
        ? record.case_number
        : `Case #${record.id}`,
    title: typeof record.title === "string" ? record.title : "",
    client_id: getNumber(record.client_id),
    client: normalizeClientReference(record.client),
    case_type: normalizedCaseType,
    case_type_id:
      getNumber(record.case_type_id) ??
      (normalizedCaseType &&
      typeof normalizedCaseType === "object" &&
      !Array.isArray(normalizedCaseType)
        ? normalizedCaseType.id
        : null),
    case_type_name:
      typeof record.case_type_name === "string"
        ? record.case_type_name
        : normalizedCaseTypeName,
    status: getString(record.status),
    status_display: getString(record.status_display),
    priority: getString(record.priority),
    priority_display: getString(record.priority_display),
    court: getString(record.court),
    court_number: getString(record.court_number),
    judge: getString(record.judge),
    opposing_party: getString(record.opposing_party),
    opposing_lawyer: getString(record.opposing_lawyer),
    description: getString(record.description),
    opening_date: getString(record.opening_date),
    closing_date: getString(record.closing_date),
    assigned_lawyer: normalizeAssignedLawyer(record.assigned_lawyer),
    assigned_lawyer_id: getNumber(record.assigned_lawyer_id),
    created_at: getString(record.created_at),
    updated_at: getString(record.updated_at),
  };
}

function normalizeClientReference(
  value: unknown,
): { id: number; full_name: string } | undefined {
  const record = asRecord(value);

  if (
    !record ||
    typeof record.id !== "number" ||
    typeof record.full_name !== "string"
  ) {
    return undefined;
  }

  return {
    id: record.id,
    full_name: record.full_name,
  };
}

function normalizeAssignedLawyer(value: unknown): CaseItem["assigned_lawyer"] {
  const record = asRecord(value);

  if (!record || typeof record.id !== "number") {
    return null;
  }

  return {
    id: record.id,
    email: getString(record.email) || "",
    first_name: getString(record.first_name),
    last_name: getString(record.last_name),
  };
}

function normalizeHearing(value: unknown): HearingItem | null {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  return {
    ...record,
    id: getNumber(record.id) ?? undefined,
    hearing_date: getString(record.hearing_date),
    date: getString(record.date),
    scheduled_date: getString(record.scheduled_date),
    hearing_time: getString(record.hearing_time),
    time: getString(record.time),
    purpose: getString(record.purpose),
    type: getString(record.type),
    hearing_type: getString(record.hearing_type),
    status: getString(record.status),
    court: getString(record.court),
    judge: getString(record.judge),
    result: getString(record.result),
    next_action: getString(record.next_action),
    notes: getString(record.notes),
    case: normalizeHearingCase(record.case),
  };
}

function normalizeHearingCase(value: unknown): HearingItem["case"] {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  return {
    id: getNumber(record.id) ?? undefined,
    case_number: getString(record.case_number) || undefined,
    title: getString(record.title) || undefined,
  };
}

function normalizeDocument(value: unknown): DocumentItem | null {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  return {
    ...record,
    id: getNumber(record.id) ?? undefined,
    name: getString(record.name),
    file_name: getString(record.file_name),
    title: getString(record.title),
    document_type: getString(record.document_type),
    type: getString(record.type),
    created_at: getString(record.created_at),
    uploaded_at: getString(record.uploaded_at),
  };
}

function normalizeTask(value: unknown): TaskItem | null {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  return {
    ...record,
    id: getNumber(record.id) ?? undefined,
    title: getString(record.title),
    name: getString(record.name),
    description: getString(record.description),
    status: getString(record.status),
    priority: getString(record.priority),
    deadline: getString(record.deadline),
    due_date: getString(record.due_date),
    created_at: getString(record.created_at),
  };
}

function normalizeTransaction(value: unknown): FinancialTransaction | null {
  const record = asRecord(value);

  if (!record || typeof record.id !== "number") {
    return null;
  }

  return {
    ...record,
    id: record.id,
    description: getString(record.description),
    title: getString(record.title),
    transaction_type: getString(record.transaction_type),
    transaction_type_display: getString(record.transaction_type_display),
    type: getString(record.type),
    transaction_date: getString(record.transaction_date),
    date: getString(record.date),
    amount:
      typeof record.amount === "number" || typeof record.amount === "string"
        ? record.amount
        : null,
    value:
      typeof record.value === "number" || typeof record.value === "string"
        ? record.value
        : null,
    reference: getString(record.reference),
    created_at: getString(record.created_at),
    client: normalizeTransactionClient(record.client),
    case: normalizeTransactionCase(record.case),
  };
}

function normalizeTransactionClient(
  value: unknown,
): FinancialTransaction["client"] {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  return {
    id: getNumber(record.id) ?? undefined,
    full_name: getString(record.full_name) || undefined,
  };
}

function normalizeTransactionCase(
  value: unknown,
): FinancialTransaction["case"] {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  return {
    id: getNumber(record.id) ?? undefined,
    case_number: getString(record.case_number) || undefined,
    title: getString(record.title) || undefined,
  };
}

function normalizeActivity(value: unknown): ActivityItem | null {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  return {
    ...record,
    id: getNumber(record.id) ?? undefined,
    title: getString(record.title),
    action: getString(record.action),
    event: getString(record.event),
    description: getString(record.description),
    created_at: getString(record.created_at),
    timestamp: getString(record.timestamp),
    date: getString(record.date),
  };
}
