import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

export default function DashboardLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // পেজ বদলালে মোবাইল ড্রয়ার নিজে বন্ধ হবে
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // ড্রয়ার খোলা থাকলে: Esc চাপলে বন্ধ, আর পেছনের পেজ স্ক্রল হবে না
  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen">
      <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="lg:pl-64">
        <Topbar onMenuClick={() => setMenuOpen(true)} />
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}