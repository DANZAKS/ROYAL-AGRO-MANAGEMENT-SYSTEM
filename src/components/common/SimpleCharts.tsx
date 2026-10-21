import React, { useState } from 'react';

interface AreaChartProps {
  data: Array<{
    month: string;
    Revenue: number;
    Expenses: number;
    Profit?: number;
    [key: string]: any;
  }>;
  height?: number;
}

export const SvgAreaChart: React.FC<AreaChartProps> = ({ data, height = 280 }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-xs">
        No financial trend data available.
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 40, left: 65 };
  const width = 600;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map((d) => Math.max(d.Revenue || 0, d.Expenses || 0)), 1000000);
  // Round up to nice number
  const yMax = Math.ceil(maxVal / 1000000) * 1000000;

  const getX = (index: number) => padding.left + (index / Math.max(data.length - 1, 1)) * chartWidth;
  const getY = (val: number) => padding.top + chartHeight - (val / yMax) * chartHeight;

  // Build SVG path strings
  const revenuePoints = data.map((d, i) => `${getX(i)},${getY(d.Revenue || 0)}`).join(' ');
  const expensesPoints = data.map((d, i) => `${getX(i)},${getY(d.Expenses || 0)}`).join(' ');

  const revenueArea = `${getX(0)},${padding.top + chartHeight} ${revenuePoints} ${getX(data.length - 1)},${padding.top + chartHeight}`;
  const expensesArea = `${getX(0)},${padding.top + chartHeight} ${expensesPoints} ${getX(data.length - 1)},${padding.top + chartHeight}`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    val: yMax * pct,
    y: padding.top + chartHeight - pct * chartHeight
  }));

  const activeItem = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div className="relative w-full overflow-hidden select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        style={{ minHeight: `${height}px` }}
      >
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7E9D73" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#7E9D73" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E07A5F" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#E07A5F" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y Grid Lines & Labels */}
        {yTicks.map((t, idx) => (
          <g key={idx}>
            <line
              x1={padding.left}
              y1={t.y}
              x2={width - padding.right}
              y2={t.y}
              stroke="#F1F5F9"
              strokeDasharray="3 3"
            />
            <text
              x={padding.left - 8}
              y={t.y + 4}
              textAnchor="end"
              className="text-[10px] fill-slate-400 font-mono font-medium"
            >
              ₦{(t.val / 1000000).toFixed(1)}M
            </text>
          </g>
        ))}

        {/* Area Fills */}
        <polygon points={revenueArea} fill="url(#revGrad)" />
        <polygon points={expensesArea} fill="url(#expGrad)" />

        {/* Lines */}
        <polyline
          fill="none"
          stroke="#7E9D73"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={revenuePoints}
        />
        <polyline
          fill="none"
          stroke="#E07A5F"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={expensesPoints}
        />

        {/* X Axis Labels & Interactive Points */}
        {data.map((d, idx) => {
          const x = getX(idx);
          const yRev = getY(d.Revenue || 0);
          const yExp = getY(d.Expenses || 0);
          const isHovered = hoverIndex === idx;

          return (
            <g
              key={idx}
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              {/* Invisible touch/hover target bar */}
              <rect
                x={x - 20}
                y={padding.top}
                width={40}
                height={chartHeight}
                fill="transparent"
              />

              {/* Vertical guideline on hover */}
              {isHovered && (
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={padding.top + chartHeight}
                  stroke="#94A3B8"
                  strokeDasharray="2 2"
                  strokeWidth="1.5"
                />
              )}

              {/* Data points */}
              <circle
                cx={x}
                cy={yRev}
                r={isHovered ? 5 : 3.5}
                fill="#7E9D73"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              <circle
                cx={x}
                cy={yExp}
                r={isHovered ? 4.5 : 3}
                fill="#E07A5F"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />

              {/* X Axis Label */}
              <text
                x={x}
                y={height - 12}
                textAnchor="middle"
                className={`text-[11px] font-semibold transition-colors ${
                  isHovered ? 'fill-emerald-800 font-bold' : 'fill-slate-500'
                }`}
              >
                {d.month}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Hover Tooltip */}
      {activeItem && (
        <div
          className="absolute top-2 right-2 bg-slate-900/90 backdrop-blur-xs text-white p-2.5 rounded-xl text-xs shadow-xl pointer-events-none z-10 border border-slate-700 animate-in fade-in"
        >
          <p className="font-bold text-slate-300 mb-1">{activeItem.month} Overview</p>
          <div className="flex items-center justify-between gap-4 text-emerald-400">
            <span>Revenue:</span>
            <span className="font-bold">₦{activeItem.Revenue.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-rose-400">
            <span>Expenses:</span>
            <span className="font-bold">₦{activeItem.Expenses.toLocaleString()}</span>
          </div>
          {activeItem.Profit !== undefined && (
            <div className="flex items-center justify-between gap-4 text-white border-t border-slate-700/80 pt-1 mt-1 font-extrabold">
              <span>Net Profit:</span>
              <span className={activeItem.Profit >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                ₦{activeItem.Profit.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pt-2 text-xs font-semibold text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#7E9D73]" />
          <span>Revenue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#E07A5F]" />
          <span>Expenses</span>
        </div>
      </div>
    </div>
  );
};

interface BarChartProps {
  data: Array<{
    name: string;
    Revenue?: number;
    Expenses?: number;
    Profit?: number;
    TotalCredit?: number;
    AmountPaid?: number;
    BalanceDue?: number;
    [key: string]: any;
  }>;
  keys?: Array<{ key: string; label: string; color: string }>;
  height?: number;
}

export const SvgGroupedBarChart: React.FC<BarChartProps> = ({
  data,
  keys = [
    { key: 'Revenue', label: 'Revenue', color: '#7E9D73' },
    { key: 'Expenses', label: 'Expenses', color: '#E07A5F' },
    { key: 'Profit', label: 'Profit', color: '#1B3022' }
  ],
  height = 280
}) => {
  const [hoverData, setHoverData] = useState<{ groupName: string; item: any } | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-xs">
        No comparative branch data available.
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const width = 600;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Compute maximum value
  let maxVal = 0;
  data.forEach((d) => {
    keys.forEach((k) => {
      if (typeof d[k.key] === 'number' && d[k.key] > maxVal) {
        maxVal = d[k.key];
      }
    });
  });
  if (maxVal === 0) maxVal = 100000;
  const yMax = Math.ceil(maxVal / 100000) * 100000;

  const groupWidth = chartWidth / data.length;
  const barWidth = Math.min((groupWidth * 0.7) / keys.length, 24);

  const getY = (val: number) => padding.top + chartHeight - (Math.max(0, val) / yMax) * chartHeight;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    val: yMax * pct,
    y: padding.top + chartHeight - pct * chartHeight
  }));

  return (
    <div className="relative w-full overflow-hidden select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        style={{ minHeight: `${height}px` }}
      >
        {/* Y Grid Lines */}
        {yTicks.map((t, idx) => (
          <g key={idx}>
            <line
              x1={padding.left}
              y1={t.y}
              x2={width - padding.right}
              y2={t.y}
              stroke="#F1F5F9"
              strokeDasharray="3 3"
            />
            <text
              x={padding.left - 8}
              y={t.y + 4}
              textAnchor="end"
              className="text-[10px] fill-slate-400 font-mono font-medium"
            >
              ₦{(t.val / 1000).toFixed(0)}k
            </text>
          </g>
        ))}

        {/* Bar Groups */}
        {data.map((item, gIdx) => {
          const groupCenterX = padding.left + gIdx * groupWidth + groupWidth / 2;
          const totalBarsWidth = keys.length * barWidth;
          const startX = groupCenterX - totalBarsWidth / 2;

          return (
            <g
              key={gIdx}
              className="cursor-pointer"
              onMouseEnter={() => setHoverData({ groupName: item.name, item })}
              onMouseLeave={() => setHoverData(null)}
            >
              {/* Invisible group hover background */}
              <rect
                x={padding.left + gIdx * groupWidth}
                y={padding.top}
                width={groupWidth}
                height={chartHeight}
                fill={hoverData?.groupName === item.name ? '#F8FAFC' : 'transparent'}
                rx={4}
              />

              {keys.map((k, kIdx) => {
                const val = Number(item[k.key] || 0);
                const barH = (Math.max(0, val) / yMax) * chartHeight;
                const barX = startX + kIdx * barWidth;
                const barY = padding.top + chartHeight - barH;

                return (
                  <rect
                    key={k.key}
                    x={barX + 1}
                    y={barY}
                    width={barWidth - 2}
                    height={Math.max(barH, 2)}
                    fill={k.color}
                    rx={3}
                    className="transition-all hover:opacity-85"
                  />
                );
              })}

              {/* X Axis Label */}
              <text
                x={groupCenterX}
                y={height - 14}
                textAnchor="middle"
                className="text-[11px] font-semibold fill-slate-600 truncate"
              >
                {item.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Hover Tooltip */}
      {hoverData && (
        <div className="absolute top-2 right-2 bg-slate-900/90 backdrop-blur-xs text-white p-2.5 rounded-xl text-xs shadow-xl pointer-events-none z-10 border border-slate-700 animate-in fade-in">
          <p className="font-bold text-slate-300 mb-1.5">{hoverData.groupName}</p>
          {keys.map((k) => (
            <div key={k.key} className="flex items-center justify-between gap-4 py-0.5">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: k.color }} />
                {k.label}:
              </span>
              <span className="font-bold text-white">
                ₦{Number(hoverData.item[k.key] || 0).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 pt-2 text-xs font-semibold text-slate-600 flex-wrap">
        {keys.map((k) => (
          <div key={k.key} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: k.color }} />
            <span>{k.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface PieChartProps {
  data: Array<{ name: string; value: number }>;
  colors?: string[];
  height?: number;
}

export const SvgDonutChart: React.FC<PieChartProps> = ({
  data,
  colors = ['#7E9D73', '#E07A5F', '#3B82F6', '#8B5CF6', '#F59E0B', '#10B981'],
  height = 220
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const total = data.reduce((acc, d) => acc + (d.value || 0), 0);

  if (!data || data.length === 0 || total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-xs">
        No category sales recorded.
      </div>
    );
  }

  const cx = 110;
  const cy = 110;
  const outerR = 80;
  const innerR = 48;

  let currentAngle = -Math.PI / 2;

  const slices = data.map((d, idx) => {
    const sliceAngle = (d.value / total) * (Math.PI * 2);
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    const isHovered = hoverIndex === idx;
    const r = isHovered ? outerR + 4 : outerR;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

    const x3 = cx + innerR * Math.cos(endAngle);
    const y3 = cy + innerR * Math.sin(endAngle);
    const x4 = cx + innerR * Math.cos(startAngle);
    const y4 = cy + innerR * Math.sin(startAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const pathData = [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4}`,
      'Z'
    ].join(' ');

    return {
      ...d,
      pathData,
      color: colors[idx % colors.length],
      percentage: ((d.value / total) * 100).toFixed(1)
    };
  });

  const activeSlice = hoverIndex !== null ? slices[hoverIndex] : null;

  return (
    <div className="flex flex-col items-center justify-center select-none w-full">
      <div className="relative">
        <svg width="220" height="220" viewBox="0 0 220 220" className="overflow-visible">
          {slices.map((slice, idx) => (
            <path
              key={idx}
              d={slice.pathData}
              fill={slice.color}
              className="cursor-pointer transition-all duration-150"
              opacity={hoverIndex === null || hoverIndex === idx ? 1 : 0.6}
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseLeave={() => setHoverIndex(null)}
            />
          ))}

          {/* Central Summary */}
          <circle cx={cx} cy={cy} r={innerR - 2} fill="#FFFFFF" />
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            className="text-[10px] font-bold fill-slate-400 uppercase tracking-widest"
          >
            {activeSlice ? activeSlice.name : 'TOTAL'}
          </text>
          <text
            x={cx}
            y={cy + 12}
            textAnchor="middle"
            className="text-xs font-black fill-slate-900"
          >
            {activeSlice ? `${activeSlice.percentage}%` : `₦${(total / 1000000).toFixed(1)}M`}
          </text>
        </svg>
      </div>

      {/* Category Labels */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs w-full max-w-xs">
        {slices.map((slice, idx) => (
          <div
            key={slice.name}
            className={`flex items-center justify-between p-1.5 rounded-lg border transition-colors cursor-pointer ${
              hoverIndex === idx
                ? 'bg-slate-100 border-slate-300 shadow-2xs font-bold'
                : 'bg-white border-slate-100'
            }`}
            onMouseEnter={() => setHoverIndex(idx)}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="truncate text-slate-700 font-medium text-[11px]">{slice.name}</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 ml-1">{slice.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
