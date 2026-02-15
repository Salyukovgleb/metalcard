import Script from "next/script";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getBenefits } from "@/lib/benefits";
import { mobileHeadingByPage, type Locale, isLocale } from "@/lib/site";
import { toQueryString, type SearchParams } from "@/lib/query";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
};

export default async function BenefitsPage({ params, searchParams }: Props) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const query = toQueryString(await searchParams);
  const currentPath = `/benefits/${locale}/`;
  const items = getBenefits(locale as Locale);

  return (
    <>
      <link rel="stylesheet" href={`/benefits/${locale}4.css`} />

      <h1 className="visually-hidden">{locale === "ru" ? "Преимущества" : "Afzalliklar"}</h1>

      <SiteHeader
        activePage="benefits"
        locale={locale as Locale}
        mobileHeading={mobileHeadingByPage[locale as Locale].benefits}
        query={query}
        currentPath={currentPath}
      />

      <main>
        <div className="benefits-container benefits-container_design">
          <div className="benefits-container__overflow">
            {items.map((item) => (
              <div key={item.key} className={`benefits-container__${item.key}`}>
                <h2>
                  {item.title} {item.highlighted ? <span>{item.highlighted}</span> : null}
                </h2>

                <div className="benefits-container__img-cont">
                  <picture>
                    <source type="image/webp" srcSet={`${item.imageWebp} 1x, ${item.imageWebp2x} 2x`} />
                    <img className="benefits-container__img" src={item.image} srcSet={`${item.image} 1x, ${item.image2x} 2x`} alt={locale === "ru" ? item.altRu : item.altUz} />
                  </picture>
                  <img className="benefits-container__blur" src="/images/benefits/blur.png" alt="Блюр" />
                </div>

                <p>
                  {item.paragraphs.map((paragraph) => (
                    <span key={paragraph}>{paragraph}</span>
                  ))}
                </p>
              </div>
            ))}
          </div>

          <div className="benefits-container__line benefits-container__line_0">
            <span className="benefits-container__line-active" />
          </div>

          <div className="benefits-container__btns">
            <button className="benefits-container__next-btn">
              <span>{locale === "ru" ? "вниз" : "pastga"}</span>
            </button>

            <button className="benefits-container__prev-btn">
              <span>{locale === "ru" ? "наверх" : "yuqoriga"}</span>
            </button>
          </div>
        </div>

        <div className="benefits-image-container benefits-image-container_0">
          <div className="benefits-image-container__overflow">
            {items.map((item) => (
              <div key={item.key} className={`benefits-image-container__${item.key}`}>
                <picture>
                  <source type="image/webp" srcSet={`${item.imageWebp} 1x, ${item.imageWebp2x} 2x`} />
                  <img className="benefits-image-container__img" src={item.image} srcSet={`${item.image} 1x, ${item.image2x} 2x`} alt={locale === "ru" ? item.altRu : item.altUz} />
                </picture>
                <img className="benefits-image-container__blur" src="/images/benefits/blur.png" alt="Блюр" />
              </div>
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
      <Script src={`/benefits/${locale}4.js`} strategy="afterInteractive" />
    </>
  );
}
