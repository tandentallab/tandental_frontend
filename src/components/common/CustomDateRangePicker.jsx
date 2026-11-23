import React from 'react';
import { Popover } from '@mui/material';
import RangeCalendar from './dateRange/RangeCalendar';

// Popover lịch chọn khoảng ngày (giao diện dùng chung RangeCalendar).
// Chọn xong ngày kết thúc (hoặc 1 ngày với mode="single") là tự áp dụng & đóng.
// "Đặt lại" = áp dụng khoảng rỗng (bỏ lọc).
const CustomDateRangePicker = ({ open, anchorEl, onClose, initialDates, onApply, mode = 'range', minDate, maxDate }) => {
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
                mode={mode}
                initialStart={initialDates?.start || ''}
                initialEnd={initialDates?.end || ''}
                minDate={minDate}
                maxDate={maxDate}
                onComplete={apply}
                onReset={() => apply({ start: '', end: '' })}
            />
        </Popover>
    );
};

export default CustomDateRangePicker;
