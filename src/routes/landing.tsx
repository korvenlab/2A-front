import { createFileRoute } from "@tanstack/react-router";

import { AvendasFocusLandingGate } from "@/components/landing/AvendasFocusLanding";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "2AVendas — Apresentação" },
      {
        name: "description",
        content: "Visão geral do produto: link de pedidos, funil e portal B2B.",
      },
    ],
  }),
  component: AvendasFocusLandingGate,
});
