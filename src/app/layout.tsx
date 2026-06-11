import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LM FIT — Painel",
  description: "Controle de pedidos, compras, notas e cadastros LM FIT",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          {children}
          <Toaster 
            position="bottom-right"
            toastOptions={{
              className: "text-sm",
              style: {
                background: "#1e1e1e",
                color: "#fff",
                border: "1px solid #333",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
