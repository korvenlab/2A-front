import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
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
import { toast } from "sonner";
import { Plus, Pencil, Loader2, UsersRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({ meta: [{ title: "Clientes — 2AVendas" }] }),
  component: CustomersPage,
});

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  assigned_seller_id: string | null;
}
interface SellerOpt {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

const empty: Omit<Customer, "id"> = {
  name: "",
  email: "",
  phone: "",
  document: "",
  city: "",
  state: "",
  notes: "",
  assigned_seller_id: null,
};

function CustomersPage() {
  const { organization, role, user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sellers, setSellers] = useState<SellerOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<Omit<Customer, "id">>(empty);
  const [saving, setSaving] = useState(false);
  const isAdmin = role === "admin";

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("id,name,email,phone,document,city,state,notes,assigned_seller_id")
      .order("name");
    if (error) toast.error(error.message);
    setCustomers((data as Customer[]) ?? []);

    if (isAdmin) {
      const { data: rs } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "vendedor");
      const ids = (rs ?? []).map((r: { user_id: string }) => r.user_id);
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", ids);
        const list: SellerOpt[] = (profs ?? []).map(
          (p: { id: string; full_name: string | null; email: string | null }) => ({
            user_id: p.id,
            full_name: p.full_name,
            email: p.email,
          }),
        );
        setSellers(list);
      } else {
        setSellers([]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [isAdmin]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty, assigned_seller_id: isAdmin ? null : (user?.id ?? null) });
    setOpen(true);
  };
  const openEdit = (c: Customer) => {
    setEditing(c);
    const { id: _id, ...rest } = c;
    setForm(rest);
    setOpen(true);
  };

  const save = async () => {
    if (!organization || !user) return;
    if (!form.name.trim()) return toast.error("Nome é obrigatório");
    setSaving(true);
    const payload = {
      ...form,
      email: form.email || null,
      phone: form.phone || null,
      document: form.document || null,
      city: form.city || null,
      state: form.state || null,
      notes: form.notes || null,
      assigned_seller_id: isAdmin ? form.assigned_seller_id : user.id,
    };
    const { error } = editing
      ? await supabase.from("customers").update(payload).eq("id", editing.id)
      : await supabase
          .from("customers")
          .insert({ ...payload, organization_id: organization.id });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Cliente atualizado" : "Cliente criado");
    setOpen(false);
    load();
  };

  const sellerLabel = (id: string | null) => {
    const s = sellers.find((x) => x.user_id === id);
    return s ? (s.full_name ?? s.email ?? "—") : "—";
  };

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <PageHeader
        title="Clientes"
        description={
          isAdmin
            ? "Carteira completa da representação."
            : "Sua carteira de clientes."
        }
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" /> Novo cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label>Nome / Razão social *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={form.email ?? ""}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Telefone</Label>
                    <Input
                      value={form.phone ?? ""}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>CNPJ/CPF</Label>
                    <Input
                      value={form.document ?? ""}
                      onChange={(e) => setForm({ ...form, document: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2 grid-cols-3 col-span-1">
                    <div className="col-span-2 grid gap-2">
                      <Label>Cidade</Label>
                      <Input
                        value={form.city ?? ""}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>UF</Label>
                      <Input
                        maxLength={2}
                        value={form.state ?? ""}
                        onChange={(e) =>
                          setForm({ ...form, state: e.target.value.toUpperCase() })
                        }
                      />
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <div className="grid gap-2">
                    <Label>Vendedor responsável</Label>
                    <Select
                      value={form.assigned_seller_id ?? "none"}
                      onValueChange={(v) =>
                        setForm({
                          ...form,
                          assigned_seller_id: v === "none" ? null : v,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem vendedor</SelectItem>
                        {sellers.map((s) => (
                          <SelectItem key={s.user_id} value={s.user_id}>
                            {s.full_name ?? s.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={form.notes ?? ""}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={save} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <UsersRound className="h-10 w-10 mx-auto mb-3 opacity-50" />
            Nenhum cliente cadastrado.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Cidade/UF</TableHead>
                {isAdmin && <TableHead>Vendedor</TableHead>}
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium">{c.name}</div>
                    {c.document && (
                      <div className="text-xs text-muted-foreground">{c.document}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div>{c.email ?? "—"}</div>
                    <div className="text-xs">{c.phone ?? ""}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.city ? `${c.city}${c.state ? "/" + c.state : ""}` : "—"}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-muted-foreground">
                      {sellerLabel(c.assigned_seller_id)}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
