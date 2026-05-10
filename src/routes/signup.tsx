import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { LoginCarousel } from "@/components/auth/LoginCarousel";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>) => ({
    invite: typeof search.invite === "string" ? search.invite : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Cadastre-se grátis — 2AVendas" },
      { name: "description", content: "Crie sua representação no 2AVendas em menos de 1 minuto. 14 dias grátis." },
    ],
  }),
  component: SignupPage,
});

const baseFieldsSchema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
});

type InvitePurposeRow = { purpose: string };

function SignupPage() {
  const search = Route.useSearch();
  const inviteToken = search.invite?.trim();
  const hasInvite = !!inviteToken;
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [clientTradeName, setClientTradeName] = useState("");
  const [clientLegalName, setClientLegalName] = useState("");
  const [clientIndustry, setClientIndustry] = useState("");
  const [staffOrganizationName, setStaffOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [invitePurpose, setInvitePurpose] = useState<"client_catalog" | "seller_signup" | null>(null);
  const [invitePeekLoading, setInvitePeekLoading] = useState(false);

  /** Cliente com conta que abre o link de cadastro: vai direto ao portal para aceitar o convite e vincular a representação. */
  useEffect(() => {
    if (loading || !isAuthenticated) return;
    if (!inviteToken) {
      navigate({ to: "/dashboard" });
      return;
    }
    if (invitePeekLoading) return;
    if (invitePurpose === "client_catalog") {
      window.location.replace(`/portal?invite=${encodeURIComponent(inviteToken)}`);
      return;
    }
    navigate({ to: "/dashboard" });
  }, [
    isAuthenticated,
    loading,
    navigate,
    inviteToken,
    invitePurpose,
    invitePeekLoading,
  ]);

  useEffect(() => {
    if (!inviteToken) {
      setInvitePurpose(null);
      setInvitePeekLoading(false);
      return;
    }
    let cancelled = false;
    setInvitePeekLoading(true);
    void supabase.rpc("peek_invite_purpose", { p_token: inviteToken }).then(({ data, error }) => {
      if (cancelled) return;
      setInvitePeekLoading(false);
      if (error || !data?.length) {
        setInvitePurpose(null);
        return;
      }
      const p = (data as InvitePurposeRow[])[0]?.purpose;
      if (p === "client_catalog" || p === "seller_signup") setInvitePurpose(p);
      else setInvitePurpose(null);
    });
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (hasInvite && invitePeekLoading) {
      toast.error("Aguarde validar o convite.");
      return;
    }

    const meta: Record<string, string | undefined> = {};
    if (inviteToken) meta.invite_token = inviteToken;

    let parsedBase: z.infer<typeof baseFieldsSchema>;

    if (!hasInvite) {
      const schema = baseFieldsSchema.extend({
        organizationName: z.string().trim().min(2, "Informe o nome da empresa da representação").max(100),
      });
      const r = schema.safeParse({ fullName, email, password, organizationName });
      if (!r.success) {
        toast.error(r.error.issues[0].message);
        return;
      }
      parsedBase = r.data;
      const orgTrim = r.data.organizationName.trim();
      meta.organization_name = orgTrim;
      meta.staff_organization_name = orgTrim;
    } else if (invitePurpose === "client_catalog") {
      const schema = baseFieldsSchema.extend({
        clientTradeName: z.string().trim().min(2, "Informe o nome da empresa").max(160),
        clientLegalName: z.string().trim().min(2, "Informe a razão social").max(200),
        clientIndustry: z.string().trim().max(160),
      });
      const r = schema.safeParse({
        fullName,
        email,
        password,
        clientTradeName,
        clientLegalName,
        clientIndustry,
      });
      if (!r.success) {
        toast.error(r.error.issues[0].message);
        return;
      }
      parsedBase = r.data;
      meta.client_trade_name = r.data.clientTradeName.trim();
      meta.client_legal_name = r.data.clientLegalName.trim();
      const ind = r.data.clientIndustry.trim();
      if (ind.length > 0) meta.client_industry = ind;
    } else if (invitePurpose === "seller_signup") {
      const schema = baseFieldsSchema.extend({
        staffOrganizationName: z.string().trim().max(100),
      });
      const r = schema.safeParse({ fullName, email, password, staffOrganizationName });
      if (!r.success) {
        toast.error(r.error.issues[0].message);
        return;
      }
      parsedBase = r.data;
      const s = r.data.staffOrganizationName.trim();
      if (s.length >= 2) {
        meta.staff_organization_name = s;
        meta.organization_name = s;
      }
    } else {
      const schema = baseFieldsSchema.extend({
        organizationName: z.string().trim().min(2, "Informe o nome da empresa").max(100),
      });
      const r = schema.safeParse({ fullName, email, password, organizationName });
      if (!r.success) {
        toast.error(r.error.issues[0].message);
        return;
      }
      parsedBase = r.data;
      meta.organization_name = r.data.organizationName.trim();
    }

    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: parsedBase.email,
      password: parsedBase.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          ...meta,
          full_name: parsedBase.fullName,
        },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      hasInvite ? "Conta criada! Você já pode acessar com o papel do convite." : "Conta criada! Você já pode acessar.",
    );
  };

  const headline = !hasInvite
    ? "Crie sua representação"
    : invitePurpose === "client_catalog"
      ? "Cadastro de cliente"
      : invitePurpose === "seller_signup"
        ? "Cadastro de vendedor"
        : "Crie sua conta";

  const sub =
    !hasInvite
      ? "14 dias grátis. Sem cartão de crédito. Informe a empresa da sua representação (tenant operacional)."
      : invitePurpose === "client_catalog"
        ? "Bem-vindo ao 2AVendas. Você terá acesso aos produtos da representação que lhe enviou o convite."
        : invitePurpose === "seller_signup"
          ? "Opcional: nome da equipe ou como aparece na carteira; por padrão usamos o nome da representação do convite."
          : invitePeekLoading
            ? "Validando convite…"
            : "Use o mesmo e-mail indicado no convite e informe a empresa conforme o tipo de convite.";

  const disableSubmit = submitting || (hasInvite && invitePeekLoading);

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:block">
        <LoginCarousel />
      </div>
      <div className="flex flex-col justify-center px-6 py-10 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Logo />
          <h1 className="mt-8 text-3xl font-bold tracking-tight">{headline}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{sub}</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="fullName">Seu nome</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-1.5 h-11" />
            </div>

            {!hasInvite && (
              <div>
                <Label htmlFor="org">Empresa da representação</Label>
                <Input
                  id="org"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  required
                  className="mt-1.5 h-11"
                />
                <p className="mt-1 text-xs text-muted-foreground">Administradores e vendedores compartilham esta mesma empresa operacional (tenant).</p>
              </div>
            )}

            {hasInvite && invitePurpose === "client_catalog" && (
              <Tabs defaultValue="empresa" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="empresa">Empresa</TabsTrigger>
                  <TabsTrigger value="industria">Indústria</TabsTrigger>
                </TabsList>
                <TabsContent value="empresa" className="space-y-4 pt-3 outline-none">
                  <div>
                    <Label htmlFor="clientTrade">Nome da empresa (nome fantasia)</Label>
                    <Input
                      id="clientTrade"
                      value={clientTradeName}
                      onChange={(e) => setClientTradeName(e.target.value)}
                      required
                      className="mt-1.5 h-11"
                      placeholder="Como a empresa prefere ser chamada"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientLegal">Razão social</Label>
                    <Input
                      id="clientLegal"
                      value={clientLegalName}
                      onChange={(e) => setClientLegalName(e.target.value)}
                      required
                      className="mt-1.5 h-11"
                      placeholder="Denominação conforme contrato ou CNPJ"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Campo distinto do nome fantasia; ambos aparecem para a representação na carteira de clientes.
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground border-l-2 border-primary/25 pl-3 py-1">
                    Já tem cadastro em outra representação? Não crie outra conta com o mesmo e-mail — peça o link “para quem já tem conta” e entre pelo login para vincular esta empresa também.
                  </p>
                </TabsContent>
                <TabsContent value="industria" className="space-y-3 pt-3 outline-none">
                  <div>
                    <Label htmlFor="clientIndustry">Segmento ou indústria</Label>
                    <Input
                      id="clientIndustry"
                      value={clientIndustry}
                      onChange={(e) => setClientIndustry(e.target.value)}
                      className="mt-1.5 h-11"
                      placeholder="Ex.: food service, varejo farmacêutico, metalúrgica…"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Opcional no cadastro; ajuda a representação a contextualizar sua operação.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            )}

            {hasInvite && invitePurpose === "seller_signup" && (
              <div>
                <Label htmlFor="staffOrg">Empresa / equipe comercial (opcional)</Label>
                <Input
                  id="staffOrg"
                  value={staffOrganizationName}
                  onChange={(e) => setStaffOrganizationName(e.target.value)}
                  className="mt-1.5 h-11"
                  placeholder="Mesma representação do convite se deixar em branco"
                />
              </div>
            )}

            {hasInvite && !invitePeekLoading && invitePurpose === null && (
              <div>
                <Label htmlFor="orgLegacy">Nome da empresa</Label>
                <Input
                  id="orgLegacy"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  required
                  className="mt-1.5 h-11"
                />
                <p className="mt-1 text-xs text-muted-foreground">Não foi possível ler o tipo de convite; use o nome orientado pelo representante.</p>
              </div>
            )}

            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5 h-11" />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1.5 h-11" />
              <p className="mt-1 text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
            </div>
            <Button type="submit" className="w-full h-11 shadow-md" disabled={disableSubmit}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link
              to="/login"
              search={hasInvite ? { invite: search.invite } : undefined}
              className="font-semibold text-primary hover:underline"
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
