import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Fonte dos títulos (expressiva, com eixos de largura e tamanho óptico). */
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
});

const DESCRICAO =
  "Monte seu currículo com ajuda da IA (digitando ou gravando um áudio) e treine entrevistas de emprego pelo WhatsApp com uma recrutadora virtual. Ao final, receba um relatório com nota, pontos fortes e o que melhorar.";

export const metadata: Metadata = {
  title: {
    default: "Impulso Jovem — currículo com IA e treino de entrevista",
    template: "%s | Impulso Jovem",
  },
  description: DESCRICAO,
  applicationName: "Impulso Jovem",
  openGraph: {
    title: "Impulso Jovem — currículo com IA e treino de entrevista",
    description: DESCRICAO,
    siteName: "Impulso Jovem",
    locale: "pt_BR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaff" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0c18" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      // Next 16: sem este atributo, a rolagem suave (scroll-smooth, usada nas âncoras da landing) também
      // animaria a volta ao topo em cada troca de página
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            {/* isolate: os modais (portais) sempre ficam acima do conteúdo da página */}
            <div className="isolate flex min-h-full flex-1 flex-col">{children}</div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
