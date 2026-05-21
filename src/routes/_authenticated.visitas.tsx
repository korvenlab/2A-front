import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { dt } from "@/lib/format";
import { AppPage, AppTableCard } from "@/components/layout/AppPage";
import { PageHeader } from "@/components/PageHeader";
import { SearchCombobox } from "@/components/ui/search-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Loader2, Trash2, CalendarDays } from "lucide-react";
import { useMenuGate } from "@/hooks/use-menu-gate";
import { userFacingDataError } from "@/lib/supabase-user-error";

export const Route = createFileRoute("/_authenticated/visitas")({
  head: () => ({ meta: [{ title: "Visitas — 2AVendas" }] }),
  component: VisitsPage,
});

interface CustomerPick {
  id: string;
  name: string;
}

interface SellerPick {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface VisitRow {
  id: string;
  organization_id: string;
  customer_id: string | null;
  seller_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  address: string | null;
  customers: { name: string } | null;
}

const statusLabels: Record<string, string> = {
  agendada: "Agendada",
  realizada: "Realizada",
  cancelada: "Cancelada",
};

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function VisitsPage() {
  useMenuGate("visitas");
  const { organization, user, role } = useAuth();
  const isAdmin = role === "admin";

  const [rows, setRows] = useState<VisitRow[]>([]);
  const [customers, setCustomers] = useState<CustomerPick[]>([]);
  const [sellers, setSellers] = useState<SellerPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formCust, setFormCust] = useState<string>("__none__");
  const [formSeller, setFormSeller] = useState<string>("");
  const [formWhen, setFormWhen] = useState(() => toLocalInput(new Date().toISOString()));
  const [formDur, setFormDur] = useState(60);
  const [formNotes, setFormNotes] = useState("");
  const [formAddr, setFormAddr] = useState("");

  const load = useCallback(async () => {
    if (!organization?.id || !user?.id) return;
    setLoading(true);

    let vq = supabase
      .from("commercial_visits")
      .select("id,organization_id,customer_id,seller_id,scheduled_at,duration_minutes,status,notes,address,customers(name)")
      .eq("organization_id", organization.id)
      .order("scheduled_at", { ascending: true });

    if (role === "vendedor") {
      vq = vq.eq("seller_id", user.id);
    }

    let cq = supabase.from("customers").select("id,name").order("name");
    if (role === "vendedor") {
      cq = cq.eq("assigned_seller_id", user.id);
    }

    const [{ data: vs, error: ve }, { data: cs }] = await Promise.all([vq, cq]);

    if (ve) toast.error(userFacingDataError(ve));
    setRows((vs as VisitRow[]) ?? []);
    setCustomers((cs as CustomerPick[]) ?? []);

    if (isAdmin) {
      const { data: rs } = await supabase.from("user_roles").select("user_id").eq("role", "vendedor");
      const ids = (rs ?? []).map((r: { user_id: string }) => r.user_id);
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", ids);
        setSellers(
          (profs ?? []).map((p: { id: string; full_name: string | null; email: string | null }) => ({
            user_id: p.id,
            full_name: p.full_name,
            email: p.email,
          })),
        );
      } else {
        setSellers([]);
      }
    } else {
      setSellers([]);
    }

    setLoading(false);
  }, [organization?.id, user?.id, role, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (user?.id && !formSeller) setFormSeller(user.id);
  }, [user?.id, formSeller]);

  const sellerLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sellers) {
      map.set(s.user_id, s.full_name ?? s.email ?? s.user_id);
    }
    if (user?.id) map.set(user.id, "Eu");
    return (id: string | null) => (id ? map.get(id) ?? "—" : "—");
  }, [sellers, user?.id]);

  const resetForm = () => {
    setFormCust("__none__");
    setFormSeller(user?.id ?? "");
    setFormWhen(toLocalInput(new Date().toISOString()));
    setFormDur(60);
    setFormNotes("");
    setFormAddr("");
  };

  const saveVisit = async () => {
    if (!organization || !user) return;
    const sellerId = isAdmin ? formSeller || user.id : user.id;
    const iso = new Date(formWhen).toISOString();
    if (Number.isNaN(new Date(formWhen).getTime())) {
      return toast.error("Data/hora inválida");
    }

    setSaving(true);
    const { error } = await supabase.from("commercial_visits").insert({
      organization_id: organization.id,
      customer_id: formCust === "__none__" ? null : formCust,
      seller_id: sellerId,
      scheduled_at: iso,
      duration_minutes: Math.min(24 * 60, Math.max(15, formDur)),
      status: "agendada",
      notes: formNotes.trim() || null,
      address: formAddr.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(userFacingDataError(error));
    toast.success("Visita agendada");
    setOpen(false);
    resetForm();
    load();
  };

  const patchStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("commercial_visits").update({ status }).eq("id", id);
    if (error) toast.error(userFacingDataError(error));
    else load();
  };

  const removeVisit = async (id: string) => {
    if (!confirm("Remover esta visita?")) return;
    const { error } = await supabase.from("commercial_visits").delete().eq("id", id);
    if (error) toast.error(userFacingDataError(error));
    else {
      toast.success("Visita removida");
      load();
    }
  };

  return (
    <AppPage className="relative pb-28 lg:pb-10">
      <PageHeader
        title="Visitas comerciais"
        description="Agende compromissos com clientes e acompanhe o status (agendada, realizada, cancelada)."
        action={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Nova visita
              </Button>
            </DialogTrigger>
            <DialogContent size="form">
              <DialogHeader>
                <DialogTitle>Agendar visita</DialogTitle>
              </DialogHeader>
              <DialogBody className="grid gap-4 py-2 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Cliente (opcional)</Label>
                  <SearchCombobox
                    items={customers}
                    value={formCust === "__none__" ? "__none__" : formCust}
                    onValueChange={(id) => setFormCust(id || "__none__")}
                    getItemId={(c) => c.id}
                    getItemLabel={(c) => c.name}
                    getSearchFields={(c) => [c.name]}
                    placeholder="Buscar cliente…"
                    emptyMessage="Nenhum cliente encontrado."
                    leadingOption={{ value: "__none__", label: "Sem cliente vinculado" }}
                  />
                </div>
                {isAdmin && (
                  <div className="grid gap-2 sm:col-span-2">
                    <Label>Vendedor responsável</Label>
                    <Select value={formSeller || "__none__"} onValueChange={(v) => setFormSeller(v === "__none__" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Quem irá na visita" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Selecionar</SelectItem>
                        {user?.id ? (
                          <SelectItem value={user.id}>Eu (administrador)</SelectItem>
                        ) : null}
                        {sellers
                          .filter((s) => s.user_id !== user?.id)
                          .map((s) => (
                            <SelectItem key={s.user_id} value={s.user_id}>
                              {s.full_name ?? s.email}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label>Data e hora</Label>
                  <Input type="datetime-local" value={formWhen} onChange={(e) => setFormWhen(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Duração (minutos)</Label>
                  <Input
                    type="number"
                    min={15}
                    max={1440}
                    step={15}
                    value={formDur}
                    onChange={(e) => setFormDur(parseInt(e.target.value, 10) || 60)}
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Endereço / local</Label>
                  <Input value={formAddr} onChange={(e) => setFormAddr(e.target.value)} placeholder="Ex.: Av. …, sala 12" />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Observações</Label>
                  <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={3} />
                </div>
              </DialogBody>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={saveVisit} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <AppTableCard>
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-50" />
            Nenhuma visita agendada.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Cliente</TableHead>
                {isAdmin ? <TableHead>Vendedor</TableHead> : null}
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    <div>{dt(v.scheduled_at)}</div>
                    <div className="text-xs">{v.duration_minutes} min</div>
                  </TableCell>
                  <TableCell className="font-medium">{v.customers?.name ?? "—"}</TableCell>
                  {isAdmin ? (
                    <TableCell className="text-muted-foreground text-sm">{sellerLabel(v.seller_id)}</TableCell>
                  ) : null}
                  <TableCell>
                    <Select value={v.status} onValueChange={(s) => patchStatus(v.id, s)}>
                      <SelectTrigger className="h-8 w-[140px] border-0 bg-transparent p-0">
                        <Badge variant={v.status === "cancelada" ? "destructive" : v.status === "realizada" ? "default" : "secondary"}>
                          {statusLabels[v.status] ?? v.status}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([val, label]) => (
                          <SelectItem key={val} value={val}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => removeVisit(v.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AppTableCard>

      <Button
        type="button"
        size="lg"
        className="fixed bottom-6 right-4 z-40 h-14 w-14 rounded-full shadow-lg lg:hidden"
        aria-label="Nova visita"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </AppPage>
  );
}
