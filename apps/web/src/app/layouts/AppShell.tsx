import { type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "../components/ui/button";
import { logoutAndRedirect } from "../hooks/useAuthGate";
import { modules } from "../../shared/config/modules";

type AppShellProps = {
  activeModuleId?: string;
  leftSlot?: ReactNode;
  fullHeight?: boolean;
  children: ReactNode;
};

export function AppShell({ activeModuleId, leftSlot, fullHeight = false, children }: AppShellProps) {
  const navigate = useNavigate();

  const wrapperClass = fullHeight
    ? "flex flex-col h-screen bg-background"
    : "min-h-screen bg-background";

  return (
    <div className={wrapperClass}>
      <header className="border-b bg-card">
        <div className="px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 md:gap-3">
              {leftSlot}
              <Link to="/" className="flex items-center gap-2 md:gap-3">
                <div className="bg-primary text-primary-foreground p-1.5 md:p-2 rounded-lg">
                  <LayoutDashboard className="size-5 md:size-6" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg md:text-xl">anton-hub</h1>
                  <p className="text-xs md:text-sm text-muted-foreground">Личный центр управления</p>
                </div>
              </Link>
            </div>

            <nav
              aria-label="Модули"
              className="flex gap-1 md:gap-2 overflow-x-auto flex-1 justify-center"
            >
              {modules.map((module) => {
                const Icon = module.icon;
                const isActive = module.id === activeModuleId;
                return (
                  <Link key={module.id} to={module.path}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className="gap-1 md:gap-2 text-xs md:text-sm whitespace-nowrap h-8 md:h-9"
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon className="size-3 md:size-4" />
                      <span className="hidden xs:inline">{module.shortName}</span>
                    </Button>
                  </Link>
                );
              })}
            </nav>

            <Button
              variant="outline"
              size="sm"
              className="md:h-9"
              onClick={() => logoutAndRedirect(navigate)}
              aria-label="Выход"
            >
              <span className="hidden sm:inline">Выход</span>
              <LogOut className="size-4 sm:hidden" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
