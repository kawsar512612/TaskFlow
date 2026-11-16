import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
import { useAuth } from "./AuthContext";
import * as taskApi from "../services/taskService";
import * as categoryApi from "../services/categoryService";

const TaskContext = createContext(null);

const initialState = { tasks: [], categories: [], status: "idle" };

function reducer(state, action) {
  switch (action.type) {
    case "LOADING":
      return { ...state, status: "loading" };
    case "LOADED":
      return { tasks: action.tasks, categories: action.categories, status: "ready" };
    case "ERROR":
      return { ...state, status: "error" };
    case "RESET":
      return initialState;
    case "ADD":
      return { ...state, tasks: [action.task, ...state.tasks] };
    case "REPLACE":
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.task.id ? action.task : t)),
      };
    case "REPLACE_MANY": {
      const byId = new Map(action.tasks.map((t) => [t.id, t]));
      return { ...state, tasks: state.tasks.map((t) => byId.get(t.id) ?? t) };
    }
    case "REMOVE":
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };
    case "REMOVE_MANY": {
      const gone = new Set(action.ids);
      return { ...state, tasks: state.tasks.filter((t) => !gone.has(t.id)) };
    }
    default:
      return state;
  }
}

export function TaskProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [state, dispatch] = useReducer(reducer, initialState);

  const fetchAll = () => Promise.all([taskApi.listTasks(), categoryApi.listCategories()]);

  const load = useCallback(async (isCancelled = () => false) => {
    dispatch({ type: "LOADING" });
    try {
      const [tasks, categories] = await fetchAll();
      if (!isCancelled()) dispatch({ type: "LOADED", tasks, categories });
    } catch {
      if (!isCancelled()) dispatch({ type: "ERROR" });
    }
  }, []);

  const silentRefresh = useCallback(async () => {
    try {
      const [tasks, categories] = await fetchAll();
      dispatch({ type: "LOADED", tasks, categories });
    } catch {
      /* ব্যর্থ হলে পুরোনো ডেটা থাকে */
    }
  }, []);

  useEffect(() => {
    if (userId === null) {
      dispatch({ type: "RESET" });
      return;
    }
    let cancelled = false;
    load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [userId, load]);

  const actions = useMemo(
    () => ({
      addTask: async (data) => {
        const task = await taskApi.createTask(data);
        dispatch({ type: "ADD", task });
      },
      updateTask: async (id, data) => {
        const task = await taskApi.updateTask(id, data);
        dispatch({ type: "REPLACE", task });
      },
      setTaskStatus: async (id, status) => {
        const task = await taskApi.updateTask(id, { status });
        dispatch({ type: "REPLACE", task });
      },

      // Kanban: আগে স্ক্রিনে বদলায়, সার্ভার ব্যর্থ হলে আগের অবস্থায় ফেরে
      moveTask: async (task, status) => {
        dispatch({ type: "REPLACE", task: { ...task, status } });
        try {
          const saved = await taskApi.updateTask(task.id, { status });
          dispatch({ type: "REPLACE", task: saved });
        } catch (err) {
          dispatch({ type: "REPLACE", task });
          throw err;
        }
      },

      deleteTask: async (id) => {
        await taskApi.removeTask(id);
        dispatch({ type: "REMOVE", id });
      },

      bulkSetStatus: async (ids, status) => {
        const results = await Promise.allSettled(
          ids.map((id) => taskApi.updateTask(id, { status }))
        );
        const updated = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
        if (updated.length > 0) dispatch({ type: "REPLACE_MANY", tasks: updated });
        return { ok: updated.length, failed: ids.length - updated.length };
      },
      bulkDelete: async (ids) => {
        const results = await Promise.allSettled(ids.map((id) => taskApi.removeTask(id)));
        const removed = ids.filter((_, i) => results[i].status === "fulfilled");
        if (removed.length > 0) dispatch({ type: "REMOVE_MANY", ids: removed });
        return { ok: removed.length, failed: ids.length - removed.length };
      },

      addCategory: async (data) => {
        await categoryApi.createCategory(data);
        await silentRefresh();
      },
      updateCategory: async (id, data) => {
        await categoryApi.updateCategory(id, data);
        await silentRefresh();
      },
      deleteCategory: async (id) => {
        await categoryApi.removeCategory(id);
        await silentRefresh();
      },

      reload: () => load(),
    }),
    [load, silentRefresh]
  );

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export const useTasks = () => useContext(TaskContext);