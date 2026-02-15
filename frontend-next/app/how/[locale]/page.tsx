import Script from "next/script";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { mobileHeadingByPage, type Locale, isLocale } from "@/lib/site";
import { toQueryString, type SearchParams } from "@/lib/query";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
};

const textByLocale = {
  ru: {
    h1: "Страница, на которой вы можете ознакомиться с обучающим видео",
    title: "Как это работает",
    play: "смотри",
  },
  uz: {
    h1: "bu qanday ishlaydi",
    title: "Bu qanday ishlaydi",
    play: "tomosha qiling",
  },
} as const;

export default async function HowPage({ params, searchParams }: Props) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const query = toQueryString(await searchParams);
  const currentPath = `/how/${locale}/`;
  const text = textByLocale[locale as Locale];

  return (
    <>
      <link rel="stylesheet" href={`/how/${locale}4.css`} />

      <h1 className="visually-hidden">{text.h1}</h1>

      <SiteHeader
        activePage="how"
        locale={locale as Locale}
        mobileHeading={mobileHeadingByPage[locale as Locale].how}
        query={query}
        currentPath={currentPath}
      />

      <main className="main">
        <video className="main__video" preload="auto">
          <source src="/video/desk.mp4" type='video/mp4; codecs="avc1.42E01E, mp4a.40.2"' />
        </video>

        <video className="main__video-mob" preload="auto">
          <source src="/video/mob.mp4" type='video/mp4; codecs="avc1.42E01E, mp4a.40.2"' />
        </video>

        <h2 className="main__header">{text.title}</h2>
        <button className="main__play-btn">{text.play}</button>
      </main>

      <SiteFooter />
      <Script src={`/how/${locale}4.js`} strategy="afterInteractive" />
    </>
  );
}
