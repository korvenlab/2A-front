import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, PackageSearch, Download, Upload } from "lucide-react";
import { useRef } from "react";

const PRODUCT_IMAGES_BUCKET = "product-images";

export const Route = createFileRoute("/_authenticated/catalogo")({
  head: () => ({ meta: [{ title: "Catálogo — 2AVendas" }] }),
  component: CatalogPage,
});

interface Product {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  price: number;
  stock: number;
  category: string | null;
  supplier: string | null;
  image_url: string | null;
  active: boolean;
}

const empty: Omit<Product, "id"> = {
  name: "",
  sku: "",
  description: "",
  price: 0,
  stock: 0,
  category: "",
  supplier: "",
  image_url: "",
  active: true,
};

function CatalogPage() {
  const { organization, role } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Omit<Product, "id">>(empty);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const canEdit = role === "admin" || role === "vendedor";

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id,name,sku,description,price,stock,category,supplier,image_url,active")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setProducts((data as Product[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    const { id: _id, ...rest } = p;
    setForm(rest);
    setOpen(true);
  };

  const storagePathFromPublicUrl = (url: string | null | undefined) => {
    if (!url) return null;
    const marker = `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.slice(idx + marker.length));
  };

  const removeStorageImageIfAny = async (url: string | null | undefined) => {
    const path = storagePathFromPublicUrl(url);
    if (!path) return;
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .remove([path]);
    if (error) {
      // Do not block save on old-file cleanup failure.
      console.warn("Failed to remove old product image:", error.message);
    }
  };

  const save = async () => {
    if (!organization) return;
    if (!form.name.trim()) return toast.error("Nome é obrigatório");
    setSaving(true);
    const payload = {
      ...form,
      sku: form.sku || null,
      description: form.description || null,
      category: form.category || null,
      supplier: form.supplier || null,
      image_url: form.image_url || null,
      price: Number(form.price) || 0,
      stock: Number(form.stock) || 0,
    };
    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase
          .from("products")
          .insert({ ...payload, organization_id: organization.id });
    setSaving(false);
    if (error) return toast.error(error.message);
    if (editing && editing.image_url !== payload.image_url) {
      await removeStorageImageIfAny(editing.image_url);
    }
    toast.success(editing ? "Produto atualizado" : "Produto criado");
    setOpen(false);
    load();
  };

  const toggleActive = async (p: Product) => {
    const { error } = await supabase
      .from("products")
      .update({ active: !p.active })
      .eq("id", p.id);
    if (error) toast.error(error.message);
    else load();
  };

  const handleImageUpload = async (file: File) => {
    if (!organization) {
      toast.error("Organização não encontrada");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem válido");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }
    setUploadingImage(true);
    try {
      const ext = file.name.includes(".")
        ? file.name.split(".").pop()?.toLowerCase() ?? "jpg"
        : "jpg";
      const objectPath = `org/${organization.id}/products/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(objectPath, file, {
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadError) {
        toast.error(uploadError.message);
        return;
      }
      const { data } = supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .getPublicUrl(objectPath);
      const publicUrl = data.publicUrl;
      setForm((prev) => ({ ...prev, image_url: publicUrl }));
      toast.success("Imagem carregada");
    } finally {
      setUploadingImage(false);
    }
  };

  const exportCsv = () => {
    if (products.length === 0) {
      toast.error("Nenhum produto para exportar");
      return;
    }
    const headers = ["Nome", "SKU", "Categoria", "Fornecedor", "Preço", "Estoque", "Ativo", "Descrição"];
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = products.map((p) =>
      [p.name, p.sku ?? "", p.category ?? "", p.supplier ?? "", p.price, p.stock, p.active ? "Sim" : "Não", p.description ?? ""]
        .map(escape)
        .join(","),
    );
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `catalogo-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${products.length} produtos exportados`);
  };

  const parseCsv = (text: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let cur = "";
    let inQuotes = false;
    const t = text.replace(/^\uFEFF/, "");
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (inQuotes) {
        if (c === '"') {
          if (t[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
        } else cur += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === "," || c === ";") { row.push(cur); cur = ""; }
        else if (c === "\n" || c === "\r") {
          if (c === "\r" && t[i + 1] === "\n") i++;
          row.push(cur); cur = "";
          if (row.some((v) => v !== "")) rows.push(row);
          row = [];
        } else cur += c;
      }
    }
    if (cur !== "" || row.length) { row.push(cur); if (row.some((v) => v !== "")) rows.push(row); }
    return rows;
  };

  const handleImport = async (file: File) => {
    if (!organization) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length < 2) {
        toast.error("CSV vazio ou sem dados");
        return;
      }
      const header = rows[0].map((h) => h.trim().toLowerCase());
      const idx = (names: string[]) => header.findIndex((h) => names.includes(h));
      const iName = idx(["nome", "name", "produto"]);
      const iSku = idx(["sku", "código", "codigo"]);
      const iCat = idx(["categoria", "category"]);
      const iSup = idx(["fornecedor", "fabricante", "supplier"]);
      const iPrice = idx(["preço", "preco", "price"]);
      const iStock = idx(["estoque", "stock", "quantidade"]);
      const iActive = idx(["ativo", "active"]);
      const iDesc = idx(["descrição", "descricao", "description"]);
      if (iName === -1) {
        toast.error("Coluna 'Nome' não encontrada no CSV");
        return;
      }
      const num = (v: string | undefined) => {
        if (!v) return 0;
        const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
        return isNaN(n) ? parseFloat(v) || 0 : n;
      };
      const payload = rows.slice(1)
        .map((r) => ({
          organization_id: organization.id,
          name: (r[iName] ?? "").trim(),
          sku: iSku >= 0 ? (r[iSku] ?? "").trim() || null : null,
          category: iCat >= 0 ? (r[iCat] ?? "").trim() || null : null,
          supplier: iSup >= 0 ? (r[iSup] ?? "").trim() || null : null,
          price: iPrice >= 0 ? num(r[iPrice]) : 0,
          stock: iStock >= 0 ? Math.floor(num(r[iStock])) : 0,
          active: iActive >= 0 ? !/^(não|nao|no|false|0|inativo)$/i.test((r[iActive] ?? "").trim()) : true,
          description: iDesc >= 0 ? (r[iDesc] ?? "").trim() || null : null,
        }))
        .filter((p) => p.name);
      if (payload.length === 0) {
        toast.error("Nenhum produto válido encontrado");
        return;
      }
      const { error } = await supabase.from("products").insert(payload);
      if (error) toast.error(error.message);
      else {
        toast.success(`${payload.length} produtos importados`);
        load();
      }
    } catch (e) {
      toast.error("Erro ao processar CSV");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <PageHeader
        title="Catálogo"
        description="Gerencie os produtos disponíveis para os pedidos."
        action={
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
              }}
            />
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Importar CSV
              </Button>
            )}
            <Button variant="outline" onClick={exportCsv} disabled={loading || products.length === 0}>
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            {canEdit && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNew}>
                  <Plus className="h-4 w-4" /> Novo produto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label>Nome *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>SKU</Label>
                      <Input
                        value={form.sku ?? ""}
                        onChange={(e) => setForm({ ...form, sku: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Categoria</Label>
                      <Input
                        value={form.category ?? ""}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Fornecedor / Fabricante</Label>
                    <Input
                      value={form.supplier ?? ""}
                      onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                      placeholder="Ex: Nestlé, Distribuidor X"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Imagem do produto</Label>
                    <Input
                      placeholder="Cole a URL da imagem (https://...)"
                      value={form.image_url ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, image_url: e.target.value })
                      }
                    />
                    <input
                      ref={imageFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleImageUpload(file);
                        e.currentTarget.value = "";
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => imageFileInputRef.current?.click()}
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}{" "}
                        Enviar da máquina
                      </Button>
                      {form.image_url && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            setForm((prev) => ({ ...prev, image_url: "" }))
                          }
                        >
                          Remover imagem
                        </Button>
                      )}
                    </div>
                    {form.image_url && (
                      <div className="mt-1 rounded-lg border border-border bg-muted p-2">
                        <img
                          src={form.image_url}
                          alt="Pré-visualização"
                          className="h-28 w-28 rounded-md object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>Preço (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.price}
                        onChange={(e) =>
                          setForm({ ...form, price: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Estoque</Label>
                      <Input
                        type="number"
                        value={form.stock}
                        onChange={(e) =>
                          setForm({ ...form, stock: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={form.description ?? ""}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={form.active}
                      onCheckedChange={(v) => setForm({ ...form, active: v })}
                    />
                    <Label>Produto ativo</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={save} disabled={saving || uploadingImage}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            )}
          </div>
        }
      />

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <PackageSearch className="h-10 w-10 mx-auto mb-3 opacity-50" />
            Nenhum produto cadastrado ainda.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{p.name}</div>
                        {p.category && (
                          <div className="text-xs text-muted-foreground">{p.category}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.sku ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">{brl(p.price)}</TableCell>
                  <TableCell className="text-right">{p.stock}</TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Switch
                        checked={p.active}
                        onCheckedChange={() => toggleActive(p)}
                      />
                    ) : (
                      <Badge variant={p.active ? "default" : "secondary"}>
                        {p.active ? "Ativo" : "Inativo"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {canEdit && (
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
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
