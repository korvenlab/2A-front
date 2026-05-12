import { createFileRoute } from "@tanstack/react-router";

import { AvendasFocusLandingGate } from "@/components/landing/AvendasFocusLanding";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "2AVendas — CRM para representantes comerciais" },
      {
        name: "description",
        content:
          "Gestão de equipe, funil, WhatsApp no pedido, pedidos centralizados, portal com link e catálogo B2B.",
      },
    ],
  }),
  component: AvendasFocusLandingGate,
});
