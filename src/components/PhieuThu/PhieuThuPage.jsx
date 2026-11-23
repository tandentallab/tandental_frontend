import React, { useEffect, useState, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllPhieuThu } from "../../redux/slices/phieuThuSlice";
import { fetchNhaKhoa } from "../../redux/slices/nhaKhoaSlice";
import PhieuThuModal from "./PhieuThuModal";
import PhieuThuDetailPanel from "./PhieuThuDetailPanel";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import StoreIcon from "@mui/icons-material/Store";
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import DownloadIcon from "@mui/icons-material/Download";
import PrintIcon from "@mui/icons-material/Print";
import { api } from "../../config/api";
import { exportPhieuThuToExcel } from "../../utils/exportToExcel";
import CustomDateRangePicker from "../common/CustomDateRangePicker";
import dayjs from "dayjs";
import { toast } from "sonner";

const formatCurrency = (value) =>
    (value || 0).toLocaleString('vi-VN');

const formatSoPhieu = (id) =>
    id ? "TAN" + id.toString().slice(-8).toUpperCase() : "-";

const formatDateTime = (d) => {
    if (!d) return "-";
    return new Date(d).toLocaleString("vi-VN", {
        day: "2-digit", month: "2-digit", year: "numeric",
    });
};

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

const getDateRange = (preset) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    switch (preset) {
        case "today": return { from: today, to: tomorrow };
        case "yesterday": { const f = new Date(today); f.setDate(f.getDate() - 1); return { from: f, to: today }; }
        case "this_week": { const d = today.getDay(); const f = new Date(today); f.setDate(today.getDate() - (d === 0 ? 6 : d - 1)); return { from: f, to: tomorrow }; }
        case "this_month": return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: tomorrow };
        case "this_year": return { from: new Date(today.getFullYear(), 0, 1), to: tomorrow };
        case "last_7": { const f = new Date(today); f.setDate(f.getDate() - 7); return { from: f, to: tomorrow }; }
        case "last_10": { const f = new Date(today); f.setDate(f.getDate() - 10); return { from: f, to: tomorrow }; }
        case "last_30": { const f = new Date(today); f.setDate(f.getDate() - 30); return { from: f, to: tomorrow }; }
        default: return { from: null, to: null };
    }
};

const ROWS_PER_PAGE = 20;
const EMPTY_DATE = { preset: null, customFrom: "", customTo: "" };

export default function PhieuThuPage() {
    const dispatch = useDispatch();
    const { danhSach, pagination, loading } = useSelector((s) => s.phieuThu);
    const nhaKhoaList = useSelector((s) => s.nhaKhoa.data) ?? [];

    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [openModal, setOpenModal] = useState(false);
    const [selectedPhieuThu, setSelectedPhieuThu] = useState(null);

    // Applied filter (drives API calls)
    const [appliedNgayThu, setAppliedNgayThu] = useState(EMPTY_DATE);
    const [appliedNhaKhoa, setAppliedNhaKhoa] = useState(null);

    // Filter panel UI
    const [showFilter, setShowFilter] = useState(false);
    const [draftNgayThu, setDraftNgayThu] = useState(EMPTY_DATE);
    const [draftNhaKhoa, setDraftNhaKhoa] = useState(null);
    const [openDateModal, setOpenDateModal] = useState(null);
    const [openPickerModal, setOpenPickerModal] = useState(null);
    const [nhaKhoaSearch, setNhaKhoaSearch] = useState("");
    const filterRef = useRef(null);

    // Export UI
    const [openExport, setOpenExport] = useState(false);
    const [exportDateFilter, setExportDateFilter] = useState(EMPTY_DATE);
    const [exporting, setExporting] = useState(false);

    // STATES CHO CUSTOM DROPDOWN NHA KHOA MỚI (XUẤT EXCEL)
    const [exportNhaKhoaObj, setExportNhaKhoaObj] = useState(null);
    const [openExportNhaKhoaDropdown, setOpenExportNhaKhoaDropdown] = useState(false);
    const [exportNhaKhoaSearch, setExportNhaKhoaSearch] = useState("");
    const exportNhaKhoaRef = useRef(null);

    // STATES CHO DROPDOWN NGÀY (MODAL XUẤT)
    const [exportDateAnchorEl, setExportDateAnchorEl] = useState(null);
    const exportDateRef = useRef(null);

    // STATE ĐỂ NEO TỜ LỊCH CUSTOM TRONG MENU LỌC BẢNG
    const [anchorElCustomDate, setAnchorElCustomDate] = useState(null);

    const [isPrintingBlank, setIsPrintingBlank] = useState(false);
    const [congTy, setCongTy] = useState(null);

    const handlePrintBlank = () => {
        setIsPrintingBlank(true);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                window.print();
                const cleanup = () => {
                    setIsPrintingBlank(false);
                    window.removeEventListener("afterprint", cleanup);
                };
                window.addEventListener("afterprint", cleanup);
            });
        });
    };

    useEffect(() => {
        dispatch(fetchNhaKhoa());
        api.get("/cong-ty")
            .then((res) => {
                setCongTy(res.data?.data || res.data);
            })
            .catch((err) => console.error("Lỗi fetch thông tin công ty:", err));
    }, [dispatch]);

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(searchTerm); setPage(1); }, 500);
        return () => clearTimeout(t);
    }, [searchTerm]);

    // Lắng nghe click outside cho Menu Lọc Chính
    useEffect(() => {
        const handleClick = (e) => {
            if (filterRef.current && !filterRef.current.contains(e.target)) {
                if (e.target.closest?.('.MuiPopover-root, .MuiMenu-root, .MuiModal-root')) return;
                setShowFilter(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Lắng nghe click outside cho Modal Xuất (Ngày & Nha Khoa)
    useEffect(() => {
        const handleClickOutsideDropdown = (event) => {
            if (exportNhaKhoaRef.current && !exportNhaKhoaRef.current.contains(event.target)) {
                setOpenExportNhaKhoaDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutsideDropdown);
        return () => document.removeEventListener("mousedown", handleClickOutsideDropdown);
    }, []);

    const handleOpenFilter = () => {
        setDraftNgayThu(appliedNgayThu);
        setDraftNhaKhoa(appliedNhaKhoa);
        setOpenDateModal(null);
        setOpenPickerModal(null);
        setNhaKhoaSearch("");
        setShowFilter(true);
    };

    const getApiDates = useCallback((preset, from, to) => {
        if (!preset) return { dateFrom: "", dateTo: "" };
        if (preset === "custom") {
            return {
                dateFrom: from ? new Date(from).toISOString() : "",
                dateTo: to ? new Date(to + "T23:59:59").toISOString() : "",
            };
        }
        const { from: f, to: t } = getDateRange(preset);
        return { dateFrom: f ? f.toISOString() : "", dateTo: t ? t.toISOString() : "" };
    }, []);

    const loadData = useCallback(() => {
        const { dateFrom, dateTo } = getApiDates(appliedNgayThu.preset, appliedNgayThu.customFrom, appliedNgayThu.customTo);
        dispatch(fetchAllPhieuThu({
            page, limit: ROWS_PER_PAGE, search: debouncedSearch,
            nhaKhoaId: appliedNhaKhoa?._id || "",
            dateFrom, dateTo,
        }));
    }, [dispatch, page, debouncedSearch, appliedNgayThu, appliedNhaKhoa, getApiDates]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleRefresh = () => {
        setSearchTerm(""); setDebouncedSearch("");
        setAppliedNgayThu(EMPTY_DATE); setAppliedNhaKhoa(null);
        setPage(1);
    };

    const handleApplyFilters = () => {
        setAppliedNgayThu(draftNgayThu);
        setAppliedNhaKhoa(draftNhaKhoa);
        setPage(1);
        setOpenDateModal(null);
        setOpenPickerModal(null);
        setShowFilter(false);
    };

    const handleResetDraft = () => {
        setDraftNgayThu(EMPTY_DATE); setDraftNhaKhoa(null);
    };

    const handleRowClick = (pt) => setSelectedPhieuThu((prev) => (prev?._id === pt._id ? null : pt));

    const handlePanelUpdated = (updated) => {
        if (updated) setSelectedPhieuThu((prev) => prev ? { ...prev, ...updated } : prev);
        loadData();
    };

    // 🔥 XỬ LÝ XUẤT EXCEL
    const handleExportExcel = async () => {
        const { dateFrom: fromISO, dateTo: toISO } = getApiDates(
            exportDateFilter?.preset,
            exportDateFilter?.customFrom,
            exportDateFilter?.customTo
        );

        if (!fromISO || !toISO) {
            toast.error("Vui lòng chọn khoảng thời gian xuất Excel.");
            return;
        }

        try {
            setExporting(true);

            const res = await api.get("/phieu-thu", {
                params: {
                    page: 1,
                    limit: 5000,
                    search: "",
                    nhaKhoaId: exportNhaKhoaObj?._id || "",
                    dateFrom: fromISO,
                    dateTo: toISO,
                },
            });

            const data = res.data?.data || [];

            await exportPhieuThuToExcel(data, {
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

    const filteredNhaKhoaOpts = nhaKhoaList
        .map((nk) => ({ _id: nk._id, name: nk.tenGiaoDich || nk.hoVaTen || "" }))
        .filter((nk) => !nhaKhoaSearch.trim() || nk.name.toLowerCase().includes(nhaKhoaSearch.toLowerCase()));

    const filteredExportNhaKhoaOpts = nhaKhoaList
        .map((nk) => ({ _id: nk._id, name: nk.tenGiaoDich || nk.hoVaTen || "" }))
        .filter((nk) => !exportNhaKhoaSearch.trim() || nk.name.toLowerCase().includes(exportNhaKhoaSearch.toLowerCase()));

    const getDateLabel = (f) => {
        if (f.preset === "custom" && f.customFrom) {
            return f.customTo
                ? `${dayjs(f.customFrom).format('DD/MM/YYYY')} → ${dayjs(f.customTo).format('DD/MM/YYYY')}`
                : `Từ ${dayjs(f.customFrom).format('DD/MM/YYYY')}`;
        }
        return DATE_PRESETS.find((p) => p.key === f.preset)?.label || "";
    };
    const isFiltered = !!appliedNgayThu.preset || !!appliedNhaKhoa;
    const totalPages = pagination.totalPages || 1;

    // Bấm "Ngày thu" → mở lịch ngay; chọn xong là lọc luôn
    const renderDatePicker = (cf, scf) => (
        <>
            <CustomDateRangePicker
                open={Boolean(anchorElCustomDate)}
                anchorEl={anchorElCustomDate}
                onClose={() => setAnchorElCustomDate(null)}
                initialDates={{
                    start: cf.preset === "custom" ? cf.customFrom : "",
                    end: cf.preset === "custom" ? cf.customTo : "",
                }}
                onApply={(dates) => {
                    const newNgayThu = dates.start
                        ? { preset: "custom", customFrom: dates.start, customTo: dates.end || dates.start }
                        : EMPTY_DATE;

                    setAnchorElCustomDate(null);
                    scf(newNgayThu);

                    setAppliedNgayThu(newNgayThu);
                    setAppliedNhaKhoa(draftNhaKhoa);
                    setPage(1);
                    setOpenDateModal(null);
                    setOpenPickerModal(null);
                    setShowFilter(false);
                }}
            />
        </>
    );

    return (
        <div className="p-4 bg-gray-100 min-h-screen">
            {/* Toolbar */}
            <div className="mb-4 bg-white rounded shadow-sm border">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative" ref={filterRef}>
                            <button
                                onClick={handleOpenFilter}
                                title="Bộ lọc"
                                className={`relative p-1.5 rounded transition ${isFiltered ? "text-blue-600 bg-blue-50 hover:bg-blue-100" : "text-gray-500 hover:bg-gray-100"}`}
                            >
                                <FilterAltIcon sx={{ fontSize: 20 }} />
                                {isFiltered && <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-blue-500 rounded-full" />}
                            </button>

                            {/* Filter dropdown */}
                            {showFilter && (
                                <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-white rounded-xl shadow-2xl border border-gray-200" onClick={() => { setOpenDateModal(null); setOpenPickerModal(null); }}>
                                    {/* Ngày thu */}
                                    <div className="relative border-b border-gray-100" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition text-base"
                                            onClick={(e) => { setOpenPickerModal(null); setOpenDateModal(null); setAnchorElCustomDate(e.currentTarget); }}
                                        >
                                            <span className={draftNgayThu.preset ? "text-blue-600 font-medium" : "text-gray-600"}>
                                                {draftNgayThu.preset ? getDateLabel(draftNgayThu) : "Ngày thu"}
                                            </span>
                                            <CalendarTodayIcon sx={{ fontSize: 16, color: "#9ca3af" }} />
                                        </button>
                                        {renderDatePicker(draftNgayThu, setDraftNgayThu)}
                                    </div>

                                    {/* Nha khoa */}
                                    <div className="relative border-b border-gray-100" onClick={(e) => e.stopPropagation()}>
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
                                                onClick={() => { setOpenDateModal(null); setNhaKhoaSearch(""); setOpenPickerModal("nhaKhoa"); }}
                                            >
                                                <span className={draftNhaKhoa ? "text-blue-600 font-medium truncate" : "text-gray-400"}>
                                                    {draftNhaKhoa ? draftNhaKhoa.name : "Nha khoa"}
                                                </span>
                                            </button>
                                        )}
                                        {openPickerModal === "nhaKhoa" && (
                                            <div className="absolute left-2 top-full z-[100] w-[90%] bg-white rounded-xl shadow-xl border border-gray-200 max-h-56 overflow-y-auto">
                                                {draftNhaKhoa && (
                                                    <button onClick={() => { setDraftNhaKhoa(null); setOpenPickerModal(null); }}
                                                        className="w-full text-left px-4 py-2 text-base text-red-500 hover:bg-red-50 border-b border-gray-100 transition">
                                                        Bỏ chọn
                                                    </button>
                                                )}
                                                {filteredNhaKhoaOpts.map((item) => (
                                                    <button key={item._id} onClick={() => { setDraftNhaKhoa(item); setOpenPickerModal(null); }}
                                                        className={`w-full text-left px-4 py-2 text-base border-b border-gray-50 transition ${draftNhaKhoa?._id === item._id ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}>
                                                        {item.name}
                                                    </button>
                                                ))}
                                                {filteredNhaKhoaOpts.length === 0 && <p className="text-center text-base text-gray-400 py-4">Không tìm thấy</p>}
                                            </div>
                                        )}
                                    </div>

                                    {/* Bottom buttons */}
                                    <div className="flex items-center justify-between px-4 py-3">
                                        <button onClick={handleResetDraft} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition" title="Reset lọc">
                                            <RefreshIcon sx={{ fontSize: 20 }} />
                                        </button>
                                        <button onClick={handleApplyFilters} className="flex items-center gap-1 px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white text-base font-semibold rounded-lg transition shadow-sm">
                                            ✓ Lưu
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <h2 className="text-base font-semibold text-gray-700">Phiếu Thu</h2>
                    </div>

                    {/* Right: search + add + refresh */}
                    <div className="flex gap-2 items-center flex-wrap w-full sm:w-auto">
                        <div className="relative flex items-center flex-1 sm:flex-none">
                            <span className="absolute left-2.5 text-gray-400 flex items-center pointer-events-none">
                                <SearchIcon sx={{ fontSize: 16 }} />
                            </span>
                            <input
                                type="text"
                                placeholder="Tìm phiếu thu, KH..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="border bg-gray-50 pl-8 pr-8 py-1.5 rounded-full w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-blue-500 text-base"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm("")} className="absolute right-2.5 text-gray-400 hover:text-gray-600 flex items-center">
                                    <CloseIcon sx={{ fontSize: 15 }} />
                                </button>
                            )}
                        </div>
                        <button onClick={() => setOpenModal(true)} title="Thêm phiếu thu"
                            className="bg-green-500 text-white rounded-full hover:bg-green-600 flex items-center justify-center w-8 h-8 shadow-sm">
                            <AddIcon sx={{ fontSize: 20 }} />
                        </button>
                        <button
                            onClick={() => setOpenExport(true)}
                            title="Xuất Excel"
                            className="p-2 rounded hover:bg-gray-200 text-gray-500 transition"
                        >
                            <DownloadIcon sx={{ fontSize: 20 }} />
                        </button>
                        <button
                            onClick={handlePrintBlank}
                            title="In phiếu thu mẫu"
                            className="p-2 rounded hover:bg-gray-200 text-gray-500 transition"
                        >
                            <PrintIcon sx={{ fontSize: 20 }} />
                        </button>
                        <button onClick={handleRefresh} title="Tải lại" className="text-gray-600 hover:bg-gray-100 p-1.5 rounded">
                            <RefreshIcon sx={{ fontSize: 20 }} />
                        </button>
                    </div>
                </div>

                {/* Active filter chips */}
                {isFiltered && (
                    <div className="flex items-center gap-2 px-3 pb-2.5 flex-wrap">
                        {appliedNgayThu.preset && (
                            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-base font-medium px-2.5 py-1 rounded-full">
                                <CalendarTodayIcon sx={{ fontSize: 11 }} />
                                {getDateLabel(appliedNgayThu)}
                                <button
                                    onClick={() => { setAppliedNgayThu(EMPTY_DATE); setPage(1); }}
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
                                    onClick={() => { setAppliedNhaKhoa(null); setPage(1); }}
                                    className="ml-0.5 hover:text-blue-900 flex items-center"
                                >
                                    <CloseIcon sx={{ fontSize: 12 }} />
                                </button>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded shadow-sm overflow-hidden border">
                <div className="sm:hidden divide-y divide-gray-100">
                    {loading ? (
                        <p className="text-center py-10 text-gray-400 text-base">Đang tải dữ liệu...</p>
                    ) : danhSach.length === 0 ? (
                        <p className="text-center py-10 text-gray-400 text-base">Không có dữ liệu</p>
                    ) : (
                        danhSach.map((pt) => (
                            <div
                                key={pt._id}
                                onClick={() => handleRowClick(pt)}
                                className={`px-4 py-3 cursor-pointer transition-colors ${selectedPhieuThu?._id === pt._id ? "bg-blue-50" : "hover:bg-gray-50"}`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-blue-700 text-base">
                                        {pt.soPhieuThu || formatSoPhieu(pt._id)}
                                    </span>
                                    <span className="font-semibold text-green-700 text-base">
                                        {formatCurrency(pt.soTienThu)}
                                    </span>
                                </div>
                                <p className="text-base text-gray-800 font-medium truncate">
                                    {pt.nhaKhoaInfo?.hoVaTen || pt.nhaKhoaInfo?.tenGiaoDich || "—"}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-base text-gray-400">{formatDateTime(pt.ngayThu)}</span>
                                    {pt.phuongThucThanhToan && (
                                        <span className={`text-base px-2 py-0.5 rounded-full font-medium ${pt.phuongThucThanhToan === "Chuyển khoản" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
                                            {pt.phuongThucThanhToan}
                                        </span>
                                    )}
                                </div>
                                {pt.noiDung && (
                                    <p className="text-base text-gray-400 mt-0.5 truncate">{pt.noiDung}</p>
                                )}
                            </div>
                        ))
                    )}
                </div>

                <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full min-w-[640px] text-base text-left whitespace-nowrap">
                        <thead className="bg-blue-50 text-blue-600 font-medium border-b sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-base ">Số phiếu</th>
                                <th className="px-4 py-3 text-base ">Khách hàng</th>
                                <th className="px-4 py-3 text-base ">Ngày thu</th>
                                <th className="px-4 py-3 text-base text-right">Số tiền thu</th>
                                <th className="px-4 py-3 text-base  hidden md:table-cell">Nội dung thu</th>
                                <th className="px-4 py-3 text-base  hidden sm:table-cell">Phương thức</th>
                                <th className="px-4 py-3 text-base  hidden lg:table-cell">Người tạo</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700">
                            {loading ? (
                                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Đang tải dữ liệu...</td></tr>
                            ) : danhSach.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Không có dữ liệu</td></tr>
                            ) : (
                                danhSach.map((pt) => (
                                    <tr
                                        key={pt._id}
                                        onClick={() => handleRowClick(pt)}
                                        className={`border-b cursor-pointer transition-colors ${selectedPhieuThu?._id === pt._id ? "bg-blue-50 ring-1 ring-inset ring-blue-200" : "hover:bg-gray-50"}`}
                                    >
                                        <td className="px-4 py-3 text-base  font-semibold text-blue-700">{pt.soPhieuThu || formatSoPhieu(pt._id)}</td>
                                        <td className="px-4 py-3 text-base ">{pt.nhaKhoaInfo?.hoVaTen || pt.nhaKhoaInfo?.tenGiaoDich || "-"}</td>
                                        <td className="px-4 py-3 text-base ">{formatDateTime(pt.ngayThu)}</td>
                                        <td className="px-4 py-3 text-base  text-right font-semibold text-green-700">{formatCurrency(pt.soTienThu)}</td>
                                        <td className="px-4 py-3 text-base  max-w-[200px] truncate hidden md:table-cell" title={pt.noiDung}>{pt.noiDung || " "}</td>
                                        <td className="px-4 py-3 text-base  hidden sm:table-cell">
                                            <span className={`text-base px-2 py-0.5 rounded-full font-medium ${pt.phuongThucThanhToan === "Chuyển khoản" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
                                                {pt.phuongThucThanhToan || "-"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 hidden lg:table-cell">{pt.nguoiTaoInfo?.HoTenNV || "-"}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-gray-50 border-t p-3 flex justify-between items-center text-base text-gray-600">
                    <span>Tổng: {pagination.total || 0} phiếu thu</span>
                    <div className="flex items-center gap-2">
                        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                            className="px-2 py-1 border rounded text-base hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">← Trước</button>
                        <span className="text-base">Trang {page} / {totalPages}</span>
                        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                            className="px-2 py-1 border rounded text-base hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">Sau →</button>
                    </div>
                </div>
            </div>

            <PhieuThuModal open={openModal} onClose={() => setOpenModal(false)} onSuccess={loadData} />

            <PhieuThuDetailPanel
                phieuThu={selectedPhieuThu}
                onClose={() => setSelectedPhieuThu(null)}
                onUpdated={handlePanelUpdated}
            />

            {/* MODAL XUẤT EXCEL */}
            {openExport && (
                <div className="fixed inset-0 z-[1200] flex items-start justify-center pt-24">
                    <div className="fixed inset-0 bg-black/40" onClick={() => {
                        setOpenExport(false);
                        setExportDateFilter(EMPTY_DATE);
                        setExportNhaKhoaObj(null);
                    }} />
                    <div className="relative w-full max-w-xl bg-gray-50 rounded-2xl shadow-2xl border border-gray-200 overflow-visible">
                        <div className="bg-[#1ea4e8] px-6 py-4 flex items-center justify-between rounded-t-2xl">
                            <h3 className="text-white text-base font-semibold">Xuất excel</h3>
                            <button className="text-white" onClick={() => {
                                setOpenExport(false);
                                setExportDateFilter(EMPTY_DATE);
                                setExportNhaKhoaObj(null);
                            }}>
                                <CloseIcon sx={{ fontSize: 28 }} />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-1 gap-6 mb-6">

                                {/* 🔥 CUSTOM DROPDOWN CHỌN NGÀY XUẤT EXCEL 🔥 */}
                                <div>
                                    <p className="text-base font-semibold text-gray-500 mb-1">Chọn ngày xuất</p>
                                    <div className="relative" ref={exportDateRef}>
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-between border-b border-gray-300 bg-transparent py-2 hover:bg-gray-50 transition text-base text-left shadow-none"
                                            onClick={() => setExportDateAnchorEl(exportDateRef.current)}
                                        >
                                            <span className={exportDateFilter?.preset ? "text-blue-700 font-medium truncate" : "text-gray-900"}>
                                                {exportDateFilter?.preset === "custom" && exportDateFilter.customFrom
                                                    ? `${dayjs(exportDateFilter.customFrom).format('DD/MM/YYYY')} - ${dayjs(exportDateFilter.customTo).format('DD/MM/YYYY')}`
                                                    : DATE_PRESETS.find(p => p.key === exportDateFilter?.preset)?.label || "Tất cả thời gian"}
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
                                    <p className="text-base font-semibold text-gray-500 mb-1">Nha khoa</p>
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
                                                className="w-full flex items-center justify-between border-b border-gray-300 bg-transparent py-2 hover:bg-gray-50 transition text-base text-left shadow-none"
                                                onClick={() => { setExportNhaKhoaSearch(""); setOpenExportNhaKhoaDropdown(true); }}
                                            >
                                                <span className={exportNhaKhoaObj ? "text-blue-700 font-medium truncate" : "text-gray-900"}>
                                                    {exportNhaKhoaObj ? exportNhaKhoaObj.name : "Tất cả nha khoa"}
                                                </span>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
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
                            </div>

                            <div className="border-t border-gray-200 pt-4 flex justify-end">
                                <button
                                    onClick={handleExportExcel}
                                    disabled={exporting}
                                    className="px-6 py-2.5 bg-[#1ea4e8] hover:bg-[#039be5] text-white rounded-full font-semibold shadow disabled:opacity-60 transition"
                                >
                                    {exporting ? "Đang xuất..." : "Tải xuống"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {isPrintingBlank && (
                <div id="print-blank-receipt" className="hidden print:block w-full">
                    <style>{`
                        @media print {
                            @page { size: A5 landscape; margin: 0; }
                            html, body {
                                margin: 0 !important;
                                padding: 0 !important;
                                overflow: hidden !important;
                            }
                            body * { visibility: hidden; }
                            #print-blank-receipt, #print-blank-receipt * { visibility: visible; }
                            #print-blank-receipt {
                                position: fixed !important;
                                top: 0 !important;
                                left: 0 !important;
                                width: 210mm !important;
                                height: 148mm !important;
                                padding: 6mm 10mm 8mm 10mm !important;
                                box-shadow: none !important;
                                border: none !important;
                                background: white !important;
                                display: flex !important;
                                flex-direction: column !important;
                            }
                        }
                    `}</style>
                    <div style={{ fontFamily: "Cambria", display: "flex", flexDirection: "column", height: "100%" }}>
                        {/* Header */}
                        <div style={{ marginBottom: "6mm" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "3mm" }}>
                                <div style={{ flex: 2 }}>
                                    <p style={{ margin: 0, fontWeight: "bold", fontSize: "11pt", textTransform: "uppercase" }}>{congTy?.Ten || ""}</p>
                                    <p style={{ fontSize: "9pt", margin: "1mm 0 0 0" }}>{congTy?.DiaChi || ""}</p>
                                </div>
                                <div style={{ marginTop: "1mm", flex: 1, textAlign: "right", fontSize: "9pt" }}>
                                    <div>QĐ số 15/2006/QĐ-BTC</div>
                                    <div>ngày 20/03/2006 của BTC</div>
                                </div>
                            </div>
                            <div style={{ borderTop: "1px solid #ccc", paddingTop: "3mm", textAlign: "center" }}>
                                <h1 style={{ margin: "0 0", fontSize: "15pt", fontWeight: "bold", textTransform: "uppercase" }}>PHIẾU THU</h1>
                                <div style={{ fontSize: "9pt", marginTop: "1mm" }}>............................................</div>
                                <div style={{ fontSize: "9pt", marginTop: "0.5mm" }}>........................ , ....... / ....... /..........</div>
                            </div>
                        </div>

                        {/* Thông tin người nộp */}
                        <div style={{ marginBottom: "3mm", fontSize: "11pt", lineHeight: "2.2" }}>
                            <div style={{ display: "flex", gap: "4px", overflow: "hidden", whiteSpace: "nowrap" }}>
                                <span style={{ minWidth: "115px" }}>Người nộp tiền:</span>
                                <span style={{ flex: 1, overflow: "hidden" }}>................................................................................................................................................................................................................</span>
                            </div>
                            <div style={{ display: "flex", gap: "4px", overflow: "hidden", whiteSpace: "nowrap" }}>
                                <span style={{ minWidth: "115px" }}>Địa chỉ:</span>
                                <span style={{ flex: 1, overflow: "hidden" }}>................................................................................................................................................................................................................</span>
                            </div>
                            <div style={{ display: "flex", gap: "4px", overflow: "hidden", whiteSpace: "nowrap" }}>
                                <span style={{ minWidth: "115px" }}>Nội dung thu:</span>
                                <span style={{ flex: 1, overflow: "hidden" }}>.................................................................................................................................................................................................................</span>
                            </div>
                            <div style={{ display: "flex", gap: "4px", overflow: "hidden", whiteSpace: "nowrap", alignItems: "baseline" }}>
                                <span style={{ minWidth: "115px" }}>Số tiền thu:</span>
                                <span style={{ width: "3cm", flexShrink: 0, overflow: "hidden" }}>..................................................</span>
                                <span style={{ flexShrink: 0 }}>Bằng chữ:</span>
                                <span style={{ flex: 1, overflow: "hidden" }}>................................................................................................................................................................</span>
                            </div>
                        </div>

                        {/* Bảng hóa đơn */}
                        <div style={{ marginBottom: "4mm" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11pt" }}>
                                <thead>
                                    <tr>
                                        <th style={{ border: "1px solid #999", fontWeight: "normal", textAlign: "center", padding: "2mm" }}>Hóa đơn</th>
                                        <th style={{ border: "1px solid #999", fontWeight: "normal", textAlign: "center", padding: "2mm" }}>Số tiền ban đầu</th>
                                        <th style={{ border: "1px solid #999", fontWeight: "normal", textAlign: "center", padding: "2mm" }}>Đã thanh toán</th>
                                        <th style={{ border: "1px solid #999", fontWeight: "normal", textAlign: "center", padding: "2mm" }}>Số tiền còn lại</th>
                                        <th style={{ border: "1px solid #999", fontWeight: "normal", textAlign: "center", padding: "2mm" }}>Thanh toán</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ border: "1px solid #999", padding: "2.5mm 2mm" }}>&nbsp;</td>
                                        <td style={{ border: "1px solid #999", padding: "2.5mm 2mm" }}>&nbsp;</td>
                                        <td style={{ border: "1px solid #999", padding: "2.5mm 2mm" }}>&nbsp;</td>
                                        <td style={{ border: "1px solid #999", padding: "2.5mm 2mm" }}>&nbsp;</td>
                                        <td style={{ border: "1px solid #999", padding: "2.5mm 2mm" }}>&nbsp;</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Chữ ký */}
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11pt", marginTop: "auto", paddingTop: "6mm", minHeight: "32mm", alignItems: "flex-start" }}>
                            {[["Người lập phiếu"], ["Người nộp tiền"], ["Thủ quỹ"], ["Kế toán"], ["Thủ trưởng đơn vị"]].map(([label]) => (
                                <div key={label} style={{ textAlign: "center", width: "20%" }}>
                                    <div style={{ fontWeight: "bold" }}>{label}</div>
                                    <div style={{ fontStyle: "italic", fontSize: "10pt" }}>(Ký, họ tên)</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}