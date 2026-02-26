import Link from "next/link";
import {
  getAnalyticsOverview,
  getFilteredAnalyticsSummary,
  getRecentAnalyticsEvents,
  getTopAnalyticsEvents,
  getTopAnalyticsPaths,
  getAnalyticsTimeSeries,
  getAnalyticsConversionFunnel,
} from "@/lib/analytics-data";
import {
  TimeSeriesChart,
  ConversionFunnel,
  DonutChart,
  StatCard,
} from "@/components/analytics-charts";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type DetailKind = "" | "event" | "path" | "metric";

type AnalyticsQuery = {
  hours: string;
  limit: string;
  event: string;
  path: string;
  detail: string;
  value: string;
};

const fmt = new Intl.NumberFormat("ru-RU");
const HOURS_OPTIONS = [24, 72, 168, 720] as const;
const LIMIT_OPTIONS = [50, 100, 200] as const;

const EVENT_TITLES: Record<string, string> = {
  page_view: "Просмотр страницы",
  order_preview: "Предпросмотр заказа",
  order_submit: "Отправка заказа",
  order_create: "Создание заказа",
  promo_order_create: "Создание промо-заказа",
  consent_accept: "Принятие cookies",
  consent_decline: "Отказ от cookies",
};

const EVENT_COLORS: Record<string, string> = {
  page_view: "#0f5eb8",
  order_preview: "#7c3aed",
  order_submit: "#0d9488",
  order_create: "#ea580c",
  promo_order_create: "#dc2626",
  consent_accept: "#16a34a",
  consent_decline: "#6b7280",
};

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

function normalizeDetailKind(value: string): DetailKind {
  if (value === "event" || value === "path" || value === "metric") {
    return value;
  }
  return "";
}

function buildAnalyticsHref(base: AnalyticsQuery, updates: Partial<AnalyticsQuery>): string {
  const merged: AnalyticsQuery = {
    ...base,
    ...updates,
  };

  if (!merged.hours) {
    merged.hours = "24";
  }
  if (!merged.limit) {
    merged.limit = "100";
  }

  const params = new URLSearchParams();
  params.set("hours", merged.hours);
  params.set("limit", merged.limit);

  if (merged.event) {
    params.set("event", merged.event);
  }
  if (merged.path) {
    params.set("path", merged.path);
  }
  if (merged.detail) {
    params.set("detail", merged.detail);
  }
  if (merged.value) {
    params.set("value", merged.value);
  }

  return `/analytics?${params.toString()}`;
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

function eventTitle(code: string): string {
  return EVENT_TITLES[code] ?? `Событие: ${code}`;
}

function percent(current: number, max: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }
  const value = Math.round((current / max) * 100);
  return Math.max(8, Math.min(100, value));
}

export default async function AnalyticsPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;

  const hours = normalizeHours(asInt(firstParam(searchParams.hours), 24));
  const limit = normalizeLimit(asInt(firstParam(searchParams.limit), 100));
  const eventFilter = firstParam(searchParams.event).trim().toLowerCase().slice(0, 64);
  const pathFilter = firstParam(searchParams.path).trim().slice(0, 256);

  const rawDetailKind = normalizeDetailKind(firstParam(searchParams.detail).trim().toLowerCase());
  const rawDetailValue = firstParam(searchParams.value).trim().slice(0, 256);

  const resolvedDetailKind: DetailKind = rawDetailKind || (eventFilter ? "event" : pathFilter ? "path" : "");
  const resolvedDetailValue =
    rawDetailValue || (resolvedDetailKind === "event" ? eventFilter : resolvedDetailKind === "path" ? pathFilter : "");

  const [overview, topEvents, topPaths, recentEvents, filteredSummary, timeSeries, funnelSteps] = await Promise.all([
    getAnalyticsOverview(),
    getTopAnalyticsEvents(12, hours),
    getTopAnalyticsPaths(12, hours),
    getRecentAnalyticsEvents({
      hours,
      limit,
      eventName: eventFilter || undefined,
      pathContains: pathFilter || undefined,
    }),
    getFilteredAnalyticsSummary({
      hours,
      eventName: eventFilter || undefined,
      pathContains: pathFilter || undefined,
    }),
    getAnalyticsTimeSeries(hours),
    getAnalyticsConversionFunnel(hours),
  ]);

  const baseQuery: AnalyticsQuery = {
    hours: String(hours),
    limit: String(limit),
    event: eventFilter,
    path: pathFilter,
    detail: resolvedDetailKind,
    value: resolvedDetailValue,
  };

  const stats = [
    { key: "visitors24h", label: "Уникальные посетители", value: overview.visitors24h, icon: "👥", color: "primary" as const },
    { key: "sessions24h", label: "Сессии", value: overview.sessions24h, icon: "🔗", color: "purple" as const },
    { key: "pageViews24h", label: "Просмотры страниц", value: overview.pageViews24h, icon: "📄", color: "teal" as const },
    { key: "orders24h", label: "Созданные заказы", value: overview.orders24h, icon: "🛒", color: "orange" as const },
  ];

  const eventChartData = topEvents.map((item) => ({
    label: eventTitle(item.eventName),
    value: item.count,
    color: EVENT_COLORS[item.eventName] || "#6b7280",
  }));

  const selectedEvent = topEvents.find((item) => item.eventName === resolvedDetailValue);
  const selectedPath = topPaths.find((item) => item.path === resolvedDetailValue);

  let detailTitle = "Выберите график для детализации";
  let detailDescription =
    "Нажмите на полосу графика или кнопку «Детально изучить», чтобы сразу отфильтровать журнал действий пользователей.";

  if (resolvedDetailKind === "event" && resolvedDetailValue) {
    detailTitle = `Детализация по событию: ${eventTitle(resolvedDetailValue)}`;
    detailDescription = `Код события: ${resolvedDetailValue}. Показаны все записи с этим событием за выбранный период.`;
  } else if (resolvedDetailKind === "path" && resolvedDetailValue) {
    detailTitle = "Детализация по странице";
    detailDescription = `Путь: ${resolvedDetailValue}. Показаны события пользователей по выбранной странице.`;
  } else if (resolvedDetailKind === "metric") {
    const selectedMetric = stats.find((item) => item.key === resolvedDetailValue);
    if (selectedMetric) {
      detailTitle = `Детализация по метрике: ${selectedMetric.label}`;
      detailDescription = "Ниже можно сразу перейти к событиям и страницам, которые формируют эту метрику.";
    }
  }

  const maxEvents = Math.max(1, ...topEvents.map((item) => item.count));
  const maxPaths = Math.max(1, ...topPaths.map((item) => item.count));

  const periodLabel = hours === 24 ? "24 часа" : hours === 72 ? "3 дня" : hours === 168 ? "7 дней" : "30 дней";

  return (
    <div className="analytics-page">
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>📊 Аналитика сайта</h1>
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
            Код события
          </label>
          <input
            id="event"
            name="event"
            defaultValue={eventFilter}
            placeholder="например order_create"
            style={{ width: 220 }}
          />

          <label htmlFor="path" style={{ marginBottom: 0 }}>
            Путь
          </label>
          <input id="path" name="path" defaultValue={pathFilter} placeholder="например /design" style={{ width: 220 }} />

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
          {/* Stats Overview */}
          <div className="analytics-overview-grid">
            {stats.map((stat) => (
              <StatCard
                key={stat.key}
                value={stat.value}
                label={`${stat.label} (24ч)`}
                icon={stat.icon}
                color={stat.color}
              />
            ))}
          </div>

          {/* Charts Row */}
          <div className="analytics-charts-grid">
            <div className="card">
              <TimeSeriesChart data={timeSeries} />
            </div>
            <div className="card">
              <ConversionFunnel steps={funnelSteps} />
            </div>
          </div>

          {/* Donut Charts */}
          <div className="grid grid-2">
            <div className="card">
              <DonutChart data={eventChartData} title={`Распределение событий (${periodLabel})`} />
            </div>
            <div className="card">
              <h3 className="chart-title" style={{ marginBottom: 16 }}>Статистика за период</h3>
              <div className="grid grid-2" style={{ gap: 12 }}>
                <div className="stat">
                  <div className="stat-number">{fmt.format(overview.visitors7d)}</div>
                  <div className="stat-label">Посетителей за 7 дней</div>
                </div>
                <div className="stat">
                  <div className="stat-number">{fmt.format(overview.events24h)}</div>
                  <div className="stat-label">Событий за 24ч</div>
                </div>
                <div className="stat">
                  <div className="stat-number">{fmt.format(filteredSummary.events)}</div>
                  <div className="stat-label">Событий по фильтру</div>
                </div>
                <div className="stat">
                  <div className="stat-number">{fmt.format(filteredSummary.visitors)}</div>
                  <div className="stat-label">Посетителей по фильтру</div>
                </div>
              </div>
            </div>
          </div>

          {/* Detail Mode */}
          <div className="card">
            <div className="toolbar" style={{ justifyContent: "space-between" }}>
              <h2 style={{ margin: 0 }}>🔍 Детальный режим</h2>
              <Link
                className="btn"
                href={buildAnalyticsHref(baseQuery, {
                  event: "",
                  path: "",
                  detail: "",
                  value: "",
                })}
              >
                Очистить детализацию
              </Link>
            </div>
            <p className="analytics-note" style={{ marginTop: 0 }}>
              {detailTitle}
            </p>
            <p className="analytics-note">{detailDescription}</p>

            <div className="grid grid-4">
              <div className="card stat">
                <div className="stat-number">{fmt.format(filteredSummary.events)}</div>
                <div className="stat-label">События по текущему фильтру</div>
              </div>
              <div className="card stat">
                <div className="stat-number">{fmt.format(filteredSummary.visitors)}</div>
                <div className="stat-label">Уникальные посетители</div>
              </div>
              <div className="card stat">
                <div className="stat-number">{fmt.format(filteredSummary.sessions)}</div>
                <div className="stat-label">Сессии</div>
              </div>
              <div className="card stat">
                <div className="stat-number">{fmt.format(filteredSummary.orders)}</div>
                <div className="stat-label">Созданные заказы</div>
              </div>
            </div>

            {(resolvedDetailKind === "event" || resolvedDetailKind === "path") && (
              <div className="analytics-note">
                {resolvedDetailKind === "event" && selectedEvent
                  ? `Количество выбранного события за период: ${fmt.format(selectedEvent.count)}`
                  : null}
                {resolvedDetailKind === "path" && selectedPath
                  ? `Количество событий по выбранному пути за период: ${fmt.format(selectedPath.count)}`
                  : null}
              </div>
            )}
          </div>

          {/* Bar Charts */}
          <div className="grid grid-2">
            <div className="card">
              <h2 style={{ marginTop: 0 }}>📈 Топ событий за период</h2>
              <p className="analytics-note">Нажмите на полосу, чтобы отфильтровать таблицу действий.</p>
              <div className="analytics-bars">
                {topEvents.length === 0 ? (
                  <div className="muted">Нет данных</div>
                ) : (
                  topEvents.map((item) => {
                    const isActive = resolvedDetailKind === "event" && resolvedDetailValue === item.eventName;
                    return (
                      <Link
                        key={item.eventName}
                        className={`analytics-bar-link${isActive ? " active" : ""}`}
                        href={buildAnalyticsHref(baseQuery, {
                          event: item.eventName,
                          path: "",
                          detail: "event",
                          value: item.eventName,
                        })}
                      >
                        <div className="analytics-bar-head">
                          <div>
                            <div className="analytics-bar-title">{eventTitle(item.eventName)}</div>
                            <div className="analytics-bar-code">{item.eventName}</div>
                          </div>
                          <div className="analytics-bar-value">
                            {fmt.format(item.count)} · Детально изучить
                          </div>
                        </div>
                        <div className="analytics-bar-track">
                          <span
                            className="analytics-bar-fill"
                            style={{
                              width: `${percent(item.count, maxEvents)}%`,
                              background: EVENT_COLORS[item.eventName] || "linear-gradient(90deg, #2f7bc8, #0f5eb8)",
                            }}
                          />
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>

            <div className="card">
              <h2 style={{ marginTop: 0 }}>🌐 Топ страниц за период</h2>
              <p className="analytics-note">Клик по строке покажет подробные действия по выбранной странице.</p>
              <div className="analytics-bars">
                {topPaths.length === 0 ? (
                  <div className="muted">Нет данных</div>
                ) : (
                  topPaths.map((item) => {
                    const isActive = resolvedDetailKind === "path" && resolvedDetailValue === item.path;
                    return (
                      <Link
                        key={item.path}
                        className={`analytics-bar-link${isActive ? " active" : ""}`}
                        href={buildAnalyticsHref(baseQuery, {
                          event: "",
                          path: item.path,
                          detail: "path",
                          value: item.path,
                        })}
                      >
                        <div className="analytics-bar-head">
                          <div className="analytics-bar-title cell-break">{item.path || "/"}</div>
                          <div className="analytics-bar-value">
                            {fmt.format(item.count)} · Детально изучить
                          </div>
                        </div>
                        <div className="analytics-bar-track">
                          <span className="analytics-bar-fill" style={{ width: `${percent(item.count, maxPaths)}%` }} />
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Tables */}
          <div className="grid grid-2">
            <div className="card">
              <h2 style={{ marginTop: 0 }}>📋 Топ событий (таблица)</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Событие</th>
                      <th>Код</th>
                      <th>Количество</th>
                      <th>Действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topEvents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="muted">
                          Нет данных
                        </td>
                      </tr>
                    ) : (
                      topEvents.map((item) => (
                        <tr key={item.eventName}>
                          <td>{eventTitle(item.eventName)}</td>
                          <td>{item.eventName}</td>
                          <td>{fmt.format(item.count)}</td>
                          <td>
                            <Link
                              className="btn"
                              href={buildAnalyticsHref(baseQuery, {
                                event: item.eventName,
                                path: "",
                                detail: "event",
                                value: item.eventName,
                              })}
                            >
                              Изучить
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h2 style={{ marginTop: 0 }}>📋 Топ страниц (таблица)</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Путь</th>
                      <th>События</th>
                      <th>Посетители</th>
                      <th>Сессии</th>
                      <th>Действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPaths.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="muted">
                          Нет данных
                        </td>
                      </tr>
                    ) : (
                      topPaths.map((item) => (
                        <tr key={item.path}>
                          <td className="cell-break">{item.path || "/"}</td>
                          <td>{fmt.format(item.count)}</td>
                          <td>{fmt.format(item.visitors)}</td>
                          <td>{fmt.format(item.sessions)}</td>
                          <td>
                            <Link
                              className="btn"
                              href={buildAnalyticsHref(baseQuery, {
                                event: "",
                                path: item.path,
                                detail: "path",
                                value: item.path,
                              })}
                            >
                              Изучить
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>📝 Последние действия пользователей</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Дата</th>
                <th>Событие</th>
                <th>Путь</th>
                <th>Посетитель</th>
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
                    <td>
                      <div>{eventTitle(event.eventName)}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {event.eventName}
                      </div>
                    </td>
                    <td className="cell-break">
                      <div>{event.path || "/"}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {event.referer ? `Источник: ${refererHost(event.referer)}` : "Источник: —"}
                      </div>
                    </td>
                    <td title={event.visitorId}>
                      <div>{shortId(event.visitorId)}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        IP: {event.ip || "—"}
                      </div>
                    </td>
                    <td title={event.sessionId}>
                      <div>{shortId(event.sessionId)}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        Браузер: {shortText(event.userAgent, 38) || "—"}
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
      </div>
    </div>
  );
}
