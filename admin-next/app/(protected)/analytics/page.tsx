import Link from "next/link";
import {
  getAnalyticsOverview,
  getRecentAnalyticsEvents,
  getTopAnalyticsEvents,
  getTopAnalyticsPaths,
} from "@/lib/analytics-data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const fmt = new Intl.NumberFormat("ru-RU");
const HOURS_OPTIONS = [24, 72, 168, 720] as const;
const LIMIT_OPTIONS = [50, 100, 200] as const;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function asInt(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeHours(value: number): number {
  return HOURS_OPTIONS.includes(value as (typeof HOURS_OPTIONS)[number]) ? value : 24;
}

function normalizeLimit(value: number): number {
  return LIMIT_OPTIONS.includes(value as (typeof LIMIT_OPTIONS)[number]) ? value : 100;
}

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

function shortId(value: string): string {
  if (!value) {
    return "—";
  }
  if (value.length <= 16) {
    return value;
  }
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function shortText(value: string, max = 64): string {
  if (!value) {
    return "";
  }
  return value.length <= max ? value : `${value.slice(0, max)}…`;
}

function refererHost(value: string): string {
  if (!value) {
    return "";
  }
  try {
    return new URL(value).host;
  } catch {
    return shortText(value, 80);
  }
}

function payloadPreview(payload: Record<string, unknown>): string {
  const keys = Object.keys(payload);
  if (keys.length === 0) {
    return "—";
  }
  const raw = JSON.stringify(payload);
  if (raw.length <= 220) {
    return raw;
  }
  return `${raw.slice(0, 220)}…`;
}

export default async function AnalyticsPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;

  const hours = normalizeHours(asInt(firstParam(searchParams.hours), 24));
  const limit = normalizeLimit(asInt(firstParam(searchParams.limit), 100));
  const eventFilter = firstParam(searchParams.event).trim().toLowerCase().slice(0, 64);
  const pathFilter = firstParam(searchParams.path).trim().slice(0, 256);

  const [overview, topEvents, topPaths, recentEvents] = await Promise.all([
    getAnalyticsOverview(),
    getTopAnalyticsEvents(12, hours),
    getTopAnalyticsPaths(12, hours),
    getRecentAnalyticsEvents({
      hours,
      limit,
      eventName: eventFilter || undefined,
      pathContains: pathFilter || undefined,
    }),
  ]);

  return (
    <>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Аналитика сайта</h1>
        <Link className="btn" href="/">
          На дашборд
        </Link>
      </div>

      <div className="card">
        <form className="toolbar" method="get">
          <label htmlFor="hours" style={{ marginBottom: 0 }}>
            Период
          </label>
          <select id="hours" name="hours" defaultValue={String(hours)} style={{ width: 180 }}>
            <option value="24">24 часа</option>
            <option value="72">3 дня</option>
            <option value="168">7 дней</option>
            <option value="720">30 дней</option>
          </select>

          <label htmlFor="event" style={{ marginBottom: 0 }}>
            Событие
          </label>
          <input id="event" name="event" defaultValue={eventFilter} placeholder="order_submit" style={{ width: 220 }} />

          <label htmlFor="path" style={{ marginBottom: 0 }}>
            Путь
          </label>
          <input id="path" name="path" defaultValue={pathFilter} placeholder="/design" style={{ width: 220 }} />

          <label htmlFor="limit" style={{ marginBottom: 0 }}>
            Лимит
          </label>
          <select id="limit" name="limit" defaultValue={String(limit)} style={{ width: 120 }}>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
          </select>

          <button type="submit">Применить</button>
          <Link className="btn" href="/analytics">
            Сброс
          </Link>
        </form>
      </div>

      {!overview.available ? (
        <div className="card">
          <div className="muted">Событий аналитики пока нет. После первых посещений сайта данные появятся автоматически.</div>
        </div>
      ) : (
        <>
          <div className="grid grid-4">
            <div className="card stat">
              <div className="stat-number">{fmt.format(overview.visitors24h)}</div>
              <div className="stat-label">Уникальные посетители (24ч)</div>
            </div>
            <div className="card stat">
              <div className="stat-number">{fmt.format(overview.visitors7d)}</div>
              <div className="stat-label">Уникальные посетители (7д)</div>
            </div>
            <div className="card stat">
              <div className="stat-number">{fmt.format(overview.sessions24h)}</div>
              <div className="stat-label">Сессии (24ч)</div>
            </div>
            <div className="card stat">
              <div className="stat-number">{fmt.format(overview.pageViews24h)}</div>
              <div className="stat-label">Просмотры страниц (24ч)</div>
            </div>
            <div className="card stat">
              <div className="stat-number">{fmt.format(overview.events24h)}</div>
              <div className="stat-label">События (24ч)</div>
            </div>
            <div className="card stat">
              <div className="stat-number">{fmt.format(overview.orders24h)}</div>
              <div className="stat-label">Создание заказов (24ч)</div>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="card">
              <h2 style={{ marginTop: 0 }}>Топ событий за период</h2>
              <table>
                <thead>
                  <tr>
                    <th>Событие</th>
                    <th>Количество</th>
                  </tr>
                </thead>
                <tbody>
                  {topEvents.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="muted">
                        Нет данных
                      </td>
                    </tr>
                  ) : (
                    topEvents.map((item) => (
                      <tr key={item.eventName}>
                        <td>{item.eventName}</td>
                        <td>{fmt.format(item.count)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="card">
              <h2 style={{ marginTop: 0 }}>Топ страниц за период</h2>
              <table>
                <thead>
                  <tr>
                    <th>Путь</th>
                    <th>События</th>
                    <th>Посетители</th>
                  </tr>
                </thead>
                <tbody>
                  {topPaths.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="muted">
                        Нет данных
                      </td>
                    </tr>
                  ) : (
                    topPaths.map((item) => (
                      <tr key={item.path}>
                        <td>{item.path || "/"}</td>
                        <td>{fmt.format(item.count)}</td>
                        <td>{fmt.format(item.visitors)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Последние действия пользователей</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Дата</th>
              <th>Событие</th>
              <th>Путь</th>
              <th>Пользователь</th>
              <th>Сессия</th>
              <th>Данные</th>
            </tr>
          </thead>
          <tbody>
            {recentEvents.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">
                  По выбранным фильтрам данных нет
                </td>
              </tr>
            ) : (
              recentEvents.map((event) => (
                <tr key={event.id}>
                  <td>{event.id}</td>
                  <td>{displayDate(event.createdAt)}</td>
                  <td>{event.eventName}</td>
                  <td>
                    <div>{event.path || "/"}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {event.referer ? `ref: ${refererHost(event.referer)}` : "ref: —"}
                    </div>
                  </td>
                  <td title={event.visitorId}>
                    <div>{shortId(event.visitorId)}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      ip: {event.ip || "—"}
                    </div>
                  </td>
                  <td title={event.sessionId}>
                    <div>{shortId(event.sessionId)}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      ua: {shortText(event.userAgent, 38) || "—"}
                    </div>
                  </td>
                  <td>
                    <pre style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: 12 }}>
                      {payloadPreview(event.payload)}
                    </pre>
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
