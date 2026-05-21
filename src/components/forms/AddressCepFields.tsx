import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCep, isCepComplete, onlyDigits } from "@/lib/document-masks";
import { lookupCep } from "@/lib/cep-lookup";
import { toast } from "sonner";

export type AddressCepValues = {
  cep: string;
  street: string;
  district: string;
  city: string;
  state: string;
};

type Props = {
  values: AddressCepValues;
  onChange: (patch: Partial<AddressCepValues>) => void;
  streetLabel?: string;
  districtLabel?: string;
  disabled?: boolean;
};

export function AddressCepFields({
  values,
  onChange,
  streetLabel = "Endereço (rua, número)",
  districtLabel = "Bairro",
  disabled,
}: Props) {
  const [loading, setLoading] = useState(false);
  const lastFetchedCep = useRef<string>("");

  const fetchCep = async (digits: string) => {
    if (digits === lastFetchedCep.current) return;
    setLoading(true);
    try {
      const data = await lookupCep(digits);
      lastFetchedCep.current = digits;
      onChange({
        street: data.logradouro || values.street,
        district: data.bairro || values.district,
        city: data.cidade || values.city,
        state: data.uf || values.state,
      });
      toast.success("Endereço preenchido pelo CEP.");
    } catch (e) {
      lastFetchedCep.current = "";
      toast.error(e instanceof Error ? e.message : "Erro ao consultar CEP.");
    } finally {
      setLoading(false);
    }
  };

  const handleCepChange = (raw: string) => {
    const formatted = formatCep(raw);
    onChange({ cep: formatted });
    const digits = onlyDigits(formatted);
    if (digits.length < 8) {
      lastFetchedCep.current = "";
      return;
    }
    if (isCepComplete(formatted)) {
      void fetchCep(digits);
    }
  };

  return (
    <fieldset className="space-y-3 rounded-xl border border-border p-4">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Endereço
      </legend>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,10rem)_1fr]">
        <div className="grid gap-2">
          <Label htmlFor="addr-cep">CEP</Label>
          <div className="relative">
            <Input
              id="addr-cep"
              value={values.cep}
              disabled={disabled || loading}
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="00000-000"
              className={loading ? "pr-9" : undefined}
              onChange={(e) => handleCepChange(e.target.value)}
            />
            {loading ? (
              <Loader2
                className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
                aria-hidden
              />
            ) : null}
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="addr-street">{streetLabel}</Label>
          <Input
            id="addr-street"
            value={values.street}
            disabled={disabled}
            autoComplete="street-address"
            onChange={(e) => onChange({ street: e.target.value })}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="addr-district">{districtLabel}</Label>
          <Input
            id="addr-district"
            value={values.district}
            disabled={disabled}
            onChange={(e) => onChange({ district: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="addr-city">Cidade</Label>
          <Input
            id="addr-city"
            value={values.city}
            disabled={disabled}
            onChange={(e) => onChange({ city: e.target.value })}
          />
        </div>
        <div className="grid gap-2 sm:col-span-1">
          <Label htmlFor="addr-uf">UF</Label>
          <Input
            id="addr-uf"
            value={values.state}
            maxLength={2}
            disabled={disabled}
            className="uppercase"
            onChange={(e) => onChange({ state: e.target.value.toUpperCase() })}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Ao completar 8 dígitos do CEP, rua, bairro, cidade e UF são buscados automaticamente.
      </p>
    </fieldset>
  );
}
