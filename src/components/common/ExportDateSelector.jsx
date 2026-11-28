import React from "react";
import { Box, Typography } from "@mui/material";
import dayjs from "dayjs";
import DateField from "./dateRange/DateField";
import { EXPORT_DATE_PRESETS } from "../../utils/exportDatePresets";

// Mốc chọn nhanh hiện ở đầu lịch (bỏ "Chọn trên Lịch" vì lịch đã mở sẵn)
const QUICK_PRESETS = EXPORT_DATE_PRESETS.filter((p) => p.key !== "custom");

// Date <-> "YYYY-MM-DD" (giờ địa phương) để dùng chung lịch RangeCalendar
const toStr = (d) => (d ? dayjs(d).format("YYYY-MM-DD") : "");
const toDate = (s) => (s ? dayjs(s, "YYYY-MM-DD").startOf("day").toDate() : null);

// Bộ chọn khoảng ngày: bấm là mở lịch ngay, mốc chọn nhanh (Hôm nay, Tuần này...) ở đầu lịch.
// value = { preset, startDate: Date|null, endDate: Date|null }
// Chọn ngày trên lịch → preset "custom"; bấm mốc → preset = key của mốc; xoá hết → preset "".
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
        presets={QUICK_PRESETS}
        activePreset={value?.preset && !laKhoangNgay ? value.preset : undefined}
        onPreset={(p) => onChange({ preset: p.key, startDate: null, endDate: null })}
      />
    </Box>
  );
};

export default ExportDateSelector;
