import React, { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import "./rangeCalendar.css";

// Lịch chọn ngày dùng chung toàn hệ thống.
// - mode="range": bấm ngày bắt đầu rồi ngày kết thúc (bấm ngày nhỏ hơn thì tự đảo).
// - mode="single": bấm 1 ngày là xong.
// Ngày vào/ra đều ở dạng chuỗi "YYYY-MM-DD" ("" = chưa chọn).

const FMT = "YYYY-MM-DD";
const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const DELAY_DONG_MS = 220;

const parse = (s) => (s ? dayjs(String(s).slice(0, 10), FMT) : null);
const hienThi = (d) => (d ? d.format("DD/MM/YYYY") : "--/--/----");

const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 18l-6-6 6-6" /></svg>
);
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 18l6-6-6-6" /></svg>
);

const RangeCalendar = ({
  mode = "range",
  initialStart = "",
  initialEnd = "",
  minDate,
  maxDate,
  maxRangeDays,
  onComplete,
  onReset,
  onSelectionChange,
  resetLabel = "Đặt lại",
  presets, // [{ key, label }] — mốc chọn nhanh hiện ở đầu lịch (Hôm nay, Hôm qua...)
  activePreset, // key mốc đang áp dụng (để tô đậm)
  onPreset, // (preset) => void — bấm 1 mốc là áp dụng luôn
}) => {
  const isSingle = mode === "single";
  const [start, setStart] = useState(() => parse(initialStart));
  const [end, setEnd] = useState(() => (isSingle ? null : parse(initialEnd)));
  const [viewMonth, setViewMonth] = useState(() => (parse(initialStart) || dayjs()).startOf("month"));
  const [loi, setLoi] = useState("");
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const min = useMemo(() => parse(minDate), [minDate]);
  const max = useMemo(() => parse(maxDate), [maxDate]);

  const cells = useMemo(() => {
    const first = viewMonth.startOf("month");
    const offset = first.day(); // CN = 0
    const soNgay = viewMonth.daysInMonth();
    const list = Array.from({ length: offset }, () => null);
    for (let i = 0; i < soNgay; i++) list.push(first.add(i, "day"));
    return list;
  }, [viewMonth]);

  const today = dayjs().startOf("day");

  const xong = (s, e) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onComplete?.({ start: s ? s.format(FMT) : "", end: e ? e.format(FMT) : "" });
    }, DELAY_DONG_MS);
  };

  const handlePick = (date) => {
    setLoi("");
    if (isSingle) {
      setStart(date);
      onSelectionChange?.({ start: date.format(FMT), end: "" });
      xong(date, null);
      return;
    }

    if (!start || (start && end)) {
      setStart(date);
      setEnd(null);
      onSelectionChange?.({ start: date.format(FMT), end: "" });
      return;
    }

    let s = start;
    let e = date;
    if (date.isBefore(start, "day")) {
      s = date;
      e = start;
    }

    // Cùng quy tắc với isCustomRangeTooLong: số ngày chênh lệch > maxRangeDays
    if (maxRangeDays && e.diff(s, "day") > maxRangeDays) {
      setLoi(`Khoảng ngày không được vượt quá ${maxRangeDays} ngày`);
      return;
    }

    setStart(s);
    setEnd(e);
    onSelectionChange?.({ start: s.format(FMT), end: e.format(FMT) });
    xong(s, e);
  };

  const handleReset = () => {
    clearTimeout(timerRef.current);
    setStart(null);
    setEnd(null);
    setLoi("");
    onSelectionChange?.({ start: "", end: "" });
    onReset?.();
  };

  const hint = loi
    ? loi
    : isSingle
      ? start ? "Đã chọn ngày" : "Chọn ngày"
      : !start
        ? "Chọn ngày bắt đầu"
        : !end
          ? "Chọn ngày kết thúc"
          : "Đã chọn khoảng ngày";

  return (
    <div className="rcal" onMouseDown={(e) => e.stopPropagation()}>
      {presets?.length > 0 && (
        <div className="rcal-presets">
          {presets.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`rcal-preset ${activePreset === p.key ? "active" : ""}`}
              onClick={() => {
                clearTimeout(timerRef.current);
                onPreset?.(p);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="rcal-header">
        <button type="button" className="rcal-nav" onClick={() => setViewMonth((m) => m.subtract(1, "month"))} title="Tháng trước">
          <ChevronLeft />
        </button>
        <span className="rcal-month">Tháng {viewMonth.month() + 1} {viewMonth.year()}</span>
        <button type="button" className="rcal-nav" onClick={() => setViewMonth((m) => m.add(1, "month"))} title="Tháng sau">
          <ChevronRight />
        </button>
      </div>

      <div className="rcal-status">
        {isSingle ? (
          <div className={`rcal-pill ${start ? "filled" : ""}`}>
            <span className="lbl">Ngày đã chọn</span>
            <span>{hienThi(start)}</span>
          </div>
        ) : (
          <>
            <div className={`rcal-pill ${start ? "filled" : ""}`}>
              <span className="lbl">Bắt đầu</span>
              <span>{hienThi(start)}</span>
            </div>
            <div className={`rcal-pill ${end ? "filled" : ""}`}>
              <span className="lbl">Kết thúc</span>
              <span>{hienThi(end)}</span>
            </div>
          </>
        )}
      </div>

      <div className="rcal-weekdays">
        {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
      </div>

      <div className="rcal-grid">
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} className="rcal-cell" />;

          const isStart = start && d.isSame(start, "day");
          const isEnd = end && d.isSame(end, "day");
          const inRange = start && end && d.isAfter(start, "day") && d.isBefore(end, "day");
          const disabled = (min && d.isBefore(min, "day")) || (max && d.isAfter(max, "day"));

          const cellCls = ["rcal-cell"];
          if (start && end && (inRange || isStart || isEnd)) {
            cellCls.push("in-range-bg");
            if (isStart) cellCls.push("edge-start");
            if (isEnd) cellCls.push("edge-end");
          }

          const btnCls = ["rcal-day"];
          if (d.isSame(today, "day")) btnCls.push("today");
          if (isStart || isEnd) btnCls.push("selected");
          if (inRange) btnCls.push("in-range");

          return (
            <div key={d.format(FMT)} className={cellCls.join(" ")}>
              <button
                type="button"
                className={btnCls.join(" ")}
                disabled={!!disabled}
                onClick={() => handlePick(d)}
              >
                {d.date()}
              </button>
            </div>
          );
        })}
      </div>

      <div className="rcal-footer">
        <span className="rcal-hint" style={loi ? { color: "#dc2626" } : undefined}>{hint}</span>
        <button type="button" className="rcal-reset" onClick={handleReset}>{resetLabel}</button>
      </div>
    </div>
  );
};

export default RangeCalendar;
