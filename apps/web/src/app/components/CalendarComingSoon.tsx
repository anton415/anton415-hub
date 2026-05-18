import { useAuthGate } from "../hooks/useAuthGate";

export function CalendarComingSoon() {
  const { status } = useAuthGate();

  if (status === "loading") {
    return <div className="flex items-center justify-center h-screen text-muted-foreground">Загрузка…</div>;
  }

  return <div className="p-8">Календарь (в разработке)</div>;
}
