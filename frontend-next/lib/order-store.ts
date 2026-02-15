import crypto from "node:crypto";

type OrderCardDataItem = {
  text: string;
  fontName: string;
  pos: {
    top: number;
    left: number;
    width: number;
  };
};

export type OrderPayload = {
  design?: number;
  promoID?: number;
  color: string;
  logoDeactive: boolean;
  delivery: "pickup" | "delivery" | "delivery-yandex";
  bigChip: boolean;
  cardAData: OrderCardDataItem[];
  cardBData: OrderCardDataItem[];
  cardNum: string;
  cardTime: string;
};

export type StoredOrder = {
  id: number;
  orderKey: string;
  manageKey: string;
  state: 1 | 2 | 6;
  name: string;
  phone: string;
  amount: number;
  design?: number;
  promo?: string;
  color: string;
  logoDeactive: boolean;
  bigChip: boolean;
  delivery: "pickup" | "delivery" | "delivery-yandex";
  orderData: {
    cardAData: OrderCardDataItem[];
    cardBData: OrderCardDataItem[];
    cardNum: string;
    cardTime: string;
  };
  createdAt: string;
};

type Store = {
  nextId: number;
  orders: StoredOrder[];
};

const key = "__metalcards_order_store__";
const root = globalThis as typeof globalThis & { [key: string]: Store | undefined };

if (!root[key]) {
  root[key] = {
    nextId: 1000,
    orders: [],
  };
}

function getStore(): Store {
  return root[key] as Store;
}

function randomKey(length = 20): string {
  return crypto.randomBytes(length).toString("base64url").slice(0, length);
}

export function createOrder(input: {
  name: string;
  phone: string;
  amount: number;
  payload: OrderPayload;
  promoName?: string;
}): StoredOrder {
  const store = getStore();
  const id = store.nextId;
  store.nextId += 1;

  const order: StoredOrder = {
    id,
    orderKey: randomKey(22),
    manageKey: randomKey(22),
    state: 1,
    name: input.name,
    phone: input.phone,
    amount: input.amount,
    design: input.payload.design,
    promo: input.promoName,
    color: input.payload.color,
    logoDeactive: input.payload.logoDeactive,
    bigChip: input.payload.bigChip,
    delivery: input.payload.delivery,
    orderData: {
      cardAData: input.payload.cardAData.filter((item) => item.text.length > 0),
      cardBData: input.payload.cardBData.filter((item) => item.text.length > 0),
      cardNum: input.payload.cardNum,
      cardTime: input.payload.cardTime,
    },
    createdAt: new Date().toISOString(),
  };

  store.orders.push(order);
  return order;
}

export function findOrderByIdAndKey(id: number, keyValue: string): StoredOrder | undefined {
  return getStore().orders.find((order) => order.id === id && order.orderKey === keyValue);
}

export function findOrderByIdAndManageKey(id: number, manageKey: string): StoredOrder | undefined {
  return getStore().orders.find((order) => order.id === id && order.manageKey === manageKey);
}

export function markOrderAsCash(order: StoredOrder): StoredOrder {
  order.state = 6;
  return order;
}
