import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useMenuGate } from "@/hooks/use-menu-gate";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { TrendingUp, ShoppingBag, Users, DollarSign } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — 2AVendas" }] }),
  component: Dashboard,
});

type DashboardStat = {
  label: string;
  value: string;
  change: string;
  icon: typeof DollarSign;
};

function monthStartDate(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return start.toISOString();
}

function Dashboard() {
  useMenuGate("dashboard");
  const { profile, role, user, organization } = useAuth();
  const [stats, setStats] = useState<DashboardStat[]>([
    { label: "Vendas do mês", value: "—", change: "carregando...", icon: DollarSign },
    { label: "Pedidos", value: "—", change: "carregando...", icon: ShoppingBag },
    { label: "Clientes ativos", value: "—", change: "carregando...", icon: Users },
    { label: "Conversão de pedidos", value: "—", change: "carregando...", icon: TrendingUp },
  ]);

  useEffect(() => {
    const load = async () => {
      if (!organization?.id) return;
      const startIso = monthStartDate();

      let ordersQuery = supabase
        .from("orders")
        .select("id,total,created_at")
        .eq("organization_id", organization.id)
        .gte("created_at", startIso);
      let customersQuery = supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization.id);

      if (role === "vendedor" && user?.id) {
        ordersQuery = ordersQuery.eq("seller_id", user.id);
        customersQuery = customersQuery.eq("assigned_seller_id", user.id);
      }

      const [{ data: orders }, { count: customerCount }] = await Promise.all([ordersQuery, customersQuery]);
      const rows = orders ?? [];
      const revenue = rows.reduce((acc, row) => acc + Number((row as { total?: number }).total ?? 0), 0);
      const ordersCount = rows.length;
      const clients = customerCount ?? 0;
      const conversion = clients > 0 ? `${((ordersCount / clients) * 100).toFixed(1)}%` : "0%";

      setStats([
        { label: "Vendas do mês", value: brl(revenue), change: role === "admin" ? "admin + vendedores" : "minha carteira", icon: DollarSign },
        { label: "Pedidos", value: String(ordersCount), change: role === "admin" ? "todos os vendedores" : "meus pedidos", icon: ShoppingBag },
        { label: "Clientes ativos", value: String(clients), change: role === "admin" ? "base total" : "minha base", icon: Users },
        { label: "Conversão de pedidos", value: conversion, change: "pedidos/clientes", icon: TrendingUp },
      ]);
    };
    void load();
  }, [organization?.id, role, user?.id]);

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Olá, {profile?.full_name?.split(" ")[0] ?? "vendedor"} 👋</h1>
        <p className="mt-1 text-muted-foreground">
          {role === "admin"
            ? "Visão consolidada do seu desempenho + equipe de vendedores."
            : role === "vendedor"
              ? "Resumo personalizado da sua carteira e suas vendas."
              : "Visão da sua operação."}
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
