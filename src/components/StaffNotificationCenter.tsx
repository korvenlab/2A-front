import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Loader2, MailCheck, ShoppingBag, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brl, moneyNumber } from "@/lib/format";
import type { AppRole } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const WINDOW_DAYS = 14;
const POLL_MS = 120_000;
const STORAGE_KEY_PREFIX = "2avendas.notifications.lastSeen.";

type FeedKind = "order" | "customer" | "invite_accept";

interface FeedItem {
  id: string;
  kind: FeedKind;
  at: string;
  title: string;
  detail?: string | null;
  href: string;
}

function storageKey(orgId: string) {
  return `${STORAGE_KEY_PREFIX}${orgId}`;
}

function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "agora";
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d} dia${d > 1 ? "s" : ""}`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function StaffNotificationCenter({
  organizationId,
  role,
  userId,
}: {
  organizationId: string;
  role: AppRole;
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [lastSeenAt, setLastSeenAt] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(storageKey(organizationId)) ?? "";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    setLastSeenAt(localStorage.getItem(storageKey(organizationId)) ?? "");
  }, [organizationId]);

  const load = useCallback(async () => {
    if (!organizationId || !userId) return;
    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    setLoading(true);

    let ordersQuery = supabase
      .from("orders")
      .select("id,order_number,status,total,created_at,customers(name)")
      .eq("organization_id", organizationId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(30);
    if (role === "vendedor") {
      ordersQuery = ordersQuery.eq("seller_id", userId);
    }

    let customersQuery = supabase
      .from("customers")
      .select("id,name,email,created_at,user_id,assigned_seller_id")
      .eq("organization_id", organizationId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(30);
    if (role === "vendedor") {
      customersQuery = customersQuery.eq("assigned_seller_id", userId);
    }

    const invitesQuery =
      role === "admin"
        ? supabase
            .from("seller_invitations")
            .select("id,email,accepted_at,invited_by,purpose")
            .eq("organization_id", organizationId)
            .eq("purpose", "client_catalog")
            .not("accepted_at", "is", null)
            .gte("accepted_at", since)
            .order("accepted_at", { ascending: false })
            .limit(20)
        : null;

    const [ordRes, custRes, invRes] = await Promise.all([
      ordersQuery,
      customersQuery,
      invitesQuery ?? Promise.resolve({ data: [], error: null }),
    ]);

    const next: FeedItem[] = [];

    if (!ordRes.error && ordRes.data) {
      for (const row of ordRes.data as {
        id: string;
        order_number: number;
        status: string;
        total: unknown;
        created_at: string;
        customers?: { name?: string | null } | null;
      }[]) {
        const cust = row.customers?.name?.trim() || "Cliente";
        const total = brl(moneyNumber(row.total));
        const isPortal = row.status === "enviado";
        next.push({
          id: `order-${row.id}`,
          kind: "order",
          at: row.created_at,
          title: isPortal ? "Novo pedido pelo portal" : "Pedido atualizado",
          detail: `#${String(row.order_number).padStart(4, "0")} · ${cust} · ${total}`,
          href: "/pedidos",
        });
      }
    }

    if (!custRes.error && custRes.data) {
      for (const row of custRes.data as {
        id: string;
        name: string;
        email: string | null;
        created_at: string;
        user_id: string | null;
      }[]) {
        const viaPortal = !!row.user_id;
        next.push({
          id: `cust-${row.id}`,
          kind: "customer",
          at: row.created_at,
          title: viaPortal ? "Cliente entrou pelo link" : "Novo cliente na base",
          detail: `${row.name.trim()}${row.email ? ` · ${row.email}` : ""}`,
          href: "/clientes",
        });
      }
    }

    if (!invRes.error && invRes.data) {
      for (const row of invRes.data as {
        id: string;
        email: string;
        accepted_at: string | null;
        invited_by: string | null;
      }[]) {
        if (!row.accepted_at) continue;
        const em = (row.email ?? "").trim() || "convite";
        next.push({
          id: `inv-${row.id}`,
          kind: "invite_accept",
          at: row.accepted_at,
          title: "Convite de catálogo aceito",
          detail: em,
          href: "/clientes",
        });
      }
    }

    next.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    setItems(next.slice(0, 40));
    setLoading(false);
  }, [organizationId, role, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!organizationId) return;
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [organizationId, load]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const unreadCount = useMemo(() => {
    if (!lastSeenAt) return items.length;
    const t = new Date(lastSeenAt).getTime();
    if (Number.isNaN(t)) return items.length;
    return items.filter((i) => new Date(i.at).getTime() > t).length;
  }, [items, lastSeenAt]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next && typeof window !== "undefined") {
      const now = new Date().toISOString();
      localStorage.setItem(storageKey(organizationId), now);
      setLastSeenAt(now);
    }
  };

  const Icon = ({ kind }: { kind: FeedKind }) => {
    switch (kind) {
      case "order":
        return <ShoppingBag className="h-4 w-4 shrink-0 text-primary" aria-hidden />;
      case "customer":
        return <UserPlus className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />;
      default:
        return <MailCheck className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />;
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label="Central de notificações"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <Badge
              variant="destructive"
              className="absolute -right-0.5 -top-0.5 h-5 min-w-5 px-1 flex items-center justify-center rounded-full p-0 text-[10px] font-bold"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(100vw-2rem,22rem)] p-0" sideOffset={8}>
        <DropdownMenuLabel className="px-3 py-2 text-sm font-semibold">
          Atividades recentes
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-0" />
        <ScrollArea className="max-h-[min(70vh,320px)]">
          <div className="py-1">
            {loading && items.length === 0 ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Nenhuma atualização nas últimas {WINDOW_DAYS} dias.
              </p>
            ) : (
              items.map((it) => (
                <Link
                  key={it.id}
                  to={it.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex gap-3 px-3 py-2.5 text-left text-sm outline-none transition-colors",
                    "hover:bg-accent focus-visible:bg-accent",
                    lastSeenAt &&
                      !Number.isNaN(new Date(lastSeenAt).getTime()) &&
                      new Date(it.at).getTime() > new Date(lastSeenAt).getTime()
                      ? "bg-primary/[0.06]"
                      : "",
                  )}
                >
                  <Icon kind={it.kind} />
                  <span className="min-w-0 flex-1 space-y-0.5">
                    <span className="font-medium leading-tight text-foreground block">{it.title}</span>
                    {it.detail ? (
                      <span className="text-xs text-muted-foreground line-clamp-2 block">{it.detail}</span>
                    ) : null}
                    <span className="text-[10px] text-muted-foreground">{relTime(it.at)}</span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </ScrollArea>
        <DropdownMenuSeparator className="my-0" />
        <p className="px-3 py-2 text-[10px] text-muted-foreground">
          Pedidos, clientes e aceites de convite da sua organização. Atualiza ao abrir e a cada{" "}
          {POLL_MS / 60_000} min.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
