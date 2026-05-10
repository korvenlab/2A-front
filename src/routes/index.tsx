import { createFileRoute } from "@tanstack/react-router";

import { AvendasFocusLandingGate } from "@/components/landing/AvendasFocusLanding";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "2AVendas — Plataforma B2B para equipe, funil e pedidos" },
      {
        name: "description",
        content:
          "Equipe externa, funil de vendas, orçamentos, visitas, pedidos com NF-e, comissões, outreach e portal com link — um cockpit único para a operação comercial B2B.",
      },
      {
        property: "og:title",
        content: "2AVendas — Operação comercial B2B num só lugar",
      },
      {
        property: "og:description",
        content:
          "Funil, pedidos, WhatsApp, portal com link, fiscal e remuneração da equipe integrados.",
      },
    ],
  }),
  component: AvendasFocusLandingGate,
});
