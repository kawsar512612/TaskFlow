import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search, LogOut } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../context/AuthContext";

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  // Enter চাপলে All Tasks পেজে search সহ যায়
  const handleSearch = (e) => {
    e.preventDefault();
    const term = query.trim();
    navigate(term ? `/tasks?q=${encodeURIComponent(term)}` : "/tasks");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const initial = user?.name?.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-900/80">
      <button
        onClick={onMenuClick}
        aria-label="Open menu"
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 lg:hidden dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Menu size={20} />
      </button>

      <form onSubmit={handleSearch} role="search" className="relative max-w-md flex-1">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks and press Enter..."
          aria-label="Search tasks"
          className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 dark:border-slate-800 dark:bg-slate-950"
        />
      </form>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <span
          title={user?.email}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300"
        >
          {initial}
        </span>
        <button
          onClick={handleLogout}
          aria-label="Log out"
          className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
    </header>
  );
}