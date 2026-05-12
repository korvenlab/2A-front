import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { persistPendingPromoCode } from "@/lib/billing-redeem-promo";
import { useAuth } from "@/lib/auth-context";
import { LoginCarousel } from "@/components/auth/LoginCarousel";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const signupInputClass =
  "login-input-clean mt-1.5 h-11 rounded-xl px-3 text-sm font-normal text-[#003366] placeholder:text-[#9CA3AF] focus-visible:ring-0";

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>) => ({
    invite: typeof search.invite === "string" ? search.invite : undefined,
    two_avendas_promo:
      typeof search.two_avendas_promo === "string" ? search.two_avendas_promo : undefined,
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
  const [staffOrganizationName, setStaffOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [invitePurpose, setInvitePurpose] = useState<"client_catalog" | "seller_signup" | null>(null);
  const [invitePeekLoading, setInvitePeekLoading] = useState(false);

  useEffect(() => {
    const p = search.two_avendas_promo?.trim();
    if (p) persistPendingPromoCode(p);
  }, [search.two_avendas_promo]);

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
      });
      const r = schema.safeParse({
        fullName,
        email,
        password,
        clientTradeName,
        clientLegalName,
      });
      if (!r.success) {
        toast.error(r.error.issues[0].message);
        return;
      }
      parsedBase = r.data;
      meta.client_trade_name = r.data.clientTradeName.trim();
      meta.client_legal_name = r.data.clientLegalName.trim();
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
      toast.error(userFacingAuthError(error));
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
        ? "Bem-vindo ao 2AVendas. Este link é exclusivo da representação que o enviou; após o cadastro você verá o catálogo e passará a constar na carteira deles."
        : invitePurpose === "seller_signup"
          ? "Opcional: nome da equipe ou como aparece na carteira; por padrão usamos o nome da representação do convite."
          : invitePeekLoading
            ? "Validando convite…"
            : "Use o mesmo e-mail indicado no convite e informe a empresa conforme o tipo de convite.";

  const disableSubmit = submitting || (hasInvite && invitePeekLoading);

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[#FFFFFF] font-sans antialiased lg:grid-cols-2">
      <div className="hidden border-r border-[rgba(0,122,255,0.15)] lg:block">
        <LoginCarousel />
      </div>

      <div className="flex min-h-0 flex-col">
        <div className="border-b border-[#E8ECF2] bg-[#F9F9F9] px-5 py-4 lg:hidden">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#007AFF]">2AVendas</p>
          <p className="mt-2 text-sm leading-relaxed text-[#003366]">
            Cadastro rápido: representação própria ou conta via convite de cliente ou vendedor.
          </p>
        </div>

        <div className="flex flex-1 flex-col justify-center px-6 py-10 lg:px-16">
          <div className="landing-magic-float mx-auto w-full max-w-[420px] rounded-[22px] border border-[rgba(0,122,255,0.22)] bg-white p-8 md:p-10">
            <div className="mb-6 flex justify-start">
              <Logo light={false} />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-[#003366]">{headline}</h1>
            <p className="mt-2 text-sm text-[#475569]">{sub}</p>
            <Link
              to="/"
              className="mt-3 inline-block text-xs font-mono uppercase tracking-[0.18em] text-[#007AFF] underline-offset-4 hover:underline"
            >
              Voltar ao início
            </Link>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div>
                <Label htmlFor="fullName" className="text-sm font-medium text-[#003366]">
                  Seu nome
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className={signupInputClass}
                />
              </div>

              {!hasInvite && (
                <div>
                  <Label htmlFor="org" className="text-sm font-medium text-[#003366]">
                    Empresa da representação
                  </Label>
                  <Input
                    id="org"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    required
                    className={signupInputClass}
                  />
                  <p className="mt-1 text-xs text-[#64748B]">
                    Administradores e vendedores compartilham esta mesma empresa operacional (tenant).
                  </p>
                </div>
              )}

              {hasInvite && invitePurpose === "client_catalog" && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="clientTrade" className="text-sm font-medium text-[#003366]">
                      Nome da empresa (nome fantasia)
                    </Label>
                    <Input
                      id="clientTrade"
                      value={clientTradeName}
                      onChange={(e) => setClientTradeName(e.target.value)}
                      required
                      className={signupInputClass}
                      placeholder="Como a empresa prefere ser chamada"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientLegal" className="text-sm font-medium text-[#003366]">
                      Razão social
                    </Label>
                    <Input
                      id="clientLegal"
                      value={clientLegalName}
                      onChange={(e) => setClientLegalName(e.target.value)}
                      required
                      className={signupInputClass}
                      placeholder="Denominação conforme contrato ou CNPJ"
                    />
                    <p className="mt-1 text-xs text-[#64748B]">
                      Campo distinto do nome fantasia; ambos aparecem para a representação na carteira de clientes. O segmento ou indústria pode ser preenchido depois pelo administrador ou vendedor na carteira.
                    </p>
                  </div>
                  <p className="border-l-2 border-[rgba(0,122,255,0.28)] py-1 pl-3 text-xs text-[#64748B]">
                    Já tem cadastro em outra representação? Não crie outra conta com o mesmo e-mail — peça o link “para quem já tem conta” e entre pelo login para vincular esta empresa também.
                  </p>
                </div>
              )}

              {hasInvite && invitePurpose === "seller_signup" && (
                <div>
                  <Label htmlFor="staffOrg" className="text-sm font-medium text-[#003366]">
                    Empresa / equipe comercial (opcional)
                  </Label>
                  <Input
                    id="staffOrg"
                    value={staffOrganizationName}
                    onChange={(e) => setStaffOrganizationName(e.target.value)}
                    className={signupInputClass}
                    placeholder="Mesma representação do convite se deixar em branco"
                  />
                </div>
              )}

              {hasInvite && !invitePeekLoading && invitePurpose === null && (
                <div>
                  <Label htmlFor="orgLegacy" className="text-sm font-medium text-[#003366]">
                    Nome da empresa
                  </Label>
                  <Input
                    id="orgLegacy"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    required
                    className={signupInputClass}
                  />
                  <p className="mt-1 text-xs text-[#64748B]">
                    Não foi possível ler o tipo de convite; use o nome orientado pelo representante.
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="email" className="text-sm font-medium text-[#003366]">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={signupInputClass}
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-sm font-medium text-[#003366]">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={signupInputClass}
                />
                <p className="mt-1 text-xs text-[#64748B]">Mínimo 8 caracteres.</p>
              </div>
              <Button
                type="submit"
                className="h-11 w-full rounded-xl border-0 bg-[#007AFF] text-sm font-semibold text-white shadow-none hover:bg-[#0066DB]"
                disabled={disableSubmit}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-[#475569]">
              Já tem conta?{" "}
              <Link
                to="/login"
                search={
                  hasInvite || search.two_avendas_promo?.trim()
                    ? {
                        ...(hasInvite && search.invite ? { invite: search.invite } : {}),
                        ...(search.two_avendas_promo?.trim()
                          ? { two_avendas_promo: search.two_avendas_promo.trim() }
                          : {}),
                      }
                    : undefined
                }
                className="font-semibold text-[#007AFF] underline-offset-2 hover:underline"
              >
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
