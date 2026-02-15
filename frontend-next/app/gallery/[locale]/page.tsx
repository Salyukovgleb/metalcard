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
    h1: "Страница, на которой вы можете ознакомиться с возможными вариантами печати на картах",
    title: "Галерея",
    subtitleTop: "Представляем тебе наши",
    subtitleBottom: "лучшие работы",
    cta: "заказать",
  },
  uz: {
    h1: "galereya",
    title: "Galereya",
    subtitleTop: "Sizga eng yaxshi ishimizni",
    subtitleBottom: "taqdim etamiz",
    cta: "buyurtma",
  },
} as const;

export default async function GalleryPage({ params, searchParams }: Props) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const query = toQueryString(await searchParams);
  const currentPath = `/gallery/${locale}/`;
  const text = textByLocale[locale as Locale];

  return (
    <>
      <link rel="stylesheet" href={`/gallery/${locale}4.css`} />

      <h1 className="visually-hidden">{text.h1}</h1>

      <SiteHeader
        activePage="gallery"
        locale={locale as Locale}
        mobileHeading={mobileHeadingByPage[locale as Locale].gallery}
        query={query}
        currentPath={currentPath}
      />

      <main className="main">
        <h2 className="main__header">{text.title}</h2>

        <p className="main__info">
          {text.subtitleTop}
          <br />
          {text.subtitleBottom}
        </p>

        <div className="main__right">
          <a className="main__right-link" href={withQuery(`/design/${locale}/`, query)}>
            <span>{text.cta}</span>
          </a>
        </div>

        <div className="main__gallery">
          <div className="main__gallery-inner">
            {Array.from({ length: 21 }).map((_, index) => {
              const reelNum = index + 1;
              return (
                <button key={reelNum} className="main__gallery-inner-item" id={`reels-${reelNum}`}>
                  <picture>
                    <source srcSet={`/images/reels/reels-${reelNum}.webp`} type="image/webp" />
                    <img src={`/images/reels/reels-${reelNum}.jpg`} alt={`Reels ${reelNum}`} />
                  </picture>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      <div className="video-player-cont">
        <button className="video-player-cont__controls" id="video-player-prev-btn" />
        <div className="video-player-cont__video-cont" id="video-player-video" />
        <button className="video-player-cont__controls" id="video-player-next-btn" />
        <button className="video-player-cont__exit" id="video-player-exit-btn" />
      </div>

      <SiteFooter />
      <Script src={`/gallery/${locale}4.js`} strategy="afterInteractive" />
    </>
  );
}
