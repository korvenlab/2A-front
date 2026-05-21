import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCnpj, isCnpjComplete } from "@/lib/document-masks";
import { lookupCnpj, type CnpjLookupResult } from "@/lib/cnpj-lookup";
import { toast } from "sonner";

type Props = {
  id?: string;
  label?: string;
  value: string;
  onValueChange: (formatted: string) => void;
  onLookup: (data: CnpjLookupResult) => void;
  disabled?: boolean;
  hint?: string;
};

export function CnpjLookupInput({
  id,
  label = "CNPJ",
  value,
  onValueChange,
  onLookup,
  disabled,
  hint,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleBlur = async () => {
    if (!isCnpjComplete(value)) return;
    setLoading(true);
    try {
      const data = await lookupCnpj(value);
      onLookup(data);
      toast.success("Dados do CNPJ preenchidos.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao consultar CNPJ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-2">
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <div className="relative">
        <Input
          id={id}
          value={value}
          disabled={disabled || loading}
          inputMode="numeric"
          autoComplete="off"
          placeholder="00.000.000/0000-00"
          className={loading ? "pr-9" : undefined}
          onChange={(e) => onValueChange(formatCnpj(e.target.value))}
          onBlur={() => void handleBlur()}
        />
        {loading ? (
          <Loader2
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden
          />
        ) : null}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
