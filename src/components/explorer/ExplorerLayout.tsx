import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { DeepSpaceBackground } from "@/components/DeepSpaceBackground";
import {
  Home,
  Globe,
  Box,
  ArrowRightLeft,
  User,
  FileCode,
  Users,
  Link2,
  Cpu,
  Code,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { path: "/explorer", label: "Overview", icon: Home },
  { path: "/explorer/network", label: "Network", icon: Globe },
  { path: "/explorer/blocks", label: "Blocks", icon: Box },
  { path: "/explorer/transactions", label: "Transactions", icon: ArrowRightLeft },
  { path: "/explorer/accounts", label: "Accounts", icon: User },
  { path: "/explorer/contracts", label: "Contracts", icon: FileCode },
  { path: "/explorer/validators", label: "Validators", icon: Users },
  { path: "/explorer/consensus", label: "Consensus", icon: Link2 },
  { path: "/explorer/evm", label: "EVM", icon: Cpu },
  { path: "/explorer/developers", label: "Developers", icon: Code },
];

export const ExplorerLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen relative">
      <DeepSpaceBackground />
      
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-card/80 backdrop-blur-xl border-b border-border/50 z-50 flex items-center px-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden mr-2"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Box className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold text-foreground">Lattice Network</span>
        </div>
        
        <div className="ml-auto flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-md bg-secondary/50 border border-border/50">
            <span className="text-xs text-muted-foreground">Chain ID</span>
            <span className="text-sm font-mono text-foreground ml-2">88401</span>
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-14 left-0 bottom-0 z-40 bg-card/60 backdrop-blur-xl border-r border-border/50 transition-all duration-300",
          sidebarOpen ? "w-56" : "w-14",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full py-4">
          <nav className="flex-1 px-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                (item.path === "/explorer" && location.pathname === "/explorer") ||
                (item.path !== "/explorer" && location.pathname.startsWith(item.path));
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                    isActive
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {sidebarOpen && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Collapse button - desktop only */}
          <div className="px-2 hidden md:block">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <ChevronLeft className={cn(
                "h-4 w-4 transition-transform",
                !sidebarOpen && "rotate-180"
              )} />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={cn(
          "pt-14 min-h-screen transition-all duration-300",
          sidebarOpen ? "md:pl-56" : "md:pl-14"
        )}
      >
        <div className="p-6 relative z-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
