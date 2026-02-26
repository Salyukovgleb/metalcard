import { notFound } from "next/navigation";
import Link from "next/link";
import { activeCardColors } from "@/lib/card-colors";
import { getDrawApp } from "@/lib/draw-app";
import { findOrderByIdAndKey } from "@/lib/order-store";

type Props = {
  params: Promise<{ id: string; key: string }>;
};

const deliveryText = {
  delivery: "Доставка по Вилоятам Узбекистана",
  "delivery-yandex": "Доставка через Яндекс Такси",
  pickup: "Самовывоз",
} as const;

export default async function ShowOrderPage({ params }: Props) {
  const { id, key } = await params;
  const orderId = Number.parseInt(id, 10);

  const order = await findOrderByIdAndKey(orderId, key);
  if (!order) {
    notFound();
  }

  const color = activeCardColors.find((cardColor) => cardColor.name === order.color) ?? activeCardColors[0];

  const drawApp = await getDrawApp();
  const sideA = drawApp.drawTextOnSideA(order.orderData.cardAData);
  const sideB = drawApp.drawTextOnSideB(order.orderData.cardBData, order.orderData.cardNum, order.orderData.cardTime);

  const render =
    order.design && order.folderName
      ? `/renders/${order.folderName}/${color.renderColor}/${order.design}`
      : "";

  const colorCSS = `
    .preview-card_${color.name} {
      background: ${color.cardBack};
    }

    .preview-card_${color.name} .fillable,
    .preview-card_${color.name} .svgdevtextmc {
      fill: ${color.fillColor};
    }

    .preview-card_${color.name} .strokable {
      stroke: ${color.fillColor};
    }

  `;

  const stateText = order.state === 2 ? "Оплачен" : order.state === 6 ? "Оплата наличными" : "Не оплачен";

  return (
    <>
      <link rel="stylesheet" href="/orders/showDataNew.css?ver=16" />
      <style dangerouslySetInnerHTML={{ __html: colorCSS }} />

      <h1>
        Заказ {order.id} ({stateText})
      </h1>

      <div>
        <h2>Данные</h2>
        <p>Имя: {order.name}</p>
        <p>Номер телефона: {order.phone}</p>
        <p>Доставка: {deliveryText[order.delivery]}</p>
        {order.state === 2 ? <p>Заплачено: {order.amount} сум</p> : <p>К оплате: {order.amount} сум</p>}
        {order.state !== 2 ? <p>Ваша карта будет готова, после того как вы оплатите</p> : null}
        {order.promo ? <p>Промо-акция: {order.promo}</p> : null}
      </div>

      <div>
        <h2>Дизайн</h2>
        <p>Чип: Маленький</p>
        <p>Цвет карты: {color.textRu}</p>
        <p>Срок изготовления: 1-2 дня</p>
        <p>С вами свяжутся в ближайшее время</p>
      </div>

      <div className="preview-card-cont">
        <div id="preview-card-a" className={`preview-card preview-card_${order.color}`}>
          <div className="preview-card-img-cont" dangerouslySetInnerHTML={{ __html: sideA }} />
          {render ? (
            <picture>
              <source srcSet={`${render}.webp`} type="image/webp" />
              <img src={`${render}.png`} />
            </picture>
          ) : null}
          <img src="/images/chip.svg" className="preview-card-chip preview-card-chip_small" />
        </div>

        <div id="preview-card-b" className={`preview-card preview-card_${order.color}`}>
          <div className="preview-card-img-cont" dangerouslySetInnerHTML={{ __html: sideB }} />
          <div className="preview-card-magnetic-stripe" />
          <div className="preview-card-signature-stripe" />
        </div>
      </div>

      <Link className="main-link" href="/">
        <img src="/images/logo.svg" alt="Логотип" />
      </Link>

      <svg xmlns="http://www.w3.org/2000/svg" id="gold-gradient-svg" width="300%" height="300%">
        <defs>
          <linearGradient id="gold-gradient" gradientUnits="userSpaceOnUse" x1="-10.36%" y1="25.06%" x2="110.36%" y2="74.94%">
            <stop stopColor="#D5AC52" />
            <stop offset=".963" stopColor="#EAD373" />
          </linearGradient>
        </defs>
      </svg>
    </>
  );
}
