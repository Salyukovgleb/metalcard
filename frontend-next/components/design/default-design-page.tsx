import Link from "next/link";
import Script from "next/script";
import { OrderLegalGuard } from "@/components/order-legal-guard";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { type Locale, mobileHeadingByPage } from "@/lib/site";
import { toQueryString, type SearchParams } from "@/lib/query";
import { getDesignCategories } from "@/lib/design-data";
import { getRuntimeCardColorsConfig } from "@/lib/runtime-card-colors";

type Props = {
  locale: Locale;
  searchParams: SearchParams;
};

const fontsFamily = [
  "Gilroy",
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

const t = {
  ru: {
    h1: "Страница, на которой вы можете создать свой дизайн карты",
    chooseCategory: "Выбери категорию",
    allDesigns: "Все дизайны",
    chooseDesign: "Выбери свой дизайн",
    next: "Далее",
    catalog: "Каталог",
    cardWithBigChip: "Карта с",
    cardWithBigChip2: "большим чипом",
    cardWithSmallChip: "Карта с",
    cardWithSmallChip2: "маленьким чипом",
    inscription: "надпись",
    font: "Шрифт",
    addInscription: "Добавить еще одну надпись",
    deleteInscription: "Удалить надпись",
    sideFront: "Лицевая",
    sideFront2: "сторона",
    sideBack: "Задняя",
    sideBack2: "сторона",
    cardNum: "номер карты",
    cardTime: "срок действия",
    removeLogo: "убрать логотип MetalCards",
    visual: "Визуализация карты",
    color: "цвет",
    chooseColor: "Выбери цвет",
    total: "общая сумма",
    sum: "сум",
    order: "Закажи",
    confirmDesign: "Подтверди дизайн",
    confirm: "подтвердить",
    backToEditor: "вернуться к редактору",
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
    orderPayment: "Оплата заказа",
    payVia: "оплатить через",
    payCash: "оплатить наличными",
    cancel: "отменить заказ",
    cashOnly1: "Оплата наличными",
    cashOnly2: "только по Ташкенту",
    acceptPrivacyPrefix: "Я принимаю",
    acceptPrivacyLink: "политику конфиденциальности",
    acceptTermsPrefix: "Я принимаю",
    acceptTermsLink: "пользовательское соглашение",
    legalRequired: "Чтобы продолжить, примите политику конфиденциальности и пользовательское соглашение.",
  },
  uz: {
    h1: "Karta dizaynini yaratishingiz mumkin bo'lgan sahifa",
    chooseCategory: "Kategoriya tanlang",
    allDesigns: "Barcha dizaynlar",
    chooseDesign: "Dizayningizni tanlang",
    next: "Keyinchalik",
    catalog: "Katalog",
    cardWithBigChip: "katta",
    cardWithBigChip2: "chip karta",
    cardWithSmallChip: "kichik",
    cardWithSmallChip2: "chip karta",
    inscription: "yozuv",
    font: "Shrift",
    addInscription: "Boshqa yorliq qo'shing",
    deleteInscription: "Yozuvni o'chirish",
    sideFront: "Old",
    sideFront2: "tomoni",
    sideBack: "Orqa",
    sideBack2: "tomon",
    cardNum: "Karta raqami",
    cardTime: "amal qilish muddati",
    removeLogo: "MetalCards logotipini olib tashlash",
    visual: "Xaritani vizualizatsiya qilish",
    color: "rang",
    chooseColor: "Rangni tanlang",
    total: "umumiy qiymat",
    sum: "so'm",
    order: "Buyurtma",
    confirmDesign: "Dizaynni tasdiqlang",
    confirm: "tasdiqlang",
    backToEditor: "muharrirga qaytish",
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
    orderPayment: "Buyurtma to'lash",
    payVia: "orqali to'lash",
    payCash: "naqd pulda to'lash",
    cancel: "buyurtmani bekor qilish",
    cashOnly1: "naqd to'lov",
    cashOnly2: "faqat Toshkentda",
    acceptPrivacyPrefix: "Men",
    acceptPrivacyLink: "maxfiylik siyosatini",
    acceptTermsPrefix: "Men",
    acceptTermsLink: "foydalanuvchi kelishuvini",
    legalRequired: "Davom etish uchun maxfiylik siyosati va foydalanuvchi kelishuvini qabul qiling.",
  },
} as const;

function SideInscription({
  idPrefix,
  locale,
}: {
  idPrefix: "a" | "b";
  locale: Locale;
}) {
  const text = t[locale];

  return (
    <div className="configurator__card-data-inscription" id={`side-${idPrefix}-inscription`}>
      <div className="configurator__card-data-inscription-desc">
        <label htmlFor={`side-${idPrefix}-inscription-text`}>{text.inscription}</label>
        <p>0/20</p>
      </div>
      <input
        className="configurator__card-data-inscription-text"
        id={`side-${idPrefix}-inscription-text`}
        type="text"
        name={`side-${idPrefix}-inscription-text`}
        placeholder={text.inscription}
      />

      <div
        className="configurator__card-data-inscription-cont configurator__card-data-inscription-font-cont"
        id={`side-${idPrefix}-inscription-font-cont`}
      >
        <button className="configurator__card-data-inscription-cont-btn" id={`side-${idPrefix}-inscription-font-cont-btn`}>
          <span style={{ opacity: 0.5 }}>{text.font}</span>
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
          {text.addInscription}
        </button>
        <button className="configurator__card-data-inscription-delete-btn" id={`side-${idPrefix}-inscription-delete-btn`}>
          {text.deleteInscription}
        </button>
      </div>
    </div>
  );
}

export default async function DefaultDesignPage({ locale, searchParams }: Props) {
  const query = toQueryString(searchParams);
  const currentPath = `/design/${locale}/`;
  const categories = getDesignCategories();
  const text = t[locale as Locale];
  const colorsConfig = await getRuntimeCardColorsConfig();
  const activeColors = colorsConfig.activeColors;

  const activeCardColorsNamesJSON = JSON.stringify(activeColors.map((color) => color.name));
  const cardColorsToRenderColorsJSON = JSON.stringify(colorsConfig.renderColorByCode);
  const cardColorsToPriceJSON = JSON.stringify(colorsConfig.priceByCode);
  const defaultColorNameJSON = JSON.stringify([colorsConfig.defaultColorName]);
  const cardColorsCSS = colorsConfig.css;
  const initialColorPrice = Math.round(colorsConfig.priceByCode[colorsConfig.defaultColorName] ?? 0);
  const initialPriceText = initialColorPrice.toLocaleString("ru-RU");

  return (
    <>
      <link rel="stylesheet" href={`/design/${locale}.css?ver=17`} />
      <style dangerouslySetInnerHTML={{ __html: cardColorsCSS }} />

      <h1 className="visually-hidden">{text.h1}</h1>

      <SiteHeader
        activePage="design"
        locale={locale as Locale}
        mobileHeading={mobileHeadingByPage[locale as Locale].design}
        query={query}
        currentPath={currentPath}
      />

      <main>
        <h2 className="visually-hidden">Конструктор</h2>

        {activeColors.map((color) => (
          <input
            key={color.name}
            className="visually-hidden"
            type="radio"
            id={`${color.name}-card`}
            value={color.name}
            name="card-color"
            defaultChecked={color.default}
          />
        ))}

        <section className="configurator">
          <h3 className="visually-hidden">Конфигуратор</h3>

          <div className="configurator__design">
            <div className="configurator__design-category-chooser">
              <div className="configurator__design-category-chooser-desc">{text.chooseCategory}</div>

              <input className="visually-hidden" id="category-chooser" type="checkbox" name="category-chooser" />
              <div className="configurator__design-category-chooser-cont">
                <div className="configurator__design-category-chooser-inner-cont">
                  <div className="configurator__design-category-chooser-inner-cont-ps">
                    <button className="configurator__design-category-chooser-item" data-category="">
                      {text.allDesigns}
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        className="configurator__design-category-chooser-item"
                        data-category={`${category.id}`}
                      >
                        {locale === "ru" ? category.design_name : category.design_name_uz}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="configurator__design-category-chooser-label" htmlFor="category-chooser">
                  <span className="configurator__design-category-chooser-label-text">{text.allDesigns}</span>
                  <span className="configurator__design-category-chooser-label-icon" />
                </label>
              </div>
            </div>

            <div className="configurator__design-desc">{text.chooseDesign}</div>
            <div className="configurator__design-gallery" />
            <div className="configurator__design-control">
              <div className="configurator__design-control-page" />
            </div>

            <button id="design-to-card-data-btn">{text.next}</button>
          </div>

          <div className="configurator__card-data" id="card-data-side-a">
            <div className="configurator__card-data-desc">
              <button id="card-data-a-to-design-btn">
                <img src="/images/arrow-black.svg" alt="Стрелка" />
                <span>{text.catalog}</span>
              </button>
            </div>

            <div className="configurator__card-data-radio-cont">
              <input className="visually-hidden" id="big-chip-input" type="radio" name="big-chip-input" value="true" />
              <input className="visually-hidden" id="small-chip-input" type="radio" name="big-chip-input" value="false" defaultChecked />
              <label htmlFor="small-chip-input">
                <span />
                <div>
                  {text.cardWithSmallChip}
                  <br />
                  {text.cardWithSmallChip2}
                </div>
              </label>
            </div>

            <SideInscription idPrefix="a" locale={locale as Locale} />

            <div className="configurator__card-data-side-chooser">
              <button className="configurator__card-data-side-chooser-btn configurator__card-data-side-chooser-btn_active">
                {text.sideFront}
                <br />
                {text.sideFront2}
              </button>
              <button id="card-data-a-to-card-data-b-btn" className="configurator__card-data-side-chooser-btn">
                {text.sideBack}
                <br />
                {text.sideBack2}
              </button>
            </div>
          </div>

          <div className="configurator__card-data" id="card-data-side-b">
            <div className="configurator__card-data-desc">
              <button id="card-data-b-to-design-btn">
                <img src="/images/arrow-black.svg" alt="Стрелка" />
                <span>{text.catalog}</span>
              </button>
            </div>

            <div className="configurator__card-data-owner-data">
              <div>
                <label htmlFor="card-num-input">{text.cardNum}</label>
              </div>

              <div>
                <label htmlFor="card-time-input">{text.cardTime}</label>
              </div>

              <input id="card-num-input" type="text" pattern="[0-9]{4}\s[0-9]\s[0-9]\s[0-9]" placeholder="8600 1234 5678 9123" maxLength={19} />

              <div>
                <input id="card-time-input" type="text" pattern="[0-9]{2}" placeholder="01" maxLength={2} />
                <span>/</span>
                <input id="card-time-2-input" type="text" pattern="[0-9]{2}" placeholder="01" maxLength={2} />
              </div>
            </div>

            <input className="visually-hidden" id="remove-logo" type="checkbox" name="remove-logo" />

            <SideInscription idPrefix="b" locale={locale as Locale} />

            <div className="configurator__card-data-side-chooser">
              <button id="card-data-b-to-card-data-a-btn" className="configurator__card-data-side-chooser-btn">
                {text.sideFront}
                <br />
                {text.sideFront2}
              </button>
              <button className="configurator__card-data-side-chooser-btn configurator__card-data-side-chooser-btn_active">
                {text.sideBack}
                <br />
                {text.sideBack2}
              </button>
            </div>
          </div>
        </section>

        <section className="visual">
          <h3 className="visually-hidden">{text.visual}</h3>

          <input className="visually-hidden" id="visualChoiceA" type="radio" value="A" name="visualChoice" defaultChecked />
          <input className="visually-hidden" id="visualChoiceB" type="radio" value="B" name="visualChoice" />

          <div className="visual__top">
            <div className="visual__color">
              <div className="visual__color-name">{text.color}</div>

              <div className="visual__color-container">
                <input className="visually-hidden" id="color-state" type="checkbox" />
                <div className="visual__color-container-name">{text.chooseColor}</div>

                <label className="visual__color-container-state-btn" htmlFor="color-state">
                  <span className="visual__color-container-state-btn-color" />

                  {activeColors.map((color) => (
                    <span key={`${color.name}-state`} className="visual__color-container-state-btn-name" id={`${color.name}-card-state`}>
                      {locale === "ru" ? color.textRu : color.textUz}
                    </span>
                  ))}
                </label>

                <div className="visual__color-container-inner">
                  {activeColors.map((color) => (
                    <label key={`${color.name}-label`} className="visual__color-label" id={`${color.name}-card-label`} htmlFor={`${color.name}-card`}>
                      <span className="visual__color-label-color" />
                      <span className="visual__color-label-name">{locale === "ru" ? color.textRu : color.textUz}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="visual__card visual__card_black-gold">
            <div className="visual__card-side-a">
              <div className="visual__card-side-a-picture" />
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
              <h4 className="visual__bottom-header">{text.total}</h4>
              <p className="visual__bottom-price">{initialPriceText}</p>
              <span>{text.sum}</span>
            </div>

            <button className="visual__bottom-btn">
              <span className="visual__bottom-btn-inner">
                <span className="visual__bottom-btn-inner_dark">
                  <span>{text.order}</span>
                </span>
                <span className="visual__bottom-btn-inner_white">
                  <span>{text.order}</span>
                </span>
              </span>
            </button>
          </div>
        </section>

        <section className="sub-designs" />
      </main>

      <SiteFooter />

      <section className="buy-section">
        <div>
          <h4 className="buy-section-header">{text.total}</h4>
          <p className="buy-section-price">{initialPriceText}</p>
          <span>{text.sum}</span>
        </div>

        <button className="buy-section-btn">
          <span className="buy-section-btn__inner">
            <span className="buy-section-btn__inner_dark">
              <span>{text.order}</span>
            </span>
            <span className="buy-section-btn__inner_white">
              <span>{text.order}</span>
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
            <h3>{text.confirmDesign}</h3>

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

            <button className="preview-confirm-btn">{text.confirm}</button>
            <button className="preview-return-btn">{text.backToEditor}</button>
          </div>

          <div className="confirm confirm_hidden">
            <h2 className="confirm-header">{text.orderConfirm}</h2>

            <label id="confirm-name-label" htmlFor="confirm-name-input">
              {text.name}
            </label>
            <input id="confirm-name-input" type="text" name="name" placeholder={text.name} maxLength={60} />

            <label id="confirm-phone-label" htmlFor="confirm-phone-input">
              {text.phone}
            </label>
            <input id="confirm-phone-input" type="text" name="phone" placeholder="(__) ___ __ __" maxLength={20} />

            <h3 className="confirm-heading">{text.deliveryMethod}</h3>

            <div className="confirm-check-cont">
              <input className="visually-hidden" id="delivery-input" type="radio" name="way-to-get-input" value="delivery" />
              <label htmlFor="delivery-input">
                <span />
                <div>
                  {text.deliveryRegion}
                  <br />
                  {text.deliveryRegion2}
                </div>
              </label>
            </div>

            <div className="confirm-check-cont">
              <input className="visually-hidden" id="delivery-yandex-input" type="radio" name="way-to-get-input" value="delivery-yandex" />
              <label htmlFor="delivery-yandex-input">
                <span />
                <div>
                  {text.deliveryYandex}
                  <br />
                  {text.deliveryYandex2}
                </div>
              </label>
            </div>

            <div className="confirm-check-cont">
              <input className="visually-hidden" id="pickup-input" type="radio" name="way-to-get-input" value="pickup" defaultChecked />
              <label htmlFor="pickup-input">
                <span />
                <div>{text.pickup}</div>
              </label>
            </div>

            <div className="confirm-check-cont confirm-check-cont_legal">
              <input className="visually-hidden" id="legal-privacy-consent" type="checkbox" name="legal-privacy-consent" />
              <label htmlFor="legal-privacy-consent">
                <span />
                <div>
                  {text.acceptPrivacyPrefix}{" "}
                  <Link href="/privacy-policy" target="_blank" rel="noreferrer">
                    {text.acceptPrivacyLink}
                  </Link>
                </div>
              </label>
            </div>

            <div className="confirm-check-cont confirm-check-cont_legal">
              <input className="visually-hidden" id="legal-terms-consent" type="checkbox" name="legal-terms-consent" />
              <label htmlFor="legal-terms-consent">
                <span />
                <div>
                  {text.acceptTermsPrefix}{" "}
                  <Link href="/user-agreement" target="_blank" rel="noreferrer">
                    {text.acceptTermsLink}
                  </Link>
                </div>
              </label>
            </div>

            <p className="confirm-legal-error" id="legal-consent-error" hidden>
              {text.legalRequired}
            </p>

            <p className="confirm-pre-price">{text.toPay}</p>
            <p className="confirm-price">{initialPriceText}</p>

            <button className="confirm-pay-me-btn" id="payme-form-create-order">
              <span>{text.confirmOrder}</span>
            </button>
          </div>

          <div className="form-payme form-payme__hidden">
            <h2 className="form-payme__header">{text.orderPayment}</h2>

            <button className="form-payme__buy-btn" id="form-payme-link-click">
              <span>{text.payVia}</span>
              <img src="/images/click.svg" alt="Click logo" />
            </button>

            <button className="form-payme__buy-btn" id="form-payme-link-payme">
              <span>{text.payVia}</span>
              <img src="/images/payme.svg" alt="PayMe logo" />
            </button>

            <button className="form-payme__buy-btn" id="form-payme-link-cache">
              <span>{text.payCash}</span>
            </button>

            <button id="form-payme-close-btn" type="button">
              <span>{text.cancel}</span>
            </button>

            <div className="block-cache">
              <img src="/images/block-cache-icon.svg" alt="" />
              <p>
                {text.cashOnly1}
                <br />
                {text.cashOnly2}
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

      <div className="visually-hidden" id="active-card-colors-names-json">
        {activeCardColorsNamesJSON}
      </div>
      <div className="visually-hidden" id="card-colors-to-render-colors-json">
        {cardColorsToRenderColorsJSON}
      </div>
      <div className="visually-hidden" id="card-colors-to-price-json">
        {cardColorsToPriceJSON}
      </div>
      <div className="visually-hidden" id="default-color-name-json">
        {defaultColorNameJSON}
      </div>

      <Script src={`/design/${locale}.js?ver=18`} strategy="afterInteractive" />
      <Script src="/design/editor-fixes.js?ver=2" strategy="afterInteractive" />
      <OrderLegalGuard />
    </>
  );
}
