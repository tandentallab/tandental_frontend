import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Checkbox, Typography,
  CircularProgress, Button, MenuItem, Select, FormControl, InputLabel, IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  startOfDay, endOfDay, subDays, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, subWeeks, subMonths, isWithinInterval,
} from "date-fns";
import { useDispatch, useSelector } from "react-redux";
import { fetchDonHangChuaHoaDon } from "../../redux/slices/hoaDonSlice";
import { fetchBangGiaByNhaKhoa } from "../../redux/slices/bangGiaSlice";
import { buildProductNameMap } from "../../utils/hoaDonUtils";
import dayjs from "dayjs";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CustomDateRangePicker from "../common/CustomDateRangePicker"; // 🔥 IMPORT LỊCH XỊN

const vndFormatter = new Intl.NumberFormat("vi-VN");
const fmtVND = (v) => vndFormatter.format(Math.round(v || 0));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";
const getFirstName = (fullName) => { if (!fullName) return ""; return fullName.trim().split(" ").pop(); };
const renderViTriText = (viTriArr, viTriText) => {
  if (viTriText) return viTriText;
  if (!viTriArr || viTriArr.length === 0) return "-";
  return viTriArr.map((v) => v.kieu === "Rời" ? v.soRang.join(", ") : `${v.soRang[0]}->${v.soRang[v.soRang.length - 1]}`).join("; ");
};
const NUMERIC_KEYS = new Set(["soLuong", "donGia", "tongCong"]);

const ResizableHeaderCell = React.memo(({ label, columnKey, isLast, style, onResize }) => (
  <TableCell sx={isLast ? { ...style, borderTopRightRadius: "8px" } : style}>
    {label}
    <div onMouseDown={(e) => onResize(columnKey, e)} className="absolute top-0 right-0 w-2 h-full cursor-col-resize z-10 flex items-center justify-center group">
      <div className="w-[1.5px] h-[75%] bg-sky-300 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
    </div>
  </TableCell>
));

const RowComponent = React.memo(({ row, isSelected, cellStyles, onToggle }) => (
  <TableRow hover sx={{ bgcolor: isSelected ? "#e8f4fd" : "white", "&:hover": { bgcolor: isSelected ? "#daeefa" : "#f8fafc" } }}>
    <TableCell padding="checkbox" sx={{ borderBottom: "1px solid #cbd5e1", position: "sticky", left: 0, zIndex: 1, bgcolor: isSelected ? "#e8f4fd" : "white" }}>
      <Checkbox size="small" checked={isSelected} sx={{ color: "#00a8df", "&.Mui-checked": { color: "#00a8df" } }} onChange={() => onToggle(row.orderId, row.rawOrder)} />
    </TableCell>
    <TableCell sx={cellStyles.maDonHang}>{row.maDonHang}</TableCell>
    <TableCell sx={cellStyles.ngayNhan}>{fmtDate(row.ngayNhan)}</TableCell>
    <TableCell sx={cellStyles.bacSi}>{getFirstName(row.bacSi)}</TableCell>
    <TableCell sx={cellStyles.benhNhan}>{row.benhNhan || "-"}</TableCell>
    <TableCell sx={cellStyles.sanPham_bold}>{row.sanPham}</TableCell>
    <TableCell sx={cellStyles.viTri_mono}>{renderViTriText(row.viTri, row.viTriText)}</TableCell>
    <TableCell sx={cellStyles.loai}>{row.loai}</TableCell>
    <TableCell sx={cellStyles.soLuong_bold}>{row.soLuong}</TableCell>
    <TableCell sx={cellStyles.donGia}>{fmtVND(row.donGia)}</TableCell>
    <TableCell sx={cellStyles.tongCong_bold}>{fmtVND(row.tongCong)}</TableCell>
    <TableCell sx={cellStyles.ghiChuTaiChinh_ellipsis} title={row.ghiChuTaiChinh}>{row.ghiChuTaiChinh || "-"}</TableCell>
    <TableCell sx={{ padding: 0, borderBottom: "1px solid #cbd5e1", width: "auto", minWidth: 0 }} />
  </TableRow>
));

export default function DonHangChuaXuatModal({ open, onClose, selectedClinic, onAddOrders }) {
  const dispatch = useDispatch();
  const { donHangs = [], loading } = useSelector((state) => state.hoaDon) || {};
  const { data: bangGia = [] } = useSelector((state) => state.bangGia) || {};
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [dateFilter, setDateFilter] = useState("thisMonth");
  const [searchMaDon, setSearchMaDon] = useState("");
  const [visibleCount, setVisibleCount] = useState(25);
  const containerRef = useRef(null);
  const sentinelRef = useRef(null);

  const today = new Date().toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  // 🔥 STATE NEO LỊCH
  const [anchorElCustomDate, setAnchorElCustomDate] = useState(null);

  useEffect(() => {
    if (open) {
      setSelectedOrders([]);
      if (selectedClinic) {
        dispatch(fetchDonHangChuaHoaDon(selectedClinic));
        dispatch(fetchBangGiaByNhaKhoa(selectedClinic));
      }
    }
  }, [open, selectedClinic, dispatch]);

  const [columnWidths, setColumnWidths] = useState({
    maDonHang: 110, ngayNhan: 95, bacSi: 75, benhNhan: 140,
    sanPham: 120, viTri: 200, loai: 80, soLuong: 50,
    donGia: 100, tongCong: 100, ghiChuTaiChinh: 140,
  });
  const columnWidthsRef = useRef(columnWidths);
  useEffect(() => { columnWidthsRef.current = columnWidths; }, [columnWidths]);
  const totalTableWidth = useMemo(() => Object.values(columnWidths).reduce((a, b) => a + b, 0) + 48, [columnWidths]);

  const handleResize = useCallback((key, e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = columnWidthsRef.current[key];
    let rafPending = false; let lastClientX = startX;
    const onMove = (mv) => {
      lastClientX = mv.clientX;
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        setColumnWidths((p) => ({ ...p, [key]: Math.max(startW + (lastClientX - startX), 40) }));
        rafPending = false;
      });
    };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
  }, []);

  const cellStyles = useMemo(() => {
    const base = (key, isHeader = false) => ({
      width: columnWidths[key], minWidth: columnWidths[key], maxWidth: columnWidths[key],
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
      maDonHang: { ...base("maDonHang"), fontWeight: 600, color: "#00a8df" },
      ngayNhan: base("ngayNhan"), bacSi: base("bacSi"), benhNhan: base("benhNhan"), loai: base("loai"), donGia: base("donGia"),
      sanPham_bold: { ...base("sanPham"), fontWeight: 500 }, viTri_mono: { ...base("viTri"), fontFamily: "monospace", fontSize: "0.8rem" },
      soLuong_bold: { ...base("soLuong"), fontWeight: "bold" }, tongCong_bold: { ...base("tongCong"), fontWeight: "bold" },
      ghiChuTaiChinh_ellipsis: { ...base("ghiChuTaiChinh"), textOverflow: "ellipsis" },
    };
  }, [columnWidths]);

  const activeDateRange = useMemo(() => {
    const now = new Date(); let start = startOfMonth(now), end = endOfDay(now);
    switch (dateFilter) {
      case "today": start = startOfDay(now); end = endOfDay(now); break;
      case "yesterday": { const y = subDays(now, 1); start = startOfDay(y); end = endOfDay(y); break; }
      case "thisWeek": start = startOfWeek(now, { weekStartsOn: 1 }); end = endOfWeek(now, { weekStartsOn: 1 }); break;
      case "lastWeek": { const lw = subWeeks(now, 1); start = startOfWeek(lw, { weekStartsOn: 1 }); end = endOfWeek(lw, { weekStartsOn: 1 }); break; }
      case "thisMonth": start = startOfMonth(now); end = endOfMonth(now); break;
      case "lastMonth": { const lm = subMonths(now, 1); start = startOfMonth(lm); end = endOfMonth(lm); break; }
      case "all": start = new Date(0); end = endOfDay(now); break;
      case "custom": if (fromDate && toDate) { start = startOfDay(new Date(fromDate)); end = endOfDay(new Date(toDate)); } break;
      default: break;
    }
    return { start, end };
  }, [dateFilter, fromDate, toDate]);

  const filteredDonHangs = useMemo(() => {
    const clinicOrders = donHangs.filter(o => o.nhaKhoa === selectedClinic || o.nhaKhoa?._id === selectedClinic);
    return clinicOrders.filter((o) => isWithinInterval(new Date(o.ngayNhan), { start: activeDateRange.start, end: activeDateRange.end }));
  }, [donHangs, activeDateRange, selectedClinic]);

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
        // Mua giùm nha khoa: có đơn giá nhập tay trên dòng, ghi chú dòng = tên món hàng
        const coDonGiaNhapTay = sp.donGia !== null && sp.donGia !== undefined;
        const donGia = coDonGiaNhapTay ? Number(sp.donGia) : (donGiaMap[spId] || 0);
        const soLuong = sp.soLuong || 1;
        result.push({
          rowId: `${order._id}_${index}`,
          orderId: order._id,
          rawOrder: order,
          maDonHang: order.maDonHang || `TAN${order._id.slice(-8).toUpperCase()}`,
          ngayNhan: order.ngayNhan,
          bacSi: order.bacSi?.hoVaTen,
          benhNhan: order.benhNhan?.hoVaTen,
          sanPhamId: spId,
          sanPhamDonHangId: sp._id,
          ghiChu: sp.ghiChu,
          ghiChuMuaGium: coDonGiaNhapTay ? (sp.ghiChu || "") : "",
          sanPham: mapTen[spId] || "SP",
          viTri: sp.viTri,
          loai: sp.loaiDon || "Mới",
          soLuong, donGia, tongCong: donGia * soLuong,
          ghiChuTaiChinh: order.ghiChuTaiChinh,
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
  const uniqueOrdersInDisplay = useMemo(() => {
    const seen = new Set(); const orders = [];
    displayedData.forEach((row) => { if (!seen.has(row.orderId)) { seen.add(row.orderId); orders.push(row.rawOrder); } });
    return orders;
  }, [displayedData]);

  useEffect(() => { setVisibleCount(25); }, [displayedData]);
  useEffect(() => {
    const container = containerRef.current; const sentinel = sentinelRef.current;
    if (!container || !sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setVisibleCount((prev) => Math.min(prev + 25, displayedData.length)); },
      { root: container, threshold: 0.1 }
    );
    observer.observe(sentinel); return () => observer.disconnect();
  }, [displayedData.length]);

  const visibleRows = displayedData.slice(0, visibleCount);

  const toggleOrder = useCallback((orderId, rawOrder) => {
    setSelectedOrders((prev) => prev.some((o) => o._id === orderId) ? prev.filter((o) => o._id !== orderId) : [...prev, rawOrder]);
  }, []);
  const toggleAll = useCallback(() => {
    const allSelected = uniqueOrdersInDisplay.length > 0 && uniqueOrdersInDisplay.every((o) => selectedSet.has(o._id));
    setSelectedOrders(allSelected ? [] : uniqueOrdersInDisplay);
  }, [uniqueOrdersInDisplay, selectedSet]);

  const allDisplaySelected = uniqueOrdersInDisplay.length > 0 && uniqueOrdersInDisplay.every((o) => selectedSet.has(o._id));
  const someDisplaySelected = uniqueOrdersInDisplay.some((o) => selectedSet.has(o._id)) && !allDisplaySelected;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth scroll="paper" PaperProps={{ sx: { height: "90vh" } }}>
      <DialogTitle sx={{ m: 0, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
        <Typography variant="h6" fontWeight={700} color="#0f172a">
          Thêm đơn hàng chưa xuất ({selectedOrders.length} đơn đang chọn)
        </Typography>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: "flex", flexCol: "column", height: "100%", overflow: "hidden" }}>
        <div className="flex-1 flex flex-col min-h-0 w-full relative bg-white">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Lọc ngày</InputLabel>
              <Select value={dateFilter} label="Lọc ngày" onChange={(e) => setDateFilter(e.target.value)}>
                <MenuItem value="all">Tất cả thời gian</MenuItem>
                <MenuItem value="custom">Chọn khoảng ngày</MenuItem>
                <MenuItem value="today">Hôm nay</MenuItem>
                <MenuItem value="yesterday">Hôm qua</MenuItem>
                <MenuItem value="thisWeek">Tuần này</MenuItem>
                <MenuItem value="lastWeek">Tuần trước</MenuItem>
                <MenuItem value="thisMonth">Tháng này</MenuItem>
                <MenuItem value="lastMonth">Tháng trước</MenuItem>
              </Select>
            </FormControl>

            {/* 🔥 THAY ĐỔI Ở ĐÂY: GỌI LỊCH CUSTOM THAY VÌ DATEPICKER MUI */}
            {dateFilter === "custom" && (
              <div className="flex items-center gap-2 relative">
                <button
                  onClick={(e) => setAnchorElCustomDate(e.currentTarget)}
                  className="h-10 px-3 flex items-center justify-center gap-2 text-base font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shadow-sm min-w-[220px]"
                >
                  <CalendarTodayIcon sx={{ fontSize: 18 }} />
                  {fromDate && toDate
                    ? `${dayjs(fromDate).format('DD/MM/YYYY')} - ${dayjs(toDate).format('DD/MM/YYYY')}`
                    : "Chọn khoảng ngày..."}
                </button>
                <CustomDateRangePicker
                  open={Boolean(anchorElCustomDate)}
                  anchorEl={anchorElCustomDate}
                  onClose={() => setAnchorElCustomDate(null)}
                  initialDates={{
                    start: fromDate,
                    end: toDate,
                  }}
                  onApply={(dates) => {
                    setFromDate(dates.start);
                    setToDate(dates.end);
                    setAnchorElCustomDate(null);
                  }}
                />
              </div>
            )}

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 focus-within:border-blue-400 focus-within:bg-white transition-all min-w-[200px]">
              <input type="text" placeholder="Tìm mã đơn..." value={searchMaDon} onChange={(e) => setSearchMaDon(e.target.value)} className="flex-1 text-base bg-transparent outline-none text-gray-700" />
            </div>

            <div className="ml-auto text-base text-gray-500 font-medium hidden sm:block">
              {visibleCount < displayedData.length ? `${visibleCount}/${displayedData.length}` : displayedData.length} dòng | Tổng: <span className="text-[#00a8df] font-bold">{fmtVND(totalCost)}</span>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-auto" ref={containerRef}>
            <TableContainer sx={{ border: "none !important", boxShadow: "none !important", "&::-webkit-scrollbar": { height: 10, width: 10 }, "&::-webkit-scrollbar-thumb": { backgroundColor: "#cbd5e1", borderRadius: 8, border: "2px solid #ffffff" } }}>
              <Table sx={{ tableLayout: "fixed", width: "100%", minWidth: `${totalTableWidth}px`, borderCollapse: "collapse" }}>
                <TableHead sx={{ position: "sticky", top: 0, zIndex: 20, bgcolor: "#e6f7ff" }}>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ width: 48, minWidth: 48, bgcolor: "#e6f7ff", borderBottom: "1px solid #e6f7ff", position: "sticky", left: 0, zIndex: 21 }}>
                      <Checkbox size="small" sx={{ color: "#00a8df", "&.Mui-checked": { color: "#00a8df" } }} indeterminate={someDisplaySelected} checked={allDisplaySelected} onChange={toggleAll} />
                    </TableCell>
                    <ResizableHeaderCell label="Đơn hàng" columnKey="maDonHang" style={cellStyles.maDonHang_h} onResize={handleResize} />
                    <ResizableHeaderCell label="Ngày nhận" columnKey="ngayNhan" style={cellStyles.ngayNhan_h} onResize={handleResize} />
                    <ResizableHeaderCell label="Bác sĩ" columnKey="bacSi" style={cellStyles.bacSi_h} onResize={handleResize} />
                    <ResizableHeaderCell label="Bệnh nhân" columnKey="benhNhan" style={cellStyles.benhNhan_h} onResize={handleResize} />
                    <ResizableHeaderCell label="Sản phẩm" columnKey="sanPham" style={cellStyles.sanPham_h} onResize={handleResize} />
                    <ResizableHeaderCell label="Vị trí" columnKey="viTri" style={cellStyles.viTri_h} onResize={handleResize} />
                    <ResizableHeaderCell label="Loại" columnKey="loai" style={cellStyles.loai_h} onResize={handleResize} />
                    <ResizableHeaderCell label="S.L" columnKey="soLuong" style={cellStyles.soLuong_h} onResize={handleResize} />
                    <ResizableHeaderCell label="Đơn giá" columnKey="donGia" style={cellStyles.donGia_h} onResize={handleResize} />
                    <ResizableHeaderCell label="Tổng cộng" columnKey="tongCong" style={cellStyles.tongCong_h} onResize={handleResize} />
                    <ResizableHeaderCell label="Ghi chú" columnKey="ghiChuTaiChinh" style={cellStyles.ghiChuTaiChinh_h} onResize={handleResize} isLast />
                    <TableCell sx={{ width: "auto", minWidth: 0, padding: 0, borderBottom: "1px solid #e6f7ff", bgcolor: "#e6f7ff" }} />
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={13} align="center" sx={{ py: 8 }}><CircularProgress size={24} sx={{ color: "#00a8df" }} /></TableCell></TableRow>
                  ) : displayedData.length === 0 ? (
                    <TableRow><TableCell colSpan={13} align="center" sx={{ py: 8, color: "text.secondary" }}>Không có đơn hàng nào</TableCell></TableRow>
                  ) : (
                    visibleRows.map((row) => (
                      <RowComponent key={row.rowId} row={row} isSelected={selectedSet.has(row.orderId)} cellStyles={cellStyles} onToggle={toggleOrder} />
                    ))
                  )}
                  {!loading && visibleCount < displayedData.length && (
                    <TableRow ref={sentinelRef}><TableCell colSpan={13} align="center" sx={{ py: 2 }}><CircularProgress size={18} sx={{ color: "#00a8df" }} /></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </div>
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
        <Button onClick={onClose} variant="outlined" sx={{ color: "#64748b", borderColor: "#cbd5e1" }}>
          Hủy bỏ
        </Button>
        <Button
          variant="contained"
          sx={{ bgcolor: "#00a8df", "&:hover": { bgcolor: "#0288d1" }, fontWeight: "bold", px: 4 }}
          onClick={() => {
            const enrichedProducts = flattenedData.filter(row => selectedSet.has(row.orderId));
            onAddOrders(selectedOrders, enrichedProducts);
            onClose();
          }}
          disabled={selectedOrders.length === 0}
        >
          Thêm {selectedOrders.length} đơn vào hóa đơn
        </Button>
      </DialogActions>
    </Dialog>
  );
}