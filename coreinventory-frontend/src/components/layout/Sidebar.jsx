import { useAtom } from "jotai";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  SlidersHorizontal,
  ScrollText,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { sidebarOpenAtom, tokenAtom, userAtom } from "@/atoms";
import { cn } from "@/utils";

const NAV = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Products", to: "/products", icon: Package },
  { label: "Warehouses", to: "/warehouses", icon: Warehouse },
  { sep: true, label: "Operations" },
  { label: "Receipts", to: "/receipts", icon: ArrowDownToLine },
  { label: "Deliveries", to: "/deliveries", icon: ArrowUpFromLine },
  { label: "Transfers", to: "/transfers", icon: ArrowLeftRight },
  { label: "Adjustments", to: "/adjustments", icon: SlidersHorizontal },
  { label: "Move History", to: "/ledger", icon: ScrollText },
  { sep: true, label: "Admin" },
  { label: "Users", to: "/users", icon: Users },
];

export default function Sidebar() {
  const [open, setOpen] = useAtom(sidebarOpenAtom);
  const [, setToken] = useAtom(tokenAtom);
  const [user, setUser] = useAtom(userAtom);
  const navigate = useNavigate();

  const logout = () => {
    setToken(null);
    setUser(null);
    navigate("/login");
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-30 h-screen flex flex-col bg-surface-900 border-r border-white/6 transition-all duration-200",
          open ? "w-56" : "w-14",
          "lg:relative lg:translate-x-0",
          !open && "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/6">
          <div className="w-7 h-7 bg-accent rounded flex items-center justify-center shrink-0">
            <Package size={14} className="text-ink" />
          </div>
          {open && (
            <span className="font-display font-700 text-sm tracking-tight whitespace-nowrap">
              CoreInventory
            </span>
          )}
          <button
            onClick={() => setOpen(!open)}
            className="ml-auto text-white/30 hover:text-white transition-colors lg:flex hidden"
          >
            {open ? <X size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-none py-4 px-2 space-y-0.5">
          {NAV.map((item, i) => {
            if (item.sep) {
              return open ? (
                <p key={i} className="section-title px-2 pt-4 pb-1">
                  {item.label}
                </p>
              ) : (
                <div key={i} className="my-2 border-t border-white/6" />
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    isActive ? "sidebar-item-active" : "sidebar-item",
                    !open && "justify-center px-0"
                  )
                }
              >
                <item.icon size={16} className="shrink-0" />
                {open && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-2 border-t border-white/6">
          {open ? (
            <div className="px-3 py-2.5 rounded bg-white/3">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-white/30 truncate">
                {user?.role?.replace("_", " ")}
              </p>
              <button
                onClick={logout}
                className="mt-2 flex items-center gap-1.5 text-xs text-white/30 hover:text-red-400 transition-colors"
              >
                <LogOut size={12} /> Logout
              </button>
            </div>
          ) : (
            <button
              onClick={logout}
              className="w-full flex justify-center p-2 text-white/30 hover:text-red-400 transition-colors"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
