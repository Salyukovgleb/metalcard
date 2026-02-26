"use client";

import { useEffect, useState } from "react";

type TimeSeriesPoint = {
  label: string;
  visitors: number;
  sessions: number;
  pageViews: number;
  orders: number;
};

type TimeSeriesData = {
  points: TimeSeriesPoint[];
  maxVisitors: number;
  maxSessions: number;
  maxPageViews: number;
  maxOrders: number;
};

type FunnelStep = {
  step: string;
  count: number;
};

type ChartMetric = "visitors" | "sessions" | "pageViews" | "orders";

const METRIC_LABELS: Record<ChartMetric, string> = {
  visitors: "Посетители",
  sessions: "Сессии",
  pageViews: "Просмотры",
  orders: "Заказы",
};

const METRIC_COLORS: Record<ChartMetric, string> = {
  visitors: "#0f5eb8",
  sessions: "#7c3aed",
  pageViews: "#0d9488",
  orders: "#ea580c",
};

function formatNumber(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n);
}

export function TimeSeriesChart({ data }: { data: TimeSeriesData }) {
  const [activeMetric, setActiveMetric] = useState<ChartMetric>("visitors");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (data.points.length === 0) {
    return <div className="chart-empty">Нет данных для построения графика</div>;
  }

  const maxValue = {
    visitors: data.maxVisitors,
    sessions: data.maxSessions,
    pageViews: data.maxPageViews,
    orders: data.maxOrders,
  }[activeMetric];

  const getValue = (point: TimeSeriesPoint): number => point[activeMetric];

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3 className="chart-title">Динамика по времени</h3>
        <div className="chart-legend">
          {(Object.keys(METRIC_LABELS) as ChartMetric[]).map((metric) => (
            <button
              key={metric}
              type="button"
              className={`chart-legend-item ${activeMetric === metric ? "active" : ""}`}
              style={{ "--metric-color": METRIC_COLORS[metric] } as React.CSSProperties}
              onClick={() => setActiveMetric(metric)}
            >
              <span className="chart-legend-dot" />
              {METRIC_LABELS[metric]}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-area">
        <div className="chart-y-axis">
          <span>{formatNumber(maxValue)}</span>
          <span>{formatNumber(Math.round(maxValue / 2))}</span>
          <span>0</span>
        </div>

        <div className="chart-bars-container">
          {data.points.map((point, index) => {
            const value = getValue(point);
            const heightPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;
            const isHovered = hoveredIndex === index;

            return (
              <div
                key={point.label}
                className={`chart-bar-wrapper ${isHovered ? "hovered" : ""}`}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div
                  className="chart-bar"
                  style={{
                    height: animated ? `${heightPercent}%` : "0%",
                    backgroundColor: METRIC_COLORS[activeMetric],
                    transitionDelay: `${index * 30}ms`,
                  }}
                />
                {isHovered && (
                  <div className="chart-tooltip">
                    <div className="chart-tooltip-label">{point.label}</div>
                    <div className="chart-tooltip-value">
                      {METRIC_LABELS[activeMetric]}: {formatNumber(value)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="chart-x-axis">
        {data.points.map((point, index) => (
          <span key={point.label} className={index % Math.ceil(data.points.length / 8) === 0 ? "" : "hidden-mobile"}>
            {point.label.split(" ")[1] || point.label.split("-").slice(1).join("/")}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ConversionFunnel({ steps }: { steps: FunnelStep[] }) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (steps.length === 0) {
    return <div className="chart-empty">Нет данных для воронки</div>;
  }

  const maxCount = Math.max(1, ...steps.map((s) => s.count));

  return (
    <div className="funnel-container">
      <h3 className="chart-title">Воронка конверсии</h3>
      <div className="funnel-steps">
        {steps.map((step, index) => {
          const widthPercent = (step.count / maxCount) * 100;
          const conversionRate = index > 0 && steps[index - 1].count > 0
            ? ((step.count / steps[index - 1].count) * 100).toFixed(1)
            : null;

          return (
            <div key={step.step} className="funnel-step">
              <div className="funnel-step-header">
                <span className="funnel-step-name">{step.step}</span>
                <span className="funnel-step-count">{formatNumber(step.count)}</span>
                {conversionRate && (
                  <span className="funnel-step-rate">→ {conversionRate}%</span>
                )}
              </div>
              <div className="funnel-bar-track">
                <div
                  className="funnel-bar-fill"
                  style={{
                    width: animated ? `${widthPercent}%` : "0%",
                    transitionDelay: `${index * 150}ms`,
                    opacity: 1 - index * 0.15,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DonutChart({
  data,
  title,
}: {
  data: { label: string; value: number; color?: string }[];
  title: string;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return <div className="chart-empty">Нет данных</div>;
  }

  const colors = [
    "#0f5eb8", "#7c3aed", "#0d9488", "#ea580c", "#dc2626",
    "#16a34a", "#ca8a04", "#9333ea", "#0891b2", "#4f46e5",
  ];

  let cumulativePercent = 0;
  const segments = data.map((item, index) => {
    const percent = (item.value / total) * 100;
    const startPercent = cumulativePercent;
    cumulativePercent += percent;
    return {
      ...item,
      percent,
      startPercent,
      color: item.color || colors[index % colors.length],
    };
  });

  const gradientStops = segments.map((seg) =>
    `${seg.color} ${seg.startPercent}% ${seg.startPercent + seg.percent}%`
  ).join(", ");

  return (
    <div className="donut-container">
      <h3 className="chart-title">{title}</h3>
      <div className="donut-wrapper">
        <div
          className="donut-chart"
          style={{
            background: animated
              ? `conic-gradient(${gradientStops})`
              : "var(--border)",
          }}
        >
          <div className="donut-hole">
            <div className="donut-total">{formatNumber(total)}</div>
            <div className="donut-total-label">всего</div>
          </div>
        </div>
        <div className="donut-legend">
          {segments.map((seg, index) => (
            <div
              key={seg.label}
              className={`donut-legend-item ${hoveredIndex === index ? "active" : ""}`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <span className="donut-legend-dot" style={{ backgroundColor: seg.color }} />
              <span className="donut-legend-label">{seg.label}</span>
              <span className="donut-legend-value">{formatNumber(seg.value)}</span>
              <span className="donut-legend-percent">{seg.percent.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StatCard({
  value,
  label,
  trend,
  icon,
  color = "primary",
}: {
  value: number;
  label: string;
  trend?: { value: number; positive: boolean };
  icon?: string;
  color?: "primary" | "purple" | "teal" | "orange";
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(value, Math.round(increment * step));
      setDisplayValue(current);
      if (step >= steps) {
        clearInterval(timer);
        setDisplayValue(value);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  const colorClasses: Record<string, string> = {
    primary: "stat-card-primary",
    purple: "stat-card-purple",
    teal: "stat-card-teal",
    orange: "stat-card-orange",
  };

  return (
    <div className={`stat-card-animated ${colorClasses[color]}`}>
      {icon && <div className="stat-card-icon">{icon}</div>}
      <div className="stat-card-value">{formatNumber(displayValue)}</div>
      <div className="stat-card-label">{label}</div>
      {trend && (
        <div className={`stat-card-trend ${trend.positive ? "positive" : "negative"}`}>
          {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%
        </div>
      )}
    </div>
  );
}
