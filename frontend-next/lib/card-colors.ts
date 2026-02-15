export type CardColor = {
  name: string;
  renderColor: string;
  textRu: string;
  textUz: string;
  labelBack: string;
  cardBack: string;
  textColor: string;
  fillColor: string;
  logoImg: string;
  active: boolean;
  default: boolean;
  price: number;
};

export const cardColors: CardColor[] = [
  {
    name: "black-silver-mat",
    renderColor: "white",
    textRu: "Черная карта серебряная гравировка",
    textUz: "Qora kumush mat",
    labelBack: "linear-gradient(to bottom right, #040404 0%, #040404 50%, #DFDFDF 50%, #DFDFDF 100%)",
    cardBack: "linear-gradient(113.06deg, #040404 7.79%, #2D2E2E 50.83%, #040404 96.64%)",
    textColor: "#f2f2f2",
    fillColor: "#f2f2f2",
    logoImg: "/images/cardLogos/Metal-white.svg",
    active: true,
    default: false,
    price: 150000,
  },
  {
    name: "black-gold-mat",
    renderColor: "gold",
    textRu: "Черная карта золотая гравировка",
    textUz: "Qora oltin mat",
    labelBack: "linear-gradient(to bottom right, #040404 0%, #040404 50%, #F3CB5B 50%, #F3CB5B 100%)",
    cardBack: "linear-gradient(113.06deg, #040404 7.79%, #2D2E2E 50.83%, #040404 96.64%)",
    textColor: "#d5b869",
    fillColor: "url(#gold-gradient)",
    logoImg: "/images/cardLogos/Metal-gold.svg",
    active: true,
    default: true,
    price: 200000,
  },
  {
    name: "gold-mirror",
    renderColor: "white",
    textRu: "Золотая зеркальная белая карта",
    textUz: "oltin oyna",
    labelBack: "linear-gradient(to bottom right, #FED760 0%, #9E761B 50%, #DFDFDF 50%, #DFDFDF 100%)",
    cardBack: "linear-gradient(113.06deg, #A87234 7.79%, #FED760 30.47%, #AB7F42 55%, #D1A751 78.6%, #A0763C 96.64%)",
    textColor: "#f2f2f2",
    fillColor: "#f2f2f2",
    logoImg: "/images/cardLogos/Metal-white.svg",
    active: true,
    default: false,
    price: 250000,
  },
  {
    name: "gold-mirror-black",
    renderColor: "black",
    textRu: "Золотая зеркальная черная карта",
    textUz: "Oltin karta qora o'yma",
    labelBack: "linear-gradient(to bottom right, #FED760 0%, #9E761B 50%, #040404 50%, #040404 100%)",
    cardBack: "linear-gradient(113.06deg, #A87234 7.79%, #FED760 30.47%, #AB7F42 55%, #D1A751 78.6%, #A0763C 96.64%)",
    textColor: "#202020",
    fillColor: "#202020",
    logoImg: "/images/cardLogos/Metal-black.svg",
    active: true,
    default: false,
    price: 250000,
  },
  {
    name: "black-gold-rib",
    renderColor: "gold",
    textRu: "Черно-золотая ребристая",
    textUz: "Qora va oltin qovurg'ali",
    labelBack: "linear-gradient(113.06deg, #646464 7.79%, #393939 50.37%, #6F6F6F 96.64%)",
    cardBack: "url(/images/black-rib-back.jpg) 0 0 / cover no-repeat",
    textColor: "#d5b869",
    fillColor: "url(#gold-gradient)",
    logoImg: "/images/cardLogos/Metal-gold.svg",
    active: true,
    default: false,
    price: 250000,
  },
  {
    name: "red",
    renderColor: "white",
    textRu: "Красная карта",
    textUz: "qizil kartochka",
    labelBack: "linear-gradient(130.61deg, #B70404 0%, #E25B5B 50%, #B70404 100%)",
    cardBack: "linear-gradient(130.61deg, #B70404 0%, #E25B5B 50%, #B70404 100%)",
    textColor: "#f2f2f2",
    fillColor: "#f2f2f2",
    logoImg: "/images/cardLogos/Metal-white.svg",
    active: true,
    default: false,
    price: 250000,
  },
  {
    name: "blue",
    renderColor: "white",
    textRu: "Синия карта",
    textUz: "ko'k karta",
    labelBack: "linear-gradient(130.61deg, #1C55A2 0%, #547EB8 100%)",
    cardBack: "linear-gradient(130.61deg, #0441B7 0%, #5BB2E2 50%, #044CB7 100%)",
    textColor: "#f2f2f2",
    fillColor: "#f2f2f2",
    logoImg: "/images/cardLogos/Metal-white.svg",
    active: true,
    default: false,
    price: 250000,
  },
  {
    name: "green",
    renderColor: "white",
    textRu: "Зелёная карта",
    textUz: "yashil xarita",
    labelBack: "linear-gradient(130.61deg, #137B0A 0%, #50CC3C 50%, #137B0A 100%)",
    cardBack: "linear-gradient(130.61deg, #137B0A 0%, #50CC3C 50%, #137B0A 100%)",
    textColor: "#f2f2f2",
    fillColor: "#f2f2f2",
    logoImg: "/images/cardLogos/Metal-white.svg",
    active: true,
    default: false,
    price: 250000,
  },
];

export const activeCardColors = cardColors.filter((color) => color.active);

export const cardColorsToRenderColors = Object.fromEntries(
  cardColors.map((color) => [color.name, color.renderColor]),
);

export const cardColorsToPrice = Object.fromEntries(cardColors.map((color) => [color.name, color.price]));

export const defaultColorName = activeCardColors.find((color) => color.default)?.name ?? activeCardColors[0]?.name;

export function getCardColorCSS(color: CardColor): string {
  return `
    .visual #${color.name}-card-label .visual__color-label-color,
    #${color.name}-card:checked ~ .visual .visual__color-container-state-btn-color {
      background: ${color.labelBack};
    }

    #${color.name}-card:checked ~ .visual #${color.name}-card-label::after {
      opacity: 1;
    }

    #${color.name}-card:checked ~ .visual #${color.name}-card-state {
      display: inline-block;
    }

    .visual .visual__card_${color.name} .visual__card-side-a,
    .visual .visual__card_${color.name} .visual__card-side-b,
    .buy-pop__inner .preview .preview-card_${color.name} {
      color: ${color.textColor};
      background: ${color.cardBack};
    }

    .visual .visual__card_${color.name} .visual__card-side-a .fillable,
    .visual .visual__card_${color.name} .visual__card-side-a .svgdevtextmc,
    .visual .visual__card_${color.name} .visual__card-side-b .fillable,
    .visual .visual__card_${color.name} .visual__card-side-b .svgdevtextmc,
    .buy-pop__inner .preview .preview-card_${color.name} .fillable,
    .buy-pop__inner .preview .preview-card_${color.name} .svgdevtextmc {
      fill: ${color.fillColor};
    }

    .visual .visual__card_${color.name} .visual__card-side-a .strokable,
    .visual .visual__card_${color.name} .visual__card-side-b .strokable,
    .buy-pop__inner .preview .preview-card_${color.name} .strokable {
      stroke: ${color.fillColor};
    }

    .visual .visual__card_${color.name} .visual__card-side-b-logo,
    .buy-pop__inner .preview .preview-card_${color.name} .preview-card-logo {
      background-image: url(${color.logoImg});
    }
  `;
}

export function getActiveCardColorsCSS(): string {
  const colorsCss = activeCardColors.map((color) => getCardColorCSS(color)).join("\n");
  const width = (activeCardColors.length * 50) / 1920 * 100;
  const mobileHeight = (activeCardColors.length * 26.25) / 450 * 100;

  return `${colorsCss}\n.visual__color-container-inner {width: ${width}vw}\n@media (max-width: 768px) { .visual__color-container-inner {width: ${(250 / 450) * 100}vw;} #color-state:checked ~ .visual__color-container-inner {height: ${mobileHeight}vw} }`;
}
