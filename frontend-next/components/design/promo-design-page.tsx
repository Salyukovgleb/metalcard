import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import { OrderLegalGuard } from "@/components/order-legal-guard";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { type Locale, mobileHeadingByPage } from "@/lib/site";
import { toQueryString, type SearchParams } from "@/lib/query";
import { getCardColorCSS } from "@/lib/card-colors";
import { getPromoByUri } from "@/lib/promo-data";
import { getRuntimeCardColorsConfig } from "@/lib/runtime-card-colors";

const fontsFamily = [
  "Alex Brush",
  "Arabella",
  "Bodoni",
  "Card",
  "Candlescript",
  "Castileo",
  "Lombardia",
  "Monotype Corsiva",
  "Porcelain",
  "Postmaster",
  "Racing Catalogue",
  "Resphekt",
];

type Props = {
  locale: Locale;
  promoSlug: string;
  searchParams: SearchParams;
};

const text = {
  ru: {
    h1: "Страница, на которой вы можете создать свой дизайн карты",
    sideFront: "Лицевая",
    sideFront2: "сторона",
    sideBack: "Задняя",
    sideBack2: "сторона",
    cardWithBigChip: "Карта с",
    cardWithBigChip2: "большим чипом",
    cardWithSmallChip: "Карта с",
    cardWithSmallChip2: "маленьким чипом",
    cardNum: "номер карты",
    cardTime: "срок действия",
    removeLogo: "убрать логотип MetalCards",
    inscription: "надпись",
    font: "Шрифт",
    addInscription: "Добавить еще одну надпись",
    deleteInscription: "Удалить надпись",
    total: "общая сумма",
    sum: "сум",
    order: "Закажи",
    confirmDesign: "Подтверди дизайн",
    confirm: "подтвердить",
    back: "вернуться к редактору",
    orderConfirm: "Подтверждение заказа",
    name: "Имя",
    phone: "Номер телефона",
    deliveryMethod: "Выберите способ получения",
    deliveryRegion: "Доставка по вилоятам Узбекистана +50 000 сум",
    deliveryRegion2: "(с вами свяжется наш менеджер)",
    deliveryYandex: "Доставка Яндекс Такси",
    deliveryYandex2: "(оплата клиентом)",
    pickup: "Самовывоз (Осие, 16)",
    toPay: "к оплате",
    confirmOrder: "подтвердить заказ",
    payment: "Оплата заказа",
    payVia: "оплатить через",
    cash: "оплатить наличными",
    cancel: "отменить заказ",
    acceptPrivacyPrefix: "Я принимаю",
    acceptPrivacyLink: "политику конфиденциальности",
    acceptTermsPrefix: "Я принимаю",
    acceptTermsLink: "пользовательское соглашение",
    legalRequired: "Чтобы продолжить, примите политику конфиденциальности и пользовательское соглашение.",
  },
  uz: {
    h1: "Karta dizaynini yaratishingiz mumkin bo'lgan sahifa",
    sideFront: "Old",
    sideFront2: "tomoni",
    sideBack: "Orqa",
    sideBack2: "tomon",
    cardWithBigChip: "katta",
    cardWithBigChip2: "chip karta",
    cardWithSmallChip: "kichik",
    cardWithSmallChip2: "chip karta",
    cardNum: "Karta raqami",
    cardTime: "amal qilish muddati",
    removeLogo: "MetalCards logotipini olib tashlash",
    inscription: "yozuv",
    font: "Shrift",
    addInscription: "Boshqa yorliq qo'shing",
    deleteInscription: "Yozuvni o'chirish",
    total: "umumiy qiymat",
    sum: "so'm",
    order: "Buyurtma",
    confirmDesign: "Dizaynni tasdiqlang",
    confirm: "tasdiqlang",
    back: "muharrirga qaytish",
    orderConfirm: "Buyurtmani tasdiqlash",
    name: "Ism",
    phone: "Telefon raqami",
    deliveryMethod: "Qanday qabul qilishni tanlang",
    deliveryRegion: "O'zbekiston viloyatlari bo'ylab yetkazib berish +50 000 so'm",
    deliveryRegion2: "(menejerimiz siz bilan bog'lanadi)",
    deliveryYandex: "Yandex Taxi yetkazib berish",
    deliveryYandex2: "(mijoz to'lovi)",
    pickup: "Termoq (Osie, 16)",
    toPay: "to'lash",
    confirmOrder: "buyurtmani tasdiqlang",
    payment: "Buyurtma to'lash",
    payVia: "orqali to'lash",
    cash: "naqd pulda to'lash",
    cancel: "buyurtmani bekor qilish",
    acceptPrivacyPrefix: "Men",
    acceptPrivacyLink: "maxfiylik siyosatini",
    acceptTermsPrefix: "Men",
    acceptTermsLink: "foydalanuvchi kelishuvini",
    legalRequired: "Davom etish uchun maxfiylik siyosati va foydalanuvchi kelishuvini qabul qiling.",
  },
} as const;

function Inscription({ idPrefix, locale }: { idPrefix: "a" | "b"; locale: Locale }) {
  const copy = text[locale];

  return (
    <div className="configurator__card-data-inscription" id={`side-${idPrefix}-inscription`}>
      <div className="configurator__card-data-inscription-desc">
        <label htmlFor={`side-${idPrefix}-inscription-text`}>{copy.inscription}</label>
        <p>0/20</p>
      </div>
      <input
        className="configurator__card-data-inscription-text"
        id={`side-${idPrefix}-inscription-text`}
        type="text"
        name={`side-${idPrefix}-inscription-text`}
        placeholder={copy.inscription}
      />

      <div
        className="configurator__card-data-inscription-cont configurator__card-data-inscription-font-cont"
        id={`side-${idPrefix}-inscription-font-cont`}
      >
        <button className="configurator__card-data-inscription-cont-btn" id={`side-${idPrefix}-inscription-font-cont-btn`}>
          <span style={{ opacity: 0.5 }}>{copy.font}</span>
        </button>
        <div className="configurator__card-data-inscription-cont-inner">
          <ul className="configurator__card-data-inscription-cont-list">
            {fontsFamily.map((font) => (
              <li key={`${idPrefix}-${font}`} className="configurator__card-data-inscription-cont-list-item">
                <label className="configurator__card-data-inscription-cont-list-item-label">
                  <span style={{ fontFamily: font }}>{font}</span>
                  <input className="visually-hidden" type="radio" name={`side-${idPrefix}-inscription-font`} value={font} />
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="configurator__card-data-inscription-actions">
        <button className="configurator__card-data-inscription-add-btn" id={`side-${idPrefix}-inscription-add-btn`}>
          {copy.addInscription}
        </button>
        <button className="configurator__card-data-inscription-delete-btn" id={`side-${idPrefix}-inscription-delete-btn`}>
          {copy.deleteInscription}
        </button>
      </div>
    </div>
  );
}

export default async function DesignPromoPage({ locale, promoSlug, searchParams }: Props) {
  const promo = getPromoByUri(promoSlug);

  if (!promo) {
    notFound();
  }

  const colorsConfig = await getRuntimeCardColorsConfig();
  const color = colorsConfig.activeColors.find((cardColor) => cardColor.name === promo.color);
  if (!color) {
    notFound();
  }

  const copy = text[locale as Locale];
  const query = toQueryString(searchParams);
  const currentPath = `/design/${promoSlug}/${locale}/`;
  const render = `/renders/${promo.folderName}/${colorsConfig.renderColorByCode[promo.color] ?? color.renderColor}/${promo.designID}`;

  const cardColorsCSS = getCardColorCSS(color);

  return (
    <>
      <link rel="stylesheet" href={`/design-promo/${locale}.css?ver=17`} />
      <style dangerouslySetInnerHTML={{ __html: cardColorsCSS }} />

      <h1 className="visually-hidden">{copy.h1}</h1>

      <SiteHeader
        activePage="design"
        locale={locale as Locale}
        mobileHeading={mobileHeadingByPage[locale as Locale].design}
        query={query}
        currentPath={currentPath}
      />

      <main>
        <h2 className="visually-hidden">Конструктор</h2>

        <input className="visually-hidden" type="radio" id={`${color.name}-card`} value={color.name} name="card-color" defaultChecked />

        <section className="configurator">
          <h3 className="visually-hidden">Конфигуратор</h3>

          <div className="configurator__card-data" id="card-data-side-a">
            <div className="configurator__card-data-radio-cont">
              <input className="visually-hidden" id="big-chip-input" type="radio" name="big-chip-input" value="true" />
              <label htmlFor="small-chip-input">
                <input className="visually-hidden" id="small-chip-input" type="radio" name="big-chip-input" value="false" defaultChecked />
                <span />
                <div>
                  {copy.cardWithSmallChip}
                  <br />
                  {copy.cardWithSmallChip2}
                </div>
              </label>
            </div>

            <div className="configurator__card-data-side-chooser">
              <button className="configurator__card-data-side-chooser-btn configurator__card-data-side-chooser-btn_active">
                {copy.sideFront}
                <br />
                {copy.sideFront2}
              </button>
              <button id="card-data-a-to-card-data-b-btn" className="configurator__card-data-side-chooser-btn">
                {copy.sideBack}
                <br />
                {copy.sideBack2}
              </button>
            </div>

            <Inscription idPrefix="a" locale={locale as Locale} />
          </div>

          <div className="configurator__card-data" id="card-data-side-b">
            <div className="configurator__card-data-owner-data">
              <div>
                <label htmlFor="card-num-input">{copy.cardNum}</label>
              </div>
              <div>
                <label htmlFor="card-time-input">{copy.cardTime}</label>
              </div>

              <input id="card-num-input" type="text" pattern="[0-9]{4}\s[0-9]\s[0-9]\s[0-9]" placeholder="8600 1234 5678 9123" maxLength={19} />

              <div>
                <input id="card-time-input" type="text" pattern="[0-9]{2}" placeholder="01" maxLength={2} />
                <span>/</span>
                <input id="card-time-2-input" type="text" pattern="[0-9]{2}" placeholder="01" maxLength={2} />
              </div>
            </div>

            <input className="visually-hidden" id="remove-logo" type="checkbox" name="remove-logo" />

            <Inscription idPrefix="b" locale={locale as Locale} />

            <div className="configurator__card-data-side-chooser">
              <button id="card-data-b-to-card-data-a-btn" className="configurator__card-data-side-chooser-btn">
                {copy.sideFront}
                <br />
                {copy.sideFront2}
              </button>
              <button className="configurator__card-data-side-chooser-btn configurator__card-data-side-chooser-btn_active">
                {copy.sideBack}
                <br />
                {copy.sideBack2}
              </button>
            </div>
          </div>
        </section>

        <section className="visual">
          <h3 className="visually-hidden">Визуализация карты</h3>

          <input className="visually-hidden" id="visualChoiceA" type="radio" value="A" name="visualChoice" defaultChecked />
          <input className="visually-hidden" id="visualChoiceB" type="radio" value="B" name="visualChoice" />

          <div className={`visual__card visual__card_${promo.color}`}>
            <div className="visual__card-side-a">
              <div className="visual__card-side-a-picture">
                <picture>
                  <source srcSet={`${render}.webp?ver=16`} type="image/webp" />
                  <img src={`${render}.png?ver=16`} />
                </picture>
              </div>

              <img className="visual__card-side-a-chip visual__card-side-a-chip_small" src="/images/chip-small.svg" />
            </div>

            <div className="visual__card-side-b">
              <div className="visual__card-side-b-magnetic-stripe" />
              <div className="visual__card-side-b-signature-stripe" />
              <div className="visual__card-side-b-logo visually-hidden" />
              <div className="visual__card-side-b-card-num">8600 1234 5678 9123</div>
              <div className="visual__card-side-b-card-time">01/25</div>
            </div>
          </div>

          <div className="visual__bottom">
            <div>
              <h4 className="visual__bottom-header">{copy.total}</h4>
              <p className="visual__bottom-price">{Math.round(promo.promoPrice).toLocaleString("ru-RU")}</p>
              <span>{copy.sum}</span>
            </div>

            <button className="visual__bottom-btn">
              <span className="visual__bottom-btn-inner">
                <span className="visual__bottom-btn-inner_dark">
                  <span>{copy.order}</span>
                </span>
                <span className="visual__bottom-btn-inner_white">
                  <span>{copy.order}</span>
                </span>
              </span>
            </button>
          </div>

          <section className="sub-designs" />
        </section>
      </main>

      <SiteFooter />

      <section className="buy-section">
        <div>
          <h4 className="buy-section-header">{copy.total}</h4>
          <p className="buy-section-price">{Math.round(promo.promoPrice).toLocaleString("ru-RU")}</p>
          <span>{copy.sum}</span>
        </div>

        <button className="buy-section-btn">
          <span className="buy-section-btn__inner">
            <span className="buy-section-btn__inner_dark">
              <span>{copy.order}</span>
            </span>
            <span className="buy-section-btn__inner_white">
              <span>{copy.order}</span>
            </span>
          </span>
        </button>
      </section>

      <div className="buy-pop">
        <div className="buy-pop__inner">
          <div className="buy-pop__inner-header">
            <a className="buy-pop__inner-header-logo" href={`/${locale}/${query}`}>
              <h2 className="visually-hidden">Логотип компании и ссылка на главную страницу</h2>
              <img src="/images/logo-white.svg" alt="Логотип" />
            </a>

            <button className="buy-pop__inner-header-exit-btn" />
          </div>

          <div className="preview preview_hidden">
            <h3>{copy.confirmDesign}</h3>

            <div className="preview-card" id="preview-card-a">
              <div className="preview-card-img-cont" />
              <img className="preview-card-chip" src="/images/chip.svg" />
            </div>

            <div className="preview-card" id="preview-card-b">
              <div className="preview-card-img-cont" />
              <div className="preview-card-magnetic-stripe" />
              <div className="preview-card-signature-stripe" />
              <div className="preview-card-logo visually-hidden" />
            </div>

            <button className="preview-confirm-btn">{copy.confirm}</button>
            <button className="preview-return-btn">{copy.back}</button>
          </div>

          <div className="confirm confirm_hidden">
            <h2 className="confirm-header">{copy.orderConfirm}</h2>

            <label id="confirm-name-label" htmlFor="confirm-name-input">
              {copy.name}
            </label>
            <input id="confirm-name-input" type="text" name="name" placeholder={copy.name} maxLength={60} />

            <label id="confirm-phone-label" htmlFor="confirm-phone-input">
              {copy.phone}
            </label>
            <input id="confirm-phone-input" type="text" name="phone" placeholder="(__) ___ __ __" maxLength={20} />

            <h3 className="confirm-heading">{copy.deliveryMethod}</h3>

            <div className="confirm-check-cont">
              <input className="visually-hidden" id="delivery-input" type="radio" name="way-to-get-input" value="delivery" />
              <label htmlFor="delivery-input">
                <span />
                <div>
                  {copy.deliveryRegion}
                  <br />
                  {copy.deliveryRegion2}
                </div>
              </label>
            </div>

            <div className="confirm-check-cont">
              <input className="visually-hidden" id="delivery-yandex-input" type="radio" name="way-to-get-input" value="delivery-yandex" />
              <label htmlFor="delivery-yandex-input">
                <span />
                <div>
                  {copy.deliveryYandex}
                  <br />
                  {copy.deliveryYandex2}
                </div>
              </label>
            </div>

            <div className="confirm-check-cont">
              <input className="visually-hidden" id="pickup-input" type="radio" name="way-to-get-input" value="pickup" defaultChecked />
              <label htmlFor="pickup-input">
                <span />
                <div>{copy.pickup}</div>
              </label>
            </div>

            <div className="confirm-check-cont confirm-check-cont_legal">
              <input className="visually-hidden" id="legal-privacy-consent" type="checkbox" name="legal-privacy-consent" />
              <label htmlFor="legal-privacy-consent">
                <span />
                <div>
                  {copy.acceptPrivacyPrefix}{" "}
                  <Link href="/privacy-policy" target="_blank" rel="noreferrer">
                    {copy.acceptPrivacyLink}
                  </Link>
                </div>
              </label>
            </div>

            <div className="confirm-check-cont confirm-check-cont_legal">
              <input className="visually-hidden" id="legal-terms-consent" type="checkbox" name="legal-terms-consent" />
              <label htmlFor="legal-terms-consent">
                <span />
                <div>
                  {copy.acceptTermsPrefix}{" "}
                  <Link href="/user-agreement" target="_blank" rel="noreferrer">
                    {copy.acceptTermsLink}
                  </Link>
                </div>
              </label>
            </div>

            <p className="confirm-legal-error" id="legal-consent-error" hidden>
              {copy.legalRequired}
            </p>

            <p className="confirm-pre-price">{copy.toPay}</p>
            <p className="confirm-price">{Math.round(promo.promoPrice).toLocaleString("ru-RU")}</p>

            {locale === "uz" ? <img className="confirm-pay-me-img" src="/images/payme.svg" alt="PayMe" /> : null}

            <button className="confirm-pay-me-btn" id="payme-form-create-order">
              <span>{copy.confirmOrder}</span>
            </button>
          </div>

          <div className="form-payme form-payme__hidden">
            <h2 className="form-payme__header">{copy.payment}</h2>

            <button className="form-payme__buy-btn" id="form-payme-link-click">
              <span>{copy.payVia}</span>
              <img src="/images/click.svg" alt="Click" />
            </button>

            <button className="form-payme__buy-btn" id="form-payme-link-payme">
              <span>{copy.payVia}</span>
              <img src="/images/payme.svg" alt="PayMe" />
            </button>

            <button className="form-payme__buy-btn" id="form-payme-link-cache">
              <span>{copy.cash}</span>
            </button>

            <button id="form-payme-close-btn" type="button">
              <span>{copy.cancel}</span>
            </button>

            <div className="block-cache">
              <img src="/images/block-cache-icon.svg" alt="" />
              <p>
                {locale === "ru" ? "Оплата наличными" : "naqd to'lov"}
                <br />
                {locale === "ru" ? "только по Ташкенту" : "faqat Toshkentda"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <svg xmlns="http://www.w3.org/2000/svg" id="gold-gradient-svg" width="300%" height="300%">
        <defs>
          <linearGradient id="gold-gradient" gradientUnits="userSpaceOnUse" x1="-10.36%" y1="25.06%" x2="110.36%" y2="74.94%">
            <stop stopColor="#D5AC52" />
            <stop offset=".963" stopColor="#EAD373" />
          </linearGradient>
        </defs>
      </svg>

      <div id="promo-json">{JSON.stringify(promo)}</div>
      <div className="visually-hidden" id="active-card-colors-names-json">
        {JSON.stringify([promo.color])}
      </div>
      <div className="visually-hidden" id="card-colors-to-render-colors-json">
        {JSON.stringify(colorsConfig.renderColorByCode)}
      </div>
      <div className="visually-hidden" id="default-color-name-json">
        {JSON.stringify([colorsConfig.defaultColorName])}
      </div>

      <Script src={`/design-promo/${locale}.js?ver=17`} strategy="afterInteractive" />
      <Script src="/design/editor-fixes.js?ver=2" strategy="afterInteractive" />
      <OrderLegalGuard />
    </>
  );
}
