import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
import toast from "react-hot-toast";
import * as authService from "../services/authService";
import { createCategory } from "../services/categoryService";
import { clearCsrfToken } from "../services/api";
import { DEFAULT_CATEGORIES } from "../utils/constants";

const AuthContext = createContext(null);

const initialState = { status: "loading", user: null };

function reducer(state, action) {
  switch (action.type) {
    case "SET_USER":
      return { status: "authenticated", user: action.user };
    case "CLEAR":
      return { status: "anonymous", user: null };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let cancelled = false;
    authService
      .fetchMe()
      .then((user) => !cancelled && dispatch({ type: "SET_USER", user }))
      .catch(() => !cancelled && dispatch({ type: "CLEAR" }));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onExpired = () => {
      clearCsrfToken();
      dispatch({ type: "CLEAR" });
      toast.error("Your session expired. Please log in again.", { id: "session-expired" });
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  const login = useCallback(async (email, password) => {
    const user = await authService.login(email, password);
    dispatch({ type: "SET_USER", user });
  }, []);

  const register = useCallback(async (data) => {
    const user = await authService.register(data);
    for (const category of DEFAULT_CATEGORIES) {
      try {
        await createCategory(category);
      } catch {
        /* ignore */
      }
    }
    dispatch({ type: "SET_USER", user });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      /* ignore */
    } finally {
      dispatch({ type: "CLEAR" });
    }
  }, []);

  const value = useMemo(
    () => ({ ...state, login, register, logout }),
    [state, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);