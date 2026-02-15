import {
  type ActivePage,
  type Locale,
  localePathFromCurrentPath,
  navLabels,
  otherLocale,
  routeFor,
  withQuery,
} from "@/lib/site";

type SiteHeaderProps = {
  activePage: ActivePage;
  locale: Locale;
  mobileHeading: string;
  query: string;
  currentPath: string;
};

const navOrder: ActivePage[] = ["main", "gallery", "how", "benefits", "design"];

export function SiteHeader({ activePage, locale, mobileHeading, query, currentPath }: SiteHeaderProps) {
  const altLocale = otherLocale(locale);
  const sameLocalePath = localePathFromCurrentPath(currentPath, locale);
  const altLocalePath = localePathFromCurrentPath(currentPath, altLocale);

  const ru = locale === "ru";

  return (
    <>
      <header className="header">
        <a className="header__logo" href={withQuery(routeFor("main", locale), query)}>
          <h2 className="visually-hidden">
            {ru ? "Логотип компании и ссылка на главную страницу" : "Kompaniya logotipi va bosh sahifaga havola"}
          </h2>
          <img src="/images/logo.svg" alt={ru ? "Логотип" : "Logotip"} />
        </a>

        <nav className="header__nav">
          <h2 className="visually-hidden">{ru ? "Карта сайта" : "Sayt xaritasi"}</h2>
          <ul className="header__nav-list">
            {navOrder.map((page) => (
              <li
                key={page}
                className={`header__nav-list-item ${activePage === page ? "header__nav-list-item_active" : ""} ${
                  page === "design" ? "header__nav-list-item_design" : ""
                }`}
              >
                <a href={withQuery(routeFor(page, locale), query)}>
                  <span>{navLabels[locale][page]}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="header__lang-cont">
          <a
            href={withQuery(sameLocalePath, query)}
            className={`header__lang-cont-item ${ru ? "header__lang-cont-item_active" : ""}`}
          >
            рус
          </a>
          <a
            href={withQuery(altLocalePath, query)}
            className={`header__lang-cont-item ${!ru ? "header__lang-cont-item_active" : ""}`}
          >
            o&apos;zb
          </a>
        </div>
      </header>

      <header className="header_mob">
        <input className="visually-hidden" id="header-mob-nav" type="checkbox" />

        <a className="header__logo_mob" href={withQuery(routeFor("main", locale), query)}>
          <h2 className="visually-hidden">
            {ru ? "Логотип компании и ссылка на главную страницу" : "Kompaniya logotipi va bosh sahifaga havola"}
          </h2>
          <img src="/images/logo.svg" alt={ru ? "Логотип" : "Logotip"} />
        </a>

        <h2 className="header__heading_mob">{mobileHeading}</h2>

        <label className="header__nav-btn_mob" htmlFor="header-mob-nav">
          <img src="/images/nav-btn.svg" alt={ru ? "Кнопка навигации" : "Navigatsiya tugmasi"} />
        </label>

        <div className="header__container_mob">
          <div className="header__container-inner_mob">
            <div className="header__container-inner-header_mob">
              <a className="header__container-inner-header-logo_mob" href={withQuery(routeFor("main", locale), query)}>
                <h2 className="visually-hidden">
                  {ru ? "Логотип компании и ссылка на главную страницу" : "Kompaniya logotipi va bosh sahifaga havola"}
                </h2>
                <img src="/images/logo.svg" alt={ru ? "Логотип" : "Logotip"} />
              </a>

              <div className="header__container-inner-header-lang-cont">
                <a
                  href={withQuery(localePathFromCurrentPath(currentPath, "ru"), query)}
                  className={`header__container-inner-header-lang-cont-item ${ru ? "header__container-inner-header-lang-cont-item_active" : ""}`}
                >
                  рус
                </a>
                <a
                  href={withQuery(localePathFromCurrentPath(currentPath, "uz"), query)}
                  className={`header__container-inner-header-lang-cont-item ${!ru ? "header__container-inner-header-lang-cont-item_active" : ""}`}
                >
                  o&apos;zb
                </a>
              </div>

              <label className="header__container-inner-header-nav-exit_mob" htmlFor="header-mob-nav">
                <img src="/images/exit.svg" alt={ru ? "Кнопка навигации" : "Navigatsiya tugmasi"} />
              </label>
            </div>

            <nav className="header__container-inner-nav_mob">
              <h3 className="visually-hidden">{ru ? "Карта сайта" : "Sayt xaritasi"}</h3>
              <ul className="header__container-inner-nav-list_mob">
                {navOrder.map((page) => (
                  <li
                    key={page}
                    className={`header__container-inner-nav-list-item_mob ${
                      activePage === page ? "header__container-inner-nav-list-item_mob-active" : ""
                    } ${page === "design" ? "header__nav-list-item_mob-design" : ""}`}
                  >
                    <a href={withQuery(routeFor(page, locale), query)}>
                      <span>{navLabels[locale][page]}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="header__container-inner-links_mob">
              <a href="https://www.instagram.com/metalcards.uz?utm_medium=copy_link">instagram</a>
              <a href="http://tiktok.com/@metalcardsuz">tik tok</a>
              <a href="https://t.me/metalcardsuz">telegram</a>
              <a href="tel:+998989997799">+998 98 999 77 99</a>
              <span>© 2022 MetalCards</span>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
