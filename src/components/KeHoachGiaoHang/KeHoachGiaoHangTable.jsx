import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import { useSelector, useDispatch } from "react-redux";
import { api } from "../../config/api";
import {
  fetchDonHang,
  fetchMoreDonHang,
  fetchThongKe,
  setKeHoachGiaoHangPageFilter,
  resetKeHoachGiaoHangPageFilter,
} from "../../redux/slices/donHangSlice";
import { format, isToday, isBefore, startOfDay, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import { exportKeHoachGiaoHangToExcel } from "../../utils/exportToExcel";
import { FiSearch, FiRefreshCw, FiDownload, FiPrinter } from "react-icons/fi";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import StoreIcon from "@mui/icons-material/Store";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import DonHangDetailPanel from "../DonHang/DonHangDetailPanel";
import { fetchNhaKhoa } from "../../redux/slices/nhaKhoaSlice";
import { CircularProgress } from "@mui/material"; // 🔥 Import loading spinner

// 🔥 Import Lịch xịn và dayjs
import CustomDateRangePicker from "../common/CustomDateRangePicker";
import dayjs from "dayjs";

const ROWS_PER_PAGE = 20;
const TRANG_THAI_OPTIONS = [
  "Chờ xử lý",
  "Đang sản xuất",
  "Đang thử",
  "Hoàn thành",
];

// 🔥 Đã giữ lại Tuần trước và Tháng trước
const DATE_PRESETS = [
  { key: "custom", label: "Chọn trên Lịch", isCalendar: true },
  { key: "today", label: "Hôm nay" },
  { key: "yesterday", label: "Hôm qua" },
  { key: "this_week", label: "Tuần này" },
  { key: "this_month", label: "Tháng này" },
  { key: "this_year", label: "Năm nay" },
  { key: "last_week", label: "Tuần trước" },
  { key: "last_month", label: "Tháng trước" },
  { key: "last_7", label: "Trong vòng 7 ngày" },
  { key: "last_10", label: "Trong vòng 10 ngày" },
  { key: "last_30", label: "Trong vòng 30 ngày" },
];

const EMPTY_DATE = { preset: null, customFrom: "", customTo: "" };

const getDateRange = (preset) => {
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
    case "last_week": {
      const d = today.getDay();
      const f = new Date(today);
      f.setDate(today.getDate() - (d === 0 ? 6 : d - 1) - 7);
      const t = new Date(f);
      t.setDate(f.getDate() + 7);
      return { from: f, to: t };
    }
    case "last_month":
      return {
        from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        to: new Date(today.getFullYear(), today.getMonth(), 1),
      };
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

const DEFAULT_COL_WIDTHS = [140, 170, 140, 180, 110, 130, 200, 110, 150];

const KeHoachGiaoHangTable = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { data, loading, loadingMore, pagination } = useSelector(
    (state) => state.donHang
  );
  const { thongKe, loadingThongKe, keHoachGiaoHangPageFilter } = useSelector(
    (state) => state.donHang
  );
  const nhaKhoaState = useSelector((state) => state.nhaKhoa);

  const { giaoHomNay = 0, treHenGiao = 0, guiThu = 0 } = thongKe || {};

  const appliedHenGiao =
    keHoachGiaoHangPageFilter?.appliedHenGiao ?? EMPTY_DATE;
  const appliedNgayNhan =
    keHoachGiaoHangPageFilter?.appliedNgayNhan ?? EMPTY_DATE;
  const appliedNhaKhoa = keHoachGiaoHangPageFilter?.appliedNhaKhoa ?? null;
  const appliedTrangThai = keHoachGiaoHangPageFilter?.appliedTrangThai ?? [];

  const [draftHenGiao, setDraftHenGiao] = useState(EMPTY_DATE);
  const [draftNgayNhan, setDraftNgayNhan] = useState(EMPTY_DATE);
  const [draftNhaKhoa, setDraftNhaKhoa] = useState(null);
  const [draftTrangThai, setDraftTrangThai] = useState([]);

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [showFilter, setShowFilter] = useState(false);
  const [openDateModal, setOpenDateModal] = useState(null);
  const [openPickerModal, setOpenPickerModal] = useState(null);
  const [nhaKhoaSearch, setNhaKhoaSearch] = useState("");
  const filterRef = useRef(null);

  const [anchorElCustomDate, setAnchorElCustomDate] = useState(null);
  const [activeDateType, setActiveDateType] = useState(null);

  const [page, setPage] = useState(1);
  const [loadingAll, setLoadingAll] = useState(false);
  const [printOrders, setPrintOrders] = useState(null);
  const [selectedDonHang, setSelectedDonHang] = useState(null);
  const sentinelRef = useRef(null);
  // Đảm bảo không fetch dữ liệu trước khi filter mặc định được set
  const filterReadyRef = useRef(false);

  const todayStart = useMemo(() => startOfDay(new Date()), []);

  const [colWidths, setColWidths] = useState(DEFAULT_COL_WIDTHS);

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

  useEffect(() => {
    dispatch(fetchThongKe());
    dispatch(fetchNhaKhoa());
  }, [dispatch]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchText);
      setPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [searchText]);

  useEffect(() => {
    setPage(1);
  }, [appliedHenGiao, appliedNgayNhan, appliedNhaKhoa, appliedTrangThai]);

  const getFilterParams = useCallback((filter, fromKey, toKey) => {
    if (!filter?.preset) return {};
    let from, to;
    if (filter.preset === "custom" || filter.preset === "overdue") {
      from = filter.customFrom ? new Date(filter.customFrom) : null;
      to = filter.customTo ? new Date(filter.customTo + "T23:59:59.999") : null;
    } else {
      const range = getDateRange(filter.preset);
      from = range.from;
      to = range.to;
    }
    const result = {};
    if (from) result[fromKey] = from.toISOString();
    if (to) result[toKey] = to.toISOString();
    return result;
  }, []);

  const loadData = useCallback(() => {
    const params = { page, limit: ROWS_PER_PAGE };

    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (appliedNhaKhoa) params.nhaKhoa = appliedNhaKhoa._id;
    if (appliedTrangThai.length > 0)
      params.trangThai = appliedTrangThai.join(",");

    Object.assign(
      params,
      getFilterParams(appliedHenGiao, "henGiaoFrom", "henGiaoTo")
    );
    Object.assign(
      params,
      getFilterParams(appliedNgayNhan, "ngayNhanFrom", "ngayNhanTo")
    );

    if (page === 1) dispatch(fetchDonHang(params));
    else dispatch(fetchMoreDonHang(params));
  }, [
    dispatch,
    page,
    debouncedSearch,
    appliedNhaKhoa,
    appliedTrangThai,
    appliedHenGiao,
    appliedNgayNhan,
    getFilterParams,
  ]);

  useEffect(() => {
    if (!filterReadyRef.current) return;
    loadData();
  }, [loadData]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          page < (pagination?.totalPages || 1) &&
          !loadingMore &&
          !loading
        ) {
          setPage((p) => p + 1);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [page, pagination?.totalPages, loadingMore, loading]);

  useEffect(() => {
    const handleClick = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        if (
          e.target.closest?.(".MuiPopover-root, .MuiMenu-root, .MuiModal-root")
        )
          return;
        setShowFilter(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const nhaKhoaOptions = useMemo(() => {
    const d = nhaKhoaState?.data || [];
    return Array.isArray(d)
      ? d
        .map((nk) => ({
          _id: nk._id,
          name: nk.tenGiaoDich || nk.hoVaTen || "",
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
      : [];
  }, [nhaKhoaState?.data]);

  const filteredNhaKhoaOpts = useMemo(() => {
    if (!nhaKhoaSearch.trim()) return nhaKhoaOptions;
    const s = nhaKhoaSearch.toLowerCase();
    return nhaKhoaOptions.filter((nk) => nk.name.toLowerCase().includes(s));
  }, [nhaKhoaOptions, nhaKhoaSearch]);

  const handleOpenFilter = () => {
    setDraftHenGiao(appliedHenGiao);
    setDraftNgayNhan(appliedNgayNhan);
    setDraftNhaKhoa(appliedNhaKhoa);
    setDraftTrangThai([...appliedTrangThai]);
    setShowFilter(true);
  };

  const handleApplyFilters = () => {
    dispatch(
      setKeHoachGiaoHangPageFilter({
        appliedHenGiao: draftHenGiao,
        appliedNgayNhan: draftNgayNhan,
        appliedNhaKhoa: draftNhaKhoa,
        appliedTrangThai: draftTrangThai,
      })
    );
    setPage(1);
    setOpenDateModal(null);
    setOpenPickerModal(null);
    setShowFilter(false);
  };

  const handleResetDraft = () => {
    setDraftHenGiao(EMPTY_DATE);
    setDraftNgayNhan(EMPTY_DATE);
    setDraftNhaKhoa(null);
    setDraftTrangThai([]);
  };

  const handleRefresh = () => {
    setSearchText("");
    dispatch(resetKeHoachGiaoHangPageFilter());
    setPage(1);
  };

  const toggleDraftTrangThai = (status) => {
    setDraftTrangThai((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const getDateLabel = (f) =>
    DATE_PRESETS.find((p) => p.key === f?.preset)?.label || "";

  const isFiltered = !!(
    appliedHenGiao?.preset ||
    appliedNgayNhan?.preset ||
    appliedNhaKhoa ||
    appliedTrangThai.length > 0
  );

  const renderDateDropdown = (cf, scf, filterKey) => (
    <div className="absolute left-5 top-full z-[100] w-[80%] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
      {DATE_PRESETS.map((p) => (
        <div key={p.key}>
          <button
            onClick={(e) => {
              scf((prev) => ({
                ...prev,
                preset: prev.preset === p.key ? null : p.key,
              }));

              if (!p.isCalendar) {
                setOpenDateModal(null);
              } else {
                if (cf.preset !== p.key) {
                  setActiveDateType(filterKey);
                  setAnchorElCustomDate(e.currentTarget);
                }
              }
            }}
            className={`w-full text-left px-4 py-2.5 text-base flex items-center gap-2 border-b border-gray-100 transition ${cf.preset === p.key
              ? "bg-blue-50 text-blue-700 font-semibold"
              : "text-gray-700 hover:bg-gray-50"
              }`}
          >
            {p.isCalendar && <CalendarTodayIcon sx={{ fontSize: 14 }} />}
            {p.label}
          </button>

          {p.isCalendar && cf.preset === "custom" && (
            <div
              className="px-4 py-3 bg-blue-50/30 border-b border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  setActiveDateType(filterKey);
                  setAnchorElCustomDate(e.currentTarget);
                }}
                className="w-full h-9 px-2 flex items-center justify-center gap-2 text-base font-semibold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
              >
                {cf.customFrom && cf.customTo
                  ? `${dayjs(cf.customFrom).format("DD/MM/YYYY")} - ${dayjs(
                    cf.customTo
                  ).format("DD/MM/YYYY")}`
                  : "📅 Bấm để chọn ngày..."}
              </button>
            </div>
          )}
        </div>
      ))}

      {activeDateType === filterKey && (
        <CustomDateRangePicker
          open={Boolean(anchorElCustomDate)}
          anchorEl={anchorElCustomDate}
          onClose={() => {
            setAnchorElCustomDate(null);
            setActiveDateType(null);
          }}
          initialDates={{
            start: cf.customFrom,
            end: cf.customTo,
          }}
          onApply={(dates) => {
            const newNgay = {
              preset: "custom",
              customFrom: dates.start,
              customTo: dates.end,
            };

            setAnchorElCustomDate(null);
            setActiveDateType(null);
            scf(newNgay);

            dispatch(
              setKeHoachGiaoHangPageFilter({
                appliedHenGiao:
                  filterKey === "henGiao" ? newNgay : draftHenGiao,
                appliedNgayNhan:
                  filterKey === "ngayNhan" ? newNgay : draftNgayNhan,
                appliedNhaKhoa: draftNhaKhoa,
                appliedTrangThai: draftTrangThai,
              })
            );
            setPage(1);
            setOpenDateModal(null);
            setOpenPickerModal(null);
            setShowFilter(false);
          }}
        />
      )}
    </div>
  );

  const formatViTri = (viTriArr) => {
    if (!viTriArr || viTriArr.length === 0) return "";
    return viTriArr
      .map((v) =>
        v.kieu === "Rời"
          ? v.soRang.join(", ")
          : `${v.soRang[0]}->${v.soRang[v.soRang.length - 1]}`
      )
      .join("; ");
  };

  const formatSingleSanPham = (item) => {
    if (!item) return "";
    const loaiDonMap = {
      Mới: "",
      "Hàng sửa": "Sửa",
      "Hàng bảo hành": "Bảo hành",
      "Hàng làm lại": "Làm lại",
    };
    const loaiDon = loaiDonMap[item.loaiDon] || "";
    const soLuong = item.soLuong || 1;
    const tenSanPham = item.sanPham?.tenSanPham || item.sanPham?.ten || "";
    const viTri = formatViTri(item.viTri);
    const mau = item.mau ? `(${item.mau})` : "";
    return [loaiDon, soLuong, tenSanPham, viTri, mau]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const filteredOrders = useMemo(
    () => [...data].sort((a, b) => parseISO(a.henGiao) - parseISO(b.henGiao)),
    [data]
  );

  const expandedRows = useMemo(() => {
    return filteredOrders.flatMap((order) => {
      const dssp = order.danhSachSanPham || [];
      if (dssp.length === 0) return [{ order, sp: null, spIdx: 0 }];
      return dssp.map((sp, spIdx) => ({ order, sp, spIdx }));
    });
  }, [filteredOrders]);

  const handleExportExcel = async () => {
    await exportKeHoachGiaoHangToExcel(filteredOrders, formatSingleSanPham);
  };

  const fetchAllFiltered = useCallback(async () => {
    setLoadingAll(true);
    try {
      const params = { page: 1, limit: 9999 };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (appliedNhaKhoa) params.nhaKhoa = appliedNhaKhoa._id;
      if (appliedTrangThai.length > 0)
        params.trangThai = appliedTrangThai.join(",");
      Object.assign(
        params,
        getFilterParams(appliedHenGiao, "henGiaoFrom", "henGiaoTo")
      );
      Object.assign(
        params,
        getFilterParams(appliedNgayNhan, "ngayNhanFrom", "ngayNhanTo")
      );

      const res = await api.get("/donhang", { params });
      const all = res.data.data || [];
      return [...all].sort((a, b) => parseISO(a.henGiao) - parseISO(b.henGiao));
    } finally {
      setLoadingAll(false);
    }
  }, [
    debouncedSearch,
    appliedNhaKhoa,
    appliedTrangThai,
    appliedHenGiao,
    appliedNgayNhan,
    getFilterParams,
  ]);

  const handlePrint = async () => {
    const allFiltered = await fetchAllFiltered();
    setPrintOrders(allFiltered);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
        const cleanup = () => {
          setPrintOrders(null);
          window.removeEventListener("afterprint", cleanup);
        };
        window.addEventListener("afterprint", cleanup);
      });
    });
  };

  useEffect(() => {
    dispatch(
      setKeHoachGiaoHangPageFilter({
        appliedTrangThai: ["Chờ xử lý", "Đang sản xuất", "Đang thử"],
      })
    );
    filterReadyRef.current = true;
  }, []);

  // 🔥 ĐÃ BỎ ĐOẠN CHẶN "LOADING CẢ PAGE" Ở ĐÂY ĐỂ TRÁNH GIẬT/CHỚP GIAO DIỆN

  return (
    <div className="p-4 bg-gray-100 min-h-screen relative">
      <div className="max-w-full mx-auto">
        <div className="print:hidden">
          <div className="flex w-full mb-3 rounded-lg overflow-hidden shadow-md">
            <div
              className={`flex-1 cursor-pointer bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white px-5 py-3 flex items-center gap-3 transition-all duration-200 hover:shadow-inner hover:scale-[1.02] hover:z-10 relative ${appliedHenGiao?.preset === "today"
                ? "ring-2 ring-inset ring-white/50"
                : ""
                }`}
              onClick={() => {
                dispatch(
                  setKeHoachGiaoHangPageFilter({
                    appliedHenGiao:
                      appliedHenGiao?.preset === "today"
                        ? EMPTY_DATE
                        : { preset: "today", customFrom: "", customTo: "" },
                    appliedTrangThai:
                      appliedHenGiao?.preset === "today"
                        ? []
                        : ["Chờ xử lý", "Đang sản xuất", "Đang thử"],
                  })
                );
                setPage(1);
              }}
            >
              <div>
                <div className="text-xl font-extrabold leading-none">
                  {loadingThongKe ? "..." : giaoHomNay}
                </div>
                <div className="text-base font-semibold mt-0.5 opacity-90">
                  Giao hôm nay
                </div>
              </div>
            </div>

            <div
              className={`flex-1 cursor-pointer bg-red-600 hover:bg-red-500 active:bg-red-700 text-white px-5 py-3 flex items-center gap-3 transition-all duration-200 hover:shadow-inner hover:scale-[1.02] hover:z-10 relative ${appliedHenGiao?.preset === "overdue"
                ? "ring-2 ring-inset ring-white/50"
                : ""
                }`}
              onClick={() => {
                // "Trễ" = henGiao < hôm nay (không bao gồm hôm nay) + chưa hoàn thành
                // Dùng preset riêng "overdue" để nhận biết trạng thái đang filter
                const alreadyFiltering =
                  appliedHenGiao?.preset === "overdue" &&
                  appliedTrangThai.length === 2 &&
                  appliedTrangThai.includes("Chờ xử lý") &&
                  appliedTrangThai.includes("Đang thử");

                // customTo = ngày hôm qua (henGiao <= hôm qua, tức < hôm nay)
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split("T")[0];

                dispatch(
                  setKeHoachGiaoHangPageFilter({
                    appliedHenGiao: alreadyFiltering
                      ? EMPTY_DATE
                      : {
                        preset: "overdue",
                        customFrom: "",
                        customTo: yesterdayStr,
                      },
                    appliedTrangThai: alreadyFiltering
                      ? []
                      : ["Chờ xử lý", "Đang sản xuất", "Đang thử"],
                  })
                );
                setPage(1);
              }}
            >
              <div>
                <div className="text-xl font-extrabold leading-none">
                  {loadingThongKe ? "..." : treHenGiao}
                </div>
                <div className="text-base font-semibold mt-0.5 opacity-90">
                  Trễ
                </div>
              </div>
            </div>

            <div
              className={`flex-1 cursor-pointer bg-purple-700 hover:bg-purple-600 active:bg-purple-800 text-white px-5 py-3 flex items-center gap-3 transition-all duration-200 hover:shadow-inner hover:scale-[1.02] hover:z-10 relative ${appliedTrangThai.length === 1 &&
                appliedTrangThai[0] === "Đang thử"
                ? "ring-2 ring-inset ring-white/50"
                : ""
                }`}
              onClick={() => {
                const isActive =
                  appliedTrangThai.length === 1 &&
                  appliedTrangThai[0] === "Đang thử";
                dispatch(
                  setKeHoachGiaoHangPageFilter({
                    appliedTrangThai: isActive ? [] : ["Đang thử"],
                    appliedHenGiao: EMPTY_DATE,
                  })
                );
                setPage(1);
              }}
            >
              <div>
                <div className="text-xl font-extrabold leading-none">
                  {loadingThongKe ? "..." : guiThu}
                </div>
                <div className="text-base font-semibold mt-0.5 opacity-90">
                  Đang thử
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 mb-2 px-1 print:hidden">
          {/* Hàng 1: Filter button + Filter tags (wrappable) */}
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <div className="relative shrink-0" ref={filterRef}>
              <button
                onClick={handleOpenFilter}
                title="Bộ lọc"
                className={`relative p-1.5 rounded transition ${isFiltered
                  ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
                  : "text-gray-500 hover:bg-gray-100"
                  }`}
              >
                <FilterAltIcon sx={{ fontSize: 20 }} />
                {isFiltered && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </button>

              {showFilter && (
                <div
                  className="absolute left-0 top-full mt-1 z-50 w-64 bg-white rounded-xl shadow-2xl border border-gray-200"
                  onClick={() => {
                    setOpenDateModal(null);
                    setOpenPickerModal(null);
                  }}
                >
                  <div
                    className="relative border-b border-gray-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition text-base"
                      onClick={() => {
                        setOpenPickerModal(null);
                        setOpenDateModal(
                          openDateModal === "henGiao" ? null : "henGiao"
                        );
                      }}
                    >
                      <span
                        className={
                          draftHenGiao.preset
                            ? "text-blue-600 font-medium"
                            : "text-gray-600"
                        }
                      >
                        {draftHenGiao.preset
                          ? getDateLabel(draftHenGiao)
                          : "Hẹn giao"}
                      </span>
                      <CalendarTodayIcon
                        sx={{ fontSize: 16, color: "#9ca3af" }}
                      />
                    </button>
                    {openDateModal === "henGiao" &&
                      renderDateDropdown(
                        draftHenGiao,
                        setDraftHenGiao,
                        "henGiao"
                      )}
                  </div>

                  <div
                    className="relative border-b border-gray-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition text-base"
                      onClick={() => {
                        setOpenPickerModal(null);
                        setOpenDateModal(
                          openDateModal === "ngayNhan" ? null : "ngayNhan"
                        );
                      }}
                    >
                      <span
                        className={
                          draftNgayNhan.preset
                            ? "text-blue-600 font-medium"
                            : "text-gray-600"
                        }
                      >
                        {draftNgayNhan.preset
                          ? getDateLabel(draftNgayNhan)
                          : "Ngày nhận"}
                      </span>
                      <CalendarTodayIcon
                        sx={{ fontSize: 16, color: "#9ca3af" }}
                      />
                    </button>
                    {openDateModal === "ngayNhan" &&
                      renderDateDropdown(
                        draftNgayNhan,
                        setDraftNgayNhan,
                        "ngayNhan"
                      )}
                  </div>

                  <div
                    className="relative border-b border-gray-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {openPickerModal === "nhaKhoa" ? (
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
                          setOpenDateModal(null);
                          setNhaKhoaSearch("");
                          setOpenPickerModal("nhaKhoa");
                        }}
                      >
                        <span
                          className={
                            draftNhaKhoa
                              ? "text-blue-600 font-medium truncate"
                              : "text-gray-400"
                          }
                        >
                          {draftNhaKhoa ? draftNhaKhoa.name : "Nha khoa"}
                        </span>
                      </button>
                    )}
                    {openPickerModal === "nhaKhoa" && (
                      <div className="absolute left-2 top-full z-[100] w-[90%] bg-white rounded shadow-xl border border-t-0 border-gray-200 max-h-56 overflow-y-auto">
                        {draftNhaKhoa && (
                          <button
                            onClick={() => {
                              setDraftNhaKhoa(null);
                              setOpenPickerModal(null);
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
                              setOpenPickerModal(null);
                            }}
                            className={`w-full text-left px-4 py-2 text-base border-b border-gray-50 transition ${draftNhaKhoa?._id === item._id
                              ? "bg-blue-50 text-blue-700 font-semibold"
                              : "text-gray-700 hover:bg-gray-50"
                              }`}
                          >
                            {item.name}
                          </button>
                        ))}
                        {filteredNhaKhoaOpts.length === 0 && (
                          <p className="text-center text-base text-gray-400 py-4">
                            Không tìm thấy
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div
                    className="border-b border-gray-100 px-3 py-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-base text-gray-400 mb-1.5">Trạng thái</p>
                    <div className="flex flex-wrap gap-1.5">
                      {TRANG_THAI_OPTIONS.map((status) => {
                        const isActive = draftTrangThai.includes(status);
                        const colorMap = {
                          "Chờ xử lý": isActive
                            ? "bg-yellow-400 text-yellow-900 border-yellow-400"
                            : "bg-white text-yellow-700 border-yellow-300 hover:bg-yellow-50",
                          "Đang thử": isActive
                            ? "bg-purple-500 text-white border-purple-500"
                            : "bg-white text-purple-700 border-purple-300 hover:bg-purple-50",
                          "Đang sản xuất": isActive
                            ? "bg-gray-500 text-white border-gray-500"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
                          "Hoàn thành": isActive
                            ? "bg-green-500 text-white border-green-500"
                            : "bg-white text-green-700 border-green-300 hover:bg-green-50",
                        };
                        return (
                          <button
                            key={status}
                            onClick={() => toggleDraftTrangThai(status)}
                            className={`px-2.5 py-1 rounded-full border text-base font-medium transition-all ${colorMap[status]}`}
                          >
                            {status}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-4 py-3">
                    <button
                      onClick={handleResetDraft}
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

            {appliedHenGiao?.preset && (
              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-base font-medium px-2.5 py-1 rounded-full">
                <CalendarTodayIcon sx={{ fontSize: 11 }} />
                Hẹn giao: {getDateLabel(appliedHenGiao)}
                {appliedHenGiao.preset === "custom" &&
                  appliedHenGiao.customFrom &&
                  ` ${dayjs(appliedHenGiao.customFrom).format("DD/MM/YYYY")}`}
                {appliedHenGiao.preset === "custom" &&
                  appliedHenGiao.customTo &&
                  ` → ${dayjs(appliedHenGiao.customTo).format("DD/MM/YYYY")}`}
                <button
                  onClick={() => {
                    dispatch(
                      setKeHoachGiaoHangPageFilter({
                        appliedHenGiao: EMPTY_DATE,
                      })
                    );
                    setPage(1);
                  }}
                  className="ml-0.5 hover:text-blue-900 flex items-center"
                >
                  <CloseIcon sx={{ fontSize: 12 }} />
                </button>
              </span>
            )}
            {appliedNgayNhan?.preset && (
              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-base font-medium px-2.5 py-1 rounded-full">
                <CalendarTodayIcon sx={{ fontSize: 11 }} />
                Nhận: {getDateLabel(appliedNgayNhan)}
                {appliedNgayNhan.preset === "custom" &&
                  appliedNgayNhan.customFrom &&
                  ` ${dayjs(appliedNgayNhan.customFrom).format("DD/MM/YYYY")}`}
                {appliedNgayNhan.preset === "custom" &&
                  appliedNgayNhan.customTo &&
                  ` → ${dayjs(appliedNgayNhan.customTo).format("DD/MM/YYYY")}`}
                <button
                  onClick={() => {
                    dispatch(
                      setKeHoachGiaoHangPageFilter({
                        appliedNgayNhan: EMPTY_DATE,
                      })
                    );
                    setPage(1);
                  }}
                  className="ml-0.5 hover:text-blue-900 flex items-center"
                >
                  <CloseIcon sx={{ fontSize: 12 }} />
                </button>
              </span>
            )}
            {appliedNhaKhoa && (
              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-base font-medium px-2.5 py-1 rounded-full">
                <StoreIcon sx={{ fontSize: 11 }} />
                {appliedNhaKhoa.name}
                <button
                  onClick={() => {
                    dispatch(
                      setKeHoachGiaoHangPageFilter({ appliedNhaKhoa: null })
                    );
                    setPage(1);
                  }}
                  className="ml-0.5 hover:text-blue-900 flex items-center"
                >
                  <CloseIcon sx={{ fontSize: 12 }} />
                </button>
              </span>
            )}
            {appliedTrangThai.map((status) => (
              <span
                key={status}
                className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-base font-medium px-2.5 py-1 rounded-full"
              >
                {status}
                <button
                  onClick={() => {
                    dispatch(
                      setKeHoachGiaoHangPageFilter({
                        appliedTrangThai: appliedTrangThai.filter(
                          (s) => s !== status
                        ),
                      })
                    );
                    setPage(1);
                  }}
                  className="ml-0.5 hover:text-blue-900 flex items-center"
                >
                  <CloseIcon sx={{ fontSize: 12 }} />
                </button>
              </span>
            ))}
          </div>

          {/* Hàng 2: Search + Action buttons */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <FiSearch
                size={15}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-8 pr-3 py-1.5 border rounded-full md:text-base text-base bg-white w-full focus:outline-none focus:ring-1 focus:ring-blue-400"
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

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleExportExcel}
                className="p-2 rounded hover:bg-gray-200 text-gray-500 transition"
                title="Xuất Excel"
              >
                <FiDownload size={17} />
              </button>
              <button
                onClick={handlePrint}
                disabled={loadingAll}
                className="p-2 rounded hover:bg-gray-200 text-gray-500 transition disabled:opacity-50"
                title="In danh sách"
              >
                {loadingAll ? (
                  <FiRefreshCw size={17} className="animate-spin" />
                ) : (
                  <FiPrinter size={17} />
                )}
              </button>
              <button
                onClick={handleRefresh}
                className="p-2 rounded hover:bg-gray-200 text-gray-500 transition"
                title="Làm mới"
              >
                <FiRefreshCw size={17} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded shadow-sm overflow-hidden border print:hidden">
          <div className="sm:hidden divide-y divide-gray-100">
            {/* 🔥 HIỆU ỨNG LOADING MƯỢT MÀ TRONG BẢNG MOBILE */}
            {loading && page === 1 ? (
              <div className="flex justify-center py-10">
                <CircularProgress size={28} sx={{ color: "#26a69a" }} />
              </div>
            ) : filteredOrders.length === 0 ? (
              <p className="text-center py-8 text-gray-500 text-base">
                Không có dữ liệu
              </p>
            ) : (
              filteredOrders.map((order) => {
                const date = parseISO(order.henGiao);
                const overdue =
                  isBefore(date, todayStart) &&
                  order.trangThai !== "Hoàn thành";
                const maDon =
                  order.maDonHang ||
                  `TAN${order._id
                    .substring(order._id.length - 8)
                    .toUpperCase()}`;
                return (
                  <div
                    key={order._id}
                    onClick={() => setSelectedDonHang(order)}
                    className={`px-4 py-3 cursor-pointer transition-colors ${selectedDonHang?._id === order._id
                      ? "bg-sky-100"
                      : "hover:bg-gray-50"
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/donhang/${order._id}/edit`);
                        }}
                        className={`font-semibold text-base hover:underline ${overdue ? "text-red-500" : "text-blue-700"
                          }`}
                      >
                        {maDon}
                      </button>
                      <TrangThaiBadge value={order.trangThai} />
                    </div>
                    <p className="text-base text-gray-800 font-medium truncate">
                      {order.nhaKhoa?.tenGiaoDich ||
                        order.nhaKhoa?.hoVaTen ||
                        "—"}
                    </p>
                    {(order.bacSi?.hoVaTen || order.benhNhan?.hoVaTen) && (
                      <p className="text-base text-gray-500 mt-0.5 truncate">
                        {[
                          order.bacSi?.hoVaTen && `BS: ${order.bacSi.hoVaTen}`,
                          order.benhNhan?.hoVaTen &&
                          `BN: ${order.benhNhan.hoVaTen}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-base text-gray-400">
                      {order.ngayNhan && (
                        <span>
                          Nhận: {format(parseISO(order.ngayNhan), "dd/MM/yyyy")}
                        </span>
                      )}
                      <span
                        className={overdue ? "text-red-500 font-medium" : ""}
                      >
                        Hẹn giao: {format(date, "dd/MM/yyyy HH:mm")}
                      </span>
                    </div>
                    {order.ghiChuChung && (
                      <p className="text-base text-gray-400 mt-0.5 truncate">
                        {order.ghiChuChung}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="hidden sm:block overflow-x-auto">
            <table
              className="text-base text-left"
              style={{
                tableLayout: "fixed",
                width: colWidths.reduce((a, b) => a + b, 0),
                minWidth: "100%",
              }}
            >
              <colgroup>
                {colWidths.map((w, i) => (
                  <col key={i} style={{ width: w }} />
                ))}
              </colgroup>
              <thead className="text-sky-500 font-medium border-b sticky top-0 bg-white z-10">
                <tr>
                  {[
                    "Nhận lúc",
                    "Số",
                    "Hẹn giao",
                    "Khách hàng",
                    "Bác sĩ",
                    "Bệnh nhân",
                    "Răng",
                    "Trạng thái",
                    "Ghi chú",
                  ].map((label, i) => (
                    <th
                      key={i}
                      className="px-3 py-3.5 select-none relative group overflow-hidden text-base"
                    >
                      {label}
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, i)}
                        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize group-hover:bg-blue-300 hover:bg-blue-400 active:bg-blue-500 z-20 transition-colors"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* 🔥 HIỆU ỨNG LOADING MƯỢT MÀ TRONG BẢNG DESKTOP */}
                {loading && page === 1 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-10">
                      <CircularProgress size={28} sx={{ color: "#26a69a" }} />
                    </td>
                  </tr>
                ) : (
                  <>
                    {expandedRows.map(({ order, sp, spIdx }) => {
                      const date = parseISO(order.henGiao);
                      const overdue =
                        isBefore(date, todayStart) &&
                        order.trangThai !== "Hoàn thành";
                      const today = isToday(date);
                      const maDon =
                        order.maDonHang ||
                        `TAN${order._id
                          .substring(order._id.length - 8)
                          .toUpperCase()}`;
                      return (
                        <tr
                          key={`${order._id}_${spIdx}`}
                          onClick={() => setSelectedDonHang(order)}
                          className={`border-b cursor-pointer transition-colors ${selectedDonHang?._id === order._id
                            ? "bg-sky-100 border-sky-200"
                            : "hover:bg-gray-50"
                            }`}
                        >
                          <td className="px-3 py-2.5 truncate text-base text-gray-600">
                            {order.ngayNhan
                              ? format(
                                parseISO(order.ngayNhan),
                                "HH:mm dd/MM/yyyy"
                              )
                              : "—"}
                          </td>
                          <td className="px-3 py-2.5 truncate">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/donhang/${order._id}/edit`);
                              }}
                              className={`font-medium text-base hover:underline ${overdue
                                ? "text-red-500"
                                : today
                                  ? "text-blue-600"
                                  : "text-gray-700"
                                }`}
                            >
                              {maDon}
                            </button>
                          </td>
                          <td
                            className={`px-3 py-2.5 truncate text-base font-medium ${overdue ? "text-red-500" : "text-gray-700"
                              }`}
                          >
                            {format(date, "HH:mm dd/MM/yyyy")}
                          </td>
                          <td className="px-3 py-2.5 truncate text-base text-gray-800">
                            {order.nhaKhoa?.tenGiaoDich ||
                              order.nhaKhoa?.hoVaTen}
                          </td>
                          <td className="px-3 py-2.5 truncate text-base text-gray-700">
                            {order.bacSi?.hoVaTen}
                          </td>
                          <td className="px-3 py-2.5 truncate text-base text-gray-700">
                            {order.benhNhan?.hoVaTen}
                          </td>
                          <td className="px-3 py-2.5 truncate text-base text-gray-700">
                            {formatSingleSanPham(sp)}
                          </td>
                          <td className="px-3 py-2.5 truncate">
                            <TrangThaiBadge value={order.trangThai} />
                          </td>
                          <td
                            className="px-3 py-2.5 truncate text-base text-gray-700"
                            title={order.ghiChuChung || ""}
                          >
                            {order.ghiChuChung}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredOrders.length === 0 && (
                      <tr>
                        <td
                          colSpan="9"
                          className="text-center py-10 text-gray-400 text-base"
                        >
                          Không có dữ liệu
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div ref={sentinelRef} className="h-4" />
        {loadingMore && (
          <div className="text-center py-3 text-gray-400 text-base print:hidden">
            Đang tải thêm...
          </div>
        )}

        <div id="print-section" className="hidden print:block w-full">
          <style>{`
            @media print {
              @page { size: A4 landscape; margin: 5mm; }
              html, body, #root, #root > div, main, .bg-gray-100, .max-w-full {
                position: static !important; margin: 0 !important; padding: 0 !important;
                width: 100% !important; max-width: 100% !important; min-width: 0 !important;
                display: block !important; box-shadow: none !important; background: white !important;
              }
              body * { visibility: hidden; }
              #print-section, #print-section * { visibility: visible; }
              #print-section {
                position: absolute !important; left: 0 !important; top: 0 !important;
                width: 100% !important; max-width: 100% !important; background-color: white !important;
                padding: 0 !important; margin: 0 !important; box-shadow: none !important;
                overflow: visible !important; display: block !important;
              }
              #print-section h2 { margin: 0 0 6px 0 !important; padding: 0 !important; text-align: center !important; font-size: 16px !important; font-weight: bold !important; text-transform: uppercase !important; }
              #print-section h3 { margin: 10px 0 4px 0 !important; padding: 0 !important; font-size: 13px !important; font-weight: bold !important; }
              #print-section table { width: 100% !important; border-collapse: collapse !important; margin: 0 !important; padding: 0 !important; }
              #print-section thead { display: table-header-group !important; }
              #print-section tr { page-break-inside: avoid !important; break-inside: avoid !important; }
              #print-section table td, #print-section table th { border: 1px solid black !important; padding: 2px 4px !important; font-size: 12px !important; line-height: 1.25 !important; vertical-align: middle !important; }
              #print-section table th { background-color: #f3f4f6 !important; font-weight: bold !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
          `}</style>
          <h2 className="text-xl font-bold text-center mb-4 uppercase">
            Kế Hoạch Giao Hàng
          </h2>
          {(() => {
            // Tách đơn có lý do hẹn lại xuống mục riêng (giống file Excel)
            const allPrintOrders = printOrders ?? filteredOrders;
            const donThuong = allPrintOrders.filter((o) => !(o.lyDoHenLai || "").trim());
            const donHenLai = allPrintOrders.filter((o) => (o.lyDoHenLai || "").trim());
            const baseHeaders = ["Nhận lúc", "Số", "Khách hàng", "Bệnh nhân", "Răng", "Hẹn giao", "Ghi chú"];

            const renderTable = (orders, withLyDo) => {
              const headers = withLyDo ? [...baseHeaders, "Lý do hẹn"] : baseHeaders;
              return (
          <table className="w-full border-collapse border border-black">
            <thead>
              <tr>
                {headers.map((h) => (
                  <th
                    key={h}
                    className="border border-black px-2 py-1 text-center font-semibold"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.flatMap((order) => {
                const dssp = order.danhSachSanPham || [];
                const products = dssp.length > 0 ? dssp : [null];
                const maDon =
                  order.maDonHang ||
                  `TAN${order._id
                    .substring(order._id.length - 8)
                    .toUpperCase()}`;
                return products.map((sp, spIdx) => (
                  <tr key={`${order._id}_${spIdx}`}>
                    <td className="border border-black px-2 py-1 text-center">
                      {order.ngayNhan
                        ? format(parseISO(order.ngayNhan), "dd/MM/yyyy HH:mm")
                        : "—"}
                    </td>
                    <td className="border border-black px-2 py-1 text-center font-semibold">
                      {maDon}
                    </td>
                    <td className="border border-black px-2 py-1">
                      {order.nhaKhoa?.tenGiaoDich || order.nhaKhoa?.hoVaTen}
                    </td>
                    <td className="border border-black px-2 py-1">
                      {order.benhNhan?.hoVaTen}
                    </td>
                    <td className="border border-black px-2 py-1">
                      {formatSingleSanPham(sp)}
                    </td>
                    <td className="border border-black px-2 py-1 text-center">
                      {order.henGiao
                        ? format(parseISO(order.henGiao), "dd/MM/yyyy HH:mm")
                        : "—"}
                    </td>
                    <td className="border border-black px-2 py-1">
                      {order.ghiChuChung}
                    </td>
                    {withLyDo && (
                      <td className="border border-black px-2 py-1">
                        {order.lyDoHenLai}
                      </td>
                    )}
                  </tr>
                ));
              })}
              {orders.length === 0 && (
                <tr>
                  <td
                    colSpan={headers.length}
                    className="border border-black text-center py-4"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
              );
            };

            return (
              <>
                {/* Bảng đầu ẩn nếu rỗng mà có đơn hẹn lại */}
                {(donThuong.length > 0 || donHenLai.length === 0) && renderTable(donThuong, false)}
                {donHenLai.length > 0 && (
                  <>
                    <h3 className="font-bold mt-3 mb-1">Đơn hẹn lại</h3>
                    {renderTable(donHenLai, true)}
                  </>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {selectedDonHang && (
        <DonHangDetailPanel
          donHang={selectedDonHang}
          onClose={() => setSelectedDonHang(null)}
        />
      )}
    </div>
  );
};

const TrangThaiBadge = ({ value }) => {
  const map = {
    "Chờ xử lý": "bg-yellow-100 text-yellow-800",
    "Đang thử": "bg-purple-100 text-purple-800",
    "Đang sản xuất": "bg-gray-100 text-gray-800",
    "Hoàn thành": "bg-green-100 text-green-800",
  };
  return (
    <span
      className={`px-2 py-1 rounded font-medium text-base ${map[value] || "bg-gray-100 text-gray-600"
        }`}
    >
      {value || "Chờ xử lý"}
    </span>
  );
};

export default KeHoachGiaoHangTable;
