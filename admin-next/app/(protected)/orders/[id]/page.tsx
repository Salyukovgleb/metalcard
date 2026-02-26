import Link from "next/link";
import { notFound } from "next/navigation";
import { addOrderItemAction, deleteOrderItemAction, updateOrderStatusAction } from "@/app/(protected)/actions";
import {
  getOrderById,
  listActiveColorOptions,
  listActiveDesignOptions,
  listOrderItems,
  listPayments,
} from "@/lib/admin-data";

type Params = Promise<{ id: string }>;

const ORDER_STATES = ["created", "paid", "cash", "canceled", "production", "shipped", "done"];
const fmt = new Intl.NumberFormat("ru-RU");

function displayDate(value: string): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("ru-RU", { hour12: false });
}

export default async function OrderDetailPage(props: { params: Params }) {
  const params = await props.params;
  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    notFound();
  }

  const [order, items, payments, designOptions, colorOptions] = await Promise.all([
    getOrderById(id),
    listOrderItems(id),
    listPayments(id),
    listActiveDesignOptions(),
    listActiveColorOptions(),
  ]);

  if (!order) {
    notFound();
  }

  return (
    <>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Заказ #{order.id}</h1>
        <Link className="btn" href="/orders">
          Назад
        </Link>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Информация</h2>
          <div className="form-grid">
            <div className="form-row">
              <label>Создан</label>
              <div>{displayDate(order.createdAt)}</div>
            </div>
            <div className="form-row">
              <label>Статус</label>
              <div>{order.state}</div>
            </div>
            <div className="form-row">
              <label>Имя</label>
              <div>{order.customerName}</div>
            </div>
            <div className="form-row">
              <label>Телефон</label>
              <div>{order.customerPhone}</div>
            </div>
            <div className="form-row">
              <label>Способ получения</label>
              <div>{order.receiveMethod}</div>
            </div>
            <div className="form-row">
              <label>Promo ID</label>
              <div>{order.promoId ?? "—"}</div>
            </div>
          </div>

          <div className="toolbar" style={{ marginTop: 12 }}>
            <div>Subtotal: {fmt.format(Math.round(order.subtotal))}</div>
            <div>Доставка: {fmt.format(Math.round(order.deliveryFee))}</div>
            <div>Скидка: {fmt.format(Math.round(order.discount))}</div>
            <div>
              <strong>
                Итого: {fmt.format(Math.round(order.total))} {order.currency}
              </strong>
            </div>
          </div>

          <form action={updateOrderStatusAction}>
            <input type="hidden" name="order_id" value={order.id} />
            <div className="toolbar">
              <select name="state" defaultValue={order.state} style={{ width: 220 }}>
                {ORDER_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              <button type="submit">Сменить статус</button>
            </div>
          </form>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Добавить позицию</h2>
          <form action={addOrderItemAction}>
            <input type="hidden" name="order_id" value={order.id} />

            <div className="form-grid">
              <div className="form-row">
                <label htmlFor="design_id">Принт</label>
                <select id="design_id" name="design_id" defaultValue="">
                  <option value="">—</option>
                  {designOptions.map((design) => (
                    <option key={design.id} value={design.id}>
                      #{design.id} {design.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label htmlFor="color_id">Цвет</label>
                <select id="color_id" name="color_id" defaultValue="">
                  <option value="">—</option>
                  {colorOptions.map((color) => (
                    <option key={color.id} value={color.id}>
                      {color.code} - {color.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-row">
                <label htmlFor="quantity">Количество</label>
                <input id="quantity" name="quantity" type="number" min={1} defaultValue={1} />
              </div>
              <div className="form-row">
                <label htmlFor="item_total">Сумма позиции</label>
                <input id="item_total" name="item_total" type="number" step="0.01" defaultValue={0} />
              </div>
            </div>

            <div className="form-row">
              <label htmlFor="texts">Тексты (JSON)</label>
              <textarea id="texts" name="texts" rows={3} defaultValue='{"A": [], "B": [], "card": {}}' />
            </div>
            <div className="form-row">
              <label htmlFor="options">Опции (JSON)</label>
              <textarea id="options" name="options" rows={2} defaultValue="{}" />
            </div>
            <div className="form-row">
              <label htmlFor="renders">Рендеры (JSON)</label>
              <textarea id="renders" name="renders" rows={2} defaultValue="{}" />
            </div>

            <button className="btn-primary" type="submit">
              Добавить
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Позиции</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Принт</th>
              <th>Цвет</th>
              <th>Кол-во</th>
              <th>Сумма</th>
              <th>Тексты</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">
                  Нет позиций
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.designTitle || item.designId || "—"}</td>
                  <td>{item.colorTitle || item.colorId || "—"}</td>
                  <td>{item.quantity}</td>
                  <td>{fmt.format(Math.round(item.itemTotal))}</td>
                  <td>
                    <pre>{JSON.stringify(item.texts, null, 2)}</pre>
                  </td>
                  <td>
                    <form action={deleteOrderItemAction}>
                      <input type="hidden" name="order_id" value={order.id} />
                      <input type="hidden" name="item_id" value={item.id} />
                      <button className="btn-danger" type="submit">
                        Удалить
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Платежи</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Провайдер</th>
              <th>Статус</th>
              <th>Сумма</th>
              <th>Создан</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  Нет платежей
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.id}</td>
                  <td>{payment.provider}</td>
                  <td>{payment.status}</td>
                  <td>
                    {fmt.format(Math.round(payment.amount))} {payment.currency}
                  </td>
                  <td>{displayDate(payment.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
