import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";

const fontFaceCss = `
@font-face {
  font-family: "Gilroy";
  src: url('/fonts/gilroy-light.woff2') format('woff2'),
      url('/fonts/gilroy-light.woff') format('woff'),
      url('/fonts/gilroy-light.ttf') format('truetype');
  font-weight: 300;
  font-style: normal;
}
@font-face {
  font-family: "Beware";
  src: url('/fonts/beware-regular.woff2') format('woff2'),
      url('/fonts/beware-regular.woff') format('woff'),
      url('/fonts/beware-regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: "Card";
  src: url('/fonts/card-regular.woff2') format('woff2'),
      url('/fonts/card-regular.woff') format('woff'),
      url('/fonts/card-regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
}
`;

export const metadata: Metadata = {
  title: "MetalCards",
  description: "MetalCards frontend 1:1 migration",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <style dangerouslySetInnerHTML={{ __html: fontFaceCss }} />
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
        <CookieConsentBanner />
        {children}
      </body>
    </html>
  );
}
