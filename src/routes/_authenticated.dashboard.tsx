import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useMenuGate } from "@/hooks/use-menu-gate";
import { supabase } from "@/integrations/supabase/client";
import { brl, dt } from "@/lib/format";
import { AppPage, AppTableCard } from "@/components/layout/AppPage";
import {
  fetchOrderCommissionLinesByOrderIds,
  viewerCommissionForOrder,
} from "@/lib/order-commission";
import {
  TrendingUp,
  ShoppingBag,
  Users,
  DollarSign,
  Percent,
  CheckCircle2,
  Circle,
  X,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

function onboardDismissKey(userId: string, orgId: string): string {
  return `2av_onboarding_dismiss:${userId}:${orgId}`;
}

type RecentOrder = {
  id: string;
  order_number: number;
  status: string;
  total: number;
  created_at: string;
  customers: { name: string } | null;
};

function Dashboard() {
  useMenuGate("dashboard");
  const { profile, role, user, organization, menu } = useAuth();
  const [stats, setStats] = useState<DashboardStat[]>([
    { label: "Vendas do mês", value: "—", change: "carregando...", icon: DollarSign },
    { label: "Pedidos", value: "—", change: "carregando...", icon: ShoppingBag },
    { label: "Clientes ativos", value: "—", change: "carregando...", icon: Users },
    { label: "Conversão de pedidos", value: "—", change: "carregando...", icon: TrendingUp },
    { label: "Comissão estimada (mês)", value: "—", change: "carregando...", icon: Percent },
  ]);

  const [onboarding, setOnboarding] = useState<{
    dismissed: boolean;
    hasCustomer: boolean;
    hasProduct: boolean;
    hasOrder: boolean;
  } | null>(null);

  const [funnelCounts, setFunnelCounts] = useState<{ stage: string; count: number; color: string | null }[]>([]);
  const [ticketMedio, setTicketMedio] = useState<number | null>(null);
  const [sellerRank, setSellerRank] = useState<{ id: string; label: string; total: number }[]>([]);
  const [productMix, setProductMix] = useState<{ name: string; subtotal: number }[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  useEffect(() => {
    const load = async () => {
      if (!organization?.id || !user?.id) return;
      const startIso = monthStartDate();

      let ordersQuery = supabase
        .from("orders")
        .select("id,total,created_at,seller_id,status")
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

      const dismissed = localStorage.getItem(onboardDismissKey(user.id, organization.id)) === "1";

      let obCust = supabase
        .from("customers")
        .select("id", { head: true, count: "exact" })
        .eq("organization_id", organization.id)
        .limit(1);
      let obOrd = supabase
        .from("orders")
        .select("id", { head: true, count: "exact" })
        .eq("organization_id", organization.id)
        .limit(1);
      if (role === "vendedor" && user?.id) {
        obCust = obCust.eq("assigned_seller_id", user.id);
        obOrd = obOrd.eq("seller_id", user.id);
      }
      const onboardingCounts = Promise.all([
        obCust,
        supabase
          .from("products")
          .select("id", { head: true, count: "exact" })
          .eq("organization_id", organization.id)
          .eq("active", true)
          .limit(1),
        obOrd,
      ]);

      let recentQ = supabase
        .from("orders")
        .select("id,order_number,status,total,created_at,customers(name)")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false })
        .limit(6);
      if (role === "vendedor" && user?.id) recentQ = recentQ.eq("seller_id", user.id);

      const funnelPromise =
        role !== "cliente"
          ? (async () => {
              const stageQuery = supabase
                .from("pipeline_stages")
                .select("id,name,sort_order,color")
                .eq("organization_id", organization.id)
                .order("sort_order");
              let oppQuery = supabase
                .from("sales_opportunities")
                .select("id,stage_id,owner_id")
                .eq("organization_id", organization.id);
              if (role === "vendedor" && user?.id) {
                oppQuery = oppQuery.or(`owner_id.eq.${user.id},owner_id.is.null`);
              }
              const [{ data: st }, { data: op }] = await Promise.all([stageQuery, oppQuery]);
              const stages = (st ?? []) as { id: string; name: string; sort_order: number; color: string | null }[];
              const opps = (op ?? []) as { stage_id: string }[];
              const byStage = new Map<string, number>();
              for (const o of opps) byStage.set(o.stage_id, (byStage.get(o.stage_id) ?? 0) + 1);
              return stages.map((s) => ({
                stage: s.name,
                count: byStage.get(s.id) ?? 0,
                color: s.color,
              }));
            })()
          : Promise.resolve([]);

      const [ordersPack, onboardRes, recentRes, funnelRows] = await Promise.all([
        Promise.all([ordersQuery, customersQuery]).then(async ([or, cu]) => ({
          data: (await or).data,
          count: (await cu).count,
        })),
        onboardingCounts,
        recentQ,
        funnelPromise,
      ]);

      const ordersRaw = (ordersPack.data ?? []) as {
        id: string;
        total?: number;
        created_at?: string;
        seller_id?: string | null;
        status?: string;
      }[];
      const rows = ordersRaw.filter((o) => o.status !== "cancelado");

      const customerCount = ordersPack.count ?? 0;
      const nc = onboardRes[0].count ?? 0;
      const np = onboardRes[1].count ?? 0;
      const no = onboardRes[2].count ?? 0;
      const recentRows = recentRes.data;

      setOnboarding({
        dismissed,
        hasCustomer: (nc ?? 0) > 0,
        hasProduct: (np ?? 0) > 0,
        hasOrder: (no ?? 0) > 0,
      });

      setRecentOrders((recentRows as RecentOrder[]) ?? []);
      setFunnelCounts(funnelRows);

      const revenue = rows.reduce((acc, row) => acc + Number(row.total ?? 0), 0);
      const ordersCount = rows.length;
      const clients = customerCount ?? 0;
      const conversion = clients > 0 ? `${((ordersCount / clients) * 100).toFixed(1)}%` : "0%";

      setTicketMedio(ordersCount > 0 ? revenue / ordersCount : null);

      const commissionBySeller: Record<string, number> = {};
      if (role === "vendedor" && user?.id) {
        const { data: commRow } = await supabase
          .from("organization_seller_commissions")
          .select("commission_pct")
          .eq("organization_id", organization.id)
          .eq("seller_user_id", user.id)
          .maybeSingle();
        commissionBySeller[user.id] =
          Number((commRow as { commission_pct?: number } | null)?.commission_pct) || 0;
      } else if (role === "admin") {
        const { data: commRows } = await supabase
          .from("organization_seller_commissions")
          .select("seller_user_id, commission_pct")
          .eq("organization_id", organization.id);
        for (const r of commRows ?? []) {
          const row = r as { seller_user_id: string; commission_pct: number };
          commissionBySeller[row.seller_user_id] = Number(row.commission_pct) || 0;
        }
      }

      const adminUserId = user.id;
      const commissionLinesByOrder = await fetchOrderCommissionLinesByOrderIds(
        supabase,
        rows.map((r) => r.id),
      );

      let commissionMonth = 0;
      for (const row of rows) {
        const sid = row.seller_id;
        if (!sid && role === "vendedor") continue;
        const sellerPct = sid ? (commissionBySeller[sid] ?? 0) : 0;
        const lines = commissionLinesByOrder[row.id] ?? [];
        commissionMonth += viewerCommissionForOrder(lines, sellerPct, {
          sellerId: sid,
          adminUserId,
          viewerRole: role,
          viewerUserId: user.id,
        });
      }
      commissionMonth = Math.round(commissionMonth * 100) / 100;

      setStats([
        {
          label: "Vendas do mês",
          value: brl(revenue),
          change: role === "admin" ? "toda a equipe" : "minha carteira",
          icon: DollarSign,
        },
        {
          label: "Pedidos",
          value: String(ordersCount),
          change: role === "admin" ? "exc. cancelados" : "meus pedidos",
          icon: ShoppingBag,
        },
        { label: "Clientes ativos", value: String(clients), change: role === "admin" ? "base total" : "minha base", icon: Users },
        { label: "Conversão de pedidos", value: conversion, change: "pedidos/clientes", icon: TrendingUp },
        {
          label: "Comissão estimada (mês)",
          value: brl(commissionMonth),
          change:
            role === "admin"
              ? "fatia da representação (por indústria)"
              : role === "vendedor"
                ? "% sobre comissão da indústria"
                : "—",
          icon: Percent,
        },
      ]);

      const orderIds = rows.map((r) => r.id);
      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from("order_items")
          .select("product_name,subtotal")
          .in("order_id", orderIds.slice(0, 500));
        const map = new Map<string, number>();
        for (const it of items ?? []) {
          const row = it as { product_name: string; subtotal: number };
          const name = row.product_name?.trim() || "—";
          map.set(name, (map.get(name) ?? 0) + Number(row.subtotal));
        }
        setProductMix(
          [...map.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([name, subtotal]) => ({ name, subtotal })),
        );
      } else {
        setProductMix([]);
      }

      if (role === "admin" && rows.length > 0) {
        const sums = new Map<string, number>();
        for (const row of rows) {
          const sid = row.seller_id;
          const key = sid ?? "__none__";
          sums.set(key, (sums.get(key) ?? 0) + Number(row.total ?? 0));
        }
        const ids = [...sums.keys()].filter((k) => k !== "__none__");
        const labels = new Map<string, string>();
        labels.set("__none__", "Sem vendedor");
        if (ids.length > 0) {
          const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
          for (const p of profs ?? []) {
            const pr = p as { id: string; full_name: string | null; email: string | null };
            labels.set(pr.id, pr.full_name?.trim() || pr.email?.trim() || pr.id);
          }
        }
        setSellerRank(
          [...sums.entries()]
            .map(([id, total]) => ({ id, label: labels.get(id) ?? id, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 12),
        );
      } else {
        setSellerRank([]);
      }
    };
    void load();
  }, [organization?.id, role, user?.id]);

  const dismissOnboarding = () => {
    if (!user?.id || !organization?.id) return;
    localStorage.setItem(onboardDismissKey(user.id, organization.id), "1");
    setOnboarding((o) => (o ? { ...o, dismissed: true } : o));
  };

  const showOnboarding =
    role !== "cliente" &&
    onboarding &&
    !onboarding.dismissed &&
    !(onboarding.hasCustomer && onboarding.hasProduct && onboarding.hasOrder);

  const statusPt: Record<string, string> = {
    rascunho: "Rascunho",
    enviado: "Enviado",
    aprovado: "Aprovado",
    faturado: "Faturado",
    cancelado: "Cancelado",
  };

  return (
    <AppPage className="space-y-8 pb-28 lg:pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Olá, {profile?.full_name?.split(" ")[0] ?? "vendedor"} 👋</h1>
        <p className="mt-1 text-muted-foreground">
          {role === "admin"
            ? "Vendas e pedidos do mês consideram toda a equipe (exceto cancelados). A comissão estimada usa o % de cada indústria sobre as linhas do pedido; nas vendas dos vendedores, você recebe o que sobra após a fatia deles."
            : role === "vendedor"
              ? "Resumo personalizado da sua carteira e suas vendas."
              : "Visão da sua operação."}
        </p>
      </div>

      {showOnboarding && (
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5 shadow-sm relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8"
            onClick={dismissOnboarding}
            aria-label="Ocultar checklist"
          >
            <X className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Primeiros passos</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Complete o essencial: clientes, catálogo e pedidos.
          </p>
          <ul className="mt-4 space-y-3">
            <li className="flex items-start gap-3">
              {onboarding?.hasCustomer ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium">Cadastre um cliente B2B</p>
                <Button variant="link" className="h-auto p-0 text-sm" asChild>
                  <Link to="/clientes">Abrir Clientes</Link>
                </Button>
              </div>
            </li>
            <li className="flex items-start gap-3">
              {onboarding?.hasProduct ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium">Publique um produto no catálogo</p>
                <Button variant="link" className="h-auto p-0 text-sm" asChild>
                  <Link to="/catalogo">Abrir Catálogo</Link>
                </Button>
              </div>
            </li>
            <li className="flex items-start gap-3">
              {onboarding?.hasOrder ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium">Registre seu primeiro pedido</p>
                <Button variant="link" className="h-auto p-0 text-sm" asChild>
                  <Link to="/pedidos">Abrir Pedidos</Link>
                </Button>
              </div>
            </li>
          </ul>
        </div>
      )}

      <div className="app-stats-grid">
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

      <div className={`grid gap-6 ${role === "admin" ? "lg:grid-cols-2" : ""}`}>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Funil (oportunidades ativas)</h2>
          </div>
          {funnelCounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados de funil ou sem permissão.</p>
          ) : (
            <ul className="space-y-2">
              {funnelCounts.map((f) => (
                <li key={f.stage} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: f.color ?? "var(--muted)" }}
                    />
                    <span className="truncate">{f.stage}</span>
                  </span>
                  <Badge variant="secondary">{f.count}</Badge>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            Distribuição atual das oportunidades por estágio (CRM). Ajuste estágios em Funil / CRM.
          </p>
        </div>

        {role === "admin" && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold">Pedidos do mês — métricas da equipe</h2>
            <p className="text-sm text-muted-foreground">
              Ticket médio e volume por representante (pedidos não cancelados). Comissões usam o % de cada
              indústria em{" "}
              <Link to="/industrias" className="text-primary underline-offset-2 hover:underline">
                Indústrias
              </Link>
              ; a fatia do vendedor é configurada em Vendedores.
            </p>
            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Ticket médio (equipe)</dt>
                <dd className="font-semibold tabular-nums">{ticketMedio != null ? brl(ticketMedio) : "—"}</dd>
              </div>
            </dl>
            {sellerRank.length > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Vendas no mês por representante
                </p>
                <ul className="space-y-1.5 text-sm">
                  {sellerRank.map((s, i) => (
                    <li key={s.id} className="flex justify-between gap-2">
                      <span className="truncate text-muted-foreground">
                        {i + 1}. {s.label}
                      </span>
                      <span className="font-medium tabular-nums shrink-0">{brl(s.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Mix de produtos (pedidos do mês)</h2>
        {productMix.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem linhas de pedido neste mês.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {productMix.map((p) => (
              <li key={p.name} className="flex justify-between gap-4">
                <span className="truncate">{p.name}</span>
                <span className="tabular-nums text-muted-foreground shrink-0">{brl(p.subtotal)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AppTableCard>
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Pedidos recentes</h2>
          <p className="mt-1 text-sm text-muted-foreground">Últimos registros com cliente e status.</p>
        </div>
        {recentOrders.length === 0 ? (
          <p className="p-8 text-sm text-muted-foreground text-center">Nenhum pedido encontrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-sm">#{String(o.order_number).padStart(4, "0")}</TableCell>
                  <TableCell>{o.customers?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{dt(o.created_at)}</TableCell>
                  <TableCell className="text-right font-medium">{brl(o.total)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{statusPt[o.status] ?? o.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="p-4 border-t border-border bg-muted/30">
          <Button variant="outline" size="sm" asChild>
            {role === "cliente" ? (
              <Link to={menu.portal ? "/portal" : "/dashboard"}>Ver pedidos no portal</Link>
            ) : (
              <Link to="/pedidos">Ver todos os pedidos</Link>
            )}
          </Button>
        </div>
      </AppTableCard>
    </AppPage>
  );
}
