import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Metalcard Admin",
  description: "Metalcard admin panel on Next.js",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
