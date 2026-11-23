import React, { useState, useEffect } from "react";
import RefreshIcon from "@mui/icons-material/Refresh";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import dayjs from "dayjs";
import CustomDateRangePicker from "../common/CustomDateRangePicker";

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

export const EMPTY_DATE = { preset: null, customFrom: "", customTo: "" };

const STATUS_OPTIONS = ["Lưu tạm", "Chưa thanh toán", "Thanh toán một phần", "Đã thanh toán"];

const HoaDonFilterDrawer = ({
    open,
    onClose,
    appliedNgayXuat,
    appliedNhaKhoa,
    appliedTrangThai,
    nhaKhoaList = [],
    onApply,
    onReset,
}) => {
    const [draftNgayXuat, setDraftNgayXuat] = useState(EMPTY_DATE);
    const [draftNhaKhoa, setDraftNhaKhoa] = useState(null);
    const [draftTrangThai, setDraftTrangThai] = useState([]);
    const [openDateModal, setOpenDateModal] = useState(null);
    const [openPickerModal, setOpenPickerModal] = useState(null);
    const [nhaKhoaSearch, setNhaKhoaSearch] = useState("");

    const [anchorElCustomDate, setAnchorElCustomDate] = useState(null);

    useEffect(() => {
        if (open) {
            setDraftNgayXuat(appliedNgayXuat || EMPTY_DATE);
            setDraftNhaKhoa(appliedNhaKhoa || null);
            setDraftTrangThai(appliedTrangThai || []);
            setOpenDateModal(null);
            setOpenPickerModal(null);
            setNhaKhoaSearch("");
        }
    }, [open, appliedNgayXuat, appliedNhaKhoa, appliedTrangThai]);

    if (!open) return null;

    const filteredNhaKhoaOpts = nhaKhoaList
        .map((nk) => ({ _id: nk._id, name: nk.tenGiaoDich || nk.hoVaTen || "" }))
        .filter((nk) => !nhaKhoaSearch.trim() || nk.name.toLowerCase().includes(nhaKhoaSearch.toLowerCase()));

    const getDateLabel = (f) => {
        if (f.preset === "custom" && f.customFrom) {
            return f.customTo
                ? `${dayjs(f.customFrom).format("DD/MM/YYYY")} → ${dayjs(f.customTo).format("DD/MM/YYYY")}`
                : `Từ ${dayjs(f.customFrom).format("DD/MM/YYYY")}`;
        }
        return DATE_PRESETS.find((p) => p.key === f.preset)?.label || "";
    };

    const toggleTrangThai = (status) =>
        setDraftTrangThai((prev) =>
            prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
        );

    // Bấm "Ngày xuất" → mở lịch ngay; chọn xong là lọc luôn
    const renderDatePicker = () => (
        <CustomDateRangePicker
            open={Boolean(anchorElCustomDate)}
            anchorEl={anchorElCustomDate}
            onClose={() => setAnchorElCustomDate(null)}
            initialDates={{
                start: draftNgayXuat.preset === "custom" ? draftNgayXuat.customFrom : "",
                end: draftNgayXuat.preset === "custom" ? draftNgayXuat.customTo : "",
            }}
            onApply={(dates) => {
                const newNgayXuat = dates.start
                    ? { preset: "custom", customFrom: dates.start, customTo: dates.end || dates.start }
                    : EMPTY_DATE;
                setAnchorElCustomDate(null);
                setDraftNgayXuat(newNgayXuat);
                onApply(newNgayXuat, draftNhaKhoa, draftTrangThai);
                onClose();
            }}
        />
    );

    return (
        <div
            className="absolute left-0 top-full mt-1 z-50 w-64 bg-white rounded-xl shadow-2xl border border-gray-200"
            onClick={() => { setOpenDateModal(null); setOpenPickerModal(null); }}
        >
            {/* Ngày xuất */}
            <div className="relative border-b border-gray-100" onClick={(e) => e.stopPropagation()}>
                <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition text-base"
                    onClick={(e) => { setOpenPickerModal(null); setOpenDateModal(null); setAnchorElCustomDate(e.currentTarget); }}
                >
                    <span className={draftNgayXuat.preset ? "text-blue-600 font-medium" : "text-gray-600"}>
                        {draftNgayXuat.preset ? getDateLabel(draftNgayXuat) : "Ngày xuất"}
                    </span>
                    <CalendarTodayIcon sx={{ fontSize: 16, color: "#9ca3af" }} />
                </button>
                {renderDatePicker()}
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

            {/* Trạng thái */}
            <div className="relative border-b border-gray-100" onClick={(e) => e.stopPropagation()}>
                <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition text-base"
                    onClick={() => { setOpenDateModal(null); setOpenPickerModal(openPickerModal === "trangThai" ? null : "trangThai"); }}
                >
                    <span className={draftTrangThai.length > 0 ? "text-blue-600 font-medium truncate" : "text-gray-600"}>
                        {draftTrangThai.length > 0 ? draftTrangThai.join(", ") : "Trạng thái"}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400 shrink-0 ml-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                </button>
                {openPickerModal === "trangThai" && (
                    <div className="absolute left-2 top-full z-[100] w-[90%] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                        {STATUS_OPTIONS.map((status) => (
                            <button
                                key={status}
                                onClick={() => toggleTrangThai(status)}
                                className={`flex items-center gap-2 w-full text-left px-4 py-2.5 text-base border-b border-gray-100 transition ${draftTrangThai.includes(status) ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}
                            >
                                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${draftTrangThai.includes(status) ? "bg-blue-500 border-blue-500" : "border-gray-300"}`}>
                                    {draftTrangThai.includes(status) && <span className="text-white text-[10px] leading-none">✓</span>}
                                </span>
                                {status}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom buttons */}
            <div className="flex items-center justify-between px-4 py-3">
                <button
                    onClick={() => { setDraftNgayXuat(EMPTY_DATE); setDraftNhaKhoa(null); setDraftTrangThai([]); }}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition"
                    title="Reset lọc"
                >
                    <RefreshIcon sx={{ fontSize: 20 }} />
                </button>
                <button
                    onClick={() => { onApply(draftNgayXuat, draftNhaKhoa, draftTrangThai); onClose(); }}
                    className="flex items-center gap-1 px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white text-base font-semibold rounded-lg transition shadow-sm"
                >
                    ✓ Lưu
                </button>
            </div>
        </div>
    );
};

export default HoaDonFilterDrawer;