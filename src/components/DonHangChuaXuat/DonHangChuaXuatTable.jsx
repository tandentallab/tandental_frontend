import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Checkbox, Typography, CircularProgress, Button,
} from "@mui/material";
import {
  startOfDay, endOfDay, isWithinInterval,
} from "date-fns";
import { useDispatch, useSelector } from "react-redux";
import { fetchDonHangChuaHoaDon } from "../../redux/slices/hoaDonSlice";
import { useNavigate } from "react-router-dom";
import { buildProductNameMap } from "../../utils/hoaDonUtils";
import dayjs from "dayjs";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CustomDateRangePicker from "../common/DateRangePicker";

const vndFormatter = new Intl.NumberFormat("vi-VN");
const fmtVND = (v) => vndFormatter.format(Math.round(v || 0));

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";

const getFirstName = (fullName) => {
  if (!fullName) return "";
  const parts = fullName.trim().split(" ");
  return parts[parts.length - 1];
};

const renderViTriText = (viTriArr, viTriText) => {
  if (viTriText) return viTriText;
  if (!viTriArr || viTriArr.length === 0) return "-";
  return viTriArr
    .map((v) => v.kieu === "Rời" ? v.soRang.join(", ") : `${v.soRang[0]}->${v.soRang[v.soRang.length - 1]}`)
    .join(", ");
};

const NUMERIC_KEYS = new Set(["soLuong", "donGia", "tongCong"]);

// ================= CELL STYLES — tĩnh hoàn toàn, tính 1 lần =================
const CELL_STYLES = (() => {
  const base = (key, isHeader = false) => ({
    boxSizing: "border-box", fontSize: isHeader ? "0.8rem" : "0.875rem",
    fontWeight: isHeader ? 700 : 400, color: isHeader ? "#00a8df" : "#1f2937",
    overflow: "hidden", whiteSpace: "nowrap", textOverflow: "clip",
    borderBottom: isHeader ? "1px solid #e6f7ff" : "1px solid #cbd5e1", borderTop: "none",
    pt: isHeader ? 1 : 1.25, pb: isHeader ? 0.5 : 1.25, pl: 2, pr: NUMERIC_KEYS.has(key) ? 3 : 2,
    textAlign: NUMERIC_KEYS.has(key) ? "right" : "left", position: "relative",
    userSelect: isHeader ? "none" : "auto", bgcolor: isHeader ? "#e6f7ff" : "transparent",
  });

  return {
    maDonHang_h: base("maDonHang", true), ngayNhan_h: base("ngayNhan", true), bacSi_h: base("bacSi", true),
    benhNhan_h: base("benhNhan", true), sanPham_h: base("sanPham", true), viTri_h: base("viTri", true),
    loai_h: base("loai", true), soLuong_h: base("soLuong", true), donGia_h: base("donGia", true),
    tongCong_h: base("tongCong", true), ghiChuTaiChinh_h: base("ghiChuTaiChinh", true),
    ngayNhan: base("ngayNhan"), bacSi: base("bacSi"), benhNhan: base("benhNhan"), loai: base("loai"), donGia: base("donGia"),
    maDonHang_link: { ...base("maDonHang"), color: "#00a8df", fontWeight: 600, cursor: "pointer" },
    sanPham_bold: { ...base("sanPham"), fontWeight: 500 }, viTri_mono: { ...base("viTri"), fontFamily: "monospace", fontSize: "0.8rem" },
    soLuong_bold: { ...base("soLuong"), fontWeight: "bold" }, tongCong_bold: { ...base("tongCong"), fontWeight: "bold" },
    ghiChuTaiChinh_ellipsis: { ...base("ghiChuTaiChinh"), textOverflow: "ellipsis" },
  };
})();

const ResizableHeaderCell = React.memo(({ label, columnKey, style, onResize }) => (
  <TableCell sx={style}>
    {label}
    <div onMouseDown={(e) => onResize(columnKey, e)} className="absolute top-0 right-0 w-2 h-full cursor-col-resize z-10 flex items-center justify-center">
      <div className="w-[1.5px] h-[75%] bg-sky-300 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
    </div>
  </TableCell>
));

const RowComponent = React.memo(({ row, isSelected, onToggle, onNavigate }) => (
  <TableRow hover sx={{ bgcolor: isSelected ? "#e8f4fd" : "white", "&:hover": { bgcolor: isSelected ? "#daeefa" : "#f8fafc" } }}>
    <TableCell padding="checkbox" sx={{ borderBottom: "1px solid #cbd5e1", position: "sticky", left: 0, bgcolor: isSelected ? "#e8f4fd" : "white", zIndex: 1 }}>
      <Checkbox size="small" checked={isSelected} sx={{ color: "#00a8df", "&.Mui-checked": { color: "#00a8df" } }} onChange={() => onToggle(row.orderId, row.rawOrder)} />
    </TableCell>
    <TableCell sx={CELL_STYLES.maDonHang_link} onClick={() => onNavigate(`/donhang/${row.orderId}/edit`)}>
      {row.maDonHang}
    </TableCell>
    <TableCell sx={CELL_STYLES.ngayNhan}>{fmtDate(row.ngayNhan)}</TableCell>
    <TableCell sx={CELL_STYLES.bacSi}>{getFirstName(row.bacSi)}</TableCell>
    <TableCell sx={CELL_STYLES.benhNhan}>{row.benhNhan || "-"}</TableCell>
    <TableCell sx={CELL_STYLES.sanPham_bold}>{row.sanPham}</TableCell>
    <TableCell sx={CELL_STYLES.viTri_mono}>{renderViTriText(row.viTri, row.viTriText)}</TableCell>
    <TableCell sx={CELL_STYLES.loai}>{row.loai}</TableCell>
    <TableCell sx={CELL_STYLES.soLuong_bold}>{row.soLuong}</TableCell>
    <TableCell sx={CELL_STYLES.donGia}>{fmtVND(row.donGia)}</TableCell>
    <TableCell sx={CELL_STYLES.tongCong_bold}>{fmtVND(row.tongCong)}</TableCell>
    <TableCell sx={CELL_STYLES.ghiChuTaiChinh_ellipsis} title={row.ghiChuTaiChinh}>{row.ghiChuTaiChinh || " "}</TableCell>
    <TableCell sx={{ padding: 0, borderBottom: "1px solid #cbd5e1", width: 40, minWidth: 40 }} />
  </TableRow>
));

// ================= DEFAULT WIDTHS =================
const DEFAULT_WIDTHS = {
  maDonHang: 110, ngayNhan: 95, bacSi: 75, benhNhan: 140,
  sanPham: 120, viTri: 220, loai: 80, soLuong: 60,
  donGia: 115, tongCong: 120, ghiChuTaiChinh: 180,
};
const COLS_ORDER = Object.keys(DEFAULT_WIDTHS);

export default function DonHangChuaXuatTable({ selectedClinic, selectedOrders, setSelectedOrders, onTaoHoaDon }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { donHangs = [], loadingDonHangs } = useSelector((state) => state.hoaDon) || {};
  const { data: bangGia = [] } = useSelector((state) => state.bangGia) || {};

  const [searchMaDon, setSearchMaDon] = useState("");
  const [visibleCount, setVisibleCount] = useState(25);
  const containerRef = useRef(null);
  const [sentinelEl, setSentinelEl] = useState(null);
  const setSentinelRef = useCallback((node) => setSentinelEl(node), []);

  const today = new Date().toISOString().split("T")[0];
  const defaultFrom = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    d.setDate(28);
    return d.toISOString().split("T")[0];
  })();

  // 1. Khởi tạo state từ sessionStorage (nếu có), nếu không có thì dùng giá trị mặc định
  const [fromDate, setFromDate] = useState(() => sessionStorage.getItem("donHang_fromDate") || defaultFrom);
  const [toDate, setToDate] = useState(() => sessionStorage.getItem("donHang_toDate") || today);
  const [dateLabel, setDateLabel] = useState(() => sessionStorage.getItem("donHang_dateLabel") || "📅 Chọn trên lịch");
  const [anchorElCustomDate, setAnchorElCustomDate] = useState(null);

  // 2. Thêm useEffect để lưu lại giá trị vào sessionStorage mỗi khi người dùng thay đổi bộ lọc ngày
  useEffect(() => {
    sessionStorage.setItem("donHang_fromDate", fromDate);
    sessionStorage.setItem("donHang_toDate", toDate);
    sessionStorage.setItem("donHang_dateLabel", dateLabel);
  }, [fromDate, toDate, dateLabel]);


  // ── Resizable columns — DOM-direct, zero re-render khi kéo ──
  const widthsRef = useRef({ ...DEFAULT_WIDTHS });
  const colElemsRef = useRef(Object.fromEntries(COLS_ORDER.map((k) => [k, null])));
  const tableRef = useRef(null);
  // +48 cho cột checkbox, +40 cho cột ảo nút X
  const totalWidthRef = useRef(COLS_ORDER.reduce((s, k) => s + DEFAULT_WIDTHS[k], 0) + 48 + 40);
  const [tableMinWidth, setTableMinWidth] = useState(totalWidthRef.current);

  const handleResize = useCallback((key, e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = widthsRef.current[key];
    let rafPending = false; let lastClientX = startX;

    const onMove = (mv) => {
      lastClientX = mv.clientX;
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        const newWidth = Math.max(startW + (lastClientX - startX), 40);
        const delta = newWidth - widthsRef.current[key];
        widthsRef.current[key] = newWidth;
        totalWidthRef.current += delta;

        const colEl = colElemsRef.current[key];
        if (colEl) colEl.style.width = `${newWidth}px`;
        if (tableRef.current) tableRef.current.style.minWidth = `${totalWidthRef.current}px`;

        rafPending = false;
      });
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setTableMinWidth(totalWidthRef.current);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  useEffect(() => {
    if (!selectedClinic) return;
    dispatch(fetchDonHangChuaHoaDon(selectedClinic));
  }, [selectedClinic, dispatch]);

  useEffect(() => {
    setVisibleCount(25);
    setSearchMaDon("");
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [selectedClinic]);

  useEffect(() => { setVisibleCount(25); }, [fromDate, toDate, searchMaDon]);

  const activeDateRange = useMemo(() => {
    let start = startOfDay(new Date());
    let end = endOfDay(new Date());
    if (fromDate && toDate) {
      start = startOfDay(new Date(fromDate));
      end = endOfDay(new Date(toDate));
    }
    return { start, end };
  }, [fromDate, toDate]);

  const filteredDonHangs = useMemo(() => {
    return donHangs.filter((o) => {
      return o.ngayNhan && isWithinInterval(new Date(o.ngayNhan), {
        start: activeDateRange.start,
        end: activeDateRange.end,
      });
    });
  }, [donHangs, activeDateRange]);

  const mapTen = useMemo(() => buildProductNameMap(bangGia), [bangGia]);

  const donGiaMap = useMemo(() => {
    const map = {};
    bangGia.forEach((item) => {
      const key = (item.sanPhamId || item.sanPham)?._id?.toString() || (item.sanPhamId || item.sanPham)?.toString();
      if (key) map[key] = Number(item.donGia ?? item.gia ?? 0);
    });
    return map;
  }, [bangGia]);

  const flattenedData = useMemo(() => {
    const result = [];
    filteredDonHangs.forEach((order) => {
      (order.danhSachSanPham || []).forEach((sp, index) => {
        const spId = sp.sanPham?.toString();
        const donGia = donGiaMap[spId] || 0;
        const soLuong = sp.soLuong || 1;
        result.push({
          rowId: `${order._id}_${index}`, orderId: order._id, rawOrder: order,
          maDonHang: order.maDonHang || `TAN${order._id.slice(-8).toUpperCase()}`,
          ngayNhan: order.ngayNhan, bacSi: order.bacSi?.hoVaTen, benhNhan: order.benhNhan?.hoVaTen,
          sanPham: mapTen[spId] || "SP", viTri: sp.viTri, loai: sp.loaiDon || "Mới",
          soLuong, donGia, tongCong: donGia * soLuong, ghiChuTaiChinh: order.ghiChuTaiChinh,
        });
      });
    });
    return result;
  }, [filteredDonHangs, mapTen, donGiaMap]);

  const displayedData = useMemo(() => {
    if (!searchMaDon.trim()) return flattenedData;
    const kw = searchMaDon.toLowerCase().trim();
    return flattenedData.filter((row) => row.maDonHang?.toLowerCase().includes(kw));
  }, [flattenedData, searchMaDon]);

  const totalCost = useMemo(() => displayedData.reduce((s, r) => s + r.tongCong, 0), [displayedData]);
  const selectedSet = useMemo(() => new Set(selectedOrders.map((o) => o._id)), [selectedOrders]);
  const soNhaKhoaDaChon = useMemo(
    () => new Set(selectedOrders.map((o) => o.nhaKhoa?._id || o.nhaKhoa)).size,
    [selectedOrders]
  );

  const uniqueOrdersInDisplay = useMemo(() => {
    const seen = new Set(); const orders = [];
    displayedData.forEach((row) => { if (!seen.has(row.orderId)) { seen.add(row.orderId); orders.push(row.rawOrder); } });
    return orders;
  }, [displayedData]);

  const displayedLenRef = useRef(displayedData.length);
  useEffect(() => { displayedLenRef.current = displayedData.length; }, [displayedData.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !sentinelEl) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((prev) => Math.min(prev + 25, displayedLenRef.current));
      }
    }, { root: container, rootMargin: "200px", threshold: 0 });
    observer.observe(sentinelEl);
    return () => observer.disconnect();
  }, [sentinelEl]);

  const visibleRows = displayedData.slice(0, visibleCount);

  const toggleOrder = useCallback((orderId, rawOrder) => {
    setSelectedOrders((prev) => prev.some((o) => o._id === orderId) ? prev.filter((o) => o._id !== orderId) : [...prev, rawOrder]);
  }, [setSelectedOrders]);

  const toggleAll = useCallback(() => {
    // Chỉ chọn/bỏ chọn các đơn đang hiển thị, giữ nguyên lựa chọn của nha khoa khác.
    const allSelected = uniqueOrdersInDisplay.length > 0 && uniqueOrdersInDisplay.every((o) => selectedSet.has(o._id));
    const displayIds = new Set(uniqueOrdersInDisplay.map((o) => o._id));
    setSelectedOrders((prev) => {
      const conLai = prev.filter((o) => !displayIds.has(o._id));
      return allSelected ? conLai : [...conLai, ...uniqueOrdersInDisplay];
    });
  }, [uniqueOrdersInDisplay, selectedSet, setSelectedOrders]);

  const onNavigate = useCallback((path) => navigate(path), [navigate]);

  const handleCreateHoaDon = () => {
    onTaoHoaDon({
      tuNgay: activeDateRange.start.toISOString(),
      denNgay: activeDateRange.end.toISOString(), // 🔥 dùng đúng "Đến ngày" filter, không phải now()
    });
  };

  const allDisplaySelected = uniqueOrdersInDisplay.length > 0 && uniqueOrdersInDisplay.every((o) => selectedSet.has(o._id));
  const someDisplaySelected = uniqueOrdersInDisplay.some((o) => selectedSet.has(o._id)) && !allDisplaySelected;

  if (!selectedClinic) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-3">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9h18M9 21V9M3 3h18v18H3z" /></svg>
        <Typography color="text.secondary">Chọn nha khoa để xem đơn hàng</Typography>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 h-full w-full relative">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 px-4 py-2 border-b bg-white flex-shrink-0">

        {/* NỬA TRÁI: Bộ lọc ngày + Text số lượng đã chọn */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full xl:w-auto">
          <div className="flex items-center flex-shrink-0">
            <button
              onClick={(e) => setAnchorElCustomDate(e.currentTarget)}
              className="h-10 px-3 flex items-center gap-2 text-base font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
            >
              <CalendarTodayIcon sx={{ fontSize: 14 }} />
              {dateLabel === '📅 Chọn trên lịch' ? (
                fromDate && toDate
                  ? `${dayjs(fromDate).format("DD/MM/YY")} – ${dayjs(toDate).format("DD/MM/YY")}`
                  : "Chọn ngày..."
              ) : (
                dateLabel
              )}
            </button>
            <CustomDateRangePicker
              open={Boolean(anchorElCustomDate)}
              anchorEl={anchorElCustomDate}
              onClose={() => setAnchorElCustomDate(null)}
              initialDates={{ start: fromDate, end: toDate }}
              onApply={(dates) => {
                setFromDate(dates.start);
                setToDate(dates.end);
                setDateLabel(dates.label || '📅 Chọn trên lịch');
                setAnchorElCustomDate(null);
              }}
            />
          </div>

          {selectedOrders.length > 0 && (
            <div className="flex items-center gap-2">
              <Typography variant="body2" sx={{ color: "#00a8df", fontWeight: 600, fontSize: "15px" }}>
                {selectedOrders.length} đơn · {soNhaKhoaDaChon} nha khoa được chọn
              </Typography>
              <Button size="small" onClick={() => setSelectedOrders([])} sx={{ textTransform: "none", minWidth: 0 }}>
                Bỏ chọn
              </Button>
            </div>
          )}
        </div>

        {/* NỬA PHẢI: Nút Tạo hóa đơn + Input tìm kiếm */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 w-full xl:w-auto">
          {selectedOrders.length > 0 && (
            <Button variant="contained" color="primary" size="small" onClick={handleCreateHoaDon} sx={{ width: { xs: "100%", sm: "auto" }, height: "38px", px: 3 }}>
              Tạo hóa đơn
            </Button>
          )}

          <div className="flex items-center gap-1.5 px-2.5 rounded-lg border border-gray-200 bg-gray-50 focus-within:border-blue-400 focus-within:bg-white transition-all w-full sm:w-auto" style={{ minWidth: 200, height: "38px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" className="flex-shrink-0"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input type="text" placeholder="Tìm mã đơn hàng..." value={searchMaDon} onChange={(e) => setSearchMaDon(e.target.value)} className="flex-1 text-base bg-transparent outline-none text-gray-700 placeholder-gray-400 w-full" />
            {searchMaDon && (
              <button onClick={() => setSearchMaDon("")} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 px-4 pt-3 pb-0">
        <TableContainer ref={containerRef} component={Paper} elevation={0} sx={{ borderRadius: "12px 12px 0 0", flex: 1, minHeight: 0, overflowX: "auto", overflowY: "auto", backgroundColor: "#ffffff", border: "none !important", boxShadow: "none !important", "&::-webkit-scrollbar": { height: 10, width: 10 }, "&::-webkit-scrollbar-track": { background: "transparent" }, "&::-webkit-scrollbar-thumb": { backgroundColor: "#cbd5e1", borderRadius: 8, border: "2px solid #ffffff" }, "&::-webkit-scrollbar-thumb:hover": { backgroundColor: "#94a3b8" } }}>
          <Table ref={tableRef} sx={{ tableLayout: "fixed", width: "100%", minWidth: `${tableMinWidth}px`, borderCollapse: "collapse", bgcolor: "white" }}>
            <colgroup>
              <col style={{ width: 48 }} /> {/* checkbox */}
              {COLS_ORDER.map((key) => (
                <col
                  key={key}
                  ref={(el) => { if (el) colElemsRef.current[key] = el; }}
                  style={{ width: DEFAULT_WIDTHS[key] }}
                />
              ))}
              <col style={{ width: 40 }} /> {/* cột ảo */}
            </colgroup>

            <TableHead sx={{ position: "sticky", top: 0, zIndex: 20, bgcolor: "#e6f7ff" }}>
              <TableRow className="group" sx={{ border: "none !important" }}>
                <TableCell padding="checkbox" sx={{ width: 48, minWidth: 48, bgcolor: "#e6f7ff", borderBottom: "1px solid #e6f7ff", borderTopLeftRadius: "12px", position: "sticky", left: 0, zIndex: 21 }}>
                  <Checkbox size="small" sx={{ color: "#00a8df", "&.Mui-checked": { color: "#00a8df" } }} indeterminate={someDisplaySelected} checked={allDisplaySelected} onChange={toggleAll} />
                </TableCell>
                <ResizableHeaderCell label="Đơn hàng" columnKey="maDonHang" style={CELL_STYLES.maDonHang_h} onResize={handleResize} />
                <ResizableHeaderCell label="Ngày nhận" columnKey="ngayNhan" style={CELL_STYLES.ngayNhan_h} onResize={handleResize} />
                <ResizableHeaderCell label="Bác sĩ" columnKey="bacSi" style={CELL_STYLES.bacSi_h} onResize={handleResize} />
                <ResizableHeaderCell label="Bệnh nhân" columnKey="benhNhan" style={CELL_STYLES.benhNhan_h} onResize={handleResize} />
                <ResizableHeaderCell label="Sản phẩm" columnKey="sanPham" style={CELL_STYLES.sanPham_h} onResize={handleResize} />
                <ResizableHeaderCell label="Vị trí" columnKey="viTri" style={CELL_STYLES.viTri_h} onResize={handleResize} />
                <ResizableHeaderCell label="Loại" columnKey="loai" style={CELL_STYLES.loai_h} onResize={handleResize} />
                <ResizableHeaderCell label="S.L" columnKey="soLuong" style={CELL_STYLES.soLuong_h} onResize={handleResize} />
                <ResizableHeaderCell label="Đơn giá" columnKey="donGia" style={CELL_STYLES.donGia_h} onResize={handleResize} />
                <ResizableHeaderCell label="Tổng cộng" columnKey="tongCong" style={CELL_STYLES.tongCong_h} onResize={handleResize} />
                <ResizableHeaderCell label="Ghi chú tài chính" columnKey="ghiChuTaiChinh" style={CELL_STYLES.ghiChuTaiChinh_h} onResize={handleResize} />
                <TableCell sx={{ width: 40, minWidth: 40, padding: 0, borderBottom: "1px solid #e6f7ff", bgcolor: "#e6f7ff", borderTopRightRadius: "12px" }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingDonHangs ? (
                <TableRow><TableCell colSpan={13} align="center" sx={{ py: 8, borderBottom: "none" }}><CircularProgress size={24} sx={{ color: "#00a8df" }} /></TableCell></TableRow>
              ) : displayedData.length === 0 ? (
                <TableRow><TableCell colSpan={13} align="center" sx={{ py: 8, color: "text.secondary", borderBottom: "none" }}>Không có đơn hàng nào</TableCell></TableRow>
              ) : (
                visibleRows.map((row) => (
                  <RowComponent
                    key={row.rowId}
                    row={row}
                    isSelected={selectedSet.has(row.orderId)}
                    onToggle={toggleOrder}
                    onNavigate={onNavigate}
                  />
                ))
              )}
              {!loadingDonHangs && visibleCount < displayedData.length && (
                <TableRow ref={setSentinelRef}><TableCell colSpan={13} align="center" sx={{ py: 2, borderBottom: "none" }}><CircularProgress size={18} sx={{ color: "#00a8df" }} /></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </div>

      <div className="px-4 py-2 border-t bg-white flex-shrink-0 flex justify-between items-center relative z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Typography variant="caption" color="text.secondary" fontSize={12}>
          {visibleCount < displayedData.length ? `${visibleCount} / ${displayedData.length} dòng` : `${displayedData.length} dòng`}
        </Typography>
        <Typography variant="caption" color="text.secondary" fontSize={12}>
          Tổng: <strong>{fmtVND(totalCost)}</strong>
        </Typography>
      </div>
    </div>
  );
}