import type { Locale } from "@/lib/site";

export type BenefitItem = {
  key: "design" | "safe" | "fast" | "price" | "connection" | "payme" | "gift";
  title: string;
  highlighted?: string;
  paragraphs: string[];
  image: string;
  imageWebp: string;
  image2x: string;
  imageWebp2x: string;
  altRu: string;
  altUz: string;
};

const imageByKey: Record<BenefitItem["key"], { file: string; file2x: string }> = {
  design: { file: "star", file2x: "star" },
  safe: { file: "padlock", file2x: "padlock" },
  fast: { file: "compass", file2x: "compass" },
  price: { file: "coin", file2x: "coin" },
  connection: { file: "chat", file2x: "chat" },
  payme: { file: "basket", file2x: "basket" },
  gift: { file: "gift", file2x: "gift" },
};

const ruItems: Omit<BenefitItem, "image" | "imageWebp" | "image2x" | "imageWebp2x">[] = [
  {
    key: "design",
    title: "Премиальный",
    highlighted: "дизайн",
    paragraphs: [
      "Надоело мириться с некрасивым и навязанным дизайном? Создай свой!",
      "У нас ты можешь сам создать свой собственный дизайн карты всего за 5 минут.",
      "Не хочешь тратить время? Выбери один из премиальных скинов в галерее и закажи его в 2 клика.",
    ],
    altRu: "Звезда",
    altUz: "Yulduz",
  },
  {
    key: "safe",
    title: "С нами",
    highlighted: "безопасно",
    paragraphs: [
      "Ты можешь не переживать ни о своем балансе на карте, ни о сохранности персональных данных.",
      "Мы обеспечиваем сохранность твоей личной информации.",
    ],
    altRu: "Замок",
    altUz: "Qulf",
  },
  {
    key: "fast",
    title: "Работаем",
    highlighted: "быстро",
    paragraphs: [
      "Персональная гравировка карты занимает 1-2 рабочих дня.",
      "Оформи заказ, и убедись в этом сам.",
    ],
    altRu: "Компас",
    altUz: "Kompas",
  },
  {
    key: "price",
    title: "У нас честные",
    highlighted: "цены",
    paragraphs: [
      "Мы предлагаем честную стоимость за честный труд.",
      "Гравировка карты с двух сторон - 250 000 сум.",
    ],
    altRu: "Монета",
    altUz: "Tanga",
  },
  {
    key: "connection",
    title: "Мы всегда",
    highlighted: "на связи",
    paragraphs: [
      "Ты всегда можешь рассчитывать на нашу помощь.",
      "Позвони нам в офис, напиши в Instagram или Telegram.",
    ],
    altRu: "Чат",
    altUz: "Suhbat",
  },
  {
    key: "payme",
    title: "Оплата через",
    highlighted: "Payme",
    paragraphs: [
      "Тебе нужно будет приехать к нам в офис всего 2 раза: привезти карту и забрать ее обратно.",
      "Мы принимаем оплату через Payme.",
    ],
    altRu: "Корзина",
    altUz: "Savat",
  },
  {
    key: "gift",
    title: "Сделай себе",
    highlighted: "подарок",
    paragraphs: ["У нас ты можешь забрендировать карту любой платежной системы: Uzcard, Humo, VISA."],
    altRu: "Подарок",
    altUz: "Sovg'a",
  },
];

const uzItems: Omit<BenefitItem, "image" | "imageWebp" | "image2x" | "imageWebp2x">[] = [
  {
    key: "design",
    title: "Premial",
    highlighted: "dizayn",
    paragraphs: [
      "Uncha chiroyli bo‘lmagan dizaynga rozi bo‘lishdan charchadingizmi? O‘z dizayningizni yarating.",
      "Bizda siz kartangiz dizaynini atigi 5 daqiqada yaratishingiz mumkin.",
      "Galereyadan premial skinlardan birini tanlang va 2 ta klik orqali buyurtma qiling.",
    ],
    altRu: "Звезда",
    altUz: "Yulduz",
  },
  {
    key: "safe",
    title: "Biz bilan",
    highlighted: "xavfsiz",
    paragraphs: [
      "Kartangizdagi balans va shaxsiy ma’lumotlaringiz xavfsiz saqlanadi.",
      "Biz ma’lumotlarni uchinchi shaxslarga bermaymiz.",
    ],
    altRu: "Замок",
    altUz: "Qulf",
  },
  {
    key: "fast",
    title: "Tez",
    highlighted: "ishlaymiz",
    paragraphs: [
      "Kartaga shaxsiy dizayn 1-2 ish kunida tushiriladi.",
      "Buyurtma qiling va o‘zingiz ishonch hosil qiling.",
    ],
    altRu: "Компас",
    altUz: "Kompas",
  },
  {
    key: "price",
    title: "Bizning narxlarimiz",
    highlighted: "adolatli",
    paragraphs: [
      "Biz halol mehnat evaziga adolatli qiymat taklif qilamiz.",
      "Kartaga ikki tarafdan o‘yma tasvir tushirish – 250 000 so‘m.",
    ],
    altRu: "Монета",
    altUz: "Tanga",
  },
  {
    key: "connection",
    title: "Biz doimo",
    highlighted: "aloqadamiz",
    paragraphs: ["Savollaringiz bo‘lsa, bizning ofisga qo‘ng‘iroq qiling yoki ijtimoiy tarmoqlarda yozing."],
    altRu: "Чат",
    altUz: "Suhbat",
  },
  {
    key: "payme",
    title: "Payme orqali",
    highlighted: "to‘lov",
    paragraphs: [
      "Ofisimizga atigi 2 marta kelib ketishingiz kerak bo‘ladi.",
      "Qolgan barcha ishlar onlayn amalga oshiriladi.",
    ],
    altRu: "Корзина",
    altUz: "Savat",
  },
  {
    key: "gift",
    title: "O‘zingizga",
    highlighted: "sovg‘a qiling",
    paragraphs: ["Bizda istalgan to‘lov tizimiga doir kartani brendlashtirishingiz mumkin: Uzcard, Humo, VISA."],
    altRu: "Подарок",
    altUz: "Sovg'a",
  },
];

export function getBenefits(locale: Locale): BenefitItem[] {
  const source = locale === "ru" ? ruItems : uzItems;

  return source.map((item) => {
    const image = imageByKey[item.key];

    return {
      ...item,
      image: `/images/benefits/${image.file}-1x.png`,
      imageWebp: `/images/benefits/${image.file}-1x.webp`,
      image2x: `/images/benefits/${image.file2x}-2x.png`,
      imageWebp2x: `/images/benefits/${image.file2x}-2x.webp`,
    };
  });
}
