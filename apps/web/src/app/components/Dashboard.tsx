import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useAuthGate } from "../hooks/useAuthGate";
import { AppShell } from "../layouts/AppShell";
import { modules } from "../../shared/config/modules";

export function Dashboard() {
  const { status } = useAuthGate();

  if (status === "loading") {
    return <div className="flex items-center justify-center h-screen text-muted-foreground">Загрузка…</div>;
  }

  return (
    <AppShell>
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="mb-2">Модули</h2>
          <p className="text-muted-foreground">Выберите модуль для работы</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => {
            const Icon = module.icon;
            const isActive = module.status === "active";

            return (
              <Card
                key={module.id}
                className={`transition-all hover:shadow-lg ${
                  isActive ? "cursor-pointer hover:border-primary" : "opacity-60"
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`${module.color} p-3 rounded-lg text-white`}>
                      <Icon className="size-6" />
                    </div>
                    {!isActive && <Badge variant="outline">Скоро</Badge>}
                  </div>
                  <CardTitle className="mt-4">{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {isActive ? (
                    <Link to={module.path}>
                      <Button className="w-full">Открыть</Button>
                    </Link>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      В разработке
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </AppShell>
  );
}
