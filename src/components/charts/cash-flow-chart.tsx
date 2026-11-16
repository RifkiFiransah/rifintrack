import { formatCompactRupiah, formatRupiah } from "@/lib/money";
import type { CashFlowPoint } from "@/services/dashboard.service";

const WIDTH = 720;
const HEIGHT = 240;
const PADDING = { top: 16, right: 16, bottom: 32, left: 64 };

function niceCeil(value: number) {
  if (value <= 0) return 1;

  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

  return step * magnitude;
}

export function CashFlowChart({
  data,
  ariaLabel = "Grafik arus kas",
}: {
  data: CashFlowPoint[];
  ariaLabel?: string;
}) {
  const hasData = data.some((point) => point.income > 0 || point.expense > 0);

  if (!hasData) {
    return (
      <p className="py-10 text-center text-sm text-text-secondary">
        Belum ada pemasukan atau pengeluaran dalam 6 bulan terakhir.
      </p>
    );
  }

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const maxValue = Math.max(
    1,
    ...data.flatMap((point) => [point.income, point.expense]),
  );
  const scaleMax = niceCeil(maxValue);

  const x = (index: number) =>
    PADDING.left +
    (data.length <= 1 ? plotWidth / 2 : (index * plotWidth) / (data.length - 1));

  const y = (value: number) =>
    PADDING.top + plotHeight - (value / scaleMax) * plotHeight;

  const line = (key: "income" | "expense") =>
    data.map((point, index) => `${x(index)},${y(point[key])}`).join(" ");

  const gridLines = [0, 0.5, 1];

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
          Pemasukan
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-danger" aria-hidden="true" />
          Pengeluaran
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-56 w-full"
        role="img"
        aria-label={ariaLabel}
      >
        {gridLines.map((ratio) => {
          const value = scaleMax * ratio;
          const gridY = y(value);
          return (
            <g key={ratio}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={gridY}
                y2={gridY}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={PADDING.left - 8}
                y={gridY + 4}
                textAnchor="end"
                className="fill-text-muted text-[10px]"
              >
                {formatCompactRupiah(value)}
              </text>
            </g>
          );
        })}

        <polyline
          points={line("income")}
          fill="none"
          className="stroke-success"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <polyline
          points={line("expense")}
          fill="none"
          className="stroke-danger"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {data.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle
              cx={x(index)}
              cy={y(point.income)}
              r={3.5}
              className="fill-success"
            >
              <title>{`${point.label} pemasukan: ${formatRupiah(point.income)}`}</title>
            </circle>
            <circle
              cx={x(index)}
              cy={y(point.expense)}
              r={3.5}
              className="fill-danger"
            >
              <title>{`${point.label} pengeluaran: ${formatRupiah(point.expense)}`}</title>
            </circle>
            <text
              x={x(index)}
              y={HEIGHT - 10}
              textAnchor="middle"
              className="fill-text-secondary text-[11px]"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
