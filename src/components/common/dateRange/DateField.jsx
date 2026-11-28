import React, { useEffect, useRef, useState } from "react";
import { Popover } from "@mui/material";
import dayjs from "dayjs";
import RangeCalendar from "./RangeCalendar";
import "./rangeCalendar.css";

// Ô chọn ngày dùng chung: bấm vào ô → mở lịch bên dưới.
// mode="range":  value = { start: "YYYY-MM-DD", end: "YYYY-MM-DD" }, onChange({ start, end })
// mode="single": value = "YYYY-MM-DD",                               onChange("YYYY-MM-DD" | "")

const hienThi = (s) => (s ? dayjs(String(s).slice(0, 10)).format("DD/MM/YYYY") : "");

const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const DateField = ({
  mode = "range",
  value,
  onChange,
  label,
  placeholder,
  minDate,
  maxDate,
  maxRangeDays,
  disabled = false,
  clearable = true,
  variant = "outlined", // "outlined" | "standard" (gạch chân)
  className = "",
  style,
  defaultOpen = false, // mở lịch ngay khi ô vừa hiện ra
  presets, // [{ key, label }] mốc chọn nhanh trong lịch
  activePreset, // key mốc đang áp dụng → ô hiển thị nhãn của mốc
  onPreset, // (preset) => void
}) => {
  const isSingle = mode === "single";
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (defaultOpen && !disabled) setOpen(true);
    // chỉ chạy lúc mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = isSingle ? (value || "") : (value?.start || "");
  const end = isSingle ? "" : (value?.end || "");

  const nhanMoc = activePreset ? presets?.find((p) => p.key === activePreset)?.label : "";
  const text = nhanMoc ? nhanMoc : isSingle
    ? hienThi(start)
    : start && end
      ? `${hienThi(start)}  →  ${hienThi(end)}`
      : start
        ? `${hienThi(start)}  →  ...`
        : "";

  const emit = (dates) => {
    if (isSingle) onChange?.(dates.start || "");
    else onChange?.({ start: dates.start || "", end: dates.end || "" });
  };

  const handleClear = (e) => {
    e.stopPropagation();
    emit({ start: "", end: "" });
  };

  const cls = ["rcal-input"];
  if (variant === "standard") cls.push("standard");
  if (open) cls.push("active");
  if (disabled) cls.push("disabled");

  return (
    <div className={className} style={style}>
      {label && <span className="rcal-label">{label}</span>}
      <div
        ref={anchorRef}
        className={cls.join(" ")}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <CalendarIcon />
        <span className={`rcal-input-text ${text ? "" : "placeholder"}`}>
          {text || placeholder || (isSingle ? "Chọn ngày" : "Chọn ngày bắt đầu - kết thúc")}
        </span>
        {clearable && !disabled && (start || nhanMoc) && (
          <button type="button" className="rcal-clear" title="Xóa" onClick={handleClear}>×</button>
        )}
      </div>

      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        // Nổi trên các modal tự dựng có z-index cao
        sx={{ zIndex: 99999 }}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 30px rgba(15,23,42,0.12)",
          },
        }}
      >
        <RangeCalendar
          mode={mode}
          initialStart={nhanMoc ? "" : start}
          initialEnd={nhanMoc ? "" : end}
          minDate={minDate}
          maxDate={maxDate}
          maxRangeDays={maxRangeDays}
          onComplete={(dates) => {
            emit(dates);
            setOpen(false);
          }}
          onReset={() => emit({ start: "", end: "" })}
          presets={presets}
          activePreset={activePreset}
          onPreset={(p) => {
            onPreset?.(p);
            setOpen(false);
          }}
        />
      </Popover>
    </div>
  );
};

export default DateField;
