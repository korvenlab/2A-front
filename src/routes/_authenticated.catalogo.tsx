import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl, moneyNumber } from "@/lib/format";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Loader2,
  PackageSearch,
  Download,
  Upload,
  Building2,
  Link2,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Layers,
  Factory,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { useMenuGate } from "@/hooks/use-menu-gate";
import { userFacingDataError } from "@/lib/supabase-user-error";
import {
  MAX_PRODUCT_IMAGES,
  normalizeProductImageUrls,
  parseImageUrlsFromCsvCell,
  validateProductImageCount,
  isLikelyHttpUrl,
} from "@/lib/product-images";
import { cn } from "@/lib/utils";
import { publicStorefrontCatalogUrl } from "@/lib/invite-links";
import { copyTextToClipboard } from "@/lib/clipboard";

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
  industry_id: string | null;
  image_url: string | null;
  image_urls: unknown;
  active: boolean;
  created_at: string;
}

interface OrganizationIndustry {
  id: string;
  trade_name: string;
  responsible_name: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  address_line: string;
  postal_code: string;
  cnpj: string;
}

type CatalogSortKey =
  | "recent"
  | "name"
  | "category"
  | "price_asc"
  | "price_desc"
  | "stock_asc"
  | "stock_desc";

type CatalogViewMode = "table" | "grid";

type StockFilterKey = "__all__" | "in_stock" | "out_stock";

function groupProductsByCategory(rows: ProductRow[]): [string, ProductRow[]][] {
  const map = new Map<string, ProductRow[]>();
  for (const p of rows) {
    const k = p.category?.trim() || "Sem categoria";
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(p);
  }
  const keys = [...map.keys()].sort((a, b) => {
    if (a === "Sem categoria") return 1;
    if (b === "Sem categoria") return -1;
    return a.localeCompare(b, "pt-BR");
  });
  return keys.map((k) => [k, map.get(k)!] as const);
}

function CatalogProductGridCard({
  p,
  thumbs,
  canManageCatalog,
  onEdit,
  onToggleActive,
}: {
  p: ProductRow;
  thumbs: string[];
  canManageCatalog: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
}) {
  const cover = thumbs[0];
  const cat = p.category?.trim();
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-primary/20 hover:shadow-md">
      <div className="relative aspect-square bg-gradient-to-b from-muted to-muted/60">
        {cover ? (
          <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <PackageSearch className="h-12 w-12 text-muted-foreground/35" aria-hidden />
          </div>
        )}
        {thumbs.length > 1 && (
          <span className="absolute right-2 top-2 rounded-md bg-background/95 px-2 py-0.5 text-[11px] font-semibold shadow ring-1 ring-border">
            +{thumbs.length - 1} fotos
          </span>
        )}
        {!p.active && (
          <Badge variant="secondary" className="absolute left-2 top-2 text-[10px]">
            Inativo
          </Badge>
        )}
      </div>
      {p.supplier?.trim() ? (
        <div className="flex items-center gap-2 border-b border-border bg-primary/[0.06] px-3 py-2">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <span className="truncate text-xs font-semibold">{p.supplier.trim()}</span>
        </div>
      ) : null}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {cat || "Sem categoria"}
        </div>
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug">{p.name}</h3>
        <div className="text-xs text-muted-foreground">
          EAN13 (código de barras): {p.sku ?? "—"}
        </div>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 border-t border-border pt-3">
          <div>
            <div className="text-lg font-bold text-primary">{brl(p.price)}</div>
            <div className="text-xs text-muted-foreground">Estoque {p.stock}</div>
          </div>
          {canManageCatalog ? (
            <div className="flex items-center gap-2">
              <Switch checked={p.active} onCheckedChange={onToggleActive} aria-label="Ativo" />
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Badge variant={p.active ? "default" : "secondary"}>
              {p.active ? "Ativo" : "Inativo"}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

interface ProductForm {
  name: string;
  sku: string;
  description: string;
  /** Texto livre no input (vazio = sem valor digitado; evita `0` preso em input controlado). */
  price: string;
  stock: string;
  category: string;
  /** UUID da linha em `organization_industries`, ou vazio para indústria só em texto. */
  industry_id: string;
  supplier: string;
  image_urls: string[];
  active: boolean;
}

function formatPriceForProductInput(n: number): string {
  const v = moneyNumber(n);
  if (v === 0) return "";
  return String(Math.round(v * 100) / 100);
}

const emptyForm: ProductForm = {
  name: "",
  sku: "",
  description: "",
  price: "",
  stock: "",
  category: "",
  industry_id: "",
  supplier: "",
  image_urls: [],
  active: true,
};

const emptyIndustryForm = {
  trade_name: "",
  responsible_name: "",
  city: "",
  state: "",
  phone: "",
  email: "",
  address_line: "",
  postal_code: "",
  cnpj: "",
};

/** Mini-galeria na tabela do catálogo: todas as fotos visíveis, capa destacada. */
function CatalogTablePhotoMosaic({ urls, productName }: { urls: string[]; productName: string }) {
  const u = urls.slice(0, MAX_PRODUCT_IMAGES);

  if (u.length === 0) {
    return (
      <div className="flex h-[5.25rem] w-[7.75rem] items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-muted/40">
        <PackageSearch className="h-8 w-8 text-muted-foreground/35" aria-hidden />
      </div>
    );
  }

  return (
    <div className="grid w-[7.75rem] shrink-0 grid-cols-2 gap-1">
      {u.map((url, i) => {
        const single = u.length === 1;
        const thirdWide = u.length === 3 && i === 2;
        return (
          <a
            key={`${url}-${i}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "group relative block min-h-0 overflow-hidden rounded-lg border bg-muted shadow-sm outline-none transition-[box-shadow,transform] hover:z-10 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring",
              single && "col-span-2 aspect-[5/3]",
              !single && !thirdWide && "aspect-square",
              thirdWide && "col-span-2 aspect-[2/1]",
              i === 0
                ? "border-2 border-primary/55 shadow-md"
                : "border border-border/90 ring-1 ring-border/50",
            )}
            title={
              i === 0
                ? `${productName} — foto de capa (abrir)`
                : `${productName} — foto ${i + 1} (abrir)`
            }
          >
            <img
              src={url}
              alt={i === 0 ? `${productName} — capa` : `${productName} — foto ${i + 1}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            />
            <span
              className={cn(
                "pointer-events-none absolute bottom-1 left-1 rounded px-1 py-0.5 text-[10px] font-semibold tabular-nums shadow-sm",
                i === 0 ? "bg-primary text-primary-foreground" : "bg-black/70 text-white",
              )}
            >
              {i === 0 ? "Capa" : String(i + 1)}
            </span>
          </a>
        );
      })}
    </div>
  );
}

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

  const [catalogSearch, setCatalogSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("__all__");
  const [supplierFilter, setSupplierFilter] = useState<string>("__all__");
  const [stockFilter, setStockFilter] = useState<StockFilterKey>("__all__");
  const [activeOnly, setActiveOnly] = useState(true);
  const [sortKey, setSortKey] = useState<CatalogSortKey>("recent");
  const [viewMode, setViewMode] = useState<CatalogViewMode>("table");
  const [industries, setIndustries] = useState<OrganizationIndustry[]>([]);
  const [industryPickerOpen, setIndustryPickerOpen] = useState(false);
  const [industrySearch, setIndustrySearch] = useState("");
  const industrySearchInputRef = useRef<HTMLInputElement | null>(null);
  const [industryCreateOpen, setIndustryCreateOpen] = useState(false);
  const [industryForm, setIndustryForm] = useState(emptyIndustryForm);
  const [industrySaving, setIndustrySaving] = useState(false);

  const loadIndustries = useCallback(async () => {
    if (!organization?.id) {
      setIndustries([]);
      return;
    }
    const { data, error } = await supabase
      .from("organization_industries")
      .select(
        "id,trade_name,responsible_name,city,state,phone,email,address_line,postal_code,cnpj,organization_id",
      )
      .eq("organization_id", organization.id)
      .order("trade_name");
    if (error) {
      if (import.meta.env.DEV) console.warn("[catalogo] industries", error.message);
      setIndustries([]);
      return;
    }
    setIndustries((data as OrganizationIndustry[]) ?? []);
  }, [organization?.id]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select(
        "id,name,sku,description,price,stock,category,supplier,industry_id,image_url,image_urls,active,created_at",
      )
      .order("created_at", { ascending: false });
    if (error) toast.error(userFacingDataError(error));
    setProducts(
      ((data as ProductRow[]) ?? []).map((p) => ({
        ...p,
        industry_id: p.industry_id ?? null,
        price: moneyNumber(p.price),
        stock: Number.isFinite(Number(p.stock)) ? Math.trunc(Number(p.stock)) : 0,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    void loadIndustries();
  }, [loadIndustries]);

  useEffect(() => {
    if (!industryPickerOpen) {
      setIndustrySearch("");
      return;
    }
    const id = requestAnimationFrame(() => {
      industrySearchInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [industryPickerOpen]);

  const categoryOptions = useMemo(() => {
    const s = new Set<string>();
    for (const p of products) {
      const c = p.category?.trim();
      if (c) s.add(c);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [products]);

  const supplierOptions = useMemo(() => {
    const s = new Set<string>();
    for (const p of products) {
      const x = p.supplier?.trim();
      if (x) s.add(x);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [products]);

  const filteredSortedProducts = useMemo(() => {
    let rows = [...products];
    if (activeOnly) rows = rows.filter((p) => p.active);
    const q = catalogSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q) ||
          (p.supplier ?? "").toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q),
      );
    }
    if (stockFilter === "in_stock") rows = rows.filter((p) => p.stock > 0);
    if (stockFilter === "out_stock") rows = rows.filter((p) => p.stock <= 0);
    if (categoryFilter !== "__all__") {
      if (categoryFilter === "__none__") {
        rows = rows.filter((p) => !p.category?.trim());
      } else {
        rows = rows.filter((p) => (p.category?.trim() ?? "") === categoryFilter);
      }
    }
    if (supplierFilter !== "__all__") {
      rows = rows.filter((p) => (p.supplier?.trim() ?? "") === supplierFilter);
    }
    rows.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name, "pt-BR");
        case "price_asc":
          return a.price - b.price;
        case "price_desc":
          return b.price - a.price;
        case "stock_asc":
          return a.stock - b.stock;
        case "stock_desc":
          return b.stock - a.stock;
        case "category":
          return (
            (a.category ?? "").localeCompare(b.category ?? "", "pt-BR") ||
            a.name.localeCompare(b.name, "pt-BR")
          );
        case "recent":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return rows;
  }, [products, activeOnly, catalogSearch, categoryFilter, supplierFilter, stockFilter, sortKey]);

  const groupedCatalog = useMemo(
    () => groupProductsByCategory(filteredSortedProducts),
    [filteredSortedProducts],
  );

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
      price: formatPriceForProductInput(moneyNumber(p.price)),
      stock: (() => {
        const s = Number.isFinite(Number(p.stock)) ? Math.trunc(Number(p.stock)) : 0;
        return s === 0 ? "" : String(s);
      })(),
      category: p.category ?? "",
      industry_id: p.industry_id ?? "",
      supplier: p.supplier ?? "",
      image_urls: normalizeProductImageUrls(p.image_urls, p.image_url),
      active: p.active,
    });
    setImageUrlDraft("");
    setOpen(true);
  };

  const selectedIndustry = useMemo(
    () => industries.find((i) => i.id === form.industry_id) ?? null,
    [industries, form.industry_id],
  );

  const filteredIndustries = useMemo(() => {
    const raw = industrySearch.trim();
    if (!raw) return industries;
    const lower = raw.toLowerCase();
    const qDigits = raw.replace(/\D/g, "");
    return industries.filter((ind) => {
      if (ind.trade_name.toLowerCase().includes(lower)) return true;
      const cnpj = ind.cnpj?.trim() ?? "";
      if (cnpj && cnpj.toLowerCase().includes(lower)) return true;
      const cnpjDigits = cnpj.replace(/\D/g, "");
      if (qDigits.length > 0 && cnpjDigits.includes(qDigits)) return true;
      return false;
    });
  }, [industries, industrySearch]);

  const saveIndustry = async () => {
    if (!organization?.id) {
      toast.error("Organização não carregada.");
      return;
    }
    const t = (s: string) => s.trim();
    const f = {
      trade_name: t(industryForm.trade_name),
      responsible_name: t(industryForm.responsible_name),
      city: t(industryForm.city),
      state: t(industryForm.state),
      phone: t(industryForm.phone),
      email: t(industryForm.email),
      address_line: t(industryForm.address_line),
      postal_code: t(industryForm.postal_code),
      cnpj: t(industryForm.cnpj),
    };
    const checks: [string, string][] = [
      ["Nome fantasia", f.trade_name],
      ["Responsável", f.responsible_name],
      ["Cidade", f.city],
      ["Estado", f.state],
      ["Telefone", f.phone],
      ["E-mail", f.email],
      ["Endereço", f.address_line],
      ["CEP", f.postal_code],
      ["CNPJ", f.cnpj],
    ];
    for (const [label, v] of checks) {
      if (!v || v.length < 2) {
        toast.error(`${label}: informe pelo menos 2 caracteres.`);
        return;
      }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
      toast.error("E-mail inválido.");
      return;
    }
    setIndustrySaving(true);
    try {
      const { data, error } = await supabase
        .from("organization_industries")
        .insert({ organization_id: organization.id, ...f })
        .select("id,trade_name")
        .single();
      if (error) {
        toast.error(userFacingDataError(error));
        return;
      }
      const row = data as { id: string; trade_name: string };
      toast.success("Indústria cadastrada.");
      await loadIndustries();
      if (open) {
        setForm((prev) => ({
          ...prev,
          industry_id: row.id,
          supplier: row.trade_name,
        }));
      }
      setIndustryCreateOpen(false);
      setIndustryForm(emptyIndustryForm);
    } finally {
      setIndustrySaving(false);
    }
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
    const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
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
    const industryId = form.industry_id.trim();
    const industryRow = industries.find((i) => i.id === industryId);
    if (!industryId || !industryRow) {
      toast.error("Selecione uma indústria na lista (obrigatório).");
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
      const priceRaw = form.price.trim().replace(",", ".");
      const priceNum = priceRaw === "" ? 0 : Number(priceRaw);
      if (priceRaw !== "" && !Number.isFinite(priceNum)) {
        toast.error("Preço inválido");
        return;
      }
      if (priceNum < 0) {
        toast.error("Preço não pode ser negativo");
        return;
      }
      const stockRaw = form.stock.trim();
      const stockNum = stockRaw === "" ? 0 : parseInt(stockRaw, 10);
      if (stockRaw !== "" && !Number.isFinite(stockNum)) {
        toast.error("Estoque inválido");
        return;
      }
      if (stockNum < 0) {
        toast.error("Estoque não pode ser negativo");
        return;
      }
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        industry_id: industryId,
        supplier: industryRow.trade_name.trim() || null,
        image_urls: urls,
        image_url: urls[0] ?? null,
        price: priceNum,
        stock: stockNum,
        active: form.active,
      };
      const { error } = editing
        ? await supabase.from("products").update(payload).eq("id", editing.id)
        : await supabase.from("products").insert({
            ...payload,
            organization_id: organization.id,
            owner_seller_id: role === "vendedor" ? (user?.id ?? null) : null,
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
    const { error } = await supabase.from("products").update({ active: !p.active }).eq("id", p.id);
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
        ? (file.name.split(".").pop()?.toLowerCase() ?? "jpg")
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
      const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(objectPath);
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
      "EAN13 (código de barras)",
      "Categoria",
      "Industria",
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
    toast.success(
      products.length > 0
        ? `${products.length} produtos exportados`
        : "Modelo CSV (apenas cabeçalhos) exportado",
    );
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
          if (t[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else cur += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === "," || c === ";") {
          row.push(cur);
          cur = "";
        } else if (c === "\n" || c === "\r") {
          if (c === "\r" && t[i + 1] === "\n") i++;
          row.push(cur);
          cur = "";
          if (row.some((v) => v !== "")) rows.push(row);
          row = [];
        } else cur += c;
      }
    }
    if (cur !== "" || row.length) {
      row.push(cur);
      if (row.some((v) => v !== "")) rows.push(row);
    }
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
      const iSku = idx([
        "sku",
        "ean13",
        "ean",
        "código",
        "codigo",
        "ean13 (código de barras)",
        "ean13 (codigo de barras)",
        "código de barras",
        "codigo de barras",
        "código de barras (ean13)",
        "codigo de barras (ean13)",
      ]);
      const iCat = idx(["categoria", "category"]);
      const iSup = idx([
        "fornecedor",
        "fabricante",
        "supplier",
        "industria",
        "indústria",
        "industria/fabricante",
      ]);
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
      const ownerSellerId = role === "vendedor" ? (user?.id ?? null) : null;
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
          industry_id: null,
          price: iPrice >= 0 ? num(r[iPrice]) : 0,
          stock: iStock >= 0 ? Math.floor(num(r[iStock])) : 0,
          active:
            iActive >= 0
              ? !/^(não|nao|no|false|0|inativo)$/i.test((r[iActive] ?? "").trim())
              : true,
          description: iDesc >= 0 ? (r[iDesc] ?? "").trim() || null : null,
          image_urls,
          image_url: image_urls[0] ?? null,
          owner_seller_id: ownerSellerId,
        };
      });
      const skippedBadImages = rawRows.filter(
        (p) => p.name && validateProductImageCount(p.image_urls) !== null,
      ).length;
      const payload = rawRows.filter(
        (p) => p.name && validateProductImageCount(p.image_urls) === null,
      );
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

      const toUpdate = dedupedWithSku.filter((p) =>
        existingBySku.has((p.sku as string).toLowerCase()),
      );
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
            industry_id: null,
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
        `Importação concluída: ${inserted} inseridos, ${updated} atualizados, ${failed} falhas, ${skippedDuplicatedSku} EAN13/códigos de barras duplicados ignorados, ${skippedBadImages} linhas sem imagens válidas ignoradas.`,
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
    <>
      <Dialog open={industryCreateOpen} onOpenChange={setIndustryCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova indústria</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label>Nome fantasia *</Label>
              <Input
                value={industryForm.trade_name}
                onChange={(e) => setIndustryForm((x) => ({ ...x, trade_name: e.target.value }))}
                placeholder="Nome comercial da indústria"
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Responsável *</Label>
              <Input
                value={industryForm.responsible_name}
                onChange={(e) =>
                  setIndustryForm((x) => ({ ...x, responsible_name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Cidade *</Label>
              <Input
                value={industryForm.city}
                onChange={(e) => setIndustryForm((x) => ({ ...x, city: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Estado (UF) *</Label>
              <Input
                value={industryForm.state}
                maxLength={2}
                className="uppercase"
                onChange={(e) =>
                  setIndustryForm((x) => ({ ...x, state: e.target.value.toUpperCase() }))
                }
                placeholder="SP"
              />
            </div>
            <div className="grid gap-2">
              <Label>Telefone *</Label>
              <Input
                value={industryForm.phone}
                onChange={(e) => setIndustryForm((x) => ({ ...x, phone: e.target.value }))}
                inputMode="tel"
              />
            </div>
            <div className="grid gap-2">
              <Label>E-mail *</Label>
              <Input
                type="email"
                value={industryForm.email}
                onChange={(e) => setIndustryForm((x) => ({ ...x, email: e.target.value }))}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Endereço *</Label>
              <Input
                value={industryForm.address_line}
                onChange={(e) => setIndustryForm((x) => ({ ...x, address_line: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>CEP *</Label>
              <Input
                value={industryForm.postal_code}
                onChange={(e) => setIndustryForm((x) => ({ ...x, postal_code: e.target.value }))}
                inputMode="numeric"
              />
            </div>
            <div className="grid gap-2">
              <Label>CNPJ *</Label>
              <Input
                value={industryForm.cnpj}
                onChange={(e) => setIndustryForm((x) => ({ ...x, cnpj: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIndustryCreateOpen(false);
                setIndustryForm(emptyIndustryForm);
              }}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={industrySaving} onClick={() => void saveIndustry()}>
              {industrySaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar indústria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="p-6 lg:p-10 space-y-6">
        {organization?.slug?.trim() ? (
          <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Link2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                Link do catálogo para clientes (visualização)
              </div>
              <p className="text-xs text-muted-foreground">
                Quem abre o link vê os produtos ativos sem login. Para montar o carrinho, o cliente
                entra ou cadastra-se — o cadastro segue o mesmo fluxo do convite universal em{" "}
                <Link
                  to="/clientes"
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  Clientes
                </Link>
                .
              </p>
              <p className="break-all font-mono text-[11px] text-foreground/90">
                {typeof window !== "undefined"
                  ? publicStorefrontCatalogUrl(organization.slug.trim())
                  : `/p/${organization.slug.trim()}/catalogo`}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-2"
              onClick={async () => {
                const url = publicStorefrontCatalogUrl(organization.slug!.trim());
                const ok = await copyTextToClipboard(url);
                if (ok) toast.success("Link do catálogo público copiado.");
                else toast.error("Não foi possível copiar. Use HTTPS ou copie manualmente.");
              }}
            >
              <Link2 className="h-4 w-4" /> Copiar link
            </Button>
          </div>
        ) : null}
        <PageHeader
          title="Catálogo"
          description="Filtre por categoria e indústria, ordene e alterne entre tabela e grade. Os itens ficam agrupados por categoria para localizar mais rápido."
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
                  {importing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIndustryForm(emptyIndustryForm);
                    setIndustryCreateOpen(true);
                  }}
                >
                  <Factory className="h-4 w-4" /> Nova indústria
                </Button>
              )}
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
                          <Label>EAN13 (código de barras)</Label>
                          <Input
                            value={form.sku ?? ""}
                            onChange={(e) => setForm({ ...form, sku: e.target.value })}
                            inputMode="numeric"
                            maxLength={32}
                            placeholder="13 dígitos (opcional)"
                            autoComplete="off"
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
                        <Label>Indústria *</Label>
                        <p className="text-xs text-muted-foreground">
                          Obrigatório: escolha um cadastro na lista. Ao abrir, digite no campo de
                          busca para filtrar por nome fantasia ou CNPJ (com ou sem pontuação). Para
                          incluir outra, use «Cadastrar nova indústria» na lista ou «Nova indústria»
                          no topo da página.
                        </p>
                        <Popover open={industryPickerOpen} onOpenChange={setIndustryPickerOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              aria-expanded={industryPickerOpen}
                              className="w-full justify-between font-normal"
                            >
                              <span className="truncate text-left">
                                {selectedIndustry ? (
                                  <>
                                    {selectedIndustry.trade_name.trim()} · {selectedIndustry.cnpj}
                                  </>
                                ) : editing && form.supplier.trim() ? (
                                  <>Selecione na lista — texto atual: {form.supplier.trim()}</>
                                ) : (
                                  "Selecione uma indústria (obrigatório)"
                                )}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[var(--radix-popover-trigger-width)] p-0"
                            align="start"
                          >
                            <Command shouldFilter={false}>
                              <CommandInput
                                ref={industrySearchInputRef}
                                placeholder="Digite para buscar por nome ou CNPJ…"
                                value={industrySearch}
                                onValueChange={setIndustrySearch}
                              />
                              <CommandList>
                                {industries.length === 0 ? (
                                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                    Nenhuma indústria cadastrada. Escolha «Cadastrar nova indústria»
                                    abaixo ou «Nova indústria» no topo.
                                  </div>
                                ) : industrySearch.trim() && filteredIndustries.length === 0 ? (
                                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                                    Nenhum resultado para «{industrySearch.trim()}». Ajuste a busca
                                    ou cadastre uma nova indústria.
                                  </div>
                                ) : null}
                                <CommandGroup>
                                  <CommandItem
                                    value="__new_industry__"
                                    onSelect={() => {
                                      setIndustryPickerOpen(false);
                                      setIndustryCreateOpen(true);
                                    }}
                                  >
                                    <Plus className="mr-2 h-4 w-4 shrink-0" />
                                    Cadastrar nova indústria…
                                  </CommandItem>
                                  {filteredIndustries.map((ind) => (
                                    <CommandItem
                                      key={ind.id}
                                      value={ind.id}
                                      onSelect={() => {
                                        setForm((prev) => ({
                                          ...prev,
                                          industry_id: ind.id,
                                          supplier: ind.trade_name.trim(),
                                        }));
                                        setIndustryPickerOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4 shrink-0",
                                          form.industry_id === ind.id ? "opacity-100" : "opacity-0",
                                        )}
                                      />
                                      <span className="min-w-0 flex-1 truncate">
                                        {ind.trade_name}
                                      </span>
                                      <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                                        {ind.cnpj}
                                      </span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {selectedIndustry ? (
                          <p className="text-xs text-muted-foreground">
                            O nome da indústria no catálogo segue o cadastro selecionado (nome
                            fantasia).
                          </p>
                        ) : editing && form.supplier.trim() && !form.industry_id ? (
                          <p className="text-xs text-amber-700 dark:text-amber-500">
                            Este produto ainda não está vinculado a um cadastro de indústria.
                            Selecione o correspondente na lista para poder salvar.
                          </p>
                        ) : null}
                      </div>
                      <div className="grid gap-2">
                        <Label>
                          Fotos do produto ({form.image_urls.length}/{MAX_PRODUCT_IMAGES}) *
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Obrigatório entre 1 e {MAX_PRODUCT_IMAGES} imagens. Você pode enviar
                          arquivos ou colar URLs públicas (https).
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
                            disabled={
                              uploadingImage || form.image_urls.length >= MAX_PRODUCT_IMAGES
                            }
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
                              <div
                                key={`${url}-${idx}`}
                                className="relative rounded-lg border border-border bg-muted overflow-hidden group"
                              >
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
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="0"
                            value={form.price}
                            onChange={(e) => {
                              const v = e.target.value.replace(",", ".");
                              if (v === "" || /^\d*\.?\d*$/.test(v)) {
                                setForm({ ...form, price: v });
                              }
                            }}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Estoque</Label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder="0"
                            value={form.stock}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === "" || /^\d+$/.test(v)) {
                                setForm({ ...form, stock: v });
                              }
                            }}
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

        {!loading ? (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-4 lg:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:flex-wrap xl:items-end">
              <div className="relative min-w-[min(100%,280px)] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Buscar nome, EAN13, descrição, categoria ou indústria…"
                  className="h-10 pl-9"
                />
              </div>
              <div className="grid gap-1.5 min-w-[160px]">
                <span className="text-xs font-medium text-muted-foreground">Categoria</span>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas as categorias</SelectItem>
                    {products.some((p) => !p.category?.trim()) ? (
                      <SelectItem value="__none__">Sem categoria</SelectItem>
                    ) : null}
                    {categoryOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5 min-w-[160px]">
                <span className="text-xs font-medium text-muted-foreground">Indústria</span>
                <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas as indústrias</SelectItem>
                    {supplierOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5 min-w-[160px]">
                <span className="text-xs font-medium text-muted-foreground">Estoque</span>
                <Select
                  value={stockFilter}
                  onValueChange={(v) => setStockFilter(v as StockFilterKey)}
                >
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    <SelectItem value="in_stock">Com estoque</SelectItem>
                    <SelectItem value="out_stock">Sem estoque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5 min-w-[180px]">
                <span className="text-xs font-medium text-muted-foreground">Ordenar por</span>
                <Select value={sortKey} onValueChange={(v) => setSortKey(v as CatalogSortKey)}>
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Mais recentes</SelectItem>
                    <SelectItem value="name">Nome (A–Z)</SelectItem>
                    <SelectItem value="category">Categoria + nome</SelectItem>
                    <SelectItem value="price_asc">Preço menor → maior</SelectItem>
                    <SelectItem value="price_desc">Preço maior → menor</SelectItem>
                    <SelectItem value="stock_asc">Estoque menor → maior</SelectItem>
                    <SelectItem value="stock_desc">Estoque maior → menor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="catalog-active-only"
                    checked={activeOnly}
                    onCheckedChange={setActiveOnly}
                  />
                  <Label htmlFor="catalog-active-only" className="text-sm font-normal">
                    Somente ativos
                  </Label>
                </div>
                <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
                  <Button
                    type="button"
                    variant={viewMode === "table" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 gap-1.5 px-2.5"
                    onClick={() => setViewMode("table")}
                    aria-pressed={viewMode === "table"}
                  >
                    <TableIcon className="h-4 w-4" /> Tabela
                  </Button>
                  <Button
                    type="button"
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 gap-1.5 px-2.5"
                    onClick={() => setViewMode("grid")}
                    aria-pressed={viewMode === "grid"}
                  >
                    <LayoutGrid className="h-4 w-4" /> Grade
                  </Button>
                </div>
                {(catalogSearch.trim() !== "" ||
                  categoryFilter !== "__all__" ||
                  supplierFilter !== "__all__" ||
                  stockFilter !== "__all__" ||
                  !activeOnly ||
                  sortKey !== "recent") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => {
                      setCatalogSearch("");
                      setCategoryFilter("__all__");
                      setSupplierFilter("__all__");
                      setStockFilter("__all__");
                      setActiveOnly(true);
                      setSortKey("recent");
                    }}
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Mostrando{" "}
                <strong className="text-foreground">{filteredSortedProducts.length}</strong>
                {products.length > 0 ? (
                  <> de {products.length} produtos · agrupados por categoria</>
                ) : (
                  <> produtos</>
                )}
              </p>
            </div>
          </div>
        ) : null}

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
          ) : filteredSortedProducts.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <PackageSearch className="h-10 w-10 mx-auto mb-3 opacity-50" />
              Nenhum produto corresponde aos filtros.
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCatalogSearch("");
                    setCategoryFilter("__all__");
                    setSupplierFilter("__all__");
                    setStockFilter("__all__");
                    setActiveOnly(true);
                    setSortKey("recent");
                  }}
                >
                  Limpar filtros
                </Button>
              </div>
            </div>
          ) : viewMode === "grid" ? (
            <div className="space-y-10 p-4 md:p-6">
              {groupedCatalog.map(([cat, rows]) => (
                <section key={cat} className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
                    <Layers className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <h2 className="text-sm font-semibold tracking-tight">{cat}</h2>
                    <Badge variant="secondary" className="font-normal">
                      {rows.length}
                    </Badge>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {rows.map((p) => {
                      const thumbs = normalizeProductImageUrls(p.image_urls, p.image_url);
                      return (
                        <CatalogProductGridCard
                          key={p.id}
                          p={p}
                          thumbs={thumbs}
                          canManageCatalog={canManageCatalog}
                          onEdit={() => openEdit(p)}
                          onToggleActive={() => toggleActive(p)}
                        />
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[8.5rem] min-w-[8.5rem] align-middle">Fotos</TableHead>
                    <TableHead className="min-w-[200px] align-middle">Produto</TableHead>
                    <TableHead className="min-w-[9.5rem]">EAN13 (cód. barras)</TableHead>
                    <TableHead className="min-w-[120px]">Indústria</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedCatalog.map(([cat, rows]) => (
                    <Fragment key={cat}>
                      <TableRow className="border-border bg-muted/55 hover:bg-muted/55">
                        <TableCell colSpan={8} className="py-2.5">
                          <span className="inline-flex items-center gap-2 text-sm font-semibold">
                            <Layers className="h-4 w-4 text-primary" aria-hidden />
                            {cat}
                            <Badge variant="outline" className="font-normal">
                              {rows.length}
                            </Badge>
                          </span>
                        </TableCell>
                      </TableRow>
                      {rows.map((p) => {
                        const thumbs = normalizeProductImageUrls(p.image_urls, p.image_url);
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="align-middle py-3">
                              <CatalogTablePhotoMosaic urls={thumbs} productName={p.name} />
                            </TableCell>
                            <TableCell className="align-middle">
                              <div className="min-w-0 space-y-1">
                                <div className="font-semibold leading-snug">{p.name}</div>
                                {thumbs.length > 1 && (
                                  <div className="text-[11px] text-muted-foreground">
                                    {thumbs.length} fotos · capa + extras
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="align-middle text-muted-foreground">
                              {p.sku ?? "—"}
                            </TableCell>
                            <TableCell className="align-middle">
                              {p.supplier?.trim() ? (
                                <div className="flex items-start gap-2">
                                  <Building2
                                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                                    aria-hidden
                                  />
                                  <span className="text-sm font-medium leading-snug">
                                    {p.supplier.trim()}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </TableCell>
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
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
