import Script from "next/script";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { mobileHeadingByPage, type Locale, isLocale, withQuery } from "@/lib/site";
import { toQueryString, type SearchParams } from "@/lib/query";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
};

const textByLocale = {
  ru: {
    title: "Металлические карты",
    h1: "Главная страница",
    line1: "MetalCards - это твой стиль, твой характер, твой имидж.",
    line2: "Наша компания занимается гравировкой металлических платежных карт с уникальным дизайном.",
    line3: "Прямо сейчас ты можешь создать собственный шедевр и получить элитную карту класса Premium.",
    cta: "попробуй",
  },
  uz: {
    title: "METALL KARTALAR",
    h1: "bosh sahifa",
    line1: "MetalCards – bu sening uslubing, sening fe’ling, sening obro‘ing.",
    line2: "Bizning kompaniyamiz o‘ziga xos dizaynga ega metall to‘lov kartalariga o‘yma tasvir tushirish bilan shug‘ullanadi.",
    line3: "Siz hozirning o‘zida faqat sizga tegishli betakror dizaynni yaratib, Premium darajali elit kartani qo‘lga kiritishingiz mumkin.",
    cta: "sinab ko‘ring",
  },
} as const;

export default async function LocaleMainPage({ params, searchParams }: Props) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const query = toQueryString(await searchParams);
  const currentPath = `/${locale}/`;
  const text = textByLocale[locale as Locale];

  return (
    <>
      <link rel="stylesheet" href={`/${locale}4.css`} />

      <h1 className="visually-hidden">{text.h1}</h1>

      <SiteHeader
        activePage="main"
        locale={locale as Locale}
        mobileHeading={mobileHeadingByPage[locale as Locale].main}
        query={query}
        currentPath={currentPath}
      />

      <main className="main">
        <h2 className="main__header">{text.title}</h2>

        <picture>
          <source type="image/webp" srcSet="/images/main-card-1x.webp 1x, /images/main-card-2x.webp 2x" />
          <img
            className="main__pic"
            src="/images/main-card-1x.jpg"
            srcSet="/images/main-card-1x.jpg 1x, /images/main-card-1x.jpg 2x"
            alt="Карта"
          />
        </picture>

        <div className="main__container">
          <p className="main__container-info">
            <span>{text.line1}</span>
            <span>{text.line2}</span>
            <span>{text.line3}</span>
          </p>

          <a className="main__container-link" href={withQuery(`/design/${locale}/`, query)}>
            <span className="main__container-link-inner">
              <span className="main__container-link-inner_dark">
                <span>{text.cta}</span>
              </span>
              <span className="main__container-link-inner_white">
                <span>{text.cta}</span>
              </span>
            </span>
          </a>
        </div>
      </main>

      <SiteFooter />
      <Script src={`/${locale}4.js`} strategy="afterInteractive" />
    </>
  );
}
