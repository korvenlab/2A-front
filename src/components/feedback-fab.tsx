import { useState } from "react";
import { CircleHelp, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { userFacingDataError } from "@/lib/supabase-user-error";

const MIN_LEN = 5;
const MAX_LEN = 8000;

export function FeedbackFab() {
  const { session, user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const resetForm = () => setBody("");

  const submit = async () => {
    const trimmed = body.trim();
    if (!session || !user) {
      toast.error("Faça login para enviar sua mensagem.");
      return;
    }
    if (trimmed.length < MIN_LEN) {
      toast.error(`Descreva com pelo menos ${MIN_LEN} caracteres.`);
      return;
    }
    if (trimmed.length > MAX_LEN) {
      toast.error(`Texto longo demais (máximo ${MAX_LEN} caracteres).`);
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from("feedback_messages").insert({
        user_id: user.id,
        organization_id: profile?.organization_id ?? null,
        user_email: user.email ?? null,
        user_full_name: profile?.full_name ?? null,
        body: trimmed,
      });
      if (error) {
        toast.error(userFacingDataError(error));
        return;
      }
      toast.success("Obrigado! Sua mensagem foi enviada.");
      resetForm();
      setOpen(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Ajuda e feedback"
          className="fixed bottom-6 left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-primary text-primary-foreground shadow-lg transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CircleHelp className="h-7 w-7" strokeWidth={2} />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-[min(100vw,26rem)] flex-col gap-0 sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle>Ajuda e feedback</SheetTitle>
          <SheetDescription>
            Teve algum bug ou quer deixar alguma sugestão? Relate à nossa equipe.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 flex flex-1 flex-col gap-4 px-1 pb-6">
          {!session ? (
            <p className="text-sm text-muted-foreground">
              Entre na sua conta para enviar bugs ou sugestões. Use o menu &quot;Entrar&quot;.
            </p>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="feedback-body">Sua mensagem</Label>
                <Textarea
                  id="feedback-body"
                  placeholder="Descreva o que aconteceu ou sua ideia…"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  maxLength={MAX_LEN}
                  disabled={sending}
                  className="resize-none min-h-[160px]"
                />
                <p className="text-xs text-muted-foreground">
                  {body.trim().length}/{MAX_LEN} caracteres (mín. {MIN_LEN})
                </p>
              </div>
              <Button
                type="button"
                className="mt-auto"
                disabled={sending || body.trim().length < MIN_LEN}
                onClick={() => void submit()}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
