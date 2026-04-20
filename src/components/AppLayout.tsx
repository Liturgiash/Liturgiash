import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Boxes, CalendarDays, LayoutDashboard, LogOut, Package } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/materials", label: "Materiais", icon: Package },
  { to: "/events", label: "Eventos", icon: CalendarDays },
];

export function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Boxes className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold text-sidebar-primary-foreground leading-tight">Liturgia</p>
            <p className="text-xs text-sidebar-foreground/70">Gestão integrada</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-sidebar-foreground/60 truncate">Conectado como</p>
            <p className="text-sm font-medium text-sidebar-primary-foreground truncate">{user?.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-primary">
              <Boxes className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sidebar-primary-foreground">Liturgia</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-sidebar-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <nav className="flex border-t border-sidebar-border">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex-1 flex flex-col items-center gap-1 py-2 text-xs",
                  isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <main className="flex-1 md:ml-0 pt-28 md:pt-0 px-4 md:px-8 py-6 md:py-8 max-w-7xl mx-auto w-full animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
}
