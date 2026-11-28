import React, { useMemo } from 'react';
import { Popover } from '@mui/material';
import dayjs from 'dayjs';
import RangeCalendar from './dateRange/RangeCalendar';

const NHAN_LICH = '📅 Chọn trên lịch';

// Popover chọn khoảng ngày: mở ra là lịch luôn, mốc chọn nhanh (Hôm nay, Tuần này...) nằm ở đầu lịch.
// onApply nhận { start, end, label } — label là tên mốc, hoặc NHAN_LICH nếu chọn trên lịch.
// "Đặt lại" chỉ xoá lựa chọn trên lịch, không áp dụng khoảng rỗng.
const CustomDateRangePicker = ({ open, anchorEl, onClose, initialDates, onApply, activeLabel }) => {
    const presets = useMemo(() => {
        const today = dayjs();
        const dayOfWeek = today.day();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const startOfThisWeek = today.add(diffToMonday, 'day');
        const startOfLastWeek = startOfThisWeek.subtract(7, 'day');
        const f = (d) => d.format('YYYY-MM-DD');

        return [
            { key: 'Hôm nay', label: 'Hôm nay', start: f(today), end: f(today) },
            { key: 'Hôm qua', label: 'Hôm qua', start: f(today.subtract(1, 'day')), end: f(today.subtract(1, 'day')) },
            { key: 'Tuần này', label: 'Tuần này', start: f(startOfThisWeek), end: f(startOfThisWeek.add(6, 'day')) },
            { key: 'Tuần trước', label: 'Tuần trước', start: f(startOfLastWeek), end: f(startOfLastWeek.add(6, 'day')) },
            { key: 'Tháng này', label: 'Tháng này', start: f(today.startOf('month')), end: f(today.endOf('month')) },
            { key: 'Tháng trước', label: 'Tháng trước', start: f(today.subtract(1, 'month').startOf('month')), end: f(today.subtract(1, 'month').endOf('month')) },
            { key: 'Trong vòng 7 ngày', label: 'Trong vòng 7 ngày', start: f(today.subtract(6, 'day')), end: f(today) },
            { key: 'Trong vòng 30 ngày', label: 'Trong vòng 30 ngày', start: f(today.subtract(29, 'day')), end: f(today) },
        ];
        // Tính lại mỗi lần mở để "Hôm nay" luôn đúng ngày
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const apply = (dates) => {
        onApply?.(dates);
        onClose?.();
    };

    return (
        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            PaperProps={{
                sx: { mt: 1, borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(15,23,42,0.12)' }
            }}
        >
            <RangeCalendar
                initialStart={activeLabel && activeLabel !== NHAN_LICH ? '' : initialDates?.start || ''}
                initialEnd={activeLabel && activeLabel !== NHAN_LICH ? '' : initialDates?.end || ''}
                presets={presets}
                activePreset={activeLabel}
                onPreset={(p) => apply({ start: p.start, end: p.end, label: p.label })}
                onComplete={(dates) => apply({ ...dates, label: NHAN_LICH })}
            />
        </Popover>
    );
};

export default CustomDateRangePicker;
