import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useMenuGate } from "@/hooks/use-menu-gate";
import { TrendingUp, ShoppingBag, Users, DollarSign } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — 2AVendas" }] }),
  component: Dashboard,
});

const stats = [
  { label: "Vendas do mês", value: "R$ 124.580", change: "+12%", icon: DollarSign },
  { label: "Pedidos", value: "184", change: "+8%", icon: ShoppingBag },
  { label: "Clientes ativos", value: "67", change: "+3", icon: Users },
  { label: "Meta atingida", value: "78%", change: "+5%", icon: TrendingUp },
];

function Dashboard() {
  useMenuGate("dashboard");
  const { profile, role } = useAuth();
  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Olá, {profile?.full_name?.split(" ")[0] ?? "vendedor"} 👋</h1>
        <p className="mt-1 text-muted-foreground">
          {role === "vendedor"
            ? "Aqui está o resumo da sua carteira de clientes."
            : "Visão geral da sua representação."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold">{s.value}</p>
            <p className="mt-1 text-xs text-success font-medium">{s.change} vs mês anterior</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Pedidos recentes</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Em breve: lista completa de pedidos com filtros, status e ações.
        </p>
      </div>
    </div>
  );
}
