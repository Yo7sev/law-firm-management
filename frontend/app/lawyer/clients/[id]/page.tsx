"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useEffect,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from "react";

type Client = {
  id: number;
  full_name: string;
  national_id?: string;
  phone?: string;
  alternative_phone?: string;
  client_type?: string;
  client_type_display?: string;
  email?: string;
  address?: string;
  date_of_birth?: string | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  created_by?:
    | {
        id: number;
        email: string;
      }
    | string;
};

type CaseItem = {
  id: number;
  case_number: string;
  title: string;
  client_id?: number;
  client?: {
    id: number;
    full_name: string;
  };
  case_type?:
    | {
        id: number;
        name: string;
      }
    | string
    | null;
  case_type_id?: number | null;
  case_type_name?: string;
  status?: string;
  status_display?: string;
  priority?: string;
  priority_display?: string;
  court?: string;
  court_number?: string;
  judge?: string;
  opposing_party?: string;
  opposing_lawyer?: string;
  description?: string;
  opening_date?: string;
  closing_date?: string | null;
  assigned_lawyer?: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
  } | null;
  assigned_lawyer_id?: number | null;
  created_at?: string;
  updated_at?: string;
};

type CaseType = {
  id: number;
  name: string;
  description?: string;
  is_active?: boolean;
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
  [key: string]: unknown;
};

type DocumentItem = {
  id?: number;
  name?: string | null;
  file_name?: string | null;
  title?: string | null;
  document_type?: string | null;
  type?: string | null;
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
  [key: string]: unknown;
};

type FinancialTransaction = {
  id?: number;
  description?: string | null;
  title?: string | null;
  transaction_type?: string | null;
  transaction_type_display?: string | null;
  type?: string | null;
  transaction_date?: string | null;
  date?: string | null;
  created_at?: string | null;
  amount?: string | number | null;
  value?: string | number | null;
  client?: {
    id: number;
    full_name: string;
  } | null;
  case?: {
    id: number;
    case_number: string;
    title: string;
  } | null;
  [key: string]: unknown;
};

type ActivityItem = {
  id?: number | string;
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
  cases?: number;
  hearings?: number;
  documents?: number;
  tasks?: number;
  transactions?: number;
  transaction_count?: number;
  total_invoiced?: string | number;
  total_paid?: string | number;
  total_expenses?: string | number;
  total_refunds?: string | number;
  balance?: string | number;

  total_cases?: number;
  active_cases?: number;
  total_hearings?: number;
  total_documents?: number;
  pending_tasks?: number;
  total_remaining?: number;
};

type ClientProfile = {
  client: Client;
  cases: CaseItem[];
  hearings: HearingItem[];
  documents: DocumentItem[];
  tasks: TaskItem[];
  transactions?: FinancialTransaction[];
  financial_transactions?: FinancialTransaction[];
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
};

type Tab =
  | "overview"
  | "cases"
  | "hearings"
  | "documents"
  | "tasks"
  | "finance"
  | "activity";

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

type UnknownRecord = Record<string, unknown>;

type ApiErrorResponse = {
  message?: unknown;
  error?: unknown;
  detail?: unknown;
  errors?: unknown;
};

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "⌂" },
  { id: "cases", label: "Cases", icon: "▣" },
  { id: "hearings", label: "Hearings", icon: "◷" },
  { id: "documents", label: "Documents", icon: "▤" },
  { id: "tasks", label: "Tasks", icon: "✓" },
  { id: "finance", label: "Finance", icon: "¤" },
  { id: "activity", label: "Activity", icon: "◉" },
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
};

export default function ClientProfilePage() {
  const params = useParams();
  const clientId = params?.id as string;

  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editOpen, setEditOpen] = useState(false);

  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [caseEditMode, setCaseEditMode] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState<number | null>(null);

  const [caseTypes, setCaseTypes] = useState<CaseType[]>([]);
  const [caseTypesLoading, setCaseTypesLoading] = useState(false);

  const [caseForm, setCaseForm] = useState<CaseForm>(emptyCaseForm);

  const [caseSaving, setCaseSaving] = useState(false);
  const [caseError, setCaseError] = useState("");
  const [caseSuccess, setCaseSuccess] = useState("");

  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);

  useEffect(() => {
    if (!clientId) {
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/auth/clients/${clientId}/profile/`, {
          credentials: "include",
          cache: "no-store",
        });

        const data: unknown = await response.json();

        if (!response.ok || isApiFailure(data)) {
          throw new Error(
            getApiMessage(data) ||
              `Failed to load client profile (${response.status})`,
          );
        }

        if (!cancelled) {
          setProfile(normalizeProfile(data));
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load client profile.",
          );
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const reloadProfile = async () => {
    const response = await fetch(`/api/auth/clients/${clientId}/profile/`, {
      credentials: "include",
      cache: "no-store",
    });

    const data: unknown = await response.json();

    if (!response.ok || isApiFailure(data)) {
      throw new Error(
        getApiMessage(data) ||
          `Failed to refresh client profile (${response.status})`,
      );
    }

    const normalized = normalizeProfile(data);

    setProfile(normalized);

    if (selectedCase) {
      const refreshedCase = normalized.cases.find(
        (item) => item.id === selectedCase.id,
      );

      if (refreshedCase) {
        setSelectedCase(refreshedCase);
      }
    }
  };

  const loadCaseTypes = async () => {
    try {
      setCaseTypesLoading(true);
      setCaseError("");

      const response = await fetch("/api/auth/cases/types/", {
        credentials: "include",
        cache: "no-store",
      });

      const data: unknown = await response.json();

      if (!response.ok || isApiFailure(data)) {
        throw new Error(
          getApiMessage(data) ||
            `Failed to load case types (${response.status})`,
        );
      }

      const types = getCaseTypesFromResponse(data);

      setCaseTypes(types);
    } catch (err) {
      setCaseError(
        err instanceof Error ? err.message : "Failed to load case types.",
      );
    } finally {
      setCaseTypesLoading(false);
    }
  };

  const openNewCaseModal = async () => {
    setCaseEditMode(false);
    setEditingCaseId(null);

    setCaseForm({
      ...emptyCaseForm,
      status: "new",
      opening_date: new Date().toISOString().slice(0, 10),
    });

    setCaseError("");
    setCaseSuccess("");
    setCaseModalOpen(true);

    if (caseTypes.length === 0) {
      await loadCaseTypes();
    }
  };

  const openEditCaseModal = async (caseItem: CaseItem) => {
    setCaseEditMode(true);
    setEditingCaseId(caseItem.id);

    setCaseForm({
      case_number: caseItem.case_number || "",
      title: caseItem.title || "",
      case_type_id: getCaseTypeId(caseItem),
      status: caseItem.status || "new",
      priority: caseItem.priority || "medium",
      court: caseItem.court || "",
      court_number: caseItem.court_number || "",
      judge: caseItem.judge || "",
      opposing_party: caseItem.opposing_party || "",
      opposing_lawyer: caseItem.opposing_lawyer || "",
      opening_date: normalizeDateForInput(caseItem.opening_date),
      closing_date: normalizeDateForInput(caseItem.closing_date),
      description: caseItem.description || "",
    });

    setCaseError("");
    setCaseSuccess("");
    setSelectedCase(null);
    setCaseModalOpen(true);

    if (caseTypes.length === 0) {
      await loadCaseTypes();
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
      setCaseError("No case selected for editing.");
      return;
    }

    setCaseSaving(true);

    try {
      const payload: Record<string, unknown> = {
        case_number: caseForm.case_number.trim(),
        title: caseForm.title.trim(),
        priority: caseForm.priority,
        court: caseForm.court.trim(),
        court_number: caseForm.court_number.trim(),
        judge: caseForm.judge.trim(),
        opposing_party: caseForm.opposing_party.trim(),
        opposing_lawyer: caseForm.opposing_lawyer.trim(),
        opening_date: caseForm.opening_date,
        description: caseForm.description.trim(),
      };

      if (caseEditMode) {
        payload.status = caseForm.status;
      } else {
        payload.client_id = Number(clientId);
        payload.status = "new";
      }

      if (caseForm.case_type_id) {
        payload.case_type_id = Number(caseForm.case_type_id);
      } else {
        payload.case_type_id = null;
      }

      if (caseForm.closing_date) {
        payload.closing_date = caseForm.closing_date;
      } else {
        payload.closing_date = null;
      }

      const url = caseEditMode
        ? `/api/auth/cases/${editingCaseId}/`
        : "/api/auth/cases/";

      const response = await fetch(url, {
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
          extractApiError(data) ||
            `Failed to ${caseEditMode ? "update" : "create"} case (${response.status})`,
        );
      }

      setCaseSuccess(
        caseEditMode
          ? "Case updated successfully."
          : "Case created successfully.",
      );

      await reloadProfile();

      setActiveTab("cases");

      setTimeout(() => {
        setCaseModalOpen(false);
        setCaseSuccess("");
        setCaseEditMode(false);
        setEditingCaseId(null);
      }, 700);
    } catch (err) {
      setCaseError(
        err instanceof Error
          ? err.message
          : `Failed to ${caseEditMode ? "update" : "create"} case.`,
      );
    } finally {
      setCaseSaving(false);
    }
  };

  const updateClient = async (form: EditForm) => {
    const response = await fetch(`/api/auth/clients/${clientId}/`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const data: unknown = await response.json();

    if (!response.ok || isApiFailure(data)) {
      throw new Error(
        getApiMessage(data) || `Failed to update client (${response.status})`,
      );
    }

    const record = asRecord(data);
    const updatedClient = record?.client;

    if (!isClient(updatedClient)) {
      throw new Error("The server returned an invalid client response.");
    }

    setProfile((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        client: updatedClient,
      };
    });

    setEditOpen(false);
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-xl font-bold text-red-600">
              !
            </div>

            <h2 className="text-lg font-semibold text-slate-900">
              Unable to load client
            </h2>

            <p className="mt-2 text-sm text-slate-500">{error}</p>

            <Link
              href="/lawyer/clients"
              className="mt-6 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              ← Back to Clients
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const { client, statistics } = profile;

  const totalCases = getStatisticNumber(
    statistics.cases,
    statistics.total_cases,
  );

  const activeCases = getStatisticNumber(
    statistics.active_cases,
    profile.cases.filter(
      (item) => String(item.status || "").toLowerCase() === "active",
    ).length,
  );

  const totalHearings = getStatisticNumber(
    statistics.hearings,
    statistics.total_hearings,
  );

  const totalDocuments = getStatisticNumber(
    statistics.documents,
    statistics.total_documents,
  );

  const pendingTasks = getStatisticNumber(
    statistics.tasks,
    statistics.pending_tasks,
  );

  const totalPaid = Number(statistics.total_paid || 0);

  const balance = Number(statistics.balance ?? statistics.total_remaining ?? 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-6 lg:p-8">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/lawyer/clients"
            className="font-medium text-slate-500 hover:text-slate-900"
          >
            Clients
          </Link>

          <span className="text-slate-300">/</span>

          <span className="truncate text-slate-900">{client.full_name}</span>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-2 bg-slate-900" />

          <div className="p-6 lg:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-center gap-5">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-2xl font-bold text-white">
                  {getInitials(client.full_name)}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                      {client.full_name}
                    </h1>

                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Active Client
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                    <span>Client #{client.id}</span>

                    {client.client_type && (
                      <span className="capitalize">
                        {client.client_type_display || client.client_type}
                      </span>
                    )}

                    {client.phone && <span>☎ {client.phone}</span>}

                    {client.email && <span>✉ {client.email}</span>}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Edit Client
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("cases");
                    void openNewCaseModal();
                  }}
                  className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  + New Case
                </button>

                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Add Activity
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            label="Total Cases"
            value={totalCases}
            description="All registered cases"
            icon="▣"
          />

          <MetricCard
            label="Active Cases"
            value={activeCases}
            description="Currently active"
            icon="◉"
          />

          <MetricCard
            label="Hearings"
            value={totalHearings}
            description="Scheduled hearings"
            icon="◷"
          />

          <MetricCard
            label="Documents"
            value={totalDocuments}
            description="Client documents"
            icon="▤"
          />

          <MetricCard
            label="Pending Tasks"
            value={pendingTasks}
            description="Tasks requiring action"
            icon="✓"
          />

          <MetricCard
            label="Balance"
            value={formatMoney(balance)}
            description={`Paid ${formatMoney(totalPaid)}`}
            icon="¤"
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 md:px-6">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => {
                const active = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex shrink-0 items-center gap-2 px-4 py-4 text-sm font-semibold transition ${
                      active
                        ? "text-slate-900"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <span>{tab.icon}</span>

                    {tab.label}

                    {active && (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-slate-900" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-5 md:p-7">
            {activeTab === "overview" && (
              <OverviewTab
                client={client}
                cases={profile.cases}
                hearings={profile.hearings}
                tasks={profile.tasks}
                statistics={{
                  ...statistics,
                  total_cases: totalCases,
                  active_cases: activeCases,
                  total_hearings: totalHearings,
                  total_documents: totalDocuments,
                  pending_tasks: pendingTasks,
                  total_paid: totalPaid,
                  total_remaining: balance,
                }}
              />
            )}

            {activeTab === "cases" && (
              <CasesTab
                cases={profile.cases}
                onNewCase={() => void openNewCaseModal()}
                onSelectCase={setSelectedCase}
              />
            )}

            {activeTab === "hearings" && (
              <HearingsTab hearings={profile.hearings} />
            )}

            {activeTab === "documents" && (
              <DocumentsTab documents={profile.documents} />
            )}

            {activeTab === "tasks" && <TasksTab tasks={profile.tasks} />}

            {activeTab === "finance" && (
              <FinanceTab
                transactions={
                  profile.transactions || profile.financial_transactions || []
                }
                statistics={{
                  ...statistics,
                  total_paid: totalPaid,
                  total_remaining: balance,
                }}
              />
            )}

            {activeTab === "activity" && (
              <ActivityTab activity={profile.activity} />
            )}
          </div>
        </section>
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
          client={client}
          form={caseForm}
          setForm={setCaseForm}
          caseTypes={caseTypes}
          caseTypesLoading={caseTypesLoading}
          saving={caseSaving}
          error={caseError}
          success={caseSuccess}
          editMode={caseEditMode}
          onClose={() => {
            if (!caseSaving) {
              setCaseModalOpen(false);
              setCaseEditMode(false);
              setEditingCaseId(null);
            }
          }}
          onSubmit={saveCase}
        />
      )}

      {selectedCase && (
        <CaseDetailsModal
          caseItem={selectedCase}
          onClose={() => setSelectedCase(null)}
          onEdit={() => void openEditCaseModal(selectedCase)}
        />
      )}
    </div>
  );
}

/* =========================================================
   CREATE / EDIT CASE MODAL
========================================================= */

function CaseModal({
  client,
  form,
  setForm,
  caseTypes,
  caseTypesLoading,
  saving,
  error,
  success,
  editMode,
  onClose,
  onSubmit,
}: {
  client: Client;
  form: CaseForm;
  setForm: Dispatch<SetStateAction<CaseForm>>;
  caseTypes: CaseType[];
  caseTypesLoading: boolean;
  saving: boolean;
  error: string;
  success: string;
  editMode: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const updateField = (field: keyof CaseForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <div className="max-h-[95vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {editMode ? "Edit Case" : "Create New Case"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {editMode
                ? `Update case information for ${client.full_name}.`
                : `New case for ${client.full_name} — Client #${client.id}`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="max-h-[calc(95vh-155px)] overflow-y-auto p-6">
            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {success}
              </div>
            )}

            <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Client
              </p>

              <div className="mt-1 flex flex-wrap items-center gap-3">
                <p className="font-semibold text-slate-900">
                  {client.full_name}
                </p>

                <span className="text-sm text-slate-500">
                  Client #{client.id}
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                This case is attached to this client.
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
                placeholder="Enter case title"
              />

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Case Type
                </label>

                <select
                  value={form.case_type_id}
                  onChange={(event) =>
                    updateField("case_type_id", event.target.value)
                  }
                  disabled={caseTypesLoading}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                >
                  <option value="">
                    {caseTypesLoading
                      ? "Loading case types..."
                      : "Select case type"}
                  </option>

                  {caseTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {editMode && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Status
                  </label>

                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateField("status", event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="new">New</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="closed">Closed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              )}

              {!editMode && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Initial Status
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    New
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    New cases automatically start with New status.
                  </p>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Priority
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <select
                  value={form.priority}
                  onChange={(event) =>
                    updateField("priority", event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
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
                placeholder="e.g. Irbid Court of First Instance"
              />

              <FormField
                label="Court Number"
                value={form.court_number}
                onChange={(value) => updateField("court_number", value)}
                placeholder="Optional"
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
                placeholder="Opposing party name"
              />

              <FormField
                label="Opposing Lawyer"
                value={form.opposing_lawyer}
                onChange={(value) => updateField("opposing_lawyer", value)}
                placeholder="Opposing lawyer name"
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
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description / Notes
                </label>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  rows={5}
                  placeholder="Enter case description, notes, background, or important information..."
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? editMode
                  ? "Saving..."
                  : "Creating Case..."
                : editMode
                  ? "Save Case"
                  : "Create Case"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   CASE DETAILS
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
  const caseTypeName = getCaseTypeName(caseItem);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Case Details
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {caseItem.case_number}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Edit Case
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="max-h-[calc(90vh-100px)] overflow-y-auto p-6">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-slate-900">
              {caseItem.title}
            </h3>

            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge value={caseItem.status_display || caseItem.status} />

              <PriorityBadge
                value={caseItem.priority_display || caseItem.priority}
              />

              {caseTypeName && (
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                  {caseTypeName}
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <InfoItem label="Case Number" value={caseItem.case_number} />

            <InfoItem label="Case Type" value={caseTypeName} />

            <InfoItem
              label="Status"
              value={caseItem.status_display || caseItem.status}
            />

            <InfoItem
              label="Priority"
              value={caseItem.priority_display || caseItem.priority}
            />

            <InfoItem label="Court" value={caseItem.court} />

            <InfoItem label="Court Number" value={caseItem.court_number} />

            <InfoItem label="Judge" value={caseItem.judge} />

            <InfoItem label="Opposing Party" value={caseItem.opposing_party} />

            <InfoItem
              label="Opposing Lawyer"
              value={caseItem.opposing_lawyer}
            />

            <InfoItem
              label="Opening Date"
              value={formatDate(caseItem.opening_date)}
            />

            <InfoItem
              label="Closing Date"
              value={formatDate(caseItem.closing_date)}
            />

            <InfoItem
              label="Assigned Lawyer"
              value={getPersonName(caseItem.assigned_lawyer)}
            />
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Description / Notes
            </p>

            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
              {caseItem.description || "No description provided."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   EDIT CLIENT
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

  const updateField = (field: keyof EditForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
      await onSave({
        ...form,
        full_name: form.full_name.trim(),
        national_id: form.national_id.trim(),
        phone: form.phone.trim(),
        alternative_phone: form.alternative_phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update client.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <div className="max-h-[95vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Edit Client</h2>

            <p className="mt-1 text-sm text-slate-500">
              Update the client&apos;s personal and contact information.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[calc(95vh-150px)] overflow-y-auto p-6">
            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                label="Full Name"
                required
                value={form.full_name}
                onChange={(value) => updateField("full_name", value)}
                placeholder="Enter full name"
              />

              <FormField
                label="National ID"
                required
                value={form.national_id}
                onChange={(value) => updateField("national_id", value)}
                placeholder="Enter national ID"
              />

              <FormField
                label="Phone"
                required
                value={form.phone}
                onChange={(value) => updateField("phone", value)}
                placeholder="Enter phone number"
              />

              <FormField
                label="Alternative Phone"
                value={form.alternative_phone}
                onChange={(value) => updateField("alternative_phone", value)}
                placeholder="Optional"
              />

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Client Type
                </label>

                <select
                  value={form.client_type}
                  onChange={(event) =>
                    updateField("client_type", event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
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

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Address
                </label>

                <textarea
                  value={form.address}
                  onChange={(event) =>
                    updateField("address", event.target.value)
                  }
                  rows={3}
                  placeholder="Enter client address"
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Notes
                </label>

                <textarea
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  rows={5}
                  placeholder="Internal notes about this client..."
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   FORM FIELD
========================================================= */

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}

        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      />
    </div>
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
  statistics,
}: {
  client: Client;
  cases: CaseItem[];
  hearings: HearingItem[];
  tasks: TaskItem[];
  statistics: Statistics;
}) {
  return (
    <div className="space-y-8">
      <div>
        <SectionHeading
          title="Client overview"
          description="Personal information and current legal activity."
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-5 lg:col-span-2">
            <h3 className="mb-5 text-sm font-bold text-slate-900">
              Personal Information
            </h3>

            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <InfoItem label="Full Name" value={client.full_name} />

              <InfoItem
                label="Client Type"
                value={client.client_type_display || client.client_type}
              />

              <InfoItem label="National ID" value={client.national_id} />

              <InfoItem label="Date of Birth" value={client.date_of_birth} />

              <InfoItem label="Phone" value={client.phone} />

              <InfoItem
                label="Alternative Phone"
                value={client.alternative_phone}
              />

              <InfoItem label="Email" value={client.email} />

              <InfoItem label="Address" value={client.address} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-5">
            <h3 className="mb-5 text-sm font-bold text-slate-900">
              Case Snapshot
            </h3>

            <div className="space-y-4">
              <SnapshotRow
                label="Total cases"
                value={statistics.total_cases || 0}
              />

              <SnapshotRow
                label="Active cases"
                value={statistics.active_cases || 0}
              />

              <SnapshotRow
                label="Hearings"
                value={statistics.total_hearings || 0}
              />

              <SnapshotRow
                label="Pending tasks"
                value={statistics.pending_tasks || 0}
              />
            </div>
          </div>
        </div>
      </div>

      {client.notes && (
        <div>
          <SectionHeading
            title="Client notes"
            description="Internal notes associated with this client."
          />

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
            {client.notes}
          </div>
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
  onSelectCase,
}: {
  cases: CaseItem[];
  onNewCase: () => void;
  onSelectCase: (item: CaseItem) => void;
}) {
  return (
    <div>
      <SectionHeading
        title="Cases"
        description={`${cases.length} case${
          cases.length === 1 ? "" : "s"
        } associated with this client.`}
        action={
          <button
            type="button"
            onClick={onNewCase}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            + New Case
          </button>
        }
      />

      {cases.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            icon="▣"
            title="No cases"
            description="This client does not have any registered cases yet."
          />

          <div className="flex justify-center">
            <button
              type="button"
              onClick={onNewCase}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              + Create First Case
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="hidden grid-cols-5 gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 md:grid">
            <span>Case</span>
            <span>Type</span>
            <span>Status</span>
            <span>Priority</span>
            <span>Assigned</span>
          </div>

          <div className="divide-y divide-slate-100">
            {cases.map((item, index) => (
              <button
                key={item.id ?? index}
                type="button"
                onClick={() => onSelectCase(item)}
                className="grid w-full gap-3 px-5 py-4 text-left transition hover:bg-slate-50 md:grid-cols-5 md:items-center"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {item.case_number || `Case #${item.id ?? index + 1}`}
                  </p>

                  {item.title && (
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {item.title}
                    </p>
                  )}
                </div>

                <div className="text-sm text-slate-600">
                  {getCaseTypeName(item) || "—"}
                </div>

                <div>
                  <StatusBadge value={item.status_display || item.status} />
                </div>

                <div>
                  <PriorityBadge
                    value={item.priority_display || item.priority}
                  />
                </div>

                <div className="text-sm text-slate-600">
                  {getPersonName(item.assigned_lawyer) || "Unassigned"}
                </div>
              </button>
            ))}
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
        description="Court hearings and scheduled legal events."
      />

      {hearings.length === 0 ? (
        <EmptyState
          icon="◷"
          title="No hearings"
          description="No hearings are currently associated with this client."
        />
      ) : (
        <div className="space-y-3">
          {hearings.map((hearing, index) => (
            <div
              key={hearing.id ?? index}
              className="flex flex-col gap-4 rounded-xl border border-slate-200 p-5 transition hover:border-slate-300 hover:shadow-sm md:flex-row md:items-center"
            >
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <span className="text-xs font-bold uppercase">
                  {formatMonth(
                    hearing.hearing_date ||
                      hearing.date ||
                      hearing.scheduled_date,
                  )}
                </span>

                <span className="text-lg font-bold">
                  {formatDay(
                    hearing.hearing_date ||
                      hearing.date ||
                      hearing.scheduled_date,
                  )}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-900">
                    {hearing.purpose ||
                      hearing.type ||
                      hearing.hearing_type ||
                      "Court Hearing"}
                  </h3>

                  <StatusBadge value={hearing.status} />
                </div>

                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
                  {(hearing.hearing_time || hearing.time) && (
                    <span>{hearing.hearing_time || hearing.time}</span>
                  )}

                  {hearing.court && <span>{hearing.court}</span>}

                  {hearing.judge && <span>Judge: {hearing.judge}</span>}
                </div>
              </div>
            </div>
          ))}
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
        description={`${documents.length} document${
          documents.length === 1 ? "" : "s"
        } associated with this client.`}
        action={
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Upload Document
          </button>
        }
      />

      {documents.length === 0 ? (
        <EmptyState
          icon="▤"
          title="No documents"
          description="There are no documents uploaded for this client."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {documents.map((document, index) => (
            <div
              key={document.id ?? index}
              className="flex items-center gap-4 rounded-xl border border-slate-200 p-4"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">
                📄
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">
                  {document.name ||
                    document.file_name ||
                    document.title ||
                    `Document #${document.id ?? index + 1}`}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {document.document_type || document.type || "Document"}
                </p>
              </div>

              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                View
              </button>
            </div>
          ))}
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
        description="Legal and administrative tasks associated with this client."
      />

      {tasks.length === 0 ? (
        <EmptyState
          icon="✓"
          title="No tasks"
          description="There are no tasks associated with this client."
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <div
              key={task.id ?? index}
              className="rounded-xl border border-slate-200 p-5"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">
                      {task.title ||
                        task.name ||
                        `Task #${task.id ?? index + 1}`}
                    </h3>

                    <StatusBadge value={task.status} />

                    <PriorityBadge value={task.priority} />
                  </div>

                  {task.description && (
                    <p className="mt-2 text-sm text-slate-500">
                      {task.description}
                    </p>
                  )}
                </div>

                <div className="text-sm text-slate-500">
                  {task.deadline || task.due_date
                    ? `Due ${formatDate(task.deadline || task.due_date)}`
                    : "No deadline"}
                </div>
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
}: {
  transactions: FinancialTransaction[];
  statistics: Statistics;
}) {
  const totalPaid = Number(statistics.total_paid || 0);

  const balance = Number(statistics.total_remaining || statistics.balance || 0);

  const totalRecorded = totalPaid + balance;

  return (
    <div>
      <SectionHeading
        title="Financial overview"
        description="Client payments and financial transactions."
      />

      <div className="mb-7 grid gap-4 md:grid-cols-3">
        <FinanceCard label="Total Paid" value={formatMoney(totalPaid)} />

        <FinanceCard label="Outstanding" value={formatMoney(balance)} />

        <FinanceCard
          label="Total Recorded"
          value={formatMoney(totalRecorded)}
        />
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          icon="¤"
          title="No transactions"
          description="No financial transactions have been recorded for this client."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="divide-y divide-slate-100">
            {transactions.map((transaction, index) => (
              <div
                key={transaction.id ?? index}
                className="grid gap-2 px-5 py-4 md:grid-cols-4"
              >
                <div className="font-medium text-slate-900">
                  {transaction.description ||
                    transaction.title ||
                    "Financial transaction"}
                </div>

                <div className="text-sm text-slate-500">
                  {transaction.transaction_type_display ||
                    transaction.transaction_type ||
                    transaction.type ||
                    "—"}
                </div>

                <div className="text-sm text-slate-500">
                  {formatDate(
                    transaction.transaction_date ||
                      transaction.date ||
                      transaction.created_at,
                  )}
                </div>

                <div className="font-semibold text-slate-900 md:text-right">
                  {formatMoney(transaction.amount ?? transaction.value ?? 0)}
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
          icon="◉"
          title="No activity"
          description="No activity has been recorded for this client yet."
        />
      ) : (
        <div className="relative ml-3 border-l border-slate-200 pl-7">
          <div className="space-y-8">
            {activity.map((item, index) => (
              <div key={item.id ?? index} className="relative">
                <span className="absolute -left-[35px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-slate-900" />

                <div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-semibold text-slate-900">
                      {item.title || item.action || item.event || "Activity"}
                    </h3>

                    <span className="text-xs text-slate-400">
                      {formatDateTime(
                        item.created_at || item.timestamp || item.date,
                      )}
                    </span>
                  </div>

                  {item.description && (
                    <p className="mt-1 text-sm text-slate-500">
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
    <div className="rounded-xl border border-slate-200 p-5">
      <h3 className="font-bold text-slate-900">Recent Cases</h3>

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
              className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 p-4"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {item.case_number || `Case #${item.id ?? index + 1}`}
                </p>

                <p className="mt-1 text-xs text-slate-500">
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
    <div className="rounded-xl border border-slate-200 p-5">
      <h3 className="font-bold text-slate-900">Upcoming Hearings</h3>

      <p className="mt-1 text-xs text-slate-500">
        Scheduled hearings and court events.
      </p>

      <div className="mt-5 space-y-3">
        {preview.length === 0 ? (
          <p className="text-sm text-slate-500">No hearings available.</p>
        ) : (
          preview.map((hearing, index) => (
            <div
              key={hearing.id ?? index}
              className="flex items-center gap-4 rounded-lg bg-slate-50 p-4"
            >
              <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-white">
                <span className="text-[9px] font-bold uppercase text-slate-400">
                  {formatMonth(
                    hearing.hearing_date ||
                      hearing.date ||
                      hearing.scheduled_date,
                  )}
                </span>

                <span className="text-sm font-bold text-slate-900">
                  {formatDay(
                    hearing.hearing_date ||
                      hearing.date ||
                      hearing.scheduled_date,
                  )}
                </span>
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {hearing.purpose || hearing.type || "Court Hearing"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {hearing.court || "Court not specified"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PreviewTasks({ tasks }: { tasks: TaskItem[] }) {
  const preview = tasks.slice(0, 4);

  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <h3 className="font-bold text-slate-900">Open Tasks</h3>

      <p className="mt-1 text-xs text-slate-500">Tasks requiring attention.</p>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {preview.length === 0 ? (
          <p className="text-sm text-slate-500">No tasks available.</p>
        ) : (
          preview.map((task, index) => (
            <div key={task.id ?? index} className="rounded-lg bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-slate-900">
                  {task.title || task.name || `Task #${task.id ?? index + 1}`}
                </p>

                <PriorityBadge value={task.priority} />
              </div>

              <div className="mt-2">
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
   SHARED UI
========================================================= */

function LoadingState() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />

        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 animate-pulse rounded-2xl bg-slate-200" />

            <div className="space-y-3">
              <div className="h-7 w-64 animate-pulse rounded bg-slate-200" />

              <div className="h-4 w-96 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        </div>
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700">
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
        <h2 className="text-lg font-bold tracking-tight text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      {action}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1.5 text-sm font-medium text-slate-800">
        {value && value !== "None" && value !== "null" ? value : "Not provided"}
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
    <div className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-slate-500">{label}</span>

      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function FinanceCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl text-slate-500">
        {icon}
      </div>

      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>

      <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
    </div>
  );
}

function StatusBadge({ value }: { value?: string | null }) {
  const normalized = String(value || "").toLowerCase();

  let className = "bg-slate-100 text-slate-600";

  if (
    ["active", "approved", "completed", "closed", "paid"].includes(normalized)
  ) {
    className = "bg-emerald-50 text-emerald-700";
  } else if (
    ["pending", "new", "in_progress", "in-progress", "scheduled"].includes(
      normalized,
    )
  ) {
    className = "bg-amber-50 text-amber-700";
  } else if (
    ["rejected", "cancelled", "canceled", "overdue"].includes(normalized)
  ) {
    className = "bg-red-50 text-red-700";
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${className}`}
    >
      {value ? String(value).replace(/_/g, " ") : "Not specified"}
    </span>
  );
}

function PriorityBadge({ value }: { value?: string | null }) {
  const normalized = String(value || "").toLowerCase();

  let className = "bg-slate-100 text-slate-600";

  if (normalized === "urgent") {
    className = "bg-red-50 text-red-700";
  } else if (normalized === "high") {
    className = "bg-orange-50 text-orange-700";
  } else if (normalized === "medium") {
    className = "bg-amber-50 text-amber-700";
  } else if (normalized === "low") {
    className = "bg-emerald-50 text-emerald-700";
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${className}`}
    >
      {value ? String(value) : "Normal"}
    </span>
  );
}

/* =========================================================
   TYPE / API HELPERS
========================================================= */

function asRecord(value: unknown): UnknownRecord | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as UnknownRecord;
  }

  return null;
}

function isClient(value: unknown): value is Client {
  const record = asRecord(value);

  return (
    record !== null &&
    typeof record.id === "number" &&
    typeof record.full_name === "string"
  );
}

function isApiFailure(value: unknown): boolean {
  const record = asRecord(value);

  return record?.success === false;
}

function getApiMessage(value: unknown): string {
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

  const possibleTypes = [record.case_types, record.types];

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

  const cases: CaseItem[] = rawCases
    .map((item) => normalizeCase(item))
    .filter((item): item is CaseItem => item !== null);

  const hearings: HearingItem[] = Array.isArray(record.hearings)
    ? record.hearings
        .map((item) => normalizeHearing(item))
        .filter((item): item is HearingItem => item !== null)
    : [];

  const documents: DocumentItem[] = Array.isArray(record.documents)
    ? record.documents
        .map((item) => normalizeDocument(item))
        .filter((item): item is DocumentItem => item !== null)
    : [];

  const tasks: TaskItem[] = Array.isArray(record.tasks)
    ? record.tasks
        .map((item) => normalizeTask(item))
        .filter((item): item is TaskItem => item !== null)
    : [];

  const transactionsSource = Array.isArray(record.transactions)
    ? record.transactions
    : Array.isArray(record.financial_transactions)
      ? record.financial_transactions
      : [];

  const transactions: FinancialTransaction[] = transactionsSource
    .map((item) => normalizeTransaction(item))
    .filter((item): item is FinancialTransaction => item !== null);

  const activity: ActivityItem[] = Array.isArray(record.activity)
    ? record.activity
        .map((item) => normalizeActivity(item))
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

  let normalizedCaseType: CaseItem["case_type"] = null;
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

  const assignedLawyer = normalizeAssignedLawyer(record.assigned_lawyer);

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
    assigned_lawyer: assignedLawyer,
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
    id: getNumber(record.id),
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
  };
}

function normalizeDocument(value: unknown): DocumentItem | null {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  return {
    ...record,
    id: getNumber(record.id),
    name: getString(record.name),
    file_name: getString(record.file_name),
    title: getString(record.title),
    document_type: getString(record.document_type),
    type: getString(record.type),
  };
}

function normalizeTask(value: unknown): TaskItem | null {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  return {
    ...record,
    id: getNumber(record.id),
    title: getString(record.title),
    name: getString(record.name),
    description: getString(record.description),
    status: getString(record.status),
    priority: getString(record.priority),
    deadline: getString(record.deadline),
    due_date: getString(record.due_date),
  };
}

function normalizeTransaction(value: unknown): FinancialTransaction | null {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  return {
    ...record,
    id: getNumber(record.id),
    description: getString(record.description),
    title: getString(record.title),
    transaction_type: getString(record.transaction_type),
    transaction_type_display: getString(record.transaction_type_display),
    type: getString(record.type),
    transaction_date: getString(record.transaction_date),
    date: getString(record.date),
    created_at: getString(record.created_at),
    amount: getNumberOrString(record.amount),
    value: getNumberOrString(record.value),
    client: normalizeClientReference(record.client) || null,
    case: normalizeCaseReference(record.case),
  };
}

function normalizeCaseReference(value: unknown): FinancialTransaction["case"] {
  const record = asRecord(value);

  if (
    !record ||
    typeof record.id !== "number" ||
    typeof record.case_number !== "string"
  ) {
    return null;
  }

  return {
    id: record.id,
    case_number: record.case_number,
    title: getString(record.title) || "",
  };
}

function normalizeActivity(value: unknown): ActivityItem | null {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  return {
    ...record,
    id:
      typeof record.id === "number" || typeof record.id === "string"
        ? record.id
        : undefined,
    title: getString(record.title),
    action: getString(record.action),
    event: getString(record.event),
    description: getString(record.description),
    created_at: getString(record.created_at),
    timestamp: getString(record.timestamp),
    date: getString(record.date),
  };
}

/* =========================================================
   GENERAL HELPERS
========================================================= */

function getCaseTypeName(caseItem: CaseItem): string {
  if (caseItem.case_type_name) {
    return caseItem.case_type_name;
  }

  if (
    caseItem.case_type &&
    typeof caseItem.case_type === "object" &&
    !Array.isArray(caseItem.case_type)
  ) {
    return caseItem.case_type.name || "";
  }

  if (typeof caseItem.case_type === "string") {
    return caseItem.case_type;
  }

  return "";
}

function getCaseTypeId(caseItem: CaseItem): string {
  if (caseItem.case_type_id !== undefined && caseItem.case_type_id !== null) {
    return String(caseItem.case_type_id);
  }

  if (
    caseItem.case_type &&
    typeof caseItem.case_type === "object" &&
    !Array.isArray(caseItem.case_type) &&
    caseItem.case_type.id
  ) {
    return String(caseItem.case_type.id);
  }

  return "";
}

function getStatisticNumber(...values: unknown[]): number {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
      const number = Number(value);

      if (Number.isFinite(number)) {
        return number;
      }
    }
  }

  return 0;
}

function getOptionalNumber(value: unknown): number | undefined {
  const number = getNumber(value);

  return number === undefined ? undefined : number;
}

function getNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return undefined;
}

function getNumberOrString(value: unknown): number | string | undefined {
  if (typeof value === "number" || typeof value === "string") {
    return value;
  }

  return undefined;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function extractApiError(value: unknown): string {
  const data = value as ApiErrorResponse | null;

  if (!data) {
    return "";
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  if (typeof data.error === "string") {
    return data.error;
  }

  if (typeof data.detail === "string") {
    return data.detail;
  }

  const errors = asRecord(data.errors);

  if (errors) {
    const messages: string[] = [];

    for (const [field, fieldValue] of Object.entries(errors)) {
      if (Array.isArray(fieldValue)) {
        messages.push(
          `${field}: ${fieldValue
            .filter((item): item is string => typeof item === "string")
            .join(", ")}`,
        );
      } else if (typeof fieldValue === "string") {
        messages.push(`${field}: ${fieldValue}`);
      } else {
        messages.push(`${field}: ${JSON.stringify(fieldValue)}`);
      }
    }

    if (messages.length > 0) {
      return messages.join(" | ");
    }
  }

  return "";
}

function getPersonName(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  const record = asRecord(value);

  if (!record) {
    return "";
  }

  const fullName = [record.first_name, record.last_name]
    .filter((item): item is string => typeof item === "string" && Boolean(item))
    .join(" ")
    .trim();

  return (
    fullName ||
    getString(record.full_name) ||
    getString(record.name) ||
    getString(record.username) ||
    getString(record.email) ||
    ""
  );
}

function getInitials(name?: string) {
  if (!name) {
    return "CL";
  }

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatMoney(value: unknown) {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) {
    return "0.00";
  }

  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMonth(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
  });
}

function formatDay(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.getDate();
}

function normalizeDateForInput(value?: string | null) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 10);
}
