import React, { useState, useRef } from 'react';
import { Print, CalendarMonth } from '@mui/icons-material';
import dayjs from 'dayjs';
import CustomDateRangePicker from '../../common/DateRangePicker';

/* GIAO DIỆN GẠCH CHÂN */
const FieldWrapper = ({ label, children, className = '' }) => (
    <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
        <span className="text-base text-gray-500 leading-none">{label}</span>
        {/* Giữ w-fit để gạch dưới ôm sát chữ */}
        <div className="flex items-center border-b-2 border-gray-400 pb-1 min-w-0 w-fit">
            {children}
        </div>
    </div>
);

// BẢNG ÁNH XẠ
const LABEL_TO_VALUE_MAP = {
    'Hôm nay': 'today',
    'Hôm qua': 'yesterday',
    'Tuần này': 'this_week',
    'Tuần trước': 'last_week',
    'Tháng này': 'this_month',
    'Tháng trước': 'last_month',
    'Trong vòng 7 ngày': 'last_7_days',
    'Trong vòng 30 ngày': 'last_30_days',
    '📅 Chọn trên lịch': 'custom',
    'Chọn trên lịch': 'custom'
};

const DynamicFilterBar = ({
    selectedFilter, setSelectedFilter,
    customDates, setCustomDates,
    onView,
    showPrintButton,
    onPrint,
    extraFilters,
    extraFilterLabel
}) => {
    const filterContainerRef = useRef(null);
    const [anchorEl, setAnchorEl] = useState(null);
    const [dateLabel, setDateLabel] = useState('Tháng này');
    const hasExtraFilters = Boolean(extraFilters);

    return (
        <div className="mb-2" ref={filterContainerRef}>
            {/* Đảm bảo w-full để container bung hết chiều ngang */}
            <div className="flex flex-wrap items-end gap-2 w-full">

                {/* 1. THỜI GIAN (Ở mobile là dòng 2, neo bên trái) */}
                <FieldWrapper
                    label="Thời gian"
                    className="order-2 md:order-1 min-w-0"
                >
                    <button
                        onClick={() => setAnchorEl(filterContainerRef.current)}
                        className="flex items-center gap-1.5 text-base font-medium text-gray-900 hover:text-blue-600 transition-colors px-1 outline-none min-w-0"
                        style={{ minWidth: hasExtraFilters ? '130px' : '100px' }}
                    >
                        <CalendarMonth sx={{ fontSize: 20, color: '#8c857e' }} className="shrink-0" />
                        <span className="flex-1 min-w-0 truncate text-left">
                            {dateLabel === '📅 Chọn trên lịch' ? (
                                customDates?.start && customDates?.end
                                    ? `${dayjs(customDates.start).format('DD/MM/YY')} - ${dayjs(customDates.end).format('DD/MM/YY')}`
                                    : 'Chọn ngày...'
                            ) : (
                                dateLabel
                            )}
                        </span>
                    </button>
                </FieldWrapper>

                {/* 2. BỘ LỌC LOẠI / KHÁCH HÀNG (Ở mobile là w-full chiếm trọn dòng 1) */}
                {extraFilters && (
                    <div
                        className="order-1 md:order-2 w-full md:w-auto flex flex-col gap-1"
                        style={{ minWidth: 180 }}
                    >
                        <span className="text-base text-gray-500 leading-none">{extraFilterLabel || 'Loại'}</span>
                        <div className="text-base font-medium text-gray-900">
                            {extraFilters}
                        </div>
                    </div>
                )}

                {/* 3 & 4. NHÓM NÚT (Gom chung vào 1 div, dùng ml-auto để đẩy toàn bộ sang mép phải) */}
                <div className="order-3 flex items-end gap-2 ml-auto shrink-0">

                    {/* NÚT XEM */}
                    <button
                        onClick={onView}
                        className="px-6 py-2 bg-green-600 text-white text-base font-bold rounded-full hover:bg-green-700 transition-all shadow-sm active:scale-95 shrink-0"
                    >
                        Xem
                    </button>

                    {/* NÚT IN (Giữ nguyên style của bạn) */}
                    {showPrintButton && (
                        hasExtraFilters ? (
                            <button
                                onClick={onPrint}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-300 text-emerald-700 font-semibold hover:bg-emerald-100 transition active:scale-95"
                            >
                                <Print sx={{ fontSize: 20 }} />
                                In
                            </button>
                        ) : (
                            <button
                                onClick={onPrint}
                                aria-label="In"
                                title="In"
                                className="flex items-center justify-center w-20 h-10 p-0 rounded-full md:w-auto md:h-auto md:gap-2 md:px-4 md:py-2 md:rounded-none bg-emerald-200 border border-emerald-300 text-emerald-700 font-semibold hover:bg-emerald-100 transition active:scale-95 shrink-0"
                            >
                                <Print sx={{ fontSize: 26 }} />
                                <span className="hidden md:inline">In</span>
                            </button>
                        )
                    )}
                </div>

            </div>

            <CustomDateRangePicker
                activeLabel={dateLabel}
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                initialDates={customDates}
                onApply={(dates) => {
                    setCustomDates({ start: dates.start, end: dates.end });

                    const newLabel = dates.label || '📅 Chọn trên lịch';
                    setDateLabel(newLabel);

                    if (setSelectedFilter) {
                        const filterValue = LABEL_TO_VALUE_MAP[newLabel] || 'custom';
                        setSelectedFilter(filterValue);
                    }

                    setAnchorEl(null);
                }}
            />
        </div>
    );
};

export default DynamicFilterBar;