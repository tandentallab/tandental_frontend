import React from "react";
import dayjs from "dayjs";
import DateField from "./DateField";

// Chọn ngày (lịch dùng chung) + giờ. value / onChange: "YYYY-MM-DDTHH:mm" ("" = chưa chọn).
// minDateTime / maxDateTime: "YYYY-MM-DDTHH:mm" (hoặc ISO) — kết quả luôn bị kẹp trong khoảng này.
const FMT = "YYYY-MM-DDTHH:mm";

const DateTimeField = ({
  value,
  onChange,
  label,
  placeholder,
  minDateTime,
  maxDateTime,
  defaultTime, // giờ mặc định khi mới chọn ngày, vd "08:00"; bỏ trống = giờ hiện tại
  disabled = false,
  clearable = true,
  variant = "outlined",
  className = "",
}) => {
  const ngay = value ? value.slice(0, 10) : "";
  const gio = value ? value.slice(11, 16) : "";

  const min = minDateTime ? dayjs(minDateTime) : null;
  const max = maxDateTime ? dayjs(maxDateTime) : null;

  const kep = (str) => {
    let d = dayjs(str);
    if (!d.isValid()) return str;
    if (min && d.isBefore(min)) d = min;
    if (max && d.isAfter(max)) d = max;
    return d.format(FMT);
  };

  const handleNgay = (n) => {
    if (!n) {
      onChange?.("");
      return;
    }
    const g = gio || defaultTime || dayjs().format("HH:mm");
    onChange?.(kep(`${n}T${g}`));
  };

  const handleGio = (g) => {
    if (!ngay) return;
    onChange?.(kep(`${ngay}T${g || "00:00"}`));
  };

  const timeCls =
    variant === "standard"
      ? "border-0 border-b border-gray-300 focus:border-blue-600 px-0 py-1 text-[15px] outline-none bg-transparent disabled:opacity-60"
      : "border-[1.5px] border-slate-200 rounded-[10px] px-2 h-10 text-[15px] outline-none focus:border-blue-600 bg-white disabled:bg-slate-50";

  return (
    <div className={className}>
      {label && <span className="rcal-label">{label}</span>}
      <div className="flex items-end gap-2">
        <DateField
          mode="single"
          className="flex-1 min-w-0"
          variant={variant}
          value={ngay}
          onChange={handleNgay}
          placeholder={placeholder}
          minDate={min ? min.format("YYYY-MM-DD") : undefined}
          maxDate={max ? max.format("YYYY-MM-DD") : undefined}
          disabled={disabled}
          clearable={clearable}
        />
        <input
          type="time"
          aria-label="Giờ"
          className={timeCls}
          disabled={disabled || !ngay}
          value={gio}
          onChange={(e) => handleGio(e.target.value)}
        />
      </div>
    </div>
  );
};

export default DateTimeField;
