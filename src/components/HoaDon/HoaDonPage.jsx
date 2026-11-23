import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Modal,
  FormControl,
  Select,
  MenuItem,
  Chip,
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import { SearchIcon } from "lucide-react";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import FilterListIcon from "@mui/icons-material/FilterList";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CloseIcon from "@mui/icons-material/Close";
import StoreIcon from "@mui/icons-material/Store";
import { toast } from "sonner";
import DownloadIcon from "@mui/icons-material/Download";
import SvgIcon from "@mui/material/SvgIcon";
import dayjs from "dayjs";

import { fetchAllHoaDonAdmin, resetEditedHoaDonIds } from "../../redux/slices/hoaDonSlice";
import { fetchNhaKhoa } from "../../redux/slices/nhaKhoaSlice";
import ThongKeCongNo from "./ThongKeCongNo";
import HoaDonFilterDrawer from "./HoaDonFilterDrawer";
import HoaDonTable from "./HoaDonTable";
import { exportHoaDonListToExcel } from "../../utils/exportToExcel";
import { api } from "../../config/api";
import CustomDateRangePicker from "../common/CustomDateRangePicker";

function ExcelIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <rect x="2" y="3" width="20" height="18" rx="2" ry="2" fill="#1b7a34" />
      <path d="M6 7h12v2H6z" fill="#fff" />
      <path
        d="M7.2 15.5l1.6-2.3 1.6 2.3 1.6-2.3 1.6 2.3"
        stroke="#fff"
        strokeWidth="0.9"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

const DATE_PRESETS = [
  { key: "custom", label: "Chọn trên Lịch", isCalendar: true },
  { key: "today", label: "Hôm nay" },
  { key: "yesterday", label: "Hôm qua" },
  { key: "this_week", label: "Tuần này" },
  { key: "this_month", label: "Tháng này" },
  { key: "this_year", label: "Năm nay" },
  { key: "last_7", label: "Trong vòng 7 ngày" },
  { key: "last_10", label: "Trong vòng 10 ngày" },
  { key: "last_30", label: "Trong vòng 30 ngày" },
];

const EMPTY_DATE = { preset: null, customFrom: "", customTo: "" };

const _getDateRange = (preset) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1
  );
  switch (preset) {
    case "today":
      return { from: today, to: tomorrow };
    case "yesterday": {
      const f = new Date(today);
      f.setDate(f.getDate() - 1);
      return { from: f, to: today };
    }
    case "this_week": {
      const d = today.getDay();
      const f = new Date(today);
      f.setDate(today.getDate() - (d === 0 ? 6 : d - 1));
      return { from: f, to: tomorrow };
    }
    case "this_month":
      return {
        from: new Date(today.getFullYear(), today.getMonth(), 1),
        to: tomorrow,
      };
    case "this_year":
      return { from: new Date(today.getFullYear(), 0, 1), to: tomorrow };
    case "last_7": {
      const f = new Date(today);
      f.setDate(f.getDate() - 7);
      return { from: f, to: tomorrow };
    }
    case "last_10": {
      const f = new Date(today);
      f.setDate(f.getDate() - 10);
      return { from: f, to: tomorrow };
    }
    case "last_30": {
      const f = new Date(today);
      f.setDate(f.getDate() - 30);
      return { from: f, to: tomorrow };
    }
    default:
      return { from: null, to: null };
  }
};

const computeDateRange = (filter) => {
  if (!filter?.preset) return { fromDate: "", toDate: "" };
  if (filter.preset === "custom") {
    return {
      fromDate: filter.customFrom
        ? new Date(filter.customFrom).toISOString()
        : "",
      toDate: filter.customTo
        ? new Date(filter.customTo + "T23:59:59").toISOString()
        : "",
    };
  }
  const { from, to } = _getDateRange(filter.preset);
  return {
    fromDate: from ? from.toISOString() : "",
    toDate: to ? to.toISOString() : "",
  };
};

const HoaDonPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    danhSachHoaDon = [],
    pagination = {},
    loading = false,
  } = useSelector((state) => state.hoaDon);
  const nhaKhoa = useSelector((state) => state.nhaKhoa);

  const [page, setPage] = useState(() => Number(sessionStorage.getItem("hd_page")) || 0);
  const [rowsPerPage, setRowsPerPage] = useState(() => Number(sessionStorage.getItem("hd_rowsPerPage")) || 50);
  const [activeTabThongKe, setActiveTabThongKe] = useState(() => sessionStorage.getItem("hd_activeTabThongKe") || "");

  const [appliedNgayXuat, setAppliedNgayXuat] = useState(() => {
    const saved = sessionStorage.getItem("hd_appliedNgayXuat_v2");
    return saved ? JSON.parse(saved) : EMPTY_DATE;
  });
  const [appliedNhaKhoa, setAppliedNhaKhoa] = useState(() => {
    const saved = sessionStorage.getItem("hd_appliedNhaKhoa");
    return saved ? JSON.parse(saved) : null;
  });
  const [appliedTrangThai, setAppliedTrangThai] = useState(() => {
    const saved = sessionStorage.getItem("hd_appliedTrangThai_v2");
    return saved ? JSON.parse(saved) : ["Lưu tạm", "Chưa thanh toán", "Thanh toán một phần"];
  });
  const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem("hd_searchTerm") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [sortOrder, setSortOrder] = useState(() => sessionStorage.getItem("hd_sortOrder") || "desc");

  const [openFilter, setOpenFilter] = useState(false);
  const filterContainerRef = useRef(null);
  const isFirstRender = useRef(true);

  // STATES CHO MODAL XUẤT EXCEL
  const [openExport, setOpenExport] = useState(false);
  const [exportDateFilter, setExportDateFilter] = useState(EMPTY_DATE);
  const [exportTrangThai, setExportTrangThai] = useState([]);
  const [exporting, setExporting] = useState(false);

  // STATES CHO DROPDOWN NHA KHOA MỚI (MODAL XUẤT)
  const [exportNhaKhoaObj, setExportNhaKhoaObj] = useState(null);
  const [openExportNhaKhoaDropdown, setOpenExportNhaKhoaDropdown] = useState(false);
  const [exportNhaKhoaSearch, setExportNhaKhoaSearch] = useState("");
  const exportNhaKhoaRef = useRef(null);

  // STATES CHO DROPDOWN NGÀY (MODAL XUẤT)
  const [exportDateAnchorEl, setExportDateAnchorEl] = useState(null);
  const exportDateRef = useRef(null);

  useEffect(() => { sessionStorage.setItem("hd_activeTabThongKe", activeTabThongKe); }, [activeTabThongKe]);
  useEffect(() => { sessionStorage.setItem("hd_page", page.toString()); }, [page]);
  useEffect(() => { sessionStorage.setItem("hd_rowsPerPage", rowsPerPage.toString()); }, [rowsPerPage]);
  useEffect(() => { sessionStorage.setItem("hd_sortOrder", sortOrder); }, [sortOrder]);
  useEffect(() => { sessionStorage.setItem("hd_appliedNgayXuat_v2", JSON.stringify(appliedNgayXuat)); }, [appliedNgayXuat]);
  useEffect(() => { sessionStorage.setItem("hd_appliedNhaKhoa", JSON.stringify(appliedNhaKhoa)); }, [appliedNhaKhoa]);
  useEffect(() => { sessionStorage.setItem("hd_appliedTrangThai_v2", JSON.stringify(appliedTrangThai)); }, [appliedTrangThai]);
  useEffect(() => { sessionStorage.setItem("hd_searchTerm", searchTerm); }, [searchTerm]);

  // Khi rời trang: nếu KHÔNG phải sang HoaDonDetail thì reset trạng thái về default
  useEffect(() => {
    return () => {
      const nextPath = window.location.pathname;
      const isGoingToDetail = nextPath.startsWith("/hoa-don/") && nextPath.includes("/edit");
      if (isGoingToDetail) {
        // 🔥 Đánh dấu là Kế toán đang đi vào xem chi tiết
        sessionStorage.setItem("hd_keep_data", "true");
      } else {
        // Đi sang Menu khác thì dọn dẹp sạch sẽ
        dispatch(resetEditedHoaDonIds()); // 🔥 Kích hoạt hàm xóa trí nhớ
        sessionStorage.removeItem("hd_keep_data");
        sessionStorage.removeItem("hd_appliedTrangThai_v2");
        sessionStorage.removeItem("hd_sortOrder");
        sessionStorage.removeItem("hd_rowsPerPage");
        sessionStorage.removeItem("hd_tableScrollTop");
        sessionStorage.removeItem("hd_mobileScrollTop");
      }
    };
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchNhaKhoa());
  }, [dispatch]);

  // 🔥 VÁ LỖ HỔNG Ô TÌM KIẾM
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== debouncedSearch) {
        dispatch(resetEditedHoaDonIds()); // 🔥 Xóa trí nhớ khi tìm kiếm mới
        setDebouncedSearch(searchTerm);
        setPage(0);
        setRowsPerPage(50); // Reset số dòng
        sessionStorage.removeItem("hd_tableScrollTop");
        sessionStorage.removeItem("hd_mobileScrollTop");
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, debouncedSearch, dispatch]);

  useEffect(() => {
    // 🔥 NẾU LÀ LẦN QUAY TRỞ LẠI TỪ MÀN HÌNH CHI TIẾT -> CHẶN FETCH API!
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (sessionStorage.getItem("hd_keep_data") === "true") {
        sessionStorage.removeItem("hd_keep_data");
        return; // Dừng luôn ở đây, giữ nguyên state của Redux
      }
    }

    const { fromDate, toDate } = computeDateRange(appliedNgayXuat);
    dispatch(
      fetchAllHoaDonAdmin({
        page: page + 1,
        limit: rowsPerPage,
        nhaKhoaId: appliedNhaKhoa?._id || "",
        trangThai: appliedTrangThai.join(","),
        fromDate,
        toDate,
        search: debouncedSearch,
        loaiHan: activeTabThongKe,
        sortOrder,
      })
    );
  }, [
    dispatch,
    page,
    rowsPerPage,
    appliedNhaKhoa,
    appliedTrangThai,
    appliedNgayXuat,
    debouncedSearch,
    activeTabThongKe,
    sortOrder,
  ]);

  // Lắng nghe click ra ngoài Form Filter
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        filterContainerRef.current &&
        !filterContainerRef.current.contains(event.target)
      ) {
        if (
          event.target.closest?.(
            ".MuiPopover-root, .MuiMenu-root, .MuiModal-root"
          )
        )
          return;
        setOpenFilter(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lắng nghe click ra ngoài Dropdown Nha Khoa & Ngày (Modal Xuất)
  useEffect(() => {
    const handleClickOutsideDropdown = (event) => {
      if (exportNhaKhoaRef.current && !exportNhaKhoaRef.current.contains(event.target)) {
        setOpenExportNhaKhoaDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideDropdown);
    return () => document.removeEventListener("mousedown", handleClickOutsideDropdown);
  }, []);

  const handleLoadMore = () => {
    if (!loading && danhSachHoaDon.length < (pagination?.total || 0)) {
      setRowsPerPage((prev) => prev + 50);
    }
  };

  const handleExport = async () => {
    const { fromDate: fromISO, toDate: toISO } = computeDateRange(exportDateFilter);

    if (!fromISO || !toISO) {
      toast.error("Vui lòng chọn khoảng thời gian xuất Excel.");
      return;
    }

    try {
      setExporting(true);

      const res = await api.get("/hoa-don/all", {
        params: {
          page: 1,
          limit: 5000,
          fromDate: fromISO,
          toDate: toISO,
          nhaKhoaId: exportNhaKhoaObj?._id || "",
        },
      });

      let data = res.data?.data || [];
      if (exportTrangThai.length > 0) {
        data = data.filter((hd) => exportTrangThai.includes(hd.trangThai));
      }

      await exportHoaDonListToExcel(data, {
        fromDate: fromISO,
        toDate: toISO,
        nhaKhoaName: exportNhaKhoaObj?.name || "Tất cả",
      });
      setOpenExport(false);
    } catch (err) {
      toast.error(`Xuất Excel thất bại: ${err?.response?.data?.message || err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const isFiltered = !!appliedNgayXuat.preset || !!appliedNhaKhoa || appliedTrangThai.length > 0;

  const filteredExportNhaKhoaOpts = (nhaKhoa?.data || [])
    .map((nk) => ({ _id: nk._id, name: nk.tenGiaoDich || nk.hoVaTen || "" }))
    .filter((nk) => !exportNhaKhoaSearch.trim() || nk.name.toLowerCase().includes(exportNhaKhoaSearch.toLowerCase()));

  return (
    <div className="bg-gray-50 flex-1 flex flex-col overflow-hidden"
      style={{ maxHeight: 'calc(100vh - 70px)' }}>
      <style>
        {`
                .custom-scrollbar .MuiTableContainer-root {
                    -webkit-overflow-scrolling: touch;
                }
                .custom-scrollbar *::-webkit-scrollbar {
                    height: 14px; 
                    width: 14px;
                }
                .custom-scrollbar *::-webkit-scrollbar-track {
                    background: transparent; 
                }
                .custom-scrollbar *::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1; 
                    border-radius: 10px;
                    border: 3px solid #ffffff; 
                }
                .custom-scrollbar *::-webkit-scrollbar-thumb:hover {
                    background-color: #94a3b8; 
                }

                .table-wrapper .MuiTableContainer-root {
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto !important; 
                }
                .table-wrapper .MuiTableHead-root .MuiTableCell-root {
                    position: sticky;
                    top: 0;
                    z-index: 20;
                    background-color: #e6f7ff;
                }
                `}
      </style>

      <div className="shrink-0">
        <ThongKeCongNo
          activeTab={activeTabThongKe}
          onCardClick={(type) => {
            dispatch(resetEditedHoaDonIds()); // 🔥 VÁ LỖ HỔNG CLICK THẺ THỐNG KÊ
            if (activeTabThongKe === type) {
              setActiveTabThongKe("");
            } else {
              setActiveTabThongKe(type);
            }
            setPage(0);
            setRowsPerPage(50);
            sessionStorage.removeItem("hd_tableScrollTop");
            sessionStorage.removeItem("hd_mobileScrollTop");
          }}
        />
      </div>

      <div className="shrink-0 rounded-t-lg bg-white shadow-sm relative z-30 border-b border-gray-100">
        {/* Container */}
        <div className="flex flex-wrap md:flex-nowrap items-center gap-2 px-3 py-2 min-h-[50px] w-full">

          {/* 1. Nút Bộ Lọc (Luôn ở đầu) */}
          <div className="relative shrink-0 order-1" ref={filterContainerRef}>
            <Tooltip title="Bộ lọc">
              <IconButton
                onClick={() => setOpenFilter(!openFilter)}
                size="small"
                className={`transition-colors ${openFilter ? "bg-blue-50" : ""}`}
                sx={{ color: isFiltered ? "#1976d2" : "#555", p: "6px", position: "relative" }}
              >
                <FilterListIcon fontSize="small" />
                {isFiltered && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 border border-white" style={{ pointerEvents: "none" }} />
                )}
              </IconButton>
            </Tooltip>

            <HoaDonFilterDrawer
              open={openFilter}
              onClose={() => setOpenFilter(false)}
              appliedNgayXuat={appliedNgayXuat}
              appliedNhaKhoa={appliedNhaKhoa}
              appliedTrangThai={appliedTrangThai}
              nhaKhoaList={Array.isArray(nhaKhoa?.data) ? nhaKhoa.data : []}
              onApply={(ngayXuat, nhaKhoa, trangThai) => {
                dispatch(resetEditedHoaDonIds());
                setAppliedNgayXuat(ngayXuat);
                setAppliedNhaKhoa(nhaKhoa);
                setAppliedTrangThai(trangThai);
                setPage(0);
                setRowsPerPage(50);
                sessionStorage.removeItem("hd_tableScrollTop");
                sessionStorage.removeItem("hd_mobileScrollTop");
              }}
              onReset={() => {
                dispatch(resetEditedHoaDonIds());
                setAppliedNgayXuat(EMPTY_DATE);
                setAppliedNhaKhoa(null);
                setAppliedTrangThai([]);
                setActiveTabThongKe("");
                setPage(0);
                setRowsPerPage(50);
                sessionStorage.removeItem("hd_tableScrollTop");
                sessionStorage.removeItem("hd_mobileScrollTop");
              }}
            />
          </div>

          {/* 2. NỘI DUNG BỘ LỌC ĐÃ CHỌN */}
          {/* Desktop: Nằm giữa (order-2), chiếm hết không gian (flex-1). Mobile: Rớt xuống dòng cuối (order-4) */}
          {isFiltered && (
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:flex-1 order-4 md:order-2 pt-1 md:pt-0 pb-1 md:pb-0">
              {appliedNgayXuat.preset && (
                <div className="flex items-center bg-blue-50 border border-blue-200 rounded-full pl-2 pr-1 py-1 gap-1.5 shadow-sm">
                  <div className="flex items-center gap-1 text-[13px] font-semibold text-blue-800 whitespace-nowrap">
                    <CalendarTodayIcon sx={{ fontSize: 14 }} />
                    {appliedNgayXuat.preset === "custom"
                      ? `${appliedNgayXuat.customFrom || "?"} → ${appliedNgayXuat.customTo || "?"}`
                      : DATE_PRESETS.find((p) => p.key === appliedNgayXuat.preset)?.label || appliedNgayXuat.preset}
                  </div>
                  <button onClick={() => { setAppliedNgayXuat(EMPTY_DATE); setPage(0); }} className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-blue-200 text-blue-500 hover:text-red-600 transition-colors">
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </button>
                </div>
              )}

              {appliedNhaKhoa && (
                <div className="flex items-center bg-indigo-50 border border-indigo-200 rounded-full pl-2 pr-1 py-1 gap-1.5 shadow-sm">
                  <div className="flex items-center gap-1 text-[13px] font-semibold text-indigo-800 whitespace-nowrap">
                    <StoreIcon sx={{ fontSize: 14 }} />
                    {appliedNhaKhoa.name}
                  </div>
                  <button onClick={() => { setAppliedNhaKhoa(null); setPage(0); }} className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-indigo-200 text-indigo-500 hover:text-red-600 transition-colors">
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </button>
                </div>
              )}

              {appliedTrangThai.length > 0 && (
                <div className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-full pl-2 pr-1 py-1 shadow-sm">
                  <span className="text-[13px] text-gray-700 whitespace-nowrap">
                    <span className="font-semibold">Trạng thái:</span> {appliedTrangThai.join(", ")}
                  </span>
                  <button onClick={() => { setAppliedTrangThai([]); setActiveTabThongKe(""); setPage(0); }} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-300 text-gray-500 hover:text-gray-700 transition-colors">
                    <CloseIcon sx={{ fontSize: 12 }} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. Ô Tìm Kiếm */}
          {/* Desktop: Nằm sát mảng lọc (order-3), chiều rộng cố định 250px. Dùng md:ml-auto để luôn đẩy mảng này sang phải khi không có bộ lọc */}
          <div className="flex-1 md:flex-none order-2 md:order-3 md:w-[250px] md:ml-auto min-w-0">
            <TextField
              size="small"
              placeholder="Tìm mã HĐ, tên KH"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                width: "100%",
                "& .MuiOutlinedInput-root": {
                  borderRadius: "20px",
                  bgcolor: "#f5f5f5",
                  fontSize: "1rem",
                  height: "36px",
                  "& fieldset": { border: "none" },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon size={15} style={{ color: "#9e9e9e" }} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm("")}>
                      <ClearIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </div>

          {/* 4. Nhóm nút chức năng */}
          {/* Desktop: Nằm cuối cùng (order-4) sát bên phải. Mobile: order-3 */}
          <div className="flex items-center gap-1.5 shrink-0 order-3 md:order-4">
            <Tooltip title="Tạo hóa đơn">
              <IconButton
                onClick={() => navigate("/cho-xuat-hoa-don")}
                className="bg-[#4CAF50] text-white hover:bg-[#388E3C] flex items-center justify-center rounded-full"
                sx={{ width: 32, height: 32 }}
              >
                <AddIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Xuất Excel">
              <IconButton onClick={() => setOpenExport(true)} size="small" sx={{ p: '6px' }}>
                <ExcelIcon sx={{ fontSize: 20, color: "#1b7a34" }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Làm mới">
              <IconButton onClick={() => dispatch(fetchAllHoaDonAdmin())} size="small" sx={{ color: "#555", p: '6px' }}>
                <RefreshIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
          </div>

        </div>
      </div>
      <div className="flex-1 min-h-0 bg-white rounded-b-lg shadow-sm border border-gray-100 flex flex-col overflow-hidden custom-scrollbar table-wrapper">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <HoaDonTable
            danhSachHoaDon={danhSachHoaDon}
            loading={loading}
            onLoadMore={handleLoadMore}
            sortOrder={sortOrder}
            onToggleSort={() => {
              dispatch(resetEditedHoaDonIds()); // 🔥 Xóa trí nhớ
              setSortOrder(prev => prev === "desc" ? "asc" : "desc");
              setPage(0);
              setRowsPerPage(50);
              sessionStorage.removeItem("hd_tableScrollTop");
              sessionStorage.removeItem("hd_mobileScrollTop");
            }}
          />
        </div>
        <div className="border-t border-gray-200 bg-gray-50/80 backdrop-blur-sm shrink-0 z-10 relative px-5 py-2.5 flex items-center justify-end text-[13px] text-gray-600">
          <div>
            {danhSachHoaDon.length < (pagination?.total || 0) ? (
              <span>Số dòng: <span className="font-bold text-gray-900">{danhSachHoaDon.length}</span> / {pagination?.total}<span className=" text-gray-500 ml-1.5">(cuộn để tải thêm)</span></span>
            ) : (
              <span>Số dòng: <span className="font-bold text-gray-900">{danhSachHoaDon.length}</span></span>
            )}
          </div>
        </div>
      </div>

      {/* MODAL XUẤT EXCEL */}
      <Modal open={openExport} onClose={() => setOpenExport(false)}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[96%] max-w-[500px] bg-white shadow-xl p-6 rounded-lg outline-none">
          <h3 className="text-lg font-bold mb-4 text-blue-700 flex items-center gap-2">
            <ExcelIcon sx={{ fontSize: 24, color: "#1b7a34" }} />
            Xuất Excel Hóa Đơn
          </h3>
          <hr className="mb-4 border-gray-100" />

          <div className="flex flex-col gap-5">

            {/* CUSTOM DROPDOWN CHỌN NGÀY XUẤT EXCEL */}
            <div>
              <p className="text-base font-semibold mb-2 text-gray-800">Chọn ngày xuất</p>
              <div className="relative" ref={exportDateRef}>
                {/* Bấm là mở lịch ngay */}
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded bg-white hover:bg-gray-50 transition text-base text-left shadow-sm"
                  onClick={() => setExportDateAnchorEl(exportDateRef.current)}
                >
                  <span className={exportDateFilter?.preset ? "text-blue-700 font-medium truncate" : "text-gray-500"}>
                    {exportDateFilter?.preset === "custom" && exportDateFilter.customFrom
                      ? `${dayjs(exportDateFilter.customFrom).format('DD/MM/YYYY')} - ${dayjs(exportDateFilter.customTo).format('DD/MM/YYYY')}`
                      : DATE_PRESETS.find(p => p.key === exportDateFilter?.preset)?.label || "-- Chọn thời gian --"}
                  </span>
                  <CalendarTodayIcon sx={{ fontSize: 16, color: "#9ca3af" }} />
                </button>

                <CustomDateRangePicker
                  open={Boolean(exportDateAnchorEl)}
                  anchorEl={exportDateAnchorEl}
                  onClose={() => setExportDateAnchorEl(null)}
                  initialDates={{
                    start: exportDateFilter?.preset === "custom" ? exportDateFilter.customFrom || "" : "",
                    end: exportDateFilter?.preset === "custom" ? exportDateFilter.customTo || "" : "",
                  }}
                  onApply={(dates) => {
                    setExportDateFilter(
                      dates.start
                        ? { preset: "custom", customFrom: dates.start, customTo: dates.end || dates.start }
                        : EMPTY_DATE
                    );
                    setExportDateAnchorEl(null);
                  }}
                />
              </div>
            </div>

            {/* CUSTOM DROPDOWN NHA KHOA */}
            <div>
              <p className="text-base font-semibold mb-2 text-gray-800">Nha khoa</p>
              <div ref={exportNhaKhoaRef} className="relative">
                {openExportNhaKhoaDropdown ? (
                  <div className="border border-blue-400 rounded bg-white px-3 py-2 shadow-sm">
                    <input
                      type="text"
                      value={exportNhaKhoaSearch}
                      onChange={(e) => setExportNhaKhoaSearch(e.target.value)}
                      placeholder="Tìm nha khoa..."
                      autoFocus
                      className="w-full border-b border-gray-300 px-2 py-1 text-base focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded bg-white hover:bg-gray-50 transition text-base text-left shadow-sm"
                    onClick={() => { setExportNhaKhoaSearch(""); setOpenExportNhaKhoaDropdown(true); }}
                  >
                    <span className={exportNhaKhoaObj ? "text-blue-700 font-medium truncate" : "text-gray-500"}>
                      {exportNhaKhoaObj ? exportNhaKhoaObj.name : "-- Tất cả nha khoa --"}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}

                {openExportNhaKhoaDropdown && (
                  <div className="absolute left-0 top-full mt-1 z-[1300] w-full bg-white rounded-lg shadow-xl border border-gray-200 max-h-56 overflow-y-auto">
                    {exportNhaKhoaObj && (
                      <button
                        type="button"
                        onClick={() => { setExportNhaKhoaObj(null); setOpenExportNhaKhoaDropdown(false); }}
                        className="w-full text-left px-4 py-2 text-base text-red-500 hover:bg-red-50 border-b border-gray-100 transition"
                      >
                        Bỏ chọn (Tất cả nha khoa)
                      </button>
                    )}
                    {filteredExportNhaKhoaOpts.map((item) => (
                      <button
                        type="button"
                        key={item._id}
                        onClick={() => { setExportNhaKhoaObj(item); setOpenExportNhaKhoaDropdown(false); }}
                        className={`w-full text-left px-4 py-2 text-base border-b border-gray-50 transition ${exportNhaKhoaObj?._id === item._id ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}
                      >
                        {item.name}
                      </button>
                    ))}
                    {filteredExportNhaKhoaOpts.length === 0 && (
                      <p className="text-center text-base text-gray-400 py-4">Không tìm thấy</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-base font-semibold mb-2 text-gray-800">Trạng thái (chọn nhiều)</p>
              <FormControl fullWidth size="small">
                <Select
                  multiple displayEmpty value={exportTrangThai} onChange={(e) => setExportTrangThai(e.target.value)}
                  renderValue={(selected) => {
                    if (selected.length === 0) return <span className="text-gray-400">-- Tất cả trạng thái --</span>;
                    return (
                      <div className="flex flex-wrap gap-1">
                        {selected.map((value) => <Chip key={value} label={value} size="small" color="primary" variant="outlined" />)}
                      </div>
                    );
                  }}
                >
                  <MenuItem value="Lưu tạm">Lưu tạm</MenuItem>
                  <MenuItem value="Chưa thanh toán">Chưa thanh toán</MenuItem>
                  <MenuItem value="Thanh toán một phần">Thanh toán một phần</MenuItem>
                  <MenuItem value="Đã thanh toán">Đã thanh toán</MenuItem>
                </Select>
              </FormControl>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={() => {
                setOpenExport(false);
                setExportDateFilter(EMPTY_DATE);
                setExportNhaKhoaObj(null);
                setExportTrangThai([]);
              }}
              className="px-4 py-2 text-base font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Hủy
            </button>
            <button onClick={handleExport} disabled={exporting} className="px-4 py-2 text-base font-medium text-white bg-[#1b7a34] rounded-md hover:bg-green-700 transition-colors flex items-center gap-1 disabled:opacity-50">
              <DownloadIcon fontSize="small" />
              {exporting ? "Đang xuất..." : "Tải xuống"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default HoaDonPage;