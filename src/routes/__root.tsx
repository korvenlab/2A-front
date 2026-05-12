import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";
import { FeedbackFab } from "@/components/feedback-fab";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "referrer", content: "strict-origin-when-cross-origin" },
      { name: "format-detection", content: "telephone=no" },
      { title: "2AVendas — CRM para representantes comerciais" },
      {
        name: "description",
        content:
          "Gestão de equipe, funil de vendas, WhatsApp no pedido, pedidos centralizados, portal com link e catálogo B2B — um CRM para representação.",
      },
      { name: "author", content: "2AVendas" },
      { property: "og:title", content: "2AVendas — CRM para representantes comerciais" },
      {
        property: "og:description",
        content:
          "Equipe, funil, WhatsApp no pedido, pedidos centralizados, portal e catálogo B2B num só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "2AVendas — CRM para representantes comerciais" },
      {
        name: "twitter:description",
        content:
          "CRM para representantes: equipe, funil, pedidos, portal com link e catálogo B2B integrados.",
      },
      { property: "og:site_name", content: "2AVendas" },
      { property: "og:image", content: "/vendaslogo.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:image", content: "/vendaslogo.png" },
      { name: "theme-color", content: "#4f7fc4" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "apple-touch-icon", href: "/vendaslogo.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <FeedbackFab />
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}
