import { useAuthGate } from "../hooks/useAuthGate";
import { AppShell } from "../layouts/AppShell";

export function CalendarComingSoon() {
  const { status } = useAuthGate();

  if (status === "loading") {
    return <div className="flex items-center justify-center h-screen text-muted-foreground">Загрузка…</div>;
  }

  return (
    <AppShell activeModuleId="calendar">
      <main className="p-8 text-muted-foreground">Календарь (в разработке)</main>
    </AppShell>
  );
}
