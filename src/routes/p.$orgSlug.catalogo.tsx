import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl, moneyNumber } from "@/lib/format";
import { matchesProductSearch } from "@/lib/text-search";
import { normalizeProductImageUrls } from "@/lib/product-images";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2, Loader2, LogIn, Package, Search, ShoppingBag, UserPlus } from "lucide-react";

export const Route = createFileRoute("/p/$orgSlug/catalogo")({
  head: ({ params }) => ({
    meta: [
      {
        title: params.orgSlug
          ? `Catálogo — ${decodeURIComponent(params.orgSlug)} — 2AVendas`
          : "Catálogo — 2AVendas",
      },
    ],
  }),
  component: PublicStorefrontCatalog,
});

interface StorefrontProduct {
  id: string;
  owner_seller_id: string | null;
  name: string;
  sku: string | null;
  description: string | null;
  price: number;
  stock: number;
  category: string | null;
  supplier: string | null;
  image_url: string | null;
  image_urls: unknown;
}

interface StorefrontPayload {
  error?: string;
  organization_name?: string;
  organization_slug?: string;
  invite_token?: string | null;
  products?: StorefrontProduct[];
}

function PublicProductCard({ p }: { p: StorefrontProduct }) {
  const gallery = normalizeProductImageUrls(p.image_urls, p.image_url);
  const cover = gallery[0];

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-b from-muted to-muted/70">
        {cover ? (
          <img
            src={cover}
            alt={p.name}
            loading="lazy"
            className="h-full w-full object-cover object-center"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-14 w-14 text-muted-foreground/35" />
          </div>
        )}
      </div>
      {p.supplier?.trim() ? (
        <div className="flex items-center gap-2 border-b border-border bg-primary/[0.06] px-3 py-2">
          <Building2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="truncate text-xs font-semibold">{p.supplier.trim()}</span>
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-4">
        {p.category?.trim() ? (
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {p.category.trim()}
          </div>
        ) : null}
        <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug">{p.name}</h3>
        <div className="mt-1 text-xs text-muted-foreground">
          EAN13: {p.sku ?? "—"}
        </div>
        {p.description?.trim() ? (
          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.description.trim()}</p>
        ) : null}
        <div className="mt-auto pt-3 text-lg font-bold text-primary">
          {brl(moneyNumber(p.price))}
        </div>
      </div>
    </div>
  );
}

function PublicStorefrontCatalog() {
  const { orgSlug: orgSlugParam } = Route.useParams();
  const orgSlug = decodeURIComponent(orgSlugParam);
  const { isAuthenticated, loading: authLoading, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<StorefrontPayload | null>(null);
  const [search, setSearch] = useState("");
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("public_storefront_by_org_slug", {
        p_slug: orgSlug,
      });
      if (cancelled) return;
      if (error) {
        setPayload({ error: "rpc_failed" });
        setLoading(false);
        return;
      }
      const raw = data as StorefrontPayload | null;
      if (!raw || typeof raw !== "object") {
        setPayload({ error: "empty" });
        setLoading(false);
        return;
      }
      const prods = Array.isArray(raw.products) ? raw.products : [];
      setPayload({
        ...raw,
        products: prods.map((row) => ({
          ...(row as StorefrontProduct),
          price: moneyNumber((row as StorefrontProduct).price),
          stock: Number.isFinite(Number((row as StorefrontProduct).stock))
            ? Math.trunc(Number((row as StorefrontProduct).stock))
            : 0,
        })),
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [orgSlug]);

  const orgName = payload?.organization_name?.trim() || "Representação";
  const canonicalSlug = (payload?.organization_slug ?? orgSlug).trim();
  const inviteToken = (payload?.invite_token ?? "").trim();

  const filtered = useMemo(() => {
    const list = payload?.products ?? [];
    if (!search.trim()) return list;
    return list.filter((p) => matchesProductSearch(p, search));
  }, [payload?.products, search]);

  const portalHref = inviteToken
    ? `/p/${encodeURIComponent(canonicalSlug)}/portal?invite=${encodeURIComponent(inviteToken)}`
    : `/p/${encodeURIComponent(canonicalSlug)}/portal`;

  const err = payload?.error;
  const catalogReady =
    !loading &&
    !authLoading &&
    !isAuthenticated &&
    payload &&
    err !== "not_found" &&
    err !== "invalid_slug" &&
    err !== "rpc_failed" &&
    err !== "empty";

  useEffect(() => {
    if (!catalogReady) return;
    setWelcomeOpen(true);
  }, [catalogReady, orgSlug]);

  const dismissWelcome = () => {
    setWelcomeOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Dialog
        open={welcomeOpen}
        onOpenChange={(open) => {
          if (!open) dismissWelcome();
          else setWelcomeOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pedidos só após entrar na sua conta</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-left text-sm leading-relaxed text-muted-foreground">
                <p>
                  Esta página mostra apenas o catálogo da representação. Não é possível montar
                  carrinho nem enviar pedidos por aqui sem fazer{" "}
                  <strong className="text-foreground">login</strong>.
                </p>
                {inviteToken ? (
                  <p>
                    Use <strong className="text-foreground">Registrar</strong> para criar sua conta
                    de cliente desta empresa e, em seguida, comprar no portal.
                  </p>
                ) : (
                  <p>
                    Quando o cadastro de novos clientes estiver disponível para esta empresa,
                    aparecerão aqui as opções de entrar e de registrar-se.
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            {inviteToken ? (
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" className="w-full sm:w-auto" asChild>
                  <Link
                    to="/login"
                    search={{
                      redirect: `/p/${encodeURIComponent(canonicalSlug)}/portal?invite=${encodeURIComponent(inviteToken)}`,
                    }}
                    onClick={() => dismissWelcome()}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Entrar
                  </Link>
                </Button>
                <Button className="w-full sm:w-auto" asChild>
                  <Link
                    to="/signup"
                    search={{ invite: inviteToken }}
                    onClick={() => dismissWelcome()}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Registrar
                  </Link>
                </Button>
              </div>
            ) : null}
            <Button
              variant="secondary"
              className="w-full"
              type="button"
              onClick={() => dismissWelcome()}
            >
              Continuar só olhando o catálogo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <nav
          className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          aria-label="Catálogo público"
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
            <Link to="/" className="shrink-0">
              <Logo light={false} />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                Catálogo B2B
              </p>
              <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
                {orgName}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:shrink-0">
            {!authLoading && isAuthenticated && (role === "admin" || role === "vendedor") ? (
              <Button variant="outline" size="sm" asChild>
                <Link to="/catalogo">Meu catálogo</Link>
              </Button>
            ) : null}
            {!authLoading && isAuthenticated ? (
              <Button size="sm" asChild>
                <Link to={portalHref}>
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Ir ao portal para comprar
                </Link>
              </Button>
            ) : inviteToken ? (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link
                    to="/login"
                    search={{
                      redirect: `/p/${encodeURIComponent(canonicalSlug)}/portal?invite=${encodeURIComponent(inviteToken)}`,
                    }}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Entrar
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/signup" search={{ invite: inviteToken }}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Registrar
                  </Link>
                </Button>
              </>
            ) : null}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : err === "not_found" || err === "invalid_slug" ? (
          <p className="text-center text-muted-foreground">
            Não encontramos uma representação com este endereço de catálogo.
          </p>
        ) : err === "rpc_failed" || err === "empty" ? (
          <p className="text-center text-muted-foreground">
            Não foi possível carregar o catálogo agora. Tente de novo em instantes.
          </p>
        ) : (
          <>
            <div className="mb-6 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              <p>
                Esta página é só para <strong className="text-foreground">visualização</strong>.
                Para montar o carrinho e enviar pedidos, entre na sua conta ou cadastre-se como
                cliente desta empresa.
              </p>
              {!inviteToken && !authLoading ? (
                <p className="mt-2 border-l-2 border-amber-500/60 pl-3 text-amber-950 dark:text-amber-100">
                  O cadastro de novos clientes ainda não está disponível por aqui. Peça ao
                  representante o link de cadastro ou orientações para acessar o portal.
                </p>
              ) : null}
            </div>

            <div className="relative mb-6">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, categoria, indústria ou EAN13…"
                className="h-11 pl-10"
                autoComplete="off"
                aria-label="Buscar produtos"
              />
            </div>

            {filtered.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">
                Nenhum produto ativo no momento ou nada corresponde à busca.
              </p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((p) => (
                  <PublicProductCard key={p.id} p={p} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <Link to="/" className="underline-offset-4 hover:underline">
          2AVendas
        </Link>
        {" · "}
        Catálogo público da representação
      </footer>
    </div>
  );
}
