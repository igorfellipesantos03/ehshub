import type { Metadata } from "next";
// Fonte servida pela própria aplicação: o servidor pode não ter saída para a
// internet, então nada de CDN de fontes.
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "EHS HUB",
  description: "Sistema de gestão de Environment, Health and Safety",
  icons: {
    icon: "/logo_da_jamile.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" translate="no" className="dark" suppressHydrationWarning>
      <body className="min-h-screen notranslate">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
