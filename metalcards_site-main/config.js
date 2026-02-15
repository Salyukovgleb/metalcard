const cardColors = [
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

    price: 150000.00,
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

    price: 200000.00,
  },
  {
    name: "gold-mat",

    renderColor: "white",
    textRu: "Золотая матовая карта",
    textUz: "oltin mat",

    labelBack: "linear-gradient(130.61deg, #BC8A3E 0%, #FED760 100%)",
    cardBack: "linear-gradient(112.45deg, #D5AC52 -4.35%, #EAD373 96.27%)",
    textColor: "#f2f2f2",
    fillColor: "#f2f2f2",
    logoImg: "/images/cardLogos/Metal-white.svg",
    active: false,
    default: false,

    price: 250000.00,
  },
  {
    name: "gold-mirror",

    renderColor: "white",
    textRu: "Золотая зеркальная белая карта",
    textUz: "oltin oyna",

    // labelBack: "linear-gradient(130.61deg, #FED760 0%, #9E761B 52.43%, #FED760 100%)",
    labelBack: "linear-gradient(to bottom right, #FED760 0%, #9E761B 50%, #DFDFDF 50%, #DFDFDF 100%)",
    cardBack: "linear-gradient(113.06deg, #A87234 7.79%, #FED760 30.47%, #AB7F42 55%, #D1A751 78.6%, #A0763C 96.64%)",
    textColor: "#f2f2f2",
    fillColor: "#f2f2f2",
    logoImg: "/images/cardLogos/Metal-white.svg",
    active: true,
    default: false,

    price: 250000.00,
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

    price: 250000.00,
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

    price: 250000.00,
  },

  {
    name: "silver-mat",

    renderColor: "white",
    textRu: "",
    textUz: "",

    labelBack: "linear-gradient(130.61deg, #626262 0%, #F0F0F1 100%)",
    cardBack: "linear-gradient(112.45deg, #B5B5B5 -4.35%, #D5D6D7 96.27%)",
    textColor: "#f2f2f2",
    fillColor: "#f2f2f2",
    logoImg: "/images/cardLogos/Metal-white.svg",
    active: false,
    default: false,

    price: 250000.00,
  },

  {
    name: "silver-mirror",

    renderColor: "white",
    textRu: "",
    textUz: "",

    labelBack: "linear-gradient(130.61deg, #F0F0F1 0%, #8A8A8A 50%, #F0F0F1 100%)",
    cardBack: "linear-gradient(113.06deg, #B4B4B4 7.79%, #D5D6D8 30.47%, #A5A5A5 55%, #D5D6D8 78.6%, #A0A0A0 96.64%)",
    textColor: "#f2f2f2",
    fillColor: "#f2f2f2",
    logoImg: "/images/cardLogos/Metal-white.svg",
    active: false,
    default: false,

    price: 250000.00,
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

    price: 250000.00,
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

    price: 250000.00,
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

    price: 250000.00,
  },

  {
    name: "white",

    renderColor: "black",
    textRu: "",
    textUz: "",

    labelBack: "linear-gradient(130.61deg, #BEBEBE 0%, #F0F0F1 100%)",
    cardBack: "linear-gradient(113.06deg, #E3E3DC 7.79%, #FFFEF4 50.83%, #E9E8DF 96.64%)",
    textColor: "#bcbcbc",
    fillColor: "#bcbcbc",
    logoImg: "/images/cardLogos/Metal-gray.svg",
    active: false,
    default: false,

    price: 250000.00,
  },

  {
    name: "violet-mat",

    renderColor: "white",
    textRu: "",
    textUz: "",

    labelBack: "linear-gradient(130.61deg, #A93E9C 0%, #EC7CED 100%)",
    cardBack: "linear-gradient(112.45deg, #A83D9B -4.35%, #EA7BEB 96.27%)",
    textColor: "#f2f2f2",
    fillColor: "#f2f2f2",
    logoImg: "/images/cardLogos/Metal-white.svg",
    active: false,
    default: false,

    price: 250000.00,
  },

  {
    name: "chameleon",

    renderColor: "white",
    textRu: "",
    textUz: "",

    labelBack: "linear-gradient(130.61deg, #AFDC00 0%, #1DB17F 52.08%, #4F34C5 100%)",
    cardBack: "linear-gradient(130.61deg, #AFDC00 0%, #1DB17F 52.08%, #4F34C5 100%)",
    textColor: "#f2f2f2",
    fillColor: "#f2f2f2",
    logoImg: "/images/cardLogos/Metal-white.svg",
    active: false,
    default: false,

    price: 250000.00,
  },

  {
    name: "rose-mat",

    renderColor: "white",
    textRu: "",
    textUz: "",

    labelBack: "linear-gradient(130.61deg, #8E5654 0%, #E8BCAD 100%)",
    cardBack: "linear-gradient(112.45deg, #B07978 -4.35%, #E7BCAC 96.27%)",
    textColor: "#f2f2f2",
    fillColor: "#f2f2f2",
    logoImg: "/images/cardLogos/Metal-white.svg",
    active: false,
    default: false,

    price: 250000.00,
  },
  {
    name: "rose-mirror",

    renderColor: "white",
    textRu: "",
    textUz: "",

    labelBack: "linear-gradient(130.61deg, #A87071 0%, #E8BDAD 48.96%, #A87071 100%)",
    cardBack: "linear-gradient(113.06deg, #AF7878 7.79%, #E8BDAD 30.47%, #AD7676 55%, #E5B9AA 78.6%, #AD7676 96.64%)",
    textColor: "#f2f2f2",
    fillColor: "#f2f2f2",
    logoImg: "/images/cardLogos/Metal-white.svg",
    active: false,
    default: false,

    price: 250000.00,
  },
]


module.exports = {
  database : 'metalcar_base',
  user     : 'metalcar_user',
  password : 'len&3jd9-Acds(whf4L',

  cardColors: cardColors,
}