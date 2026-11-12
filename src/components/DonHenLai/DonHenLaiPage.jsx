import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import dayjs from "dayjs";
import { FiSearch, FiRefreshCw, FiChevronLeft, FiChevronRight, FiDownload, FiPrinter } from "react-icons/fi";
import { exportDonHenLaiToExcel } from "../../utils/exportToExcel";
import { calcPrintColWidths, fmtPrintDT, printMaDon, printTableCss } from "../../utils/printTable";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import StoreIcon from "@mui/icons-material/Store";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import { CircularProgress } from "@mui/material";
import { api } from "../../config/api";
import { fetchNhaKhoa } from "../../redux/slices/nhaKhoaSlice";
import DonHangDetailPanel from "../DonHang/DonHangDetailPanel";
import CustomDateRangePicker from "../common/CustomDateRangePicker";

const HEADER_HEIGHT = 70;

const TRANG_THAI_OPTIONS = ["Chờ xử lý", "Đang sản xuất", "Đang thử", "Hoàn thành"];

const COLUMNS = [
  "Nhận lúc",
  "Số",
  "Hẹn giao cũ",
  "Hẹn giao mới",
  "Khách hàng",
  "Bác sĩ",
  "Bệnh nhân",
  "Răng",
  "Trạng thái",
  "Ghi chú (lý do hẹn lại)",
];
const DEFAULT_COL_WIDTHS = [120, 120, 120, 120, 180, 80, 150, 200, 120, 260];

const DATE_PRESETS = [
  { key: "today", label: "Hôm nay" },
  { key: "tomorrow", label: "Ngày mai" },
  { key: "yesterday", label: "Hôm qua" },
  { key: "this_week", label: "Tuần này" },
  { key: "next_week", label: "Tuần sau" },
  { key: "this_month", label: "Tháng này" },
  { key: "custom", label: "Chọn trên Lịch", isCalendar: true },
];

// Trả về khoảng ngày dạng "YYYY-MM-DD" (bao gồm cả 2 đầu)
const presetToRange = (preset) => {
  const t = dayjs().startOf("day");
  const mondayOf = (d) => d.subtract((d.day() + 6) % 7, "day");
  switch (preset) {
    case "today":
      return [t, t];
    case "tomorrow":
      return [t.add(1, "day"), t.add(1, "day")];
    case "yesterday":
      return [t.subtract(1, "day"), t.subtract(1, "day")];
    case "this_week":
      return [mondayOf(t), mondayOf(t).add(6, "day")];
    case "next_week":
      return [mondayOf(t).add(7, "day"), mondayOf(t).add(13, "day")];
    case "this_month":
      return [t.startOf("month"), t.endOf("month").startOf("day")];
    default:
      return [t, t];
  }
};

const makePresetDate = (preset) => {
  const [f, to] = presetToRange(preset);
  return { preset, from: f.format("YYYY-MM-DD"), to: to.format("YYYY-MM-DD") };
};

const formatViTri = (viTriArr) => {
  if (!viTriArr || viTriArr.length === 0) return "";
  return viTriArr
    .map((v) =>
      v.kieu === "Rời" ? v.soRang.join(", ") : `${v.soRang[0]}->${v.soRang[v.soRang.length - 1]}`
    )
    .join("; ");
};

const formatSingleSanPham = (item) => {
  if (!item) return "";
  const loaiDonMap = { Mới: "", "Hàng sửa": "Sửa", "Hàng bảo hành": "Bảo hành", "Hàng làm lại": "Làm lại" };
  const tenSanPham = item.sanPham?.tenSanPham || item.sanPham?.ten || "";
  return [loaiDonMap[item.loaiDon] || "", item.soLuong || 1, tenSanPham, formatViTri(item.viTri), item.mau ? `(${item.mau})` : ""]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
};

const fmtDT = (d) => (d ? format(typeof d === "string" ? parseISO(d) : new Date(d), "HH:mm dd/MM/yyyy") : "—");

const getMaDon = (order) =>
  order.maDonHang || `TAN${String(order._id).substring(String(order._id).length - 8).toUpperCase()}`;

const TrangThaiBadge = ({ value }) => {
  const map = {
    "Chờ xử lý": "bg-yellow-100 text-yellow-800",
    "Đang thử": "bg-purple-100 text-purple-800",
    "Đang sản xuất": "bg-gray-100 text-gray-800",
    "Hoàn thành": "bg-green-100 text-green-800",
  };
  return (
    <span className={`px-2 py-1 rounded font-medium text-base ${map[value] || "bg-gray-100 text-gray-600"}`}>
      {value || "Chờ xử lý"}
    </span>
  );
};

/* ================= Bảng dùng chung cho 2 nửa màn hình ================= */
const HenLaiTable = ({
  title,
  accent,
  rows,
  loading,
  colWidths,
  onResize,
  selectedId,
  onSelect,
  highlightCol,
}) => {
  const navigate = useNavigate();


  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white rounded shadow-sm border overflow-hidden">
      <div className={`shrink-0 flex items-center justify-between px-3 py-1.5 border-b ${accent}`}>
        <span className="font-semibold text-base truncate">{title}</span>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <table
          className="text-base text-left"
          style={{ tableLayout: "fixed", width: colWidths.reduce((a, b) => a + b, 0), minWidth: "100%" }}
        >
          <colgroup>
            {colWidths.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <thead className="text-sky-500 font-medium border-b sticky top-0 bg-white z-10">
            <tr>
              {COLUMNS.map((label, i) => (
                <th key={i} className="px-3 py-2 select-none relative group overflow-hidden text-base whitespace-nowrap">
                  {label}
                  <div
                    onMouseDown={(e) => onResize(e, i)}
                    className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize group-hover:bg-blue-300 hover:bg-blue-400 active:bg-blue-500 z-20 transition-colors"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COLUMNS.length} className="text-center py-8">
                  <CircularProgress size={26} sx={{ color: "#26a69a" }} />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="text-center py-8 text-gray-400 text-base">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const lyDo = row.lyDoHenLaiDong || "";
                const ghiChu = [lyDo, row.ghiChuChung].filter(Boolean).join(" · ");
                const rang = (row.danhSachSanPham || []).map(formatSingleSanPham).filter(Boolean).join("; ");
                return (
                  <tr
                    key={row.henLaiKey}
                    onClick={() => onSelect(row)}
                    className={`border-b cursor-pointer transition-colors ${selectedId === row._id ? "bg-sky-100 border-sky-200" : "hover:bg-gray-50"
                      }`}
                  >
                    <td className="px-3 py-2 truncate text-gray-600">{fmtDT(row.ngayNhan)}</td>
                    <td className="px-3 py-2 truncate">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/donhang/${row._id}/edit`);
                        }}
                        className="font-medium text-base text-gray-700 hover:underline"
                      >
                        {getMaDon(row)}
                      </button>
                    </td>
                    <td className="px-3 py-2 truncate font-medium text-gray-700">
                      {fmtDT(row.henGiaoCu)}
                    </td>
                    <td
                      className={`px-3 py-2 truncate ${highlightCol === "moi" ? "font-semibold text-blue-600" : "font-medium text-gray-700"
                        }`}
                    >
                      {fmtDT(row.henGiaoMoi)}
                    </td>
                    <td className="px-3 py-2 truncate text-gray-800">
                      {row.nhaKhoa?.tenGiaoDich || row.nhaKhoa?.hoVaTen}
                    </td>
                    <td className="px-3 py-2 truncate text-gray-700">{row.bacSi?.hoVaTen}</td>
                    <td className="px-3 py-2 truncate text-gray-700">{row.benhNhan?.hoVaTen}</td>
                    <td className="px-3 py-2 truncate text-gray-700" title={rang}>
                      {rang}
                    </td>
                    <td className="px-3 py-2 truncate"><TrangThaiBadge value={row.trangThai} /></td>
                    <td className="px-3 py-2 truncate text-gray-700" title={ghiChu}>
                      {ghiChu}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ================= Bản in (A4 ngang) ================= */
const PRINT_HEADERS = ["Nhận lúc", "Số", "Hẹn giao cũ", "Hẹn giao mới", "Khách hàng", "Bác sĩ", "Bệnh nhân", "Răng", "Trạng thái", "Ghi chú"];
// nowrap: luôn 1 hàng; số: cột chữ (tối đa px, vượt mới xuống hàng); flex: cột Răng
const PRINT_COL_TYPES = ["nowrap", "nowrap", "nowrap", "nowrap", 140, 110, 120, "flex", "nowrap", 170];
const PRINT_CENTER_COLS = [0, 1, 2, 3, 8];

const toPrintValues = (row) => [
  fmtPrintDT(row.ngayNhan),
  printMaDon(row),
  fmtPrintDT(row.henGiaoCu),
  fmtPrintDT(row.henGiaoMoi),
  row.nhaKhoa?.tenGiaoDich || row.nhaKhoa?.hoVaTen || "",
  row.bacSi?.hoVaTen || "",
  row.benhNhan?.hoVaTen || "",
  (row.danhSachSanPham || []).map(formatSingleSanPham).filter(Boolean).join("; "),
  row.trangThai || "",
  [row.lyDoHenLaiDong, row.ghiChuChung].filter(Boolean).join(" · "),
];

const PrintSection = ({ rangeLabel, sections }) => {
  const { prepared, colWidths } = useMemo(() => {
    const prep = sections.map(({ title, rows }) => ({
      title,
      rows: rows.map((row) => ({ key: row.henLaiKey, values: toPrintValues(row) })),
    }));
    // Hai bảng dùng chung độ rộng cột để thẳng hàng
    const widths = calcPrintColWidths(
      PRINT_HEADERS,
      prep.flatMap((sec) => sec.rows.map((r) => r.values)),
      PRINT_COL_TYPES
    );
    return { prepared: prep, colWidths: widths };
  }, [sections]);

  return (
    <div id="print-hen-lai" className="hidden print:block w-full">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 5mm; }
          html, body, #root, #root > div, main {
            position: static !important; margin: 0 !important; padding: 0 !important;
            width: 100% !important; max-width: 100% !important; min-width: 0 !important;
            height: auto !important; min-height: 0 !important; overflow: visible !important;
            display: block !important; box-shadow: none !important; background: white !important;
          }
          body * { visibility: hidden; }
          #print-hen-lai, #print-hen-lai * { visibility: visible; }
          #print-hen-lai { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; background: white !important; }
          #print-hen-lai h2 { margin: 0 0 6px 0 !important; text-align: center !important; font-size: 16px !important; font-weight: bold !important; text-transform: uppercase !important; }
          #print-hen-lai h3 { margin: 10px 0 4px 0 !important; font-size: 13px !important; font-weight: bold !important; }
          ${printTableCss("#print-hen-lai")}
        }
      `}</style>
      <h2>Đơn hẹn lại ({rangeLabel})</h2>
      {prepared.map(({ title, rows }) => (
        <div key={title}>
          <h3>
            {title} ({rows.length} đơn)
          </h3>
          <table>
            <colgroup>
              {colWidths.map((w, i) => (
                <col key={i} style={w ? { width: w } : undefined} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {PRINT_HEADERS.map((h, i) => (
                  <th key={h} className={`text-center ${PRINT_COL_TYPES[i] === "nowrap" ? "nowrap" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ key, values }) => (
                <tr key={key}>
                  {values.map((v, i) => (
                    <td
                      key={i}
                      className={[
                        PRINT_COL_TYPES[i] === "nowrap" ? "nowrap" : "",
                        PRINT_CENTER_COLS.includes(i) ? "text-center" : "",
                        i === 1 ? "font-semibold" : "",
                      ].join(" ")}
                    >
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={PRINT_HEADERS.length} className="text-center">
                    Không có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

/* ================= Trang chính ================= */
const DonHenLaiPage = () => {
  const dispatch = useDispatch();
  const nhaKhoaState = useSelector((state) => state.nhaKhoa);

  const [dateFilter, setDateFilter] = useState(() => makePresetDate("today"));
  const [nhaKhoa, setNhaKhoa] = useState(null);
  const [trangThai, setTrangThai] = useState([]);

  const [draftNhaKhoa, setDraftNhaKhoa] = useState(null);
  const [draftTrangThai, setDraftTrangThai] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const [showNhaKhoaPicker, setShowNhaKhoaPicker] = useState(false);
  const [nhaKhoaSearch, setNhaKhoaSearch] = useState("");
  const filterRef = useRef(null);

  const [anchorCalendar, setAnchorCalendar] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [data, setData] = useState({ denNgay: [], tuNgay: [] });
  const [loading, setLoading] = useState(false);
  const [selectedDonHang, setSelectedDonHang] = useState(null);
  const [colWidths, setColWidths] = useState(DEFAULT_COL_WIDTHS);

  useEffect(() => {
    dispatch(fetchNhaKhoa());
  }, [dispatch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchText), 500);
    return () => clearTimeout(t);
  }, [searchText]);

  useEffect(() => {
    const handleClick = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        if (e.target.closest?.(".MuiPopover-root, .MuiMenu-root, .MuiModal-root")) return;
        setShowFilter(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        from: dayjs(dateFilter.from).startOf("day").toISOString(),
        to: dayjs(dateFilter.to).endOf("day").toISOString(),
      };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (nhaKhoa) params.nhaKhoa = nhaKhoa._id;
      if (trangThai.length > 0) params.trangThai = trangThai.join(",");
      const res = await api.get("/donhang/hen-lai", { params });
      setData(res.data?.data || { denNgay: [], tuNgay: [] });
    } catch (err) {
      console.error("Lỗi tải đơn hẹn lại:", err);
      setData({ denNgay: [], tuNgay: [] });
    } finally {
      setLoading(false);
    }
  }, [dateFilter, debouncedSearch, nhaKhoa, trangThai]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResizeMouseDown = (e, colIndex) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[colIndex];
    const onMouseMove = (moveEvent) => {
      const newWidth = Math.max(60, startWidth + moveEvent.clientX - startX);
      setColWidths((prev) => {
        const next = [...prev];
        next[colIndex] = newWidth;
        return next;
      });
    };
    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const nhaKhoaOptions = useMemo(() => {
    const d = nhaKhoaState?.data || [];
    return Array.isArray(d)
      ? d.map((nk) => ({ _id: nk._id, name: nk.tenGiaoDich || nk.hoVaTen || "" })).sort((a, b) => a.name.localeCompare(b.name))
      : [];
  }, [nhaKhoaState?.data]);

  const filteredNhaKhoaOpts = useMemo(() => {
    if (!nhaKhoaSearch.trim()) return nhaKhoaOptions;
    const s = nhaKhoaSearch.toLowerCase();
    return nhaKhoaOptions.filter((nk) => nk.name.toLowerCase().includes(s));
  }, [nhaKhoaOptions, nhaKhoaSearch]);

  // Lùi / tiến khoảng ngày theo đúng độ dài khoảng đang chọn
  const shiftDate = (dir) => {
    const len = dayjs(dateFilter.to).diff(dayjs(dateFilter.from), "day") + 1;
    setDateFilter({
      preset: "custom",
      from: dayjs(dateFilter.from).add(dir * len, "day").format("YYYY-MM-DD"),
      to: dayjs(dateFilter.to).add(dir * len, "day").format("YYYY-MM-DD"),
    });
  };

  const rangeLabel =
    dateFilter.from === dateFilter.to
      ? dayjs(dateFilter.from).format("DD/MM/YYYY")
      : `${dayjs(dateFilter.from).format("DD/MM/YYYY")} - ${dayjs(dateFilter.to).format("DD/MM/YYYY")}`;

  const handleOpenFilter = () => {
    setDraftNhaKhoa(nhaKhoa);
    setDraftTrangThai([...trangThai]);
    setShowNhaKhoaPicker(false);
    setShowFilter(true);
  };

  const handleApplyFilters = () => {
    setNhaKhoa(draftNhaKhoa);
    setTrangThai(draftTrangThai);
    setShowFilter(false);
  };

  const handleRefresh = () => {
    setSearchText("");
    setDebouncedSearch("");
    setNhaKhoa(null);
    setTrangThai([]);
    setDateFilter(makePresetDate("today"));
  };

  const isFiltered = !!nhaKhoa || trangThai.length > 0;

  const titleDen = `HẸN ĐẾN ${rangeLabel}`;
  const titleDi = `${rangeLabel} HẸN ĐI`;

  const handleExportExcel = () =>
    exportDonHenLaiToExcel(
      [
        { title: titleDen, rows: data.denNgay },
        { title: titleDi, rows: data.tuNgay },
      ],
      rangeLabel,
      formatSingleSanPham
    );

  const handlePrint = () => window.print();

  const printSections = useMemo(
    () => [
      { title: titleDen, rows: data.denNgay },
      { title: titleDi, rows: data.tuNgay },
    ],
    [titleDen, titleDi, data]
  );

  return (
    <div
      className="px-4 py-3 bg-gray-100 flex flex-col gap-2 overflow-hidden print:block print:h-auto print:p-0 print:overflow-visible"
      style={{ height: `calc(100vh - ${HEADER_HEIGHT}px)` }}
    >
      {/* ===== Thanh công cụ ===== */}
      <div className="shrink-0 flex items-center gap-2 px-1 print:hidden">
          {/* Nút bộ lọc (để ngoài vùng cuộn để dropdown không bị cắt) */}
          <div className="relative shrink-0" ref={filterRef}>
            <button
              onClick={handleOpenFilter}
              title="Bộ lọc"
              className={`relative p-1.5 rounded transition ${isFiltered ? "text-blue-600 bg-blue-50 hover:bg-blue-100" : "text-gray-500 hover:bg-gray-200"
                }`}
            >
              <FilterAltIcon sx={{ fontSize: 20 }} />
              {isFiltered && <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-blue-500 rounded-full" />}
            </button>

            {showFilter && (
              <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-white rounded-xl shadow-2xl border border-gray-200">
                <div className="relative border-b border-gray-100">
                  {showNhaKhoaPicker ? (
                    <div className="px-3 py-2">
                      <input
                        type="text"
                        value={nhaKhoaSearch}
                        onChange={(e) => setNhaKhoaSearch(e.target.value)}
                        placeholder="Tìm nha khoa..."
                        autoFocus
                        className="w-full border-b border-blue-400 px-3 py-1.5 text-base focus:outline-none"
                      />
                    </div>
                  ) : (
                    <button
                      className="w-full flex items-start px-4 py-3 hover:bg-gray-50 transition text-base"
                      onClick={() => {
                        setNhaKhoaSearch("");
                        setShowNhaKhoaPicker(true);
                      }}
                    >
                      <span className={draftNhaKhoa ? "text-blue-600 font-medium truncate" : "text-gray-400"}>
                        {draftNhaKhoa ? draftNhaKhoa.name : "Nha khoa"}
                      </span>
                    </button>
                  )}
                  {showNhaKhoaPicker && (
                    <div className="absolute left-2 top-full z-[100] w-[90%] bg-white rounded shadow-xl border border-t-0 border-gray-200 max-h-56 overflow-y-auto">
                      {draftNhaKhoa && (
                        <button
                          onClick={() => {
                            setDraftNhaKhoa(null);
                            setShowNhaKhoaPicker(false);
                          }}
                          className="w-full text-left px-4 py-2 text-base text-red-500 hover:bg-red-50 border-b border-gray-100 transition"
                        >
                          Bỏ chọn
                        </button>
                      )}
                      {filteredNhaKhoaOpts.map((item) => (
                        <button
                          key={item._id}
                          onClick={() => {
                            setDraftNhaKhoa(item);
                            setShowNhaKhoaPicker(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-base border-b border-gray-50 transition ${draftNhaKhoa?._id === item._id ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                          {item.name}
                        </button>
                      ))}
                      {filteredNhaKhoaOpts.length === 0 && (
                        <p className="text-center text-base text-gray-400 py-4">Không tìm thấy</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-b border-gray-100 px-3 py-2.5">
                  <p className="text-base text-gray-400 mb-1.5">Trạng thái</p>
                  <div className="flex flex-wrap gap-1.5">
                    {TRANG_THAI_OPTIONS.map((status) => {
                      const active = draftTrangThai.includes(status);
                      return (
                        <button
                          key={status}
                          onClick={() =>
                            setDraftTrangThai((prev) =>
                              prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
                            )
                          }
                          className={`px-2.5 py-1 rounded-full border text-base font-medium transition-all ${active ? "bg-blue-500 text-white border-blue-500" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                            }`}
                        >
                          {status}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between px-4 py-3">
                  <button
                    onClick={() => {
                      setDraftNhaKhoa(null);
                      setDraftTrangThai([]);
                    }}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition"
                    title="Reset lọc"
                  >
                    <RefreshIcon sx={{ fontSize: 20 }} />
                  </button>
                  <button
                    onClick={handleApplyFilters}
                    className="flex items-center gap-1 px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white text-base font-semibold rounded-lg transition shadow-sm"
                  >
                    ✓ Lưu
                  </button>
                </div>
              </div>
            )}
          </div>

        {/* Giữa: ngày + preset + tag (cuộn ngang nếu quá dài, không xuống hàng) */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden whitespace-nowrap">
          {/* Chọn ngày */}
          <div className="flex items-center bg-white border rounded-full overflow-hidden shrink-0">
            <button onClick={() => shiftDate(-1)} className="px-2 py-1.5 text-gray-500 hover:bg-gray-100" title="Lùi">
              <FiChevronLeft size={16} />
            </button>
            <button
              onClick={(e) => setAnchorCalendar(e.currentTarget)}
              className="px-2 py-1 flex items-center gap-1.5 text-base font-semibold text-blue-700 hover:bg-blue-50"
              title="Chọn ngày trên lịch"
            >
              <CalendarTodayIcon sx={{ fontSize: 15 }} />
              {rangeLabel}
            </button>
            <button onClick={() => shiftDate(1)} className="px-2 py-1.5 text-gray-500 hover:bg-gray-100" title="Tiến">
              <FiChevronRight size={16} />
            </button>
          </div>
          <CustomDateRangePicker
            open={Boolean(anchorCalendar)}
            anchorEl={anchorCalendar}
            onClose={() => setAnchorCalendar(null)}
            initialDates={{ start: dateFilter.from, end: dateFilter.to }}
            onApply={(dates) => {
              setAnchorCalendar(null);
              if (!dates?.start) return;
              setDateFilter({ preset: "custom", from: dates.start, to: dates.end || dates.start });
            }}
          />

          {DATE_PRESETS.filter((p) => !p.isCalendar).map((p) => (
            <button
              key={p.key}
              onClick={() => setDateFilter(makePresetDate(p.key))}
              className={`px-2.5 py-1 rounded-full border text-sm font-medium transition ${dateFilter.preset === p.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
            >
              {p.label}
            </button>
          ))}

          {nhaKhoa && (
            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-base font-medium px-2.5 py-1 rounded-full">
              <StoreIcon sx={{ fontSize: 11 }} />
              {nhaKhoa.name}
              <button onClick={() => setNhaKhoa(null)} className="ml-0.5 hover:text-blue-900 flex items-center">
                <CloseIcon sx={{ fontSize: 12 }} />
              </button>
            </span>
          )}
          {trangThai.map((status) => (
            <span
              key={status}
              className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-base font-medium px-2.5 py-1 rounded-full"
            >
              {status}
              <button
                onClick={() => setTrangThai((prev) => prev.filter((s) => s !== status))}
                className="ml-0.5 hover:text-blue-900 flex items-center"
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </button>
            </span>
          ))}
        </div>

        {/* Phải: tìm kiếm + thao tác */}
        <div className="shrink-0 flex items-center gap-1">
          <div className="relative w-48 xl:w-60 mr-1">
            <FiSearch size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-8 pr-3 py-1.5 border rounded-full text-base bg-white w-full focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            {searchText && (
              <button
                onClick={() => setSearchText("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <CloseIcon sx={{ fontSize: 15 }} />
              </button>
            )}
          </div>
          <button
            onClick={handleExportExcel}
            disabled={loading}
            className="p-2 rounded hover:bg-gray-200 text-gray-500 transition disabled:opacity-50"
            title="Xuất Excel"
          >
            <FiDownload size={17} />
          </button>
          <button
            onClick={handlePrint}
            disabled={loading}
            className="p-2 rounded hover:bg-gray-200 text-gray-500 transition disabled:opacity-50"
            title="In danh sách"
          >
            <FiPrinter size={17} />
          </button>
          <button onClick={handleRefresh} className="p-2 rounded hover:bg-gray-200 text-gray-500 transition" title="Làm mới">
            <FiRefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ===== 2 bảng chia đôi chiều cao còn lại ===== */}
      <div className="flex-1 min-h-0 flex flex-col gap-2 print:hidden">
        <HenLaiTable
          title={titleDen}
          accent="bg-blue-50 text-blue-800"
          rows={data.denNgay}
          loading={loading}
          colWidths={colWidths}
          onResize={handleResizeMouseDown}
          selectedId={selectedDonHang?._id}
          onSelect={setSelectedDonHang}
          highlightCol="moi"
        />
        <HenLaiTable
          title={titleDi}
          accent="bg-orange-50 text-orange-800"
          rows={data.tuNgay}
          loading={loading}
          colWidths={colWidths}
          onResize={handleResizeMouseDown}
          selectedId={selectedDonHang?._id}
          onSelect={setSelectedDonHang}
        />

      </div>

      <PrintSection
        rangeLabel={rangeLabel}
        sections={printSections}
      />

      {selectedDonHang && (
        <DonHangDetailPanel donHang={selectedDonHang} onClose={() => setSelectedDonHang(null)} />
      )}
    </div>
  );
};

export default DonHenLaiPage;
