import React from "react";
import { Box, Typography } from "@mui/material";
import dayjs from "dayjs";
import DateField from "./dateRange/DateField";

// Date <-> "YYYY-MM-DD" (giờ địa phương) để dùng chung lịch RangeCalendar
const toStr = (d) => (d ? dayjs(d).format("YYYY-MM-DD") : "");
const toDate = (s) => (s ? dayjs(s, "YYYY-MM-DD").startOf("day").toDate() : null);

// Bộ chọn khoảng ngày: bấm là mở lịch ngay.
// value = { preset, startDate: Date|null, endDate: Date|null }
// Chọn ngày → preset "custom"; xoá hết → preset "" (không lọc theo ngày).
// Giá trị mốc nhanh cũ (vd "today") vẫn được toISODateRange hiểu, chỉ là không còn chọn được trên giao diện.
const ExportDateSelector = ({
  title,
  value,
  onChange,
  placeholder = "Chọn khoảng ngày",
  maxRangeDays = 30,
}) => {
  const laKhoangNgay = value?.preset === "custom";

  const handleRangeChange = ({ start, end }) => {
    onChange(
      start
        ? { preset: "custom", startDate: toDate(start), endDate: toDate(end) }
        : { preset: "", startDate: null, endDate: null }
    );
  };

  return (
    <Box className="export-date-selector">
      {title && (
        <Typography variant="subtitle2" className="font-semibold text-gray-700 mb-1">
          {title}
        </Typography>
      )}
      <DateField
        mode="range"
        value={{
          start: laKhoangNgay ? toStr(value?.startDate) : "",
          end: laKhoangNgay ? toStr(value?.endDate) : "",
        }}
        onChange={handleRangeChange}
        maxRangeDays={maxRangeDays}
        placeholder={placeholder}
      />
    </Box>
  );
};

export default ExportDateSelector;
