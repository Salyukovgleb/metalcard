import Link from "next/link";
import { getDashboardData } from "@/lib/admin-data";
import { getAnalyticsOverview, getTopAnalyticsEvents } from "@/lib/analytics-data";
import { readBackupStatus } from "@/lib/backup-status";

const fmt = new Intl.NumberFormat("ru-RU");

function displayDate(value: string): string {
  if (!value) {
    return "—";
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return value;
  }
  return d.toLocaleString("ru-RU", { hour12: false });
}

export default async function DashboardPage() {
  const [dashboard, backup, analytics, topEvents] = await Promise.all([
    getDashboardData(),
    readBackupStatus(),
    getAnalyticsOverview(),
    getTopAnalyticsEvents(8),
  ]);

  return (
    <>
      <h1 style={{ marginTop: 0 }}>Панель управления</h1>

      <div className="grid grid-4">
        <div className="card stat">
          <div className="stat-number">{fmt.format(dashboard.ordersTotal)}</div>
          <div className="stat-label">Всего заказов</div>
        </div>
        <div className="card stat">
          <div className="stat-number">{fmt.format(dashboard.paymentsTotal)}</div>
          <div className="stat-label">Платежей</div>
        </div>
        <div className="card stat">
          <div className="stat-number">{fmt.format(Math.round(dashboard.revenue))}</div>
          <div className="stat-label">Выручка (UZS)</div>
        </div>
        <div className="card stat">
          <div className="stat-number">
            {dashboard.designsWithPrice}/{dashboard.designsTotal}
          </div>
          <div className="stat-label">Дизайнов с фикс. ценой</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Статистика каталога</h2>
          <div className="grid grid-2">
            <div className="card stat">
              <div className="stat-number">{fmt.format(dashboard.designsTotal)}</div>
              <div className="stat-label">Активных принтов</div>
            </div>
            <div className="card stat">
              <div className="stat-number">{fmt.format(dashboard.colorsActive)}</div>
              <div className="stat-label">Активных цветов</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Бэкап БД</h2>
          <div style={{ marginBottom: 10 }}>
            <span className={backup.ok ? "ok-badge" : "warn-badge"}>{backup.label}</span>
          </div>
          <div className="form-row">
            <label>Последний бэкап</label>
            <div>{displayDate(backup.finishedAtRaw)}</div>
          </div>
          <div className="form-row">
            <label>Файл</label>
            <div>{backup.file || "—"}</div>
          </div>
          <div className="form-row">
            <label>Размер</label>
            <div>{backup.sizeHuman || "—"}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="toolbar" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Аналитика сайта</h2>
          <Link className="btn" href="/analytics">
            Открыть детали
          </Link>
        </div>
        {!analytics.available ? (
          <div className="muted">Событий аналитики пока нет.</div>
        ) : (
          <>
            <div className="grid grid-4">
              <div className="card stat">
                <div className="stat-number">{fmt.format(analytics.visitors24h)}</div>
                <div className="stat-label">Уникальных посетителей (24ч)</div>
              </div>
              <div className="card stat">
                <div className="stat-number">{fmt.format(analytics.visitors7d)}</div>
                <div className="stat-label">Уникальных посетителей (7д)</div>
              </div>
              <div className="card stat">
                <div className="stat-number">{fmt.format(analytics.pageViews24h)}</div>
                <div className="stat-label">Просмотров страниц (24ч)</div>
              </div>
              <div className="card stat">
                <div className="stat-number">{fmt.format(analytics.orders24h)}</div>
                <div className="stat-label">Созданий заказа (24ч)</div>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <strong>Топ событий за 24 часа:</strong>{" "}
              {topEvents.length === 0
                ? "—"
                : topEvents.map((item) => `${item.eventName} (${item.count})`).join(", ")}
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="toolbar" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Последние заказы</h2>
          <Link className="btn" href="/orders">
            Все заказы
          </Link>
        </div>
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
            {dashboard.recentOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">
                  Нет заказов
                </td>
              </tr>
            ) : (
              dashboard.recentOrders.map((order) => (
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
