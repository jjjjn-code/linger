"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { computeStats, itemFlowByMonth, type MonthFlow } from "@/lib/reflect";
import { formatPrice } from "@/lib/format";

export default function DashboardView() {
  const { items } = useStore();
  const stats = computeStats(items);
  const months = itemFlowByMonth(items);

  // Default the chart selection to the most recent month with any activity.
  const defaultKey =
    [...months].reverse().find(
      (m) => m.considered + m.bought + m.letGo > 0
    )?.key ?? months[months.length - 1]?.key;
  const [picked, setPicked] = useState<string | null>(null);
  const selectedKey = picked ?? defaultKey;
  const selected =
    months.find((m) => m.key === selectedKey) ?? months[months.length - 1];

  return (
    <div className="space-y-10">
      {/* Proportion of things */}
      <section>
        <div className="grid grid-cols-3 gap-3 sm:max-w-md">
          <Stat label="Considering" value={stats.considering} />
          <Stat label="Bought" value={stats.bought} />
          <Stat label="Let go" value={stats.letGo} />
        </div>
        <ProportionBar
          considering={stats.considering}
          bought={stats.bought}
          letGo={stats.letGo}
        />
      </section>

      {/* Items by month — considered / bought / let go */}
      {months.length > 0 ? (
        <section>
          <h2 className="text-base font-semibold text-ink">Items by month</h2>
          <p className="mt-1 text-meta text-ink-muted">
            What you considered, bought, and let go each month. Tap a month for
            its summary.
          </p>
          <FlowChart
            data={months}
            selectedKey={selectedKey}
            onSelect={setPicked}
            className="mt-5"
          />
          {selected ? (
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink-soft">
              {monthSummary(selected)}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function monthSummary(m: MonthFlow): string {
  const my = `${m.label} '${m.year}`;
  const bits: string[] = [];
  if (m.considered > 0)
    bits.push(`added ${m.considered} want${m.considered === 1 ? "" : "s"}`);
  if (m.bought > 0) bits.push(`bought ${m.bought}`);
  if (m.letGo > 0) bits.push(`let go of ${m.letGo}`);
  if (bits.length === 0) return `Nothing logged or resolved in ${my}.`;
  const list =
    bits.length === 1
      ? bits[0]
      : `${bits.slice(0, -1).join(", ")}${bits.length > 2 ? "," : ""} and ${
          bits[bits.length - 1]
        }`;
  let s = `In ${my}, you ${list}.`;
  if (m.valueLetGo > 0)
    s += ` That's ${formatPrice(m.valueLetGo)} of passing wants you decided against.`;
  return s;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3">
      <div className="font-mono text-2xl font-semibold tabular-nums text-ink">
        {value}
      </div>
      <div className="mt-1 font-mono text-label uppercase text-ink-muted">
        {label}
      </div>
    </div>
  );
}

function ProportionBar({
  considering,
  bought,
  letGo,
}: {
  considering: number;
  bought: number;
  letGo: number;
}) {
  const total = considering + bought + letGo;
  if (total === 0) return null;
  const seg = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="mt-5 max-w-xl">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-line">
        <div className="bg-ink" style={{ width: seg(considering) }} />
        <div className="bg-ink-muted" style={{ width: seg(bought) }} />
        <div className="bg-line-strong" style={{ width: seg(letGo) }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <LegendDot className="bg-ink" label="Considering" />
        <LegendDot className="bg-ink-muted" label="Bought" />
        <LegendDot className="bg-line-strong" label="Let go" />
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-meta text-ink-muted">
      <span className={"h-2 w-2 rounded-full " + className} />
      {label}
    </span>
  );
}

function FlowChart({
  data,
  selectedKey,
  onSelect,
  className = "",
}: {
  data: MonthFlow[];
  selectedKey?: string;
  onSelect: (key: string) => void;
  className?: string;
}) {
  const max = Math.max(
    1,
    ...data.flatMap((d) => [d.considered, d.bought, d.letGo])
  );
  const bar = (n: number, cls: string, series: string, month: string) => (
    <div
      className={"w-2 rounded-t " + cls}
      style={{ height: `${(n / max) * 100}%`, minHeight: n > 0 ? 3 : 0 }}
      title={`${month} · ${series}: ${n}`}
    />
  );
  return (
    <div className={className}>
      {/* Legend — same colours as the proportion bar. */}
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1">
        <LegendDot className="bg-ink" label="Considered" />
        <LegendDot className="bg-ink-muted" label="Bought" />
        <LegendDot className="bg-line-strong" label="Let go" />
      </div>
      <div className="flex items-end gap-1 overflow-x-auto pb-1">
        {data.map((d, i) => {
          const showYear = i === 0 || d.year !== data[i - 1].year;
          const isSelected = d.key === selectedKey;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => onSelect(d.key)}
              aria-pressed={isSelected}
              className={
                "flex shrink-0 flex-col items-center gap-2 rounded-control px-2 py-1 transition-colors " +
                (isSelected ? "bg-surface shadow-soft" : "hover:bg-surface/60")
              }
            >
              <div
                className="flex items-end justify-center gap-1"
                style={{ height: 120 }}
              >
                {bar(d.considered, "bg-ink", "Considered", d.label)}
                {bar(d.bought, "bg-ink-muted", "Bought", d.label)}
                {bar(d.letGo, "bg-line-strong", "Let go", d.label)}
              </div>
              <div
                className={
                  "flex flex-col items-center font-mono text-label uppercase " +
                  (isSelected ? "text-ink" : "text-ink-faint")
                }
              >
                <span>{d.label}</span>
                <span
                  className={
                    showYear
                      ? isSelected
                        ? "text-ink-muted"
                        : "text-ink-faint"
                      : "opacity-0"
                  }
                >
                  &rsquo;{d.year}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
