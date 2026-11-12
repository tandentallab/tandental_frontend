import React from 'react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

// Cùng tông với các thẻ tổng hợp (đã kiểm tra phân biệt được với người mù màu)
export const SERIES = [
    { key: 'moi', label: 'Mới', color: '#059669' },
    { key: 'sua', label: 'Sửa', color: '#f59e0b' },
    { key: 'lamLaiBaoHanh', label: 'Làm lại / Bảo hành', color: '#f43f5e' },
];

const fmt = (n) => (n || 0).toLocaleString('vi-VN');

const TooltipRow = ({ label, value, bold }) => (
    <div className={`flex justify-between gap-6 py-0.5 ${bold ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
        <span>{label}</span>
        <span className="tabular-nums text-gray-900">{value}</span>
    </div>
);

// Tooltip khi đang chọn 1 thẻ: chỉ hiện số của nhóm đó (Hợp Kim / Toàn Sứ / Tổng)
const FocusedTooltip = ({ row, activeKey }) => {
    const series = SERIES.find((s) => s.key === activeKey);
    const b = row[activeKey];
    const khac = (f) => row.sua[f] + row.lamLaiBaoHanh[f];
    const show = activeKey === 'tong'
        ? (f) => <><b>{fmt(row.moi[f])}</b><span className="text-gray-400"> / {fmt(khac(f))}</span></>
        : (f) => fmt(b[f]);
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-sm min-w-[200px]">
            <p className="font-bold text-gray-800 mb-1">{row.label}</p>
            <p className="flex items-center gap-2 text-gray-700 font-semibold mb-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: series ? series.color : '#0284c7' }} />
                {series ? series.label : 'Tổng (Mới / Sửa + LL-BH)'}
            </p>
            <TooltipRow label="Report Hợp Kim" value={show('hopKim')} />
            <TooltipRow label="Report Toàn Sứ" value={show('toanSu')} />
            <div className="border-t border-gray-100 mt-1 pt-1">
                <TooltipRow label="Tổng" value={show('tong')} bold />
            </div>
        </div>
    );
};

const ChartTooltip = ({ active, payload, label, activeKey }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    if (activeKey) return <FocusedTooltip row={row} activeKey={activeKey} />;
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-sm min-w-[200px]">
            <p className="font-bold text-gray-800 mb-1.5">{row.label || label}</p>
            {SERIES.map((s) => (
                <div key={s.key} className="flex items-center justify-between gap-4 py-0.5">
                    <span className="flex items-center gap-2 text-gray-600">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
                        {s.label}
                    </span>
                    <span className="tabular-nums text-gray-900">
                        <b>{fmt(row[s.key].tong)}</b>
                        <span className="text-gray-400 text-xs ml-1">
                            (HK {fmt(row[s.key].hopKim)} · TS {fmt(row[s.key].toanSu)})
                        </span>
                    </span>
                </div>
            ))}
            <div className="flex justify-between border-t border-gray-100 mt-1.5 pt-1.5 font-bold text-gray-900">
                <span>Tổng</span>
                <span className="tabular-nums">{fmt(row.tong.tong)}</span>
            </div>
        </div>
    );
};

/**
 * Biểu đồ cột chồng: số răng mỗi ngày (hoặc tháng), chia theo loại đơn.
 * activeKey: nhóm đang chọn ở thẻ tổng hợp → làm mờ các nhóm khác.
 */
const NangSuatChart = ({ rows, activeKey }) => {
    const data = rows.map((r) => ({
        ...r,
        moiV: r.moi.tong,
        suaV: r.sua.tong,
        lamLaiBaoHanhV: r.lamLaiBaoHanh.tong,
    }));

    const dim = (key) => (activeKey && activeKey !== 'tong' && activeKey !== key ? 0.2 : 1);

    // Bo góc trên cho đoạn trên cùng có số liệu của mỗi cột
    const topKey = (row) => [...SERIES].reverse().find((s) => row[s.key].tong > 0)?.key;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mb-3 text-sm text-gray-700">
                {SERIES.map((s) => (
                    <span key={s.key} className="flex items-center gap-2" style={{ opacity: dim(s.key) === 1 ? 1 : 0.45 }}>
                        <span className="inline-block w-3 h-3 rounded-sm" style={{ background: s.color }} />
                        {s.label}
                    </span>
                ))}
            </div>

            {data.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-gray-400 italic">
                    Không có số liệu trong khoảng thời gian này.
                </div>
            ) : (
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="25%">
                            <CartesianGrid vertical={false} stroke="#eef0f2" />
                            <XAxis
                                dataKey="short"
                                tickLine={false}
                                axisLine={{ stroke: '#d1d5db' }}
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                                interval="preserveStartEnd"
                                minTickGap={8}
                            />
                            <YAxis
                                allowDecimals={false}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                                tickFormatter={fmt}
                            />
                            <Tooltip content={<ChartTooltip activeKey={activeKey} />} cursor={{ fill: 'rgba(15, 23, 42, 0.05)' }} />
                            {SERIES.map((s) => (
                                <Bar
                                    key={s.key}
                                    dataKey={`${s.key}V`}
                                    name={s.label}
                                    stackId="rang"
                                    fill={s.color}
                                    fillOpacity={dim(s.key)}
                                    stroke="#ffffff"
                                    strokeWidth={1}
                                    maxBarSize={36}
                                    isAnimationActive={false}
                                    shape={(props) => {
                                        const { x, y, width, height, fill, fillOpacity, payload } = props;
                                        if (!height || height <= 0) return null;
                                        const r = topKey(payload) === s.key ? Math.min(4, width / 2, height) : 0;
                                        const path = r
                                            ? `M${x},${y + height} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} Z`
                                            : `M${x},${y + height} V${y} H${x + width} V${y + height} Z`;
                                        return <path d={path} fill={fill} fillOpacity={fillOpacity} stroke="#ffffff" strokeWidth={1} />;
                                    }}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

export default NangSuatChart;
