import Link from "next/link";
import { listOrders } from "@/lib/admin-data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const fmt = new Intl.NumberFormat("ru-RU");

const ORDER_STATES = ["created", "paid", "cash", "canceled", "production", "shipped", "done"];

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

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

export default async function OrdersPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const state = firstParam(searchParams.state).trim();

  const orders = await listOrders(state || undefined);

  return (
    <>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Заказы</h1>
        <Link className="btn btn-primary" href="/orders/new">
          Новый заказ
        </Link>
      </div>

      <div className="card">
        <form className="toolbar" method="get">
          <label htmlFor="state" style={{ marginBottom: 0 }}>
            Статус
          </label>
          <select id="state" name="state" defaultValue={state} style={{ width: 220 }}>
            <option value="">Все</option>
            {ORDER_STATES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button type="submit">Фильтровать</button>
        </form>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Дата</th>
              <th>Статус</th>
              <th>Имя</th>
              <th>Телефон</th>
              <th>Сумма</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">
                  Пока пусто
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{displayDate(order.createdAt)}</td>
                  <td>{order.state}</td>
                  <td>{order.customerName}</td>
                  <td>{order.customerPhone}</td>
                  <td>
                    {fmt.format(Math.round(order.total))} {order.currency}
                  </td>
                  <td>
                    <Link className="btn" href={`/orders/${order.id}`}>
                      Открыть
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
