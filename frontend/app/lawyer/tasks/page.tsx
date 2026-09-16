"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";



type Case = {
  id: number;
  case_number: string;
  title: string;
  client_id: number;
};

type Task = {
  id: number;
  title: string;
  description: string;
  deadline: string | null;
  status: string;
  status_display?: string;
  case: {
    id: number;
    case_number: string;
    title: string;
    client: {
      id: number;
      full_name: string;
    };
  };
  assigned_to: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  created_at: string;
  updated_at: string;
};

type TasksResponse = {
  success: boolean;
  count?: number;
  tasks: Task[];
  message?: string;
};

type CasesResponse = {
  success: boolean;
  cases: Case[];
  message?: string;
};

type CreateTaskResponse = {
  success: boolean;
  message?: string;
  task?: Task;
};

type UpdateTaskResponse = {
  success: boolean;
  message?: string;
  task?: Task;
};

type CurrentUserResponse = {
  success: boolean;
  user?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  message?: string;
};

const taskStatuses = [
  {
    value: "todo",
    label: "To Do",
  },
  {
    value: "in_progress",
    label: "In Progress",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
];

function formatStatus(status: string) {
  switch (status) {
    case "todo":
      return "To Do";

    case "in_progress":
      return "In Progress";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    default:
      return status
        .replace(/_/g, " ")
        .replace(/\b\w/g, (character) =>
          character.toUpperCase(),
        );
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "todo":
      return "border-slate-700 bg-slate-900 text-slate-300";

    case "in_progress":
      return "border-blue-900/60 bg-blue-950/30 text-blue-300";

    case "completed":
      return "border-emerald-900/60 bg-emerald-950/30 text-emerald-300";

    case "cancelled":
      return "border-red-900/60 bg-red-950/30 text-red-300";

    default:
      return "border-slate-700 bg-slate-900 text-slate-400";
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) {
    return "No deadline";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDateForInput(dateString: string | null) {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getDeadlineState(deadline: string | null, status: string) {
  if (!deadline || status === "completed" || status === "cancelled") {
    return "normal";
  }

  const deadlineDate = new Date(deadline);

  if (Number.isNaN(deadlineDate.getTime())) {
    return "normal";
  }

  const now = new Date();

  if (deadlineDate.getTime() < now.getTime()) {
    return "overdue";
  }

  const twoDaysFromNow = new Date(
    now.getTime() + 2 * 24 * 60 * 60 * 1000,
  );

  if (deadlineDate.getTime() <= twoDaysFromNow.getTime()) {
    return "soon";
  }

  return "normal";
}

function getDeadlineClass(
  deadline: string | null,
  status: string,
) {
  switch (getDeadlineState(deadline, status)) {
    case "overdue":
      return "text-red-400";

    case "soon":
      return "text-amber-400";

    default:
      return "text-slate-400";
  }
}

export default function LawyerTasksPage() {
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [cases, setCases] = useState<Case[]>([]);

  const [currentUser, setCurrentUser] =
    useState<CurrentUserResponse["user"]>(undefined);

  const [loading, setLoading] = useState(true);
  const [loadingCases, setLoadingCases] = useState(true);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");
  const [caseFilter, setCaseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [showEditModal, setShowEditModal] =
    useState(false);

  const [editingTask, setEditingTask] =
    useState<Task | null>(null);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] =
    useState("");
  const [taskCaseId, setTaskCaseId] = useState("");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [taskStatus, setTaskStatus] = useState("todo");

  const [savingTask, setSavingTask] = useState(false);
  const [deletingId, setDeletingId] =
    useState<number | null>(null);
  const [updatingStatusId, setUpdatingStatusId] =
    useState<number | null>(null);

  const loadCurrentUser = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/auth/me/",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      );

      if (
        response.status === 401 ||
        response.status === 403 ||
        response.redirected
      ) {
        router.push("/login");
        return;
      }

      const data: CurrentUserResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to load the current user.",
        );
      }

      setCurrentUser(data.user);
    } catch (userError) {
      const message =
        userError instanceof Error
          ? userError.message
          : "Unable to load the current user.";

      setError(message);
    }
  }, [router]);

  const loadCases = useCallback(async () => {
    try {
      setLoadingCases(true);

      const response = await fetch(
        "/api/auth/cases/",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      );

      if (
        response.status === 401 ||
        response.status === 403 ||
        response.redirected
      ) {
        router.push("/login");
        return;
      }

      const data: CasesResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to load cases.",
        );
      }

      setCases(data.cases || []);
    } catch (casesError) {
      const message =
        casesError instanceof Error
          ? casesError.message
          : "Unable to load cases.";

      setError(message);
    } finally {
      setLoadingCases(false);
    }
  }, [router]);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set(
          "search",
          search.trim(),
        );
      }

      if (caseFilter) {
        params.set(
          "case_id",
          caseFilter,
        );
      }

      if (statusFilter) {
        params.set(
          "status",
          statusFilter,
        );
      }

      const queryString = params.toString();

      const response = await fetch(
        `/api/auth/tasks/${
          queryString
            ? `?${queryString}`
            : ""
        }`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      );

      if (
        response.status === 401 ||
        response.status === 403 ||
        response.redirected
      ) {
        router.push("/login");
        return;
      }

      const data: TasksResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to load tasks.",
        );
      }

      setTasks(data.tasks || []);
    } catch (tasksError) {
      const message =
        tasksError instanceof Error
          ? tasksError.message
          : "Unable to load tasks.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [
    caseFilter,
    router,
    search,
    statusFilter,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCurrentUser();
      void loadCases();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadCases, loadCurrentUser]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTasks();
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadTasks]);

  const filteredCases = useMemo(() => {
    return cases;
  }, [cases]);

  const taskSummary = useMemo(() => {
    return {
      total: tasks.length,
      todo: tasks.filter(
        (task) => task.status === "todo",
      ).length,
      inProgress: tasks.filter(
        (task) => task.status === "in_progress",
      ).length,
      completed: tasks.filter(
        (task) => task.status === "completed",
      ).length,
      overdue: tasks.filter(
        (task) =>
          getDeadlineState(
            task.deadline,
            task.status,
          ) === "overdue",
      ).length,
    };
  }, [tasks]);

  function resetTaskForm() {
    setTaskTitle("");
    setTaskDescription("");
    setTaskCaseId("");
    setTaskDeadline("");
    setTaskStatus("todo");
  }

  function closeCreateModal() {
    if (savingTask) {
      return;
    }

    setShowCreateModal(false);
    resetTaskForm();
  }

  function openCreateModal() {
    setError("");
    setSuccessMessage("");
    resetTaskForm();
    setShowCreateModal(true);
  }

  function openEditModal(task: Task) {
    setEditingTask(task);

    setTaskTitle(task.title);
    setTaskDescription(
      task.description || "",
    );
    setTaskCaseId(
      String(task.case.id),
    );
    setTaskDeadline(
      formatDateForInput(task.deadline),
    );
    setTaskStatus(task.status);

    setError("");
    setSuccessMessage("");
    setShowEditModal(true);
  }

  function closeEditModal() {
    if (savingTask) {
      return;
    }

    setShowEditModal(false);
    setEditingTask(null);
    resetTaskForm();
  }

  async function handleCreateTask(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!taskTitle.trim()) {
      setError("Please enter a task title.");
      return;
    }

    if (!taskCaseId) {
      setError("Please select a case.");
      return;
    }

    try {
      setSavingTask(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        "/api/auth/tasks/",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: taskTitle.trim(),
            description:
              taskDescription.trim(),
            case_id: Number(taskCaseId),
            deadline:
              taskDeadline
                ? new Date(
                    taskDeadline,
                  ).toISOString()
                : null,
            status: taskStatus,
            ...(currentUser?.id
              ? {
                  assigned_to_id:
                    currentUser.id,
                }
              : {}),
          }),
        },
      );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        router.push("/login");
        return;
      }

      const data: CreateTaskResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to create the task.",
        );
      }

      if (!data.task) {
        throw new Error(
          "The task was created, but the server did not return it.",
        );
      }

      setTasks((currentTasks) => [
        data.task!,
        ...currentTasks,
      ]);

      setSuccessMessage(
        "Task created successfully.",
      );

      setShowCreateModal(false);
      resetTaskForm();
    } catch (createError) {
      const message =
        createError instanceof Error
          ? createError.message
          : "Unable to create the task.";

      setError(message);
    } finally {
      setSavingTask(false);
    }
  }

  async function handleEditTask(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!editingTask) {
      return;
    }

    if (!taskTitle.trim()) {
      setError("Please enter a task title.");
      return;
    }

    if (!taskCaseId) {
      setError("Please select a case.");
      return;
    }

    try {
      setSavingTask(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `/api/auth/tasks/${editingTask.id}/`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: taskTitle.trim(),
            description:
              taskDescription.trim(),
            case_id: Number(taskCaseId),
            deadline:
              taskDeadline
                ? new Date(
                    taskDeadline,
                  ).toISOString()
                : null,
            status: taskStatus,
            assigned_to_id:
              editingTask.assigned_to.id,
          }),
        },
      );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        router.push("/login");
        return;
      }

      const data: UpdateTaskResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to update the task.",
        );
      }

      if (!data.task) {
        throw new Error(
          "The task was updated, but the server did not return it.",
        );
      }

      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === data.task?.id
            ? data.task
            : task,
        ),
      );

      setSuccessMessage(
        "Task updated successfully.",
      );

      closeEditModal();
    } catch (editError) {
      const message =
        editError instanceof Error
          ? editError.message
          : "Unable to update the task.";

      setError(message);
    } finally {
      setSavingTask(false);
    }
  }

  async function handleStatusChange(
    task: Task,
    status: string,
  ) {
    if (task.status === status) {
      return;
    }

    try {
      setUpdatingStatusId(task.id);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `/api/auth/tasks/${task.id}/`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: task.title,
            description:
              task.description || "",
            case_id: task.case.id,
            deadline: task.deadline,
            status,
            assigned_to_id:
              task.assigned_to.id,
          }),
        },
      );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        router.push("/login");
        return;
      }

      const data: UpdateTaskResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to update the task status.",
        );
      }

      if (!data.task) {
        throw new Error(
          "The task status was updated, but the server did not return the task.",
        );
      }

      setTasks((currentTasks) =>
        currentTasks.map((item) =>
          item.id === data.task?.id
            ? data.task
            : item,
        ),
      );

      setSuccessMessage(
        "Task status updated successfully.",
      );
    } catch (statusError) {
      const message =
        statusError instanceof Error
          ? statusError.message
          : "Unable to update the task status.";

      setError(message);
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function handleDelete(task: Task) {
    const confirmed = window.confirm(
      `Delete "${task.title}"?\n\nThis will permanently remove the task.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(task.id);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `/api/auth/tasks/${task.id}/`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to delete the task.",
        );
      }

      setTasks((currentTasks) =>
        currentTasks.filter(
          (item) => item.id !== task.id,
        ),
      );

      setSuccessMessage(
        "Task deleted successfully.",
      );
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete the task.";

      setError(message);
    } finally {
      setDeletingId(null);
    }
  }

  function clearFilters() {
    setSearch("");
    setCaseFilter("");
    setStatusFilter("");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-950 lg:block">
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="flex items-center gap-3 border-b border-slate-800 px-6 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-sm font-bold text-blue-400">
                LF
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  LawFirm
                </p>

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
                  href="/lawyer#clients"
                  className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
                >
                  Clients
                </Link>

                <Link
                  href="/lawyer#cases"
                  className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
                >
                  Cases
                </Link>

                <Link
                  href="/lawyer#hearings"
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
                  className="block rounded-lg bg-blue-600/10 px-3 py-2.5 text-sm font-medium text-blue-400"
                >
                  Tasks
                </Link>

                <Link
                  href="/lawyer#finance"
                  className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
                >
                  Finance
                </Link>
              </div>
            </nav>

            <div className="border-t border-slate-800 p-4">
              <Link
                href="/lawyer"
                className="block rounded-lg border border-slate-800 px-3 py-2.5 text-center text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 sm:text-xs">
                Lawyer Workspace
              </p>

              <h1 className="mt-1 truncate text-lg font-semibold text-white sm:text-xl">
                Tasks
              </h1>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500 sm:px-4"
            >
              <span className="hidden sm:inline">
                Create Task
              </span>

              <span className="sm:hidden">
                Add Task
              </span>
            </button>
          </header>

          <div className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {error && (
              <div
                role="alert"
                className="mb-5 rounded-2xl border border-red-900/60 bg-red-950/30 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-300">
                      Something went wrong
                    </p>

                    <p className="mt-1 text-sm leading-6 text-red-400/80">
                      {error}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setError("")}
                    className="self-start rounded-lg border border-red-900/60 px-3 py-2 text-xs text-red-300 transition hover:bg-red-950/50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="mb-5 rounded-2xl border border-emerald-900/60 bg-emerald-950/30 p-4"
              >
                <p className="text-sm font-medium text-emerald-300">
                  {successMessage}
                </p>
              </div>
            )}

            <div className="mb-8">
              <p className="mb-2 text-sm font-medium text-blue-400">
                Task Management
              </p>

              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Legal tasks
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Track legal work, deadlines, case-related
                actions, and task progress from one place.
              </p>
            </div>

            <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
                <p className="text-xs text-slate-600">
                  Total
                </p>

                <p className="mt-2 text-2xl font-semibold text-white">
                  {loading
                    ? "—"
                    : taskSummary.total}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
                <p className="text-xs text-slate-600">
                  To Do
                </p>

                <p className="mt-2 text-2xl font-semibold text-slate-300">
                  {loading
                    ? "—"
                    : taskSummary.todo}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
                <p className="text-xs text-slate-600">
                  In Progress
                </p>

                <p className="mt-2 text-2xl font-semibold text-blue-400">
                  {loading
                    ? "—"
                    : taskSummary.inProgress}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
                <p className="text-xs text-slate-600">
                  Completed
                </p>

                <p className="mt-2 text-2xl font-semibold text-emerald-400">
                  {loading
                    ? "—"
                    : taskSummary.completed}
                </p>
              </div>

              <div className="rounded-2xl border border-red-900/30 bg-red-950/10 p-4">
                <p className="text-xs text-slate-600">
                  Overdue
                </p>

                <p className="mt-2 text-2xl font-semibold text-red-400">
                  {loading
                    ? "—"
                    : taskSummary.overdue}
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 sm:p-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <label
                    htmlFor="task-search"
                    className="mb-2 block text-xs font-medium text-slate-500"
                  >
                    Search
                  </label>

                  <input
                    id="task-search"
                    type="search"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Title, description, case..."
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-blue-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="task-case-filter"
                    className="mb-2 block text-xs font-medium text-slate-500"
                  >
                    Case
                  </label>

                  <select
                    id="task-case-filter"
                    value={caseFilter}
                    onChange={(event) =>
                      setCaseFilter(event.target.value)
                    }
                    disabled={loadingCases}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-700 disabled:opacity-50"
                  >
                    <option value="">
                      All cases
                    </option>

                    {filteredCases.map(
                      (caseItem) => (
                        <option
                          key={caseItem.id}
                          value={caseItem.id}
                        >
                          {caseItem.case_number} —{" "}
                          {caseItem.title}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="task-status-filter"
                    className="mb-2 block text-xs font-medium text-slate-500"
                  >
                    Status
                  </label>

                  <select
                    id="task-status-filter"
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-700"
                  >
                    <option value="">
                      All statuses
                    </option>

                    {taskStatuses.map(
                      (status) => (
                        <option
                          key={status.value}
                          value={status.value}
                        >
                          {status.label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-600">
                  {loading
                    ? "Loading tasks..."
                    : `${tasks.length} task${
                        tasks.length === 1
                          ? ""
                          : "s"
                      } found`}
                </p>

                {(search ||
                  caseFilter ||
                  statusFilter) && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="self-start rounded-lg border border-slate-800 px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </section>

            <section className="mt-6">
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map(
                    (item) => (
                      <div
                        key={item}
                        className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
                      >
                        <div className="flex items-start justify-between">
                          <div className="h-5 w-3/5 rounded bg-slate-800" />

                          <div className="h-5 w-20 rounded-full bg-slate-800" />
                        </div>

                        <div className="mt-4 h-3 w-4/5 rounded bg-slate-800" />

                        <div className="mt-2 h-3 w-3/5 rounded bg-slate-800" />

                        <div className="mt-5 h-3 w-full rounded bg-slate-800" />

                        <div className="mt-2 h-3 w-4/5 rounded bg-slate-800" />

                        <div className="mt-5 h-9 w-full rounded bg-slate-800" />
                      </div>
                    ),
                  )}
                </div>
              ) : tasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 px-5 py-14 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-lg font-semibold text-blue-400">
                    T
                  </div>

                  <h3 className="mt-5 text-base font-semibold text-white">
                    No tasks found
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                    {search ||
                    caseFilter ||
                    statusFilter
                      ? "Try changing your search or filters."
                      : "Create your first task to start tracking legal work."}
                  </p>

                  {!(
                    search ||
                    caseFilter ||
                    statusFilter
                  ) && (
                    <button
                      type="button"
                      onClick={openCreateModal}
                      className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
                    >
                      Create Task
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {tasks.map((task) => (
                    <article
                      key={task.id}
                      className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition hover:border-slate-700 hover:bg-slate-900/60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3
                          title={task.title}
                          className="min-w-0 truncate text-base font-semibold text-white"
                        >
                          {task.title}
                        </h3>

                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium ${getStatusClass(
                            task.status,
                          )}`}
                        >
                          {task.status_display ||
                            formatStatus(
                              task.status,
                            )}
                        </span>
                      </div>

                      <div className="mt-4">
                        <p className="text-xs font-medium text-blue-400">
                          {task.case.case_number}
                        </p>

                        <p
                          title={task.case.title}
                          className="mt-1 truncate text-sm text-slate-300"
                        >
                          {task.case.title}
                        </p>

                        <p className="mt-1 truncate text-xs text-slate-600">
                          Client:{" "}
                          {task.case.client
                            .full_name}
                        </p>
                      </div>

                      {task.description && (
                        <p className="mt-4 line-clamp-3 border-t border-slate-800 pt-4 text-xs leading-5 text-slate-500">
                          {task.description}
                        </p>
                      )}

                      <div className="mt-4 space-y-2.5 text-xs">
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-slate-600">
                            Deadline
                          </span>

                          <span
                            className={`text-right ${getDeadlineClass(
                              task.deadline,
                              task.status,
                            )}`}
                          >
                            {formatDate(
                              task.deadline,
                            )}

                            {getDeadlineState(
                              task.deadline,
                              task.status,
                            ) ===
                              "overdue" && (
                              <span className="ml-1 font-medium">
                                · Overdue
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-start justify-between gap-4">
                          <span className="text-slate-600">
                            Assigned to
                          </span>

                          <span className="min-w-0 truncate text-right text-slate-400">
                            {task.assigned_to
                              .first_name ||
                            task.assigned_to
                              .last_name
                              ? `${task.assigned_to.first_name} ${task.assigned_to.last_name}`.trim()
                              : task.assigned_to
                                  .email}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 border-t border-slate-800 pt-4">
                        <label
                          htmlFor={`status-${task.id}`}
                          className="mb-2 block text-[11px] font-medium text-slate-600"
                        >
                          Change status
                        </label>

                        <select
                          id={`status-${task.id}`}
                          value={task.status}
                          onChange={(event) =>
                            void handleStatusChange(
                              task,
                              event.target.value,
                            )
                          }
                          disabled={
                            updatingStatusId ===
                              task.id ||
                            deletingId ===
                              task.id
                          }
                          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 outline-none focus:border-blue-700 disabled:opacity-50"
                        >
                          {taskStatuses.map(
                            (status) => (
                              <option
                                key={status.value}
                                value={
                                  status.value
                                }
                              >
                                {status.label}
                              </option>
                            ),
                          )}
                        </select>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEditModal(task)
                          }
                          disabled={
                            deletingId ===
                            task.id
                          }
                          className="rounded-lg border border-blue-900/50 px-3 py-2.5 text-xs font-medium text-blue-400 transition hover:bg-blue-950/30 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void handleDelete(
                              task,
                            )
                          }
                          disabled={
                            deletingId ===
                            task.id
                          }
                          className="rounded-lg border border-red-900/40 px-3 py-2.5 text-xs font-medium text-red-400 transition hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId ===
                          task.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <div className="mt-6 rounded-2xl border border-blue-900/40 bg-blue-950/20 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-300">
                    Task assignment
                  </p>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                    New tasks are currently assigned to the
                    logged-in user. Staff assignment and
                    team-wide task management will be connected
                    when the Admin / Staff module is implemented.
                  </p>
                </div>

                <div className="shrink-0 rounded-full border border-blue-900/60 bg-blue-950/30 px-3 py-1.5 text-xs font-medium text-blue-300">
                  {currentUser
                    ? "Assigned to you"
                    : "Loading"}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[95vh] w-full overflow-y-auto rounded-t-2xl border border-slate-800 bg-slate-950 shadow-2xl sm:max-w-2xl sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Create task
                </h2>

                <p className="mt-1 text-xs text-slate-600">
                  Create a legal task and associate it with a
                  case.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                disabled={savingTask}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-500 transition hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close create task dialog"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleCreateTask}
              className="space-y-5 p-5"
            >
              <div>
                <label
                  htmlFor="create-task-title"
                  className="mb-2 block text-xs font-medium text-slate-400"
                >
                  Task title
                </label>

                <input
                  id="create-task-title"
                  type="text"
                  value={taskTitle}
                  onChange={(event) =>
                    setTaskTitle(
                      event.target.value,
                    )
                  }
                  placeholder="e.g. Prepare court response"
                  disabled={savingTask}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-700 focus:border-blue-700"
                />
              </div>

              <div>
                <label
                  htmlFor="create-task-case"
                  className="mb-2 block text-xs font-medium text-slate-400"
                >
                  Case
                </label>

                <select
                  id="create-task-case"
                  value={taskCaseId}
                  onChange={(event) =>
                    setTaskCaseId(
                      event.target.value,
                    )
                  }
                  disabled={
                    savingTask ||
                    loadingCases
                  }
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-700 disabled:opacity-50"
                >
                  <option value="">
                    Select case
                  </option>

                  {cases.map((caseItem) => (
                    <option
                      key={caseItem.id}
                      value={caseItem.id}
                    >
                      {caseItem.case_number} —{" "}
                      {caseItem.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="create-task-deadline"
                    className="mb-2 block text-xs font-medium text-slate-400"
                  >
                    Deadline
                  </label>

                  <input
                    id="create-task-deadline"
                    type="datetime-local"
                    value={taskDeadline}
                    onChange={(event) =>
                      setTaskDeadline(
                        event.target.value,
                      )
                    }
                    disabled={savingTask}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="create-task-status"
                    className="mb-2 block text-xs font-medium text-slate-400"
                  >
                    Status
                  </label>

                  <select
                    id="create-task-status"
                    value={taskStatus}
                    onChange={(event) =>
                      setTaskStatus(
                        event.target.value,
                      )
                    }
                    disabled={savingTask}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-700"
                  >
                    {taskStatuses.map(
                      (status) => (
                        <option
                          key={status.value}
                          value={status.value}
                        >
                          {status.label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="create-task-description"
                  className="mb-2 block text-xs font-medium text-slate-400"
                >
                  Description
                </label>

                <textarea
                  id="create-task-description"
                  value={taskDescription}
                  onChange={(event) =>
                    setTaskDescription(
                      event.target.value,
                    )
                  }
                  placeholder="Optional task details..."
                  rows={5}
                  disabled={savingTask}
                  className="w-full resize-none rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-700 focus:border-blue-700"
                />
              </div>

              <div className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-4">
                <p className="text-xs leading-5 text-blue-300">
                  This task will be assigned to your current
                  account.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={savingTask}
                  className="rounded-lg border border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingTask}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingTask
                    ? "Creating..."
                    : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingTask && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[95vh] w-full overflow-y-auto rounded-t-2xl border border-slate-800 bg-slate-950 shadow-2xl sm:max-w-2xl sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Edit task
                </h2>

                <p className="mt-1 text-xs text-slate-600">
                  Update task details, deadline, and status.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                disabled={savingTask}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-500 transition hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close edit task dialog"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleEditTask}
              className="space-y-5 p-5"
            >
              <div>
                <label
                  htmlFor="edit-task-title"
                  className="mb-2 block text-xs font-medium text-slate-400"
                >
                  Task title
                </label>

                <input
                  id="edit-task-title"
                  type="text"
                  value={taskTitle}
                  onChange={(event) =>
                    setTaskTitle(
                      event.target.value,
                    )
                  }
                  disabled={savingTask}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-task-case"
                  className="mb-2 block text-xs font-medium text-slate-400"
                >
                  Case
                </label>

                <select
                  id="edit-task-case"
                  value={taskCaseId}
                  onChange={(event) =>
                    setTaskCaseId(
                      event.target.value,
                    )
                  }
                  disabled={
                    savingTask ||
                    loadingCases
                  }
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-700 disabled:opacity-50"
                >
                  <option value="">
                    Select case
                  </option>

                  {cases.map((caseItem) => (
                    <option
                      key={caseItem.id}
                      value={caseItem.id}
                    >
                      {caseItem.case_number} —{" "}
                      {caseItem.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="edit-task-deadline"
                    className="mb-2 block text-xs font-medium text-slate-400"
                  >
                    Deadline
                  </label>

                  <input
                    id="edit-task-deadline"
                    type="datetime-local"
                    value={taskDeadline}
                    onChange={(event) =>
                      setTaskDeadline(
                        event.target.value,
                      )
                    }
                    disabled={savingTask}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-task-status"
                    className="mb-2 block text-xs font-medium text-slate-400"
                  >
                    Status
                  </label>

                  <select
                    id="edit-task-status"
                    value={taskStatus}
                    onChange={(event) =>
                      setTaskStatus(
                        event.target.value,
                      )
                    }
                    disabled={savingTask}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-700"
                  >
                    {taskStatuses.map(
                      (status) => (
                        <option
                          key={status.value}
                          value={status.value}
                        >
                          {status.label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="edit-task-description"
                  className="mb-2 block text-xs font-medium text-slate-400"
                >
                  Description
                </label>

                <textarea
                  id="edit-task-description"
                  value={taskDescription}
                  onChange={(event) =>
                    setTaskDescription(
                      event.target.value,
                    )
                  }
                  rows={5}
                  disabled={savingTask}
                  className="w-full resize-none rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-700"
                />
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-xs text-slate-600">
                  Assigned to
                </p>

                <p className="mt-1 text-sm text-slate-300">
                  {editingTask.assigned_to
                    .first_name ||
                  editingTask.assigned_to
                    .last_name
                    ? `${editingTask.assigned_to.first_name} ${editingTask.assigned_to.last_name}`.trim()
                    : editingTask.assigned_to
                        .email}
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={savingTask}
                  className="rounded-lg border border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingTask}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingTask
                    ? "Saving changes..."
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}