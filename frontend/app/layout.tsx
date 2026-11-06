import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { ConfirmProvider } from "@/hooks/useConfirm";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { NgrokBypass } from "@/components/ngrok/ngrok-bypass";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Atlas Boi — Transporte de Gado",
  description: "ERP multi-tenant para transporte de gado vivo",
  icons: {
    icon: "/logomarca/atlas-boi-retangular.png",
    apple: "/logomarca/atlas-boi-retangular.png",
  },
};

/** `viewport-fit=cover` libera env(safe-area-inset-*) no app motorista (Android/iOS). */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { color: "#0a0a0a" },
  ],
};

const ngrokEarlyScript = `
(function(){
  var h = location.hostname;
  if (!/ngrok-free\\.(dev|app)|\\.ngrok\\.io/i.test(h)) return;
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/ngrok-sw.js', { scope: '/' }).catch(function(){});
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
        <script dangerouslySetInnerHTML={{ __html: ngrokEarlyScript }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>
            <ConfirmProvider>
              <NgrokBypass />
              {children}
            </ConfirmProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
