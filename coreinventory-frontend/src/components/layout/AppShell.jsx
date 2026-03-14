import { useAtom } from "jotai";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import { sidebarOpenAtom } from "@/atoms";

export default function AppShell() {
  const [, setOpen] = useAtom(sidebarOpenAtom);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-950">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-white/6 bg-surface-900">
          <button
            onClick={() => setOpen(true)}
            className="text-white/50 hover:text-white"
          >
            <Menu size={20} />
          </button>
          <span className="font-display font-700 text-sm">CoreInventory</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
