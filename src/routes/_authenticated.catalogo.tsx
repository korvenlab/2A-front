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
import { useMenuGate } from "@/hooks/use-menu-gate";
import { userFacingDataError } from "@/lib/supabase-user-error";
import {
  MAX_PRODUCT_IMAGES,
  normalizeProductImageUrls,
  parseImageUrlsFromCsvCell,
  validateProductImageCount,
  isLikelyHttpUrl,
} from "@/lib/product-images";

const PRODUCT_IMAGES_BUCKET = "product-images";

export const Route = createFileRoute("/_authenticated/catalogo")({
  head: () => ({ meta: [{ title: "Catálogo — 2AVendas" }] }),
  component: CatalogPage,
});

interface ProductRow {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  price: number;
  stock: number;
  category: string | null;
  supplier: string | null;
  image_url: string | null;
  image_urls: unknown;
  active: boolean;
}

interface ProductForm {
  name: string;
  sku: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  supplier: string;
  image_urls: string[];
  active: boolean;
}

const emptyForm: ProductForm = {
  name: "",
  sku: "",
  description: "",
  price: 0,
  stock: 0,
  category: "",
  supplier: "",
  image_urls: [],
  active: true,
};

function CatalogPage() {
  useMenuGate("catalogo");
  const { organization, role, user, menu } = useAuth();
  const useBackendMenu = !!import.meta.env.VITE_API_URL?.trim();
  const canManageCatalog = useBackendMenu ? menu.catalogo : role === "admin" || role === "vendedor";
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [imageUrlDraft, setImageUrlDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id,name,sku,description,price,stock,category,supplier,image_url,image_urls,active")
      .order("created_at", { ascending: false });
    if (error) toast.error(userFacingDataError(error));
    setProducts((data as ProductRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setImageUrlDraft("");
    setOpen(true);
  };

  const openEdit = (p: ProductRow) => {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku ?? "",
      description: p.description ?? "",
      price: p.price,
      stock: p.stock,
      category: p.category ?? "",
      supplier: p.supplier ?? "",
      image_urls: normalizeProductImageUrls(p.image_urls, p.image_url),
      active: p.active,
    });
    setImageUrlDraft("");
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
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    const urls = form.image_urls.map((u) => u.trim()).filter(Boolean);
    const imgErr = validateProductImageCount(urls);
    if (imgErr) {
      toast.error(imgErr);
      return;
    }
    if (!organization) {
      toast.error(
        "Organização não carregada. Aguarde alguns segundos e tente de novo, ou recarregue a página.",
      );
      return;
    }
    if (!user && role === "vendedor") {
      toast.error("Sessão inválida. Faça login novamente.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        supplier: form.supplier.trim() || null,
        image_urls: urls,
        image_url: urls[0] ?? null,
        price: Number(form.price) || 0,
        stock: Number(form.stock) || 0,
        active: form.active,
      };
      const { error } = editing
        ? await supabase.from("products").update(payload).eq("id", editing.id)
        : await supabase.from("products").insert({
            ...payload,
            organization_id: organization.id,
            owner_seller_id: role === "vendedor" ? user?.id ?? null : null,
          });
      if (error) {
        toast.error(userFacingDataError(error));
        return;
      }
      if (editing) {
        const prevUrls = normalizeProductImageUrls(editing.image_urls, editing.image_url);
        for (const u of prevUrls) {
          if (!urls.includes(u)) await removeStorageImageIfAny(u);
        }
      }
      toast.success(editing ? "Produto salvo com sucesso." : "Produto criado com sucesso.");
      setOpen(false);
      await load();
    } catch (e) {
      console.error("[catalogo] save", e);
      toast.error(e instanceof Error ? e.message : "Erro inesperado ao salvar o produto.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: ProductRow) => {
    const { error } = await supabase
      .from("products")
      .update({ active: !p.active })
      .eq("id", p.id);
    if (error) {
      toast.error(userFacingDataError(error));
      return;
    }
    toast.success(p.active ? "Produto desativado." : "Produto ativado.");
    await load();
  };

  const handleImageUpload = async (file: File) => {
    if (!organization) {
      toast.error(
        "Organização não carregada. Recarregue a página ou aguarde o painel terminar de carregar.",
      );
      return;
    }
    if (form.image_urls.length >= MAX_PRODUCT_IMAGES) {
      toast.error(`No máximo ${MAX_PRODUCT_IMAGES} imagens por produto.`);
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
        toast.error(userFacingDataError(uploadError));
        return;
      }
      const { data } = supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .getPublicUrl(objectPath);
      const publicUrl = data.publicUrl;
      setForm((prev) => ({ ...prev, image_urls: [...prev.image_urls, publicUrl] }));
      toast.success("Imagem carregada");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImageAt = (index: number) => {
    setForm((prev) => ({
      ...prev,
      image_urls: prev.image_urls.filter((_, i) => i !== index),
    }));
  };

  const addImageUrlFromDraft = () => {
    const u = imageUrlDraft.trim();
    if (!u) {
      toast.error("Cole uma URL de imagem.");
      return;
    }
    if (!isLikelyHttpUrl(u)) {
      toast.error("Informe uma URL http(s) válida.");
      return;
    }
    if (form.image_urls.length >= MAX_PRODUCT_IMAGES) {
      toast.error(`No máximo ${MAX_PRODUCT_IMAGES} imagens por produto.`);
      return;
    }
    if (form.image_urls.includes(u)) {
      toast.error("Esta URL já foi adicionada.");
      return;
    }
    setForm((prev) => ({ ...prev, image_urls: [...prev.image_urls, u] }));
    setImageUrlDraft("");
  };

  const exportCsv = () => {
    if (products.length === 0 && !canManageCatalog) {
      toast.error("Nenhum produto para exportar");
      return;
    }
    const headers = [
      "Nome",
      "SKU",
      "Categoria",
      "Fornecedor",
      "Preço",
      "Estoque",
      "Ativo",
      "Descrição",
      "Imagens",
    ];
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows =
      products.length > 0
        ? products.map((p) => {
            const imgs = normalizeProductImageUrls(p.image_urls, p.image_url);
            return [
              p.name,
              p.sku ?? "",
              p.category ?? "",
              p.supplier ?? "",
              p.price,
              p.stock,
              p.active ? "Sim" : "Não",
              p.description ?? "",
              imgs.join("|"),
            ]
              .map(escape)
              .join(",");
          })
        : [];
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
    toast.success(products.length > 0 ? `${products.length} produtos exportados` : "Modelo CSV (apenas cabeçalhos) exportado");
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
    if (!organization) {
      toast.error(
        "Organização não carregada. Recarregue a página ou aguarde o painel terminar de carregar.",
      );
      return;
    }
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
      const iImage = idx(["imagem", "image", "image_url", "url_imagem", "url da imagem"]);
      const iImages = idx(["imagens", "images", "urls_imagem", "urls imagem"]);
      if (iName === -1) {
        toast.error("Coluna 'Nome' não encontrada no CSV");
        return;
      }
      const num = (v: string | undefined) => {
        if (!v) return 0;
        const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
        return isNaN(n) ? parseFloat(v) || 0 : n;
      };
      const ownerSellerId = role === "vendedor" ? user?.id ?? null : null;
      const rawRows = rows.slice(1).map((r) => {
        const rawImgMulti = iImages >= 0 ? (r[iImages] ?? "").trim() : "";
        const rawImgSingle = iImage >= 0 ? (r[iImage] ?? "").trim() : "";
        const image_urls = rawImgMulti
          ? parseImageUrlsFromCsvCell(rawImgMulti)
          : parseImageUrlsFromCsvCell(rawImgSingle);
        return {
          organization_id: organization.id,
          name: (r[iName] ?? "").trim(),
          sku: iSku >= 0 ? (r[iSku] ?? "").trim() || null : null,
          category: iCat >= 0 ? (r[iCat] ?? "").trim() || null : null,
          supplier: iSup >= 0 ? (r[iSup] ?? "").trim() || null : null,
          price: iPrice >= 0 ? num(r[iPrice]) : 0,
          stock: iStock >= 0 ? Math.floor(num(r[iStock])) : 0,
          active: iActive >= 0 ? !/^(não|nao|no|false|0|inativo)$/i.test((r[iActive] ?? "").trim()) : true,
          description: iDesc >= 0 ? (r[iDesc] ?? "").trim() || null : null,
          image_urls,
          image_url: image_urls[0] ?? null,
          owner_seller_id: ownerSellerId,
        };
      });
      const skippedBadImages = rawRows.filter((p) => p.name && validateProductImageCount(p.image_urls) !== null).length;
      const payload = rawRows.filter((p) => p.name && validateProductImageCount(p.image_urls) === null);
      if (payload.length === 0) {
        toast.error(
          skippedBadImages > 0
            ? "Nenhuma linha válida: cada produto precisa de 1 a 4 imagens (coluna Imagens ou Imagem)."
            : "Nenhum produto válido encontrado",
        );
        return;
      }
      const withSku = payload.filter((p) => p.sku);
      const withoutSku = payload.filter((p) => !p.sku);
      const dedupBySku = new Map<string, (typeof payload)[number]>();
      for (const p of withSku) dedupBySku.set((p.sku as string).toLowerCase(), p);
      const dedupedWithSku = Array.from(dedupBySku.values());

      const skuValues = dedupedWithSku.map((p) => p.sku as string);
      const { data: existingWithSku, error: existingErr } = skuValues.length
        ? await supabase
            .from("products")
            .select("id,sku")
            .eq("organization_id", organization.id)
            .in("sku", skuValues)
        : { data: [], error: null };
      if (existingErr) {
        toast.error(userFacingDataError(existingErr));
        return;
      }

      const existingBySku = new Map<string, string>();
      for (const row of (existingWithSku ?? []) as Array<{ id: string; sku: string | null }>) {
        if (row.sku) existingBySku.set(row.sku.toLowerCase(), row.id);
      }

      const toUpdate = dedupedWithSku.filter((p) => existingBySku.has((p.sku as string).toLowerCase()));
      const toInsert = [
        ...dedupedWithSku.filter((p) => !existingBySku.has((p.sku as string).toLowerCase())),
        ...withoutSku,
      ];

      let updated = 0;
      let inserted = 0;
      let failed = 0;
      for (const p of toUpdate) {
        const id = existingBySku.get((p.sku as string).toLowerCase());
        if (!id) continue;
        const { error } = await supabase
          .from("products")
          .update({
            name: p.name,
            sku: p.sku,
            category: p.category,
            supplier: p.supplier,
            price: p.price,
            stock: p.stock,
            active: p.active,
            description: p.description,
            image_urls: p.image_urls,
            image_url: p.image_url,
            owner_seller_id: p.owner_seller_id,
          })
          .eq("id", id);
        if (error) failed += 1;
        else updated += 1;
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from("products").insert(toInsert);
        if (error) {
          failed += toInsert.length;
          toast.error(userFacingDataError(error));
        } else {
          inserted = toInsert.length;
        }
      }

      const skippedDuplicatedSku = withSku.length - dedupedWithSku.length;
      toast.success(
        `Importação concluída: ${inserted} inseridos, ${updated} atualizados, ${failed} falhas, ${skippedDuplicatedSku} SKUs duplicados ignorados, ${skippedBadImages} linhas sem imagens válidas ignoradas.`,
      );
      load();
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
            {canManageCatalog && (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Importar CSV
              </Button>
            )}
            <Button
              variant="outline"
              onClick={exportCsv}
              disabled={loading || (!canManageCatalog && products.length === 0)}
            >
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            {canManageCatalog && (
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
                    <Label>Fotos do produto ({form.image_urls.length}/{MAX_PRODUCT_IMAGES}) *</Label>
                    <p className="text-xs text-muted-foreground">
                      Obrigatório entre 1 e {MAX_PRODUCT_IMAGES} imagens. Você pode enviar arquivos ou colar URLs públicas (https).
                    </p>
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
                        disabled={uploadingImage || form.image_urls.length >= MAX_PRODUCT_IMAGES}
                      >
                        {uploadingImage ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}{" "}
                        Enviar arquivo
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <Input
                        placeholder="https://…"
                        value={imageUrlDraft}
                        onChange={(e) => setImageUrlDraft(e.target.value)}
                        className="flex-1 min-w-[12rem]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addImageUrlFromDraft();
                          }
                        }}
                      />
                      <Button type="button" variant="secondary" onClick={addImageUrlFromDraft}>
                        Adicionar URL
                      </Button>
                    </div>
                    {form.image_urls.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                        {form.image_urls.map((url, idx) => (
                          <div key={`${url}-${idx}`} className="relative rounded-lg border border-border bg-muted overflow-hidden group">
                            <img src={url} alt="" className="h-28 w-full object-cover" />
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="absolute top-1 right-1 h-8 w-8 p-0 opacity-90"
                              onClick={() => removeImageAt(idx)}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
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
                  <Button
                    type="button"
                    onClick={save}
                    disabled={saving || uploadingImage}
                    className="inline-flex items-center gap-2"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saving ? "Salvando…" : "Salvar"}
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
              {products.map((p) => {
                const thumbs = normalizeProductImageUrls(p.image_urls, p.image_url);
                const thumb = thumbs[0];
                return (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={p.name}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full" />
                        )}
                        {thumbs.length > 1 && (
                          <span className="absolute bottom-0 right-0 rounded-tl bg-background/90 px-1 text-[10px] font-medium border-t border-l border-border">
                            +{thumbs.length - 1}
                          </span>
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
                    {canManageCatalog ? (
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
                    {canManageCatalog && (
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
