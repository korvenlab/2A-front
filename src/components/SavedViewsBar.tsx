import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loadSavedViews, saveView, type SavedView } from "@/lib/saved-views";
import { BookmarkPlus } from "lucide-react";
import { toast } from "sonner";

type Props<T extends Record<string, unknown>> = {
  pageKey: string;
  userId: string;
  orgId: string;
  snapshot: T;
  onApply: (payload: T) => void;
};

export function SavedViewsBar<T extends Record<string, unknown>>({
  pageKey,
  userId,
  orgId,
  snapshot,
  onApply,
}: Props<T>) {
  const [list, setList] = useState<SavedView<T>[]>(() => loadSavedViews(pageKey, userId, orgId));
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    setList(loadSavedViews(pageKey, userId, orgId));
    setSelected("");
  }, [pageKey, userId, orgId]);

  const applyId = (id: string) => {
    const v = list.find((x) => x.id === id);
    if (v) onApply(v.payload);
  };

  const handleSave = () => {
    const name = window.prompt("Nome desta visão (filtros atuais)?");
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Informe um nome.");
      return;
    }
    const next = saveView(pageKey, userId, orgId, trimmed, snapshot);
    setList(next);
    toast.success("Visão salva neste navegador.");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={selected || "__none__"}
        onValueChange={(v) => {
          if (v === "__none__") {
            setSelected("");
            return;
          }
          setSelected(v);
          applyId(v);
        }}
      >
        <SelectTrigger className="w-[200px] h-9">
          <SelectValue placeholder="Visões salvas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">— Escolher visão —</SelectItem>
          {list.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              {v.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" variant="outline" size="sm" className="h-9 gap-1" onClick={handleSave}>
        <BookmarkPlus className="h-4 w-4" />
        Salvar visão
      </Button>
    </div>
  );
}
