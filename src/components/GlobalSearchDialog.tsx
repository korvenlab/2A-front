import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type { MenuFlags } from "@/lib/session-menu";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Package,
  Columns3,
  FileSpreadsheet,
  CalendarDays,
  Store,
  UserCog,
} from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type CustHit = { id: string; name: string; legal_name: string | null };
type ProdHit = { id: string; name: string };
type OrdHit = { id: string; order_number: number };

function navShortcuts(menu: MenuFlags, role: string | null): { label: string; to: string; icon: typeof LayoutDashboard }[] {
  const items: { label: string; to: string; icon: typeof LayoutDashboard }[] = [];
  if (menu.dashboard) items.push({ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard });
  if (menu.pedidos) items.push({ label: "Pedidos", to: "/pedidos", icon: ShoppingBag });
  if (menu.orcamentos) items.push({ label: "Orçamentos", to: "/orcamentos", icon: FileSpreadsheet });
  if (menu.funil) items.push({ label: "Funil / CRM", to: "/funil", icon: Columns3 });
  if (menu.visitas) items.push({ label: "Visitas", to: "/visitas", icon: CalendarDays });
  if (menu.clientes) items.push({ label: "Clientes", to: "/clientes", icon: Users });
  if (menu.vendedores && role === "admin")
    items.push({ label: "Vendedores", to: "/vendedores", icon: UserCog });
  if (menu.catalogo) items.push({ label: "Catálogo", to: "/catalogo", icon: Package });
  if (menu.portal) items.push({ label: "Portal de compras", to: "/portal", icon: Store });
  return items;
}

export function GlobalSearchDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { organization, user, role, menu } = useAuth();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CustHit[]>([]);
  const [products, setProducts] = useState<ProdHit[]>([]);
  const [orders, setOrders] = useState<OrdHit[]>([]);

  const shortcuts = useMemo(() => navShortcuts(menu, role), [menu, role]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) {
      setQ("");
      setCustomers([]);
      setProducts([]);
      setOrders([]);
      return;
    }
    const term = q.trim();
    if (!organization?.id || term.length < 2) {
      setCustomers([]);
      setProducts([]);
      setOrders([]);
      setLoading(false);
      return;
    }

    const safe = term.replace(/%/g, "").slice(0, 64);
    let cancelled = false;
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        let cq = supabase
          .from("customers")
          .select("id,name,legal_name")
          .eq("organization_id", organization.id)
          .or(`name.ilike.%${safe}%,legal_name.ilike.%${safe}%`)
          .limit(8);
        if (role === "vendedor" && user?.id) cq = cq.eq("assigned_seller_id", user.id);

        const pq = supabase
          .from("products")
          .select("id,name")
          .eq("organization_id", organization.id)
          .eq("active", true)
          .ilike("name", `%${safe}%`)
          .limit(8);

        const num = /^\d+$/.test(term) ? parseInt(term, 10) : NaN;
        let ordersPromise = Promise.resolve({ data: [] as OrdHit[] });
        if (!Number.isNaN(num)) {
          let oq = supabase
            .from("orders")
            .select("id,order_number")
            .eq("organization_id", organization.id)
            .eq("order_number", num)
            .limit(5);
          if (role === "vendedor" && user?.id) oq = oq.eq("seller_id", user.id);
          ordersPromise = oq.then((r) => ({ data: (r.data as OrdHit[]) ?? [] }));
        }

        const [cr, pr, or] = await Promise.all([cq, pq, ordersPromise]);

        if (cancelled) return;
        setCustomers((cr.data as CustHit[]) ?? []);
        setProducts((pr.data as ProdHit[]) ?? []);
        setOrders(or.data ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, q, organization?.id, role, user?.id]);

  const go = (to: string) => {
    onOpenChange(false);
    navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <p className="sr-only">Busca global na organização</p>
      <CommandInput
        placeholder="Buscar clientes, produtos ou # pedido…"
        value={q}
        onValueChange={setQ}
      />
      <CommandList>
        <CommandEmpty>{loading ? "Buscando…" : q.trim().length < 2 ? "Digite pelo menos 2 caracteres." : "Nada encontrado."}</CommandEmpty>

        {shortcuts.length > 0 && (
          <CommandGroup heading="Ir para">
            {shortcuts.map((s) => (
              <CommandItem key={s.to} value={`nav-${s.label}`} onSelect={() => go(s.to)}>
                <s.icon className="h-4 w-4 text-muted-foreground" />
                {s.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {customers.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Clientes">
              {customers.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`cust-${c.name}-${c.id}`}
                  onSelect={() => go("/clientes")}
                >
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{c.name}</span>
                  {c.legal_name?.trim() ? (
                    <span className="truncate text-xs text-muted-foreground">{c.legal_name.trim()}</span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {products.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Produtos">
              {products.map((p) => (
                <CommandItem key={p.id} value={`prod-${p.name}`} onSelect={() => go("/catalogo")}>
                  <Package className="h-4 w-4 text-muted-foreground" />
                  {p.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {orders.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Pedidos">
              {orders.map((o) => (
                <CommandItem key={o.id} value={`ord-${o.order_number}`} onSelect={() => go("/pedidos")}>
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                  Pedido #{String(o.order_number).padStart(4, "0")}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Atalho">
          <CommandItem disabled>
            Abrir busca
            <CommandShortcut>Ctrl K</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
