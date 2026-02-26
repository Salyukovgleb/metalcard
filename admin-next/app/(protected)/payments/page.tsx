import Link from "next/link";
import { listPayments } from "@/lib/admin-data";

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

export default async function PaymentsPage() {
  const payments = await listPayments();

  return (
    <>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Платежи</h1>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Order ID</th>
              <th>Провайдер</th>
              <th>Статус</th>
              <th>Сумма</th>
              <th>Создан</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">
                  Пока пусто
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.id}</td>
                  <td>{payment.orderId}</td>
                  <td>{payment.provider}</td>
                  <td>{payment.status}</td>
                  <td>
                    {fmt.format(Math.round(payment.amount))} {payment.currency}
                  </td>
                  <td>{displayDate(payment.createdAt)}</td>
                  <td>
                    <Link className="btn" href={`/payments/${payment.id}/edit`}>
                      Ред.
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
