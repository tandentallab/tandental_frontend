import React, { useState, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { Box, CircularProgress } from '@mui/material';
import ReportLayout from './shared/ReportLayout';
import DynamicFilterBar from './shared/DynamicFilterBar';
import { fetchNangSuat } from '../../redux/slices/baoCaoSlice';
import NangSuatChart from './NangSuatChart';
import { api } from '../../config/api';
import { printPhieuNangSuat } from './printPhieuNangSuat';

const computeDateRange = (filter, customDates) => {
    if (filter === 'custom') return { startDate: customDates.start, endDate: customDates.end };
    const now = dayjs();
    let start = now, end = now;
    switch (filter) {
        case 'today': break;
        case 'yesterday': start = now.subtract(1, 'day'); end = now.subtract(1, 'day'); break;
        case 'this_week': start = now.startOf('week').add(1, 'day'); break;
        case 'last_week': start = now.subtract(1, 'week').startOf('week').add(1, 'day'); end = now.subtract(1, 'week').endOf('week').add(1, 'day'); break;
        case 'last_7_days': start = now.subtract(6, 'day'); break;
        case 'last_10_days': start = now.subtract(9, 'day'); break;
        case 'this_month': start = now.startOf('month'); break;
        case 'last_month': start = now.subtract(1, 'month').startOf('month'); end = now.subtract(1, 'month').endOf('month'); break;
        case 'last_30_days': start = now.subtract(29, 'day'); break;
        default: start = now.startOf('month');
    }
    return { startDate: start.format('YYYY-MM-DD'), endDate: end.format('YYYY-MM-DD') };
};

const LOAI = [
    { key: 'moi', label: 'Mới', head: 'bg-emerald-50 text-emerald-800', card: 'bg-emerald-600 text-white' },
    { key: 'sua', label: 'Sửa', head: 'bg-amber-50 text-amber-800', card: 'bg-amber-500 text-white' },
    { key: 'lamLaiBaoHanh', label: 'Làm lại / Bảo hành', head: 'bg-rose-50 text-rose-800', card: 'bg-rose-500 text-white' },
];

const fmt = (n) => (n || 0).toLocaleString('vi-VN');

const emptyBucket = () => ({
    moi: { hopKim: 0, toanSu: 0, tong: 0 },
    sua: { hopKim: 0, toanSu: 0, tong: 0 },
    lamLaiBaoHanh: { hopKim: 0, toanSu: 0, tong: 0 },
    tong: { hopKim: 0, toanSu: 0, tong: 0 },
});

const addBucket = (target, src) => {
    ['moi', 'sua', 'lamLaiBaoHanh', 'tong'].forEach((k) => {
        ['hopKim', 'toanSu', 'tong'].forEach((n) => { target[k][n] += src[k]?.[n] || 0; });
    });
};

// Màu tô sáng cột trong bảng khi chọn thẻ tương ứng
const HIGHLIGHT = {
    moi: '!bg-emerald-600 !text-white !border-white',
    sua: '!bg-amber-500 !text-white !border-white',
    lamLaiBaoHanh: '!bg-rose-500 !text-white !border-white',
    tong: '!bg-sky-600 !text-white !border-white',
};

const SummaryCard = ({ label, card, data, active, onClick }) => (
    <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
        className={`rounded-2xl shadow-sm p-4 cursor-pointer select-none transition-all hover:shadow-md ${card} ${active ? 'ring-4 ring-offset-2 ring-gray-700 -translate-y-0.5' : ''}`}
    >
        <div className="flex items-baseline justify-between mb-3">
            <p className="font-bold">{label}</p>
            <p className="text-2xl font-bold tabular-nums">{fmt(data?.tong)}</p>
        </div>
        <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
                <span className="opacity-80">Report Hợp Kim</span>
                <span className="font-semibold tabular-nums">{fmt(data?.hopKim)}</span>
            </div>
            <div className="flex justify-between">
                <span className="opacity-80">Report Toàn Sứ</span>
                <span className="font-semibold tabular-nums">{fmt(data?.toanSu)}</span>
            </div>
        </div>
    </div>
);

const NangSuatPage = () => {
    const dispatch = useDispatch();
    // Tên / SĐT công ty cho đầu phiếu in
    const [company, setCompany] = useState(null);
    useEffect(() => {
        api.get('/cong-ty').then((res) => setCompany(res.data?.data || null)).catch(() => { });
    }, []);
    const [hasSearched, setHasSearched] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState('this_month');
    const [customDates, setCustomDates] = useState({ start: dayjs().format('YYYY-MM-DD'), end: dayjs().format('YYYY-MM-DD') });
    const [appliedRange, setAppliedRange] = useState(null);
    // Nhóm cột đang được tô sáng: 'moi' | 'sua' | 'lamLaiBaoHanh' | 'tong' | null
    const [activeKey, setActiveKey] = useState(null);
    const toggleActive = (key) => setActiveKey((cur) => (cur === key ? null : key));
    const hl = (key) => (activeKey === key ? HIGHLIGHT[key] : '');

    const { nangSuatData, nangSuatLoading, nangSuatError } = useSelector((state) => state.baoCao);

    const draftDates = useMemo(() => computeDateRange(selectedFilter, customDates), [selectedFilter, customDates]);

    const handleView = () => {
        setHasSearched(true);
        setAppliedRange(draftDates);
        dispatch(fetchNangSuat({ startDate: draftDates.startDate, endDate: draftDates.endDate }));
    };

    const isMonthly = useMemo(() => {
        if (!appliedRange) return false;
        return dayjs(appliedRange.endDate).diff(dayjs(appliedRange.startDate), 'day') >= 60;
    }, [appliedRange]);

    // Chi tiết theo ngày (hoặc gom theo tháng khi khoảng thời gian dài)
    const detailRows = useMemo(() => {
        const raw = nangSuatData?.theoNgay || [];
        if (!isMonthly) {
            return raw.map((r) => ({ ...r, label: dayjs(r.ngay).format('DD/MM/YYYY'), short: dayjs(r.ngay).format('DD/MM') }));
        }
        const grouped = {};
        raw.forEach((r) => {
            const key = dayjs(r.ngay).format('YYYY-MM');
            if (!grouped[key]) grouped[key] = emptyBucket();
            addBucket(grouped[key], r);
        });
        return Object.keys(grouped).sort().map((key) => ({
            ...grouped[key],
            label: `Tháng ${dayjs(key + '-01').format('MM/YYYY')}`,
            short: dayjs(key + '-01').format('MM/YYYY'),
        }));
    }, [nangSuatData, isMonthly]);

    const tongHop = nangSuatData?.tongHop || emptyBucket();

    // Cột Tổng cuối: hiển thị dạng "Mới / (Sửa + Làm lại/Bảo hành)"
    // field: 'hopKim' | 'toanSu' | 'tong'
    const renderMoiKhac = (b, field = 'tong') => (
        <>
            <span className="font-bold">{fmt(b.moi[field])}</span>
            <span className="opacity-60"> / {fmt(b.sua[field] + b.lamLaiBaoHanh[field])}</span>
        </>
    );

    const rangeText = appliedRange
        ? appliedRange.startDate === appliedRange.endDate
            ? dayjs(appliedRange.startDate).format('DD/MM/YYYY')
            : `${dayjs(appliedRange.startDate).format('DD/MM/YYYY')} - ${dayjs(appliedRange.endDate).format('DD/MM/YYYY')}`
        : '';

    const handlePrint = () => {
        if (!hasSearched || nangSuatLoading || !nangSuatData) {
            alert('Vui lòng bấm "Xem" để tải dữ liệu trước khi in.');
            return;
        }
        printPhieuNangSuat({ company, rangeText, tongHop });
    };

    const th = 'px-3 py-2 font-semibold text-center whitespace-nowrap border border-gray-300';
    const td = 'px-3 py-2 text-right tabular-nums whitespace-nowrap border border-gray-300';

    return (
        <ReportLayout title="Năng suất">
            <Box className="w-full">
                <div className="no-print">
                    <DynamicFilterBar
                        selectedFilter={selectedFilter} setSelectedFilter={setSelectedFilter}
                        customDates={customDates} setCustomDates={setCustomDates}
                        onView={handleView}
                        showPrintButton={true}
                        onPrint={handlePrint}
                    />
                </div>

                {!hasSearched ? (
                    <div className="flex flex-col items-center justify-center text-gray-400 gap-3 py-16 bg-white rounded-2xl border border-gray-100 shadow-sm mt-4">
                        <span className="text-gray-400 font-medium italic text-base">Vui lòng chọn thời gian và bấm "Xem" để hiển thị năng suất.</span>
                    </div>
                ) : nangSuatLoading ? (
                    <div className="flex justify-center py-16"><CircularProgress size={32} /></div>
                ) : nangSuatError ? (
                    <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl">Lỗi: {nangSuatError}</div>
                ) : (
                    <div className="mt-6 flex flex-col gap-6 animate-in fade-in duration-500">
                        {/* Tổng hợp */}
                        <div className="no-print grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                            {LOAI.map((l) => (
                                <SummaryCard key={l.key} label={l.label} card={l.card} data={tongHop[l.key]}
                                    active={activeKey === l.key} onClick={() => toggleActive(l.key)} />
                            ))}
                            <SummaryCard label="Tổng cộng" card="bg-sky-600 text-white" data={tongHop.tong}
                                active={activeKey === 'tong'} onClick={() => toggleActive('tong')} />
                        </div>

                        {/* Biểu đồ */}
                        {/* Chỉ 1 ngày (1 cột) thì biểu đồ không có ý nghĩa → ẩn */}
                        {detailRows.length > 1 && (
                            <div className="no-print">
                                <NangSuatChart rows={detailRows} activeKey={activeKey} />
                            </div>
                        )}

                        {/* Chi tiết theo thời gian */}
                        <div>
                            <div className="overflow-x-auto bg-white">
                                <table className="w-full text-sm border-collapse border border-gray-300">
                                    <thead>
                                        <tr>
                                            <th rowSpan={2} className={`${th} text-left bg-gray-50 text-gray-700`}>Thời gian</th>
                                            {LOAI.map((l) => (
                                                <th key={l.key} colSpan={2} className={`${th} bg-gray-50 text-gray-700 ${hl(l.key)}`}>{l.label}</th>
                                            ))}
                                            <th colSpan={3} className={`${th} bg-gray-50 text-gray-700 ${hl('tong')}`}>Tổng</th>
                                        </tr>
                                        <tr>
                                            {LOAI.map((l) => (
                                                <React.Fragment key={l.key}>
                                                    <th className={`${th} bg-gray-50 text-gray-700 font-medium ${hl(l.key)}`}>Hợp Kim</th>
                                                    <th className={`${th} bg-gray-50 text-gray-700 font-medium ${hl(l.key)}`}>Toàn Sứ</th>
                                                </React.Fragment>
                                            ))}
                                            <th className={`${th} bg-gray-50 text-gray-700 font-medium ${hl('tong')}`}>Hợp Kim</th>
                                            <th className={`${th} bg-gray-50 text-gray-700 font-medium ${hl('tong')}`}>Toàn Sứ</th>
                                            <th className={`${th} bg-gray-50 text-gray-700 font-medium ${hl('tong')}`}>Tổng</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detailRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={10} className="text-center text-gray-400 italic py-8 border border-gray-300">Không có số liệu trong khoảng thời gian này.</td>
                                            </tr>
                                        ) : detailRows.map((r) => (
                                            <tr key={r.label} className="even:bg-gray-50 hover:bg-sky-50">
                                                <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-700 border border-gray-300">{r.label}</td>
                                                {LOAI.map((l) => (
                                                    <React.Fragment key={l.key}>
                                                        <td className={`${td} ${hl(l.key)}`}>{fmt(r[l.key].hopKim)}</td>
                                                        <td className={`${td} ${hl(l.key)}`}>{fmt(r[l.key].toanSu)}</td>
                                                    </React.Fragment>
                                                ))}
                                                <td className={`${td} ${hl('tong')}`}>{renderMoiKhac(r, 'hopKim')}</td>
                                                <td className={`${td} ${hl('tong')}`}>{renderMoiKhac(r, 'toanSu')}</td>
                                                <td className={`${td} ${hl('tong')}`}>{renderMoiKhac(r)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {detailRows.length > 0 && (
                                        <tfoot>
                                            <tr className="bg-gray-50 font-bold">
                                                <td className="px-3 py-2">Tổng</td>
                                                {LOAI.map((l) => (
                                                    <React.Fragment key={l.key}>
                                                        <td className={`${td} ${hl(l.key)}`}>{fmt(tongHop[l.key].hopKim)}</td>
                                                        <td className={`${td} ${hl(l.key)}`}>{fmt(tongHop[l.key].toanSu)}</td>
                                                    </React.Fragment>
                                                ))}
                                                <td className={`${td} ${hl('tong')}`}>{renderMoiKhac(tongHop, 'hopKim')}</td>
                                                <td className={`${td} ${hl('tong')}`}>{renderMoiKhac(tongHop, 'toanSu')}</td>
                                                <td className={`${td} ${hl('tong')}`}>{renderMoiKhac(tongHop)}</td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </Box>
        </ReportLayout>
    );
};

export default NangSuatPage;
