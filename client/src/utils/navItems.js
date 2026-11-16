import {
  LayoutDashboard,
  ListTodo,
  CalendarCheck,
  Clock,
  CheckCircle2,
  Star,
  Calendar,
  LayoutGrid,
  Tag,
  User,
  Settings,
} from "lucide-react";

export const mainNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "All Tasks", icon: ListTodo },
  { to: "/today", label: "Today", icon: CalendarCheck },
  { to: "/upcoming", label: "Upcoming", icon: Clock },
  { to: "/completed", label: "Completed", icon: CheckCircle2 },
  { to: "/important", label: "Important", icon: Star },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/board", label: "Board", icon: LayoutGrid },
  { to: "/categories", label: "Categories", icon: Tag },
];

export const accountNav = [
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
];