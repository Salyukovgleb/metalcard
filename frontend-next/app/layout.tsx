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
  font-display: swap;
}
@font-face {
  font-family: "Beware";
  src: url('/fonts/beware-regular.woff2') format('woff2'),
      url('/fonts/beware-regular.woff') format('woff'),
      url('/fonts/beware-regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Card";
  src: url('/fonts/card-regular.woff2') format('woff2'),
      url('/fonts/card-regular.woff') format('woff'),
      url('/fonts/card-regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Alex Brush";
  src: url('/fonts/alexbrush-regular.woff2') format('woff2'),
      url('/fonts/alexbrush-regular.woff') format('woff'),
      url('/fonts/alexbrush-regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Arabella";
  src: url('/fonts/arabella-medium.woff2') format('woff2'),
      url('/fonts/arabella-medium.woff') format('woff'),
      url('/fonts/arabella-medium.ttf') format('truetype');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Bodoni";
  src: url('/fonts/bodoni-bold.woff2') format('woff2'),
      url('/fonts/bodoni-bold.woff') format('woff'),
      url('/fonts/bodoni-bold.ttf') format('truetype');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Candlescript";
  src: url('/fonts/candlescript.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Castileo";
  src: url('/fonts/castileo.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Lombardia";
  src: url('/fonts/lombardia.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Monotype Corsiva";
  src: url('/fonts/monotype-corsiva.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Porcelain";
  src: url('/fonts/porcelain.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Postmaster";
  src: url('/fonts/postmaster.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Racing Catalogue";
  src: url('/fonts/racing-catalogue.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Resphekt";
  src: url('/fonts/resphekt.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
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
