import { createFileRoute } from "@tanstack/react-router";

import { AvendasFocusLandingGate } from "@/components/landing/AvendasFocusLanding";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "2AVendas — CRM para representantes comerciais" },
      {
        name: "description",
        content:
          "CRM pensado para representantes: gestão de equipe, funil de vendas, WhatsApp no pedido, pedidos centralizados, portal com link de pedido e catálogo B2B — uma base para a operação da representação.",
      },
      {
        property: "og:title",
        content: "2AVendas — CRM para representantes comerciais",
      },
      {
        property: "og:description",
        content:
          "Equipe, funil, WhatsApp integrado ao pedido, pedidos num só lugar, portal com link e catálogo B2B para sua representação.",
      },
    ],
  }),
  component: AvendasFocusLandingGate,
});
