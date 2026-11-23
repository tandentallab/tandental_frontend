import React from 'react';
import { Popover } from '@mui/material';
import RangeCalendar from './dateRange/RangeCalendar';

const NHAN_LICH = '📅 Chọn trên lịch';

// Popover chọn khoảng ngày: mở ra là lịch luôn (không còn danh sách mốc nhanh).
// onApply nhận { start, end, label } — label giữ nguyên để nơi gọi biết là ngày chọn trên lịch.
// "Đặt lại" chỉ xoá lựa chọn trên lịch, không áp dụng khoảng rỗng.
const CustomDateRangePicker = ({ open, anchorEl, onClose, initialDates, onApply }) => (
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
            initialStart={initialDates?.start || ''}
            initialEnd={initialDates?.end || ''}
            onComplete={(dates) => {
                onApply?.({ ...dates, label: NHAN_LICH });
                onClose?.();
            }}
        />
    </Popover>
);

export default CustomDateRangePicker;
