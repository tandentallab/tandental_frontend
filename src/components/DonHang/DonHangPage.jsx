import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  fetchDonHang,
  fetchMoreDonHang,
  resetDonHangPageFilter,
  setDonHangPageFilter,
  fetchDonHangStatusCounts,
} from "../../redux/slices/donHangSlice";
import { api } from "../../config/api";
import DonHangTable from "./DonHangTable";
import DonHangDetailPanel from "./DonHangDetailPanel";
import { fetchNhaKhoa } from "../../redux/slices/nhaKhoaSlice";
import { fetchBenhNhan } from "../../redux/slices/benhNhanSlice";
import { toast } from "sonner";
import {
  Modal,
  Box,
  Typography,
  Divider,
  FormControl,
  Select,
  MenuItem,
  Chip,
  Stack,
  Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import StoreIcon from "@mui/icons-material/Store";
import PersonIcon from "@mui/icons-material/Person";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import DownloadIcon from "@mui/icons-material/Download";
import { exportDonHangListToExcel } from "../../utils/exportToExcel";
import ExportDateSelector from "../common/ExportDateSelector";
import {
  EMPTY_EXPORT_DATE_FILTER,
  toISODateRange,
  isValidExportDateFilter,
} from "../../utils/exportDatePresets";
import dayjs from "dayjs";
import CustomDateRangePicker from "../common/CustomDateRangePicker";

const DATE_PRESETS = [
  { key: "custom", label: "Chọn trên Lịch", isCalendar: true },
  { key: "today", label: "Hôm nay" },
  { key: "yesterday", label: "Hôm qua" },
  { key: "this_week", label: "Tuần này" },
  { key: "this_month", label: "Tháng này" },
  { key: "this_year", label: "Năm nay" },
  { key: "last_week", label: "Tuần trước" },
  { key: "last_month", label: "Tháng trước" },
  { key: "last_year", label: "Năm trước" },
  { key: "last_7", label: "Trong vòng 7 ngày" },
  { key: "last_10", label: "Trong vòng 10 ngày" },
  { key: "last_30", label: "Trong vòng 30 ngày" },
];

const TRANG_THAI_OPTIONS = [
  "Chờ xử lý",
  "Đang sản xuất",
  "Đang thử",
  "Hoàn thành",
];
const ROWS_PER_PAGE = 20;

const EMPTY_DATE = { preset: null, customFrom: "", customTo: "" };
const EXPORT_STATUS_OPTIONS = [
  { value: "Chờ xử lý", label: "Chờ sản xuất" },
  { value: "Đang sản xuất", label: "Đang sản xuất" },
];

const exportModalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: { xs: "96%", md: 900 },
  maxWidth: 980,
  maxHeight: "92vh",
  overflow: "auto",
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 3,
  borderRadius: 2,
};

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
    case "last_year":
      return {
        from: new Date(today.getFullYear() - 1, 0, 1),
        to: new Date(today.getFullYear(), 0, 1),
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

const isDateInRange = (dateValue, filter) => {
  if (!filter.preset) return true;
  if (!dateValue) return false;
  const d = new Date(dateValue);
  let from, to;
  if (filter.preset === "custom") {
    from = filter.customFrom ? new Date(filter.customFrom) : null;
    to = filter.customTo ? new Date(filter.customTo + "T23:59:59") : null;
  } else {
    const range = getDateRange(filter.preset);
    from = range.from;
    to = range.to;
  }
  if (from && d < from) return false;
  if (to && d >= to) return false;
  return true;
};

const DonHangPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    data: donHangs,
    loading,
    loadingMore,
    error,
    pagination,
    stats,
    statusCounts,
  } = useSelector((state) => state.donHang);

  const nhaKhoaState = useSelector((state) => state.nhaKhoa);
  const benhNhanState = useSelector((state) => state.benhNhan);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedDonHangId, setSelectedDonHangId] = useState(null);
  const sentinelRef = useRef(null);

  // Chỉ fetch danh sách Nha khoa / Bệnh nhân khi thực sự cần (mở filter hoặc mở export),
  // tránh gọi API ngay khi vào trang.
  const hasFetchedListsRef = useRef(false);
  const ensureListsLoaded = useCallback(() => {
    if (hasFetchedListsRef.current) return;
    hasFetchedListsRef.current = true;
    dispatch(fetchNhaKhoa());
    dispatch(fetchBenhNhan());
  }, [dispatch]);

  //
  const { donHangPageFilter } = useSelector((state) => state.donHang);

  // Applied filters
  const appliedNgayNhan = donHangPageFilter.appliedNgayNhan;

  const appliedYcHoanThanh = donHangPageFilter.appliedYcHoanThanh;

  const appliedHenGiao = donHangPageFilter.appliedHenGiao;

  const appliedNhaKhoa = donHangPageFilter.appliedNhaKhoa;

  const appliedBenhNhan = donHangPageFilter.appliedBenhNhan;

  const appliedTrangThai = donHangPageFilter.appliedTrangThai;

  // Draft filters
  const [draftNgayNhan, setDraftNgayNhan] = useState(EMPTY_DATE);
  const [draftYcHoanThanh, setDraftYcHoanThanh] = useState(EMPTY_DATE);
  const [draftHenGiao, setDraftHenGiao] = useState(EMPTY_DATE);
  const [draftNhaKhoa, setDraftNhaKhoa] = useState(null);
  const [draftBenhNhan, setDraftBenhNhan] = useState(null);
  const [draftTrangThai, setDraftTrangThai] = useState([]);

  // UI state
  const [showFilter, setShowFilter] = useState(false);
  const [openSection, setOpenSection] = useState(null);
  const [nhaKhoaSearch, setNhaKhoaSearch] = useState("");
  const [benhNhanSearch, setBenhNhanSearch] = useState("");
  const filterRef = useRef(null);
  const [openDateModal, setOpenDateModal] = useState(null); // 'ngayNhan' | 'ycHoanThanh' | 'henGiao'
  const [openPickerModal, setOpenPickerModal] = useState(null); // 'nhaKhoa' | 'benhNhan'
  const [datePickerAnchor, setDatePickerAnchor] = useState({
    ngayNhan: null,
    ycHoanThanh: null,
    henGiao: null,
  });

  // Export state
  const [openExport, setOpenExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportNgayNhan, setExportNgayNhan] = useState(
    EMPTY_EXPORT_DATE_FILTER
  );
  const [exportYeuCauGiao, setExportYeuCauGiao] = useState(
    EMPTY_EXPORT_DATE_FILTER
  );
  const [exportNgayHoanThanh, setExportNgayHoanThanh] = useState(
    EMPTY_EXPORT_DATE_FILTER
  );
  const [exportTrangThai, setExportTrangThai] = useState([]);
  const [exportNhaKhoa, setExportNhaKhoa] = useState("");
  const [exportBenhNhan, setExportBenhNhan] = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Helper: convert filter preset to ISO date range params
  const getFilterParams = useCallback((filter, fromKey, toKey) => {
    if (!filter.preset) return {};
    let from, to;
    if (filter.preset === "custom") {
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
    if (appliedBenhNhan) params.benhNhan = appliedBenhNhan._id;
    if (appliedTrangThai.length > 0)
      params.trangThai = appliedTrangThai.join(",");
    Object.assign(
      params,
      getFilterParams(appliedNgayNhan, "ngayNhanFrom", "ngayNhanTo")
    );
    Object.assign(
      params,
      getFilterParams(appliedYcHoanThanh, "ycHoanThanhFrom", "ycHoanThanhTo")
    );
    Object.assign(
      params,
      getFilterParams(appliedHenGiao, "henGiaoFrom", "henGiaoTo")
    );
    if (page === 1) {
      dispatch(fetchDonHang(params));
    } else {
      dispatch(fetchMoreDonHang(params));
    }
  }, [
    dispatch,
    page,
    debouncedSearch,
    appliedNhaKhoa,
    appliedBenhNhan,
    appliedTrangThai,
    appliedNgayNhan,
    appliedYcHoanThanh,
    appliedHenGiao,
    getFilterParams,
    refreshKey,
  ]);

  // Fetch status counts WITHOUT trangThai filter so the top buttons always show
  // counts for all statuses under the current non-status filters
  const loadStatusCounts = useCallback(() => {
    const params = {};
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (appliedNhaKhoa) params.nhaKhoa = appliedNhaKhoa._id;
    if (appliedBenhNhan) params.benhNhan = appliedBenhNhan._id;
    Object.assign(
      params,
      getFilterParams(appliedNgayNhan, "ngayNhanFrom", "ngayNhanTo")
    );
    Object.assign(
      params,
      getFilterParams(appliedYcHoanThanh, "ycHoanThanhFrom", "ycHoanThanhTo")
    );
    Object.assign(
      params,
      getFilterParams(appliedHenGiao, "henGiaoFrom", "henGiaoTo")
    );
    dispatch(fetchDonHangStatusCounts(params));
  }, [
    dispatch,
    debouncedSearch,
    appliedNhaKhoa,
    appliedBenhNhan,
    appliedNgayNhan,
    appliedYcHoanThanh,
    appliedHenGiao,
    getFilterParams,
    refreshKey,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadStatusCounts();
  }, [loadStatusCounts]);

  // Infinite scroll: khi sentinel vào viewport thì tải trang tiếp theo
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
        // Don't close when clicking inside MUI portals (Select dropdown, Popover, etc.)
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
    const data = nhaKhoaState?.data || [];
    return Array.isArray(data)
      ? data
        .map((nk) => ({
          _id: nk._id,
          name: nk.tenGiaoDich || nk.hoVaTen || "",
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
      : [];
  }, [nhaKhoaState?.data]);

  const benhNhanOptions = useMemo(() => {
    const data = benhNhanState?.data || [];
    return Array.isArray(data)
      ? data
        .map((bn) => ({
          _id: bn._id,
          name: bn.hoVaTen || "",
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
      : [];
  }, [benhNhanState?.data]);

  const filteredNhaKhoaOpts = useMemo(() => {
    if (!nhaKhoaSearch.trim()) return nhaKhoaOptions;
    const s = nhaKhoaSearch.toLowerCase();
    return nhaKhoaOptions.filter((nk) => nk.name.toLowerCase().includes(s));
  }, [nhaKhoaOptions, nhaKhoaSearch]);

  const filteredBenhNhanOpts = useMemo(() => {
    if (!benhNhanSearch.trim()) return benhNhanOptions;
    const s = benhNhanSearch.toLowerCase();
    return benhNhanOptions.filter((bn) => bn.name.toLowerCase().includes(s));
  }, [benhNhanOptions, benhNhanSearch]);

  const handleOpenFilter = () => {
    // Lazy-load danh sách Nha khoa/Bệnh nhân đúng lúc mở bộ lọc
    ensureListsLoaded();

    setDraftNgayNhan(donHangPageFilter.appliedNgayNhan);

    setDraftYcHoanThanh(donHangPageFilter.appliedYcHoanThanh);

    setDraftHenGiao(donHangPageFilter.appliedHenGiao);

    setDraftNhaKhoa(donHangPageFilter.appliedNhaKhoa);

    setDraftBenhNhan(donHangPageFilter.appliedBenhNhan);

    setDraftTrangThai([...donHangPageFilter.appliedTrangThai]);

    setShowFilter(true);
  };

  const handleApplyFilters = () => {
    dispatch(
      setDonHangPageFilter({
        appliedNgayNhan: draftNgayNhan,
        appliedYcHoanThanh: draftYcHoanThanh,
        appliedHenGiao: draftHenGiao,
        appliedNhaKhoa: draftNhaKhoa,
        appliedBenhNhan: draftBenhNhan,
        appliedTrangThai: draftTrangThai,
      })
    );
    setPage(1);
    setOpenDateModal(null);
    setOpenPickerModal(null);
    setShowFilter(false);
  };

  const handleResetDraft = () => {
    setDraftNgayNhan(EMPTY_DATE);
    setDraftYcHoanThanh(EMPTY_DATE);
    setDraftHenGiao(EMPTY_DATE);
    setDraftNhaKhoa(null);
    setDraftBenhNhan(null);
    setDraftTrangThai([]);
  };

  const handleRefresh = () => {
    setSearchTerm("");
    dispatch(resetDonHangPageFilter());
    setPage(1);
    setRefreshKey((k) => k + 1);
  };

  const handleOpenAdd = () => navigate("/donhang/create");

  const handleRowClick = (donHang) => {
    setSelectedDonHangId((prev) => (prev === donHang._id ? null : donHang._id));
  };

  const toggleDraftTrangThai = (status) => {
    setDraftTrangThai((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const hasExportDateValue = () =>
    [exportNgayNhan, exportYeuCauGiao, exportNgayHoanThanh].some((item) =>
      isValidExportDateFilter(item)
    );

  const isDateInRangeForExport = (dateValue, fromISO, toISO) => {
    if (!fromISO && !toISO) return true;
    if (!dateValue) return false;
    const date = new Date(dateValue);
    const fromDate = fromISO ? new Date(fromISO) : null;
    const toDate = toISO ? new Date(toISO) : null;

    if (fromDate && date < fromDate) return false;
    if (toDate && date > toDate) return false;
    return true;
  };

  const handleCloseExport = () => {
    setOpenExport(false);
    setExportNgayNhan(EMPTY_EXPORT_DATE_FILTER);
    setExportYeuCauGiao(EMPTY_EXPORT_DATE_FILTER);
    setExportNgayHoanThanh(EMPTY_EXPORT_DATE_FILTER);
    setExportTrangThai([]);
    setExportNhaKhoa("");
    setExportBenhNhan("");
  };

  const handleExportExcel = async () => {
    if (!hasExportDateValue()) {
      toast.error(
        "Vui lòng nhập ít nhất 1 trong 3 nhóm ngày: Ngày nhận đơn, Ngày yêu cầu giao hoặc Ngày hoàn thành."
      );
      return;
    }

    try {
      setExporting(true);

      const ngayNhanRange = toISODateRange(exportNgayNhan);
      const yeuCauGiaoRange = toISODateRange(exportYeuCauGiao);
      const ngayHoanThanhRange = toISODateRange(exportNgayHoanThanh);

      // Fetch all matching data from server
      const apiParams = { page: 1, limit: 5000 };
      if (ngayNhanRange.fromISO) apiParams.ngayNhanFrom = ngayNhanRange.fromISO;
      if (ngayNhanRange.toISO) apiParams.ngayNhanTo = ngayNhanRange.toISO;
      if (yeuCauGiaoRange.fromISO)
        apiParams.ycHoanThanhFrom = yeuCauGiaoRange.fromISO;
      if (yeuCauGiaoRange.toISO)
        apiParams.ycHoanThanhTo = yeuCauGiaoRange.toISO;
      if (exportNhaKhoa) apiParams.nhaKhoa = exportNhaKhoa;
      if (exportBenhNhan) apiParams.benhNhan = exportBenhNhan;
      if (exportTrangThai.length > 0)
        apiParams.trangThai = exportTrangThai.join(",");

      const res = await api.get("/donhang", { params: apiParams });
      let data = res.data.data || [];

      // Apply ngayHoanThanh filter client-side (based on updatedAt)
      if (isValidExportDateFilter(exportNgayHoanThanh)) {
        data = data.filter((dh) => {
          const completedStatus =
            dh.trangThai === "Hoàn thành" || dh.trangThai === "Đã giao";
          if (!completedStatus) return false;
          return isDateInRangeForExport(
            dh.updatedAt,
            ngayHoanThanhRange.fromISO,
            ngayHoanThanhRange.toISO
          );
        });
      }

      const selectedNhaKhoa = nhaKhoaOptions.find(
        (nk) => nk._id === exportNhaKhoa
      );
      const selectedBenhNhan = benhNhanOptions.find(
        (bn) => bn._id === exportBenhNhan
      );

      await exportDonHangListToExcel(data, {
        ngayNhanFrom: ngayNhanRange.fromISO,
        ngayNhanTo: ngayNhanRange.toISO,
        yeuCauGiaoFrom: yeuCauGiaoRange.fromISO,
        yeuCauGiaoTo: yeuCauGiaoRange.toISO,
        daHoanThanhFrom: ngayHoanThanhRange.fromISO,
        daHoanThanhTo: ngayHoanThanhRange.toISO,
        nhaKhoaName: selectedNhaKhoa?.name || "Tất cả",
        benhNhanName: selectedBenhNhan?.name || "Tất cả",
      });

      handleCloseExport();
    } catch (err) {
      toast.error(
        `Xuất Excel thất bại: ${err?.message || "Lỗi không xác định"}`
      );
    } finally {
      setExporting(false);
    }
  };

  const filteredDonHangs = useMemo(() => {
    return donHangs.filter((dh) => {
      if (debouncedSearch.trim()) {
        const term = debouncedSearch.toLowerCase().trim();
        const ma = (
          dh.maDonHang || `TAN${dh._id.substring(dh._id.length - 8)}`
        ).toLowerCase();
        const nk = (
          dh.nhaKhoa?.tenGiaoDich ||
          dh.nhaKhoa?.hoVaTen ||
          ""
        ).toLowerCase();
        const bs = (dh.bacSi?.hoVaTen || "").toLowerCase();
        const bn = (dh.benhNhan?.hoVaTen || "").toLowerCase();
        const spMatch = (dh.danhSachSanPham || []).some((item) =>
          (item.sanPham?.tenSanPham || "").toLowerCase().includes(term)
        );
        if (
          !ma.includes(term) &&
          !nk.includes(term) &&
          !bs.includes(term) &&
          !bn.includes(term) &&
          !spMatch
        )
          return false;
      }
      if (!isDateInRange(dh.ngayNhan, appliedNgayNhan)) return false;
      if (!isDateInRange(dh.yeuCauHoanThanh, appliedYcHoanThanh)) return false;
      if (!isDateInRange(dh.henGiao, appliedHenGiao)) return false;
      if (appliedNhaKhoa && dh.nhaKhoa?._id !== appliedNhaKhoa._id)
        return false;
      if (appliedBenhNhan && dh.benhNhan?._id !== appliedBenhNhan._id)
        return false;
      if (
        appliedTrangThai.length > 0 &&
        !appliedTrangThai.includes(dh.trangThai)
      )
        return false;
      return true;
    });
  }, [
    donHangs,
    debouncedSearch,
    appliedNgayNhan,
    appliedYcHoanThanh,
    appliedHenGiao,
    appliedNhaKhoa,
    appliedBenhNhan,
    appliedTrangThai,
  ]);

  const selectedDonHang =
    donHangs.find((dh) => dh._id === selectedDonHangId) || null;

  const isFiltered = !!(
    appliedNgayNhan.preset ||
    appliedYcHoanThanh.preset ||
    appliedHenGiao.preset ||
    appliedNhaKhoa ||
    appliedBenhNhan ||
    appliedTrangThai.length > 0
  );
  const getDateLabel = (f) => {
    if (f.preset === "custom") {
      if (f.customFrom && f.customTo)
        return `${dayjs(f.customFrom).format("DD/MM/YYYY")} → ${dayjs(f.customTo).format("DD/MM/YYYY")}`;
      if (f.customFrom) return `Từ ${dayjs(f.customFrom).format("DD/MM/YYYY")}`;
    }
    return DATE_PRESETS.find((p) => p.key === f.preset)?.label || "";
  };

  // Bấm trường ngày trong bộ lọc → mở lịch chọn khoảng ngày ngay
  const renderDatePicker = (cf, scf, dateKey) => (
    <CustomDateRangePicker
      open={Boolean(datePickerAnchor[dateKey])}
      anchorEl={datePickerAnchor[dateKey]}
      onClose={() =>
        setDatePickerAnchor((prev) => ({ ...prev, [dateKey]: null }))
      }
      initialDates={{
        start: cf.preset === "custom" ? cf.customFrom || "" : "",
        end: cf.preset === "custom" ? cf.customTo || "" : "",
      }}
      onApply={(dates) => {
        scf(
          dates.start
            ? { preset: "custom", customFrom: dates.start, customTo: dates.end || dates.start }
            : EMPTY_DATE
        );
        setDatePickerAnchor((prev) => ({ ...prev, [dateKey]: null }));
      }}
    />
  );

  return (
    <div className="p-3 bg-gray-100">
      <div className="mb-3 flex items-center rounded overflow-hidden font-bold">
        <div
          className="flex-1 cursor-pointer bg-yellow-500 hover:bg-yellow-700 text-white px-2 transition-colors"
          onClick={() => {
            dispatch(
              setDonHangPageFilter({
                appliedTrangThai: ["Chờ xử lý"],
                appliedHenGiao: { preset: null, customFrom: "", customTo: "" },
              })
            );
            setPage(1);
          }}
        >
          <div className="text-xl">{statusCounts?.["Chờ xử lý"] || 0}</div>
          <div className="text-base">Chờ xử lý</div>
        </div>
        <div
          className="flex-1 cursor-pointer bg-blue-500 hover:bg-blue-700 text-white px-2 transition-colors"
          onClick={() => {
            dispatch(
              setDonHangPageFilter({
                appliedTrangThai: ["Đang sản xuất"],
                appliedHenGiao: { preset: null, customFrom: "", customTo: "" },
              })
            );
            setPage(1);
          }}
        >
          <div className="text-xl">{statusCounts?.["Đang sản xuất"] || 0}</div>
          <div className="text-base">Đang SX</div>
        </div>
        <div
          className="flex-1 cursor-pointer bg-purple-500 hover:bg-purple-700 text-white px-2 transition-colors"
          onClick={() => {
            dispatch(
              setDonHangPageFilter({
                appliedTrangThai: ["Đang thử"],
                appliedHenGiao: { preset: null, customFrom: "", customTo: "" },
              })
            );
            setPage(1);
          }}
        >
          <div className="text-xl">{statusCounts?.["Đang thử"] || 0}</div>
          <div className="text-base">Đang thử</div>
        </div>
        <div
          className="flex-1 cursor-pointer bg-green-500 hover:bg-green-700 text-white px-2 transition-colors"
          onClick={() => {
            dispatch(
              setDonHangPageFilter({
                appliedTrangThai: ["Hoàn thành"],
                appliedHenGiao: { preset: null, customFrom: "", customTo: "" },
              })
            );
            setPage(1);
          }}
        >
          <div className="text-xl">{statusCounts?.["Hoàn thành"] || 0}</div>
          <div className="text-base">Hoàn thành</div>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div className="relative" ref={filterRef}>
          <button
            onClick={handleOpenFilter}
            title="Bộ lọc"
            className="relative"
          >
            <button
              onClick={handleOpenFilter}
              title="Lọc"
              className="text-white rounded-full h-10 w-10 flex items-center justify-center bg-sky-500 shadow hover:bg-sky-600 transition"
            >
              <FilterAltIcon sx={{ fontSize: 20 }} />
            </button>
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
              {/* Ngày nhận */}
              <div
                className="relative border-b border-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition text-base"
                  onClick={(e) => {
                    setOpenPickerModal(null);
                    setOpenDateModal(null);
                    const el = e.currentTarget;
                    setDatePickerAnchor((prev) => ({ ...prev, ngayNhan: el }));
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
                  <CalendarTodayIcon sx={{ fontSize: 16, color: "#9ca3af" }} />
                </button>
                {renderDatePicker(draftNgayNhan, setDraftNgayNhan, "ngayNhan")}
              </div>
              {/* Y/c hoàn thành */}
              <div
                className="relative border-b border-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition text-base"
                  onClick={(e) => {
                    setOpenPickerModal(null);
                    setOpenDateModal(null);
                    const el = e.currentTarget;
                    setDatePickerAnchor((prev) => ({ ...prev, ycHoanThanh: el }));
                  }}
                >
                  <span
                    className={
                      draftYcHoanThanh.preset
                        ? "text-blue-600 font-medium"
                        : "text-gray-600"
                    }
                  >
                    {draftYcHoanThanh.preset
                      ? getDateLabel(draftYcHoanThanh)
                      : "Y/c hoàn thành"}
                  </span>
                  <CalendarTodayIcon sx={{ fontSize: 16, color: "#9ca3af" }} />
                </button>
                {renderDatePicker(draftYcHoanThanh, setDraftYcHoanThanh, "ycHoanThanh")}
              </div>
              {/* Hẹn giao */}
              <div
                className="relative border-b border-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition text-base"
                  onClick={(e) => {
                    setOpenPickerModal(null);
                    setOpenDateModal(null);
                    const el = e.currentTarget;
                    setDatePickerAnchor((prev) => ({ ...prev, henGiao: el }));
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
                  <CalendarTodayIcon sx={{ fontSize: 16, color: "#9ca3af" }} />
                </button>
                {renderDatePicker(draftHenGiao, setDraftHenGiao, "henGiao")}
              </div>
              {/* Nha khoa */}
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
              {/* Bệnh nhân */}
              <div
                className="relative border-b border-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                {openPickerModal === "benhNhan" ? (
                  <div className="px-3 py-2">
                    <input
                      type="text"
                      value={benhNhanSearch}
                      onChange={(e) => setBenhNhanSearch(e.target.value)}
                      placeholder="Tìm bệnh nhân..."
                      autoFocus
                      className="w-full border-b border-blue-400 px-3 py-1.5 text-base focus:outline-none"
                    />
                  </div>
                ) : (
                  <button
                    className="w-full flex items-start px-4 py-3 hover:bg-gray-50 transition text-base"
                    onClick={() => {
                      setOpenDateModal(null);
                      setBenhNhanSearch("");
                      setOpenPickerModal("benhNhan");
                    }}
                  >
                    <span
                      className={
                        draftBenhNhan
                          ? "text-blue-600 font-medium truncate"
                          : "text-gray-400"
                      }
                    >
                      {draftBenhNhan ? draftBenhNhan.name : "Bệnh nhân"}
                    </span>
                  </button>
                )}
                {openPickerModal === "benhNhan" && (
                  <div className="absolute left-2 top-full z-[100] w-[90%] bg-white rounded shadow-xl border border-t-0 border-gray-200 max-h-56 overflow-y-auto">
                    {draftBenhNhan && (
                      <button
                        onClick={() => {
                          setDraftBenhNhan(null);
                          setOpenPickerModal(null);
                        }}
                        className="w-full text-left px-4 py-2 text-base text-red-500 hover:bg-red-50 border-b border-gray-100 transition"
                      >
                        Bỏ chọn
                      </button>
                    )}
                    {filteredBenhNhanOpts.map((item) => (
                      <button
                        key={item._id}
                        onClick={() => {
                          setDraftBenhNhan(item);
                          setOpenPickerModal(null);
                        }}
                        className={`w-full text-left px-4 py-2 text-base border-b border-gray-50 transition ${draftBenhNhan?._id === item._id
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-gray-700 hover:bg-gray-50"
                          }`}
                      >
                        {item.name}
                      </button>
                    ))}
                    {filteredBenhNhanOpts.length === 0 && (
                      <p className="text-center text-base text-gray-400 py-4">
                        Không tìm thấy
                      </p>
                    )}
                  </div>
                )}
              </div>
              {/* Trạng thái */}
              <div className="border-b border-gray-100 px-3 py-2">
                <FormControl fullWidth size="small">
                  <Select
                    multiple
                    displayEmpty
                    value={draftTrangThai}
                    onChange={(e) =>
                      setDraftTrangThai(
                        typeof e.target.value === "string"
                          ? e.target.value.split(",")
                          : e.target.value
                      )
                    }
                    renderValue={(selected) => {
                      if (selected.length === 0)
                        return (
                          <em
                            style={{
                              color: "#9ca3af",
                              fontStyle: "normal",
                              fontSize: "0.875rem",
                            }}
                          >
                            Trạng thái
                          </em>
                        );
                      if (selected.length === 1)
                        return (
                          <span style={{ fontSize: "0.875rem" }}>
                            {selected[0]}
                          </span>
                        );
                      return (
                        <span style={{ fontSize: "0.875rem" }}>
                          {selected[0]} (+{selected.length - 1} Khác)
                        </span>
                      );
                    }}
                    sx={{
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#e5e7eb",
                      },
                      "& .MuiSelect-select": { py: "6px" },
                    }}
                  >
                    {TRANG_THAI_OPTIONS.map((status) => (
                      <MenuItem
                        key={status}
                        value={status}
                        dense
                        sx={{ fontSize: "0.875rem" }}
                      >
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
              {/* Bottom buttons */}
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
                  className="flex items-center gap-1 px-4 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-base font-semibold rounded-lg transition shadow-sm"
                >
                  Lưu
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex items-center flex-1 sm:flex-none">
            <span className="absolute left-3 text-gray-400 flex items-center pointer-events-none">
              <SearchIcon sx={{ fontSize: 20 }} />
            </span>
            <input
              type="text"
              placeholder="Nhập Số/Nha khoa/Bác sĩ/Bệnh nhân/Sản phẩm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white shadow md:text-base text-base px-10 py-1.5 rounded-full h-10 w-48 sm:w-96 focus:outline-sky-300"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 text-gray-400 hover:text-gray-600 flex items-center"
              >
                <CloseIcon sx={{ fontSize: 16 }} />
              </button>
            )}
          </div>
          <button
            onClick={handleOpenAdd}
            title="Tạo đơn hàng"
            className="text-white rounded-full h-10 w-10 flex items-center justify-center bg-sky-500 shadow hover:bg-sky-600 transition"
          >
            <AddIcon sx={{ fontSize: 20 }} />
          </button>
          <button
            onClick={() => {
              // Lazy-load danh sách Nha khoa/Bệnh nhân đúng lúc mở export
              ensureListsLoaded();
              setOpenExport(true);
            }}
            title="Xuất Excel"
            className="text-white rounded-full h-10 w-10 flex items-center justify-center bg-sky-500 shadow hover:bg-sky-600 transition"
          >
            <DownloadIcon sx={{ fontSize: 20 }} />
          </button>
          <button
            onClick={handleRefresh}
            title="Tải lại"
            className="text-white rounded-full h-10 w-10 flex items-center justify-center bg-sky-500 shadow hover:bg-sky-600 transition"
          >
            <RefreshIcon sx={{ fontSize: 20 }} />
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      {isFiltered && (
        <div className="hidden sm:flex mb-3 flex-wrap gap-2">
          {appliedNgayNhan.preset && (
            <span className="px-2 py-1 flex items-center gap-2 bg-slate-200 text-gray-800 text-base rounded-full">
              Ngày nhận: {getDateLabel(appliedNgayNhan)}
              <button
                onClick={() => {
                  dispatch(
                    setDonHangPageFilter({
                      appliedNgayNhan: EMPTY_DATE,
                    })
                  );
                  setPage(1);
                }}
                className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-400 text-white"
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </button>
            </span>
          )}
          {appliedYcHoanThanh.preset && (
            <span className="px-2 py-1 flex items-center gap-2 bg-slate-200 text-gray-800 text-base rounded-full">
              Y/c hoàn thành: {getDateLabel(appliedYcHoanThanh)}
              <button
                onClick={() => {
                  dispatch(
                    setDonHangPageFilter({
                      appliedYcHoanThanh: EMPTY_DATE,
                    })
                  );
                  setPage(1);
                }}
                className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-400 text-white"
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </button>
            </span>
          )}
          {appliedHenGiao.preset && (
            <span className="px-2 py-1 flex items-center gap-2 bg-slate-200 text-gray-800 text-base rounded-full">
              Hẹn giao: {getDateLabel(appliedHenGiao)}
              <button
                onClick={() => {
                  dispatch(
                    setDonHangPageFilter({
                      appliedHenGiao: EMPTY_DATE,
                    })
                  );
                  setPage(1);
                }}
                className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-400 text-white"
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </button>
            </span>
          )}
          {appliedNhaKhoa && (
            <span className="px-2 py-1 flex items-center gap-2 bg-slate-200 text-gray-800 text-base rounded-full">
              Nha khoa: {appliedNhaKhoa.name}
              <button
                onClick={() => {
                  dispatch(
                    setDonHangPageFilter({
                      appliedNhaKhoa: null,
                    })
                  );
                  setPage(1);
                }}
                className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-400 text-white"
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </button>
            </span>
          )}
          {appliedBenhNhan && (
            <span className="px-2 py-1 flex items-center gap-2 bg-slate-200 text-gray-800 text-base rounded-full">
              Bệnh nhân: {appliedBenhNhan.name}
              <button
                onClick={() => {
                  dispatch(
                    setDonHangPageFilter({
                      appliedBenhNhan: null,
                    })
                  );
                  setPage(1);
                }}
                className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-400 text-white"
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </button>
            </span>
          )}
          {appliedTrangThai.map((status) => (
            <span
              key={status}
              className="px-2 py-1 flex items-center gap-2 bg-slate-200 text-gray-800 text-base rounded-full"
            >
              Trạng thái: {status}
              <button
                onClick={() => {
                  dispatch(
                    setDonHangPageFilter({
                      appliedTrangThai: appliedTrangThai.filter(
                        (s) => s !== status
                      ),
                    })
                  );
                  setPage(1);
                }}
                className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-400 text-white"
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </button>
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-500">
          Đang tải dữ liệu...
        </div>
      ) : error ? (
        <div className="text-center text-red-500 py-10">Lỗi: {error}</div>
      ) : (
        <>
          <DonHangTable
            data={filteredDonHangs}
            selectedId={selectedDonHangId}
            onRowClick={handleRowClick}
          />
          {loadingMore && (
            <div className="text-center py-3 text-gray-400 text-base">
              Đang tải thêm...
            </div>
          )}
          <div ref={sentinelRef} className="h-4" />
        </>
      )}

      <DonHangDetailPanel
        donHang={selectedDonHang}
        onClose={() => setSelectedDonHangId(null)}
      />

      <Modal open={openExport} onClose={handleCloseExport}>
        <Box sx={{ ...exportModalStyle, maxWidth: 650 }}>
          <Typography
            variant="h6"
            className="font-bold text-blue-700 mb-2 flex items-center gap-2"
          >
            <DownloadIcon sx={{ fontSize: 24 }} />
            Xuất Excel Đơn Hàng
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Stack spacing={4}>
            {/* KHỐI 1: LỌC THEO THỜI GIAN */}
            <Box>
              <Typography
                variant="subtitle2"
                className="font-semibold text-gray-800 mb-4 border-b pb-1"
              >
                Lọc theo khoảng thời gian
              </Typography>
              <Stack spacing={2.5}>
                <ExportDateSelector
                  title="1. Ngày nhận đơn"
                  value={exportNgayNhan}
                  onChange={setExportNgayNhan}
                />
                <ExportDateSelector
                  title="2. Ngày yêu cầu giao"
                  value={exportYeuCauGiao}
                  onChange={setExportYeuCauGiao}
                />
                <ExportDateSelector
                  title="3. Ngày hoàn thành"
                  value={exportNgayHoanThanh}
                  onChange={setExportNgayHoanThanh}
                />
              </Stack>
            </Box>

            {/* KHỐI 2: LỌC THEO THUỘC TÍNH */}
            <Box>
              <Typography
                variant="subtitle2"
                className="font-semibold text-gray-800 mb-3 border-b pb-1"
              >
                Lọc theo đối tượng / trạng thái
              </Typography>
              <Stack spacing={2.5}>
                {/* Trạng thái */}
                <Box>
                  <Typography
                    variant="caption"
                    className="font-semibold text-gray-700 mb-1 block"
                  >
                    Trạng thái (chọn nhiều)
                  </Typography>
                  <FormControl size="small" fullWidth>
                    <Select
                      multiple
                      displayEmpty
                      value={exportTrangThai}
                      onChange={(e) => setExportTrangThai(e.target.value)}
                      renderValue={(selected) => {
                        if (!selected || selected.length === 0)
                          return (
                            <span className="text-gray-500">
                              -- Tất cả trạng thái --
                            </span>
                          );
                        return (
                          <Box
                            sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                          >
                            {selected.map((item) => {
                              const label =
                                EXPORT_STATUS_OPTIONS.find(
                                  (s) => s.value === item
                                )?.label || item;
                              return (
                                <Chip
                                  key={item}
                                  size="small"
                                  label={label}
                                  color="primary"
                                  variant="outlined"
                                />
                              );
                            })}
                          </Box>
                        );
                      }}
                    >
                      {EXPORT_STATUS_OPTIONS.map((status) => (
                        <MenuItem key={status.value} value={status.value}>
                          {status.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* Nha khoa */}
                <Box>
                  <Typography
                    variant="caption"
                    className="font-semibold text-gray-700 mb-1 block"
                  >
                    Nha khoa
                  </Typography>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={exportNhaKhoa}
                      onChange={(e) => setExportNhaKhoa(e.target.value)}
                      displayEmpty
                      MenuProps={{
                        PaperProps: { style: { maxHeight: 300 } },
                        container:
                          typeof document !== "undefined"
                            ? document.body
                            : undefined,
                      }}
                    >
                      <MenuItem value="">
                        <span className="text-gray-500">
                          -- Tất cả nha khoa --
                        </span>
                      </MenuItem>
                      {nhaKhoaOptions.map((nk) => (
                        <MenuItem key={nk._id} value={nk._id}>
                          {nk.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* Bệnh nhân */}
                <Box>
                  <Typography
                    variant="caption"
                    className="font-semibold text-gray-700 mb-1 block"
                  >
                    Bệnh nhân
                  </Typography>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={exportBenhNhan}
                      onChange={(e) => setExportBenhNhan(e.target.value)}
                      displayEmpty
                      MenuProps={{
                        PaperProps: { style: { maxHeight: 300 } },
                        container:
                          typeof document !== "undefined"
                            ? document.body
                            : undefined,
                      }}
                    >
                      <MenuItem value="">
                        <span className="text-gray-500">
                          -- Tất cả bệnh nhân --
                        </span>
                      </MenuItem>
                      {benhNhanOptions.map((bn) => (
                        <MenuItem key={bn._id} value={bn._id}>
                          {bn.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Stack>
            </Box>
          </Stack>

          {/* FOOTER: NÚT THAO TÁC */}
          <Box className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <Button
              variant="outlined"
              color="inherit"
              onClick={handleCloseExport}
            >
              Hủy
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleExportExcel}
              disabled={exporting}
              startIcon={<DownloadIcon />}
            >
              {exporting ? "Đang xuất..." : "Tải xuống"}
            </Button>
          </Box>
        </Box>
      </Modal>
    </div>
  );
};

export default DonHangPage;