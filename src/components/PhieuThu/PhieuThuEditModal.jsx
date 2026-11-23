import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updatePhieuThu, fetchHoaDonChuaThanhToan } from "../../redux/slices/phieuThuSlice";
import CloseIcon from "@mui/icons-material/Close";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import PrintIcon from "@mui/icons-material/Print";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import DateTimeField from "../common/dateRange/DateTimeField";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CheckIcon from "@mui/icons-material/Check";

const toLocalDatetimeInput = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    const pad = (n) => String(n).padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};

const fmt = (v) => new Intl.NumberFormat("vi-VN").format(v || 0);

const formatDateDisplay = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleString("vi-VN", { day: "2-digit", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
};
const formatSoHoaDon = (id) => (id ? "TAN" + id.toString().slice(-8).toUpperCase() : "—");

const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function PhieuThuEditModal({ phieuThu, open, onClose, onSuccess }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { loading } = useSelector((s) => s.phieuThu);

    const [ngayThu, setNgayThu] = useState("");

    const [thangDoanhThu, setThangDoanhThu] = useState("");
    const [isOpenThang, setIsOpenThang] = useState(false);
    const thangDropdownRef = useRef(null);
    const [phuongThuc, setPhuongThuc] = useState("Tiền mặt");
    const [noiDung, setNoiDung] = useState("");
    const [soTienThu, setSoTienThu] = useState("");
    const [showAmountSuggestions, setShowAmountSuggestions] = useState(false);

    const [chiTietHoaDon, setChiTietHoaDon] = useState([]);
    const [error, setError] = useState("");
    const [isLoadingData, setIsLoadingData] = useState(false);

    const monthYearOptions = useMemo(() => {
        if (!chiTietHoaDon || chiTietHoaDon.length === 0) {
            const hiểnThịMặcĐịnh = dayjs().format("MM/YYYY");
            return [{ value: hiểnThịMặcĐịnh, label: hiểnThịMặcĐịnh }];
        }

        const oldestTimestamp = chiTietHoaDon.reduce((min, item) => {
            const hd = item.hoaDon || {};
            const d = new Date(hd.ngayXuatHoaDon || hd.createdAt || Date.now()).getTime();
            return d < min ? d : min;
        }, new Date().getTime());

        const startMonth = dayjs(oldestTimestamp).startOf("month");
        const endMonth = dayjs().startOf("month");

        const options = [];
        let current = endMonth;

        while (current.isAfter(startMonth) || current.isSame(startMonth, "month")) {
            const label = current.format("MM/YYYY");
            options.push({ value: label, label: label });
            current = current.subtract(1, "month");
        }

        return options;
    }, [chiTietHoaDon]);

    useEffect(() => {
        const loadData = async () => {
            if (!phieuThu || !open) return;
            setIsLoadingData(true);
            try {
                setNgayThu(toLocalDatetimeInput(phieuThu.ngayThu));
                setPhuongThuc(phieuThu.phuongThucThanhToan || "Tiền mặt");
                setNoiDung(phieuThu.noiDung || "");
                setSoTienThu(String(phieuThu.soTienThu || 0));
                setError("");

                if (phieuThu.ngayGhiNhanDoanhThu) {
                    const dateObj = new Date(phieuThu.ngayGhiNhanDoanhThu);
                    const mStr = String(dateObj.getMonth() + 1).padStart(2, "0");
                    const yStr = String(dateObj.getFullYear());
                    setThangDoanhThu(`${mStr}/${yStr}`);
                } else {
                    setThangDoanhThu("");
                }

                const nkId = phieuThu.nhaKhoaInfo?._id || (phieuThu.danhSachHoaDon?.[0]?.hoaDon?.nhaKhoa);
                let unpaidList = [];

                if (nkId) {
                    try {
                        const res = await dispatch(fetchHoaDonChuaThanhToan(nkId)).unwrap();
                        unpaidList = res.data || res || [];
                    } catch (err) {
                        console.warn("Lấy hóa đơn nợ thất bại:", err);
                    }
                }

                const existingIds = new Set();
                const ds = (phieuThu.danhSachHoaDon || []).map(item => {
                    const hd = item.hoaDon || {};
                    existingIds.add(hd._id);
                    const giaTriHoaDon = hd.giaTriThanhToan || 0;
                    const soTienPTHienTai = item.soTienThanhToan || 0;
                    const daThanhToanKhac = Math.max(0, (hd.daThanhToan || 0) - soTienPTHienTai);
                    const conLaiToiDa = (hd.conLai || 0) + soTienPTHienTai;

                    return {
                        ...item,
                        conLaiToiDa,
                        daThanhToanHienThi: daThanhToanKhac,
                        selected: soTienPTHienTai > 0,
                        soTienThanhToanInput: String(soTienPTHienTai)
                    };
                });

                unpaidList.forEach(hd => {
                    if (!existingIds.has(hd._id)) {
                        ds.push({
                            hoaDon: hd,
                            soTienThanhToan: 0,
                            giaTriHoaDon: hd.giaTriThanhToan || 0,
                            daTTruocLanNay: hd.daThanhToan || 0,
                            conLaiTruocLanNay: hd.conLai || 0,
                            conLaiToiDa: hd.conLai || 0,
                            selected: false,
                            soTienThanhToanInput: "0"
                        });
                    }
                });

                ds.sort((a, b) => new Date(b.hoaDon.ngayXuatHoaDon || 0) - new Date(a.hoaDon.ngayXuatHoaDon || 0));
                setChiTietHoaDon(ds);
            } catch (err) {
                console.error("Lỗi khi load dữ liệu chỉnh sửa:", err);
            } finally {
                setIsLoadingData(false);
            }
        };

        loadData();
    }, [phieuThu, open, dispatch]);

    const handleTotalAmountChange = (val) => {
        const digits = val.replace(/[^\d]/g, "");
        setSoTienThu(digits);
        let remaining = Number(digits) || 0;
        const newList = [...chiTietHoaDon];
        const checkedIndices = [];
        const uncheckedIndices = [];

        newList.forEach((item, idx) => {
            if (item.selected) checkedIndices.push(idx);
            else uncheckedIndices.push(idx);
        });

        const sortFn = (idxA, idxB) => {
            const timeA = new Date(newList[idxA].hoaDon?.ngayXuatHoaDon || newList[idxA].hoaDon?.createdAt || 0).getTime();
            const timeB = new Date(newList[idxB].hoaDon?.ngayXuatHoaDon || newList[idxB].hoaDon?.createdAt || 0).getTime();
            return timeA - timeB;
        };

        checkedIndices.sort(sortFn);
        uncheckedIndices.sort(sortFn);

        newList.forEach(item => {
            item.selected = false;
            item.soTienThanhToanInput = "0";
        });

        for (const idx of checkedIndices) {
            if (remaining <= 0) break;
            const item = newList[idx];
            const pay = Math.min(remaining, item.conLaiToiDa);
            if (pay > 0) {
                item.soTienThanhToanInput = String(pay);
                item.selected = true;
                remaining -= pay;
            }
        }

        if (remaining > 0) {
            for (const idx of uncheckedIndices) {
                if (remaining <= 0) break;
                const item = newList[idx];
                const pay = Math.min(remaining, item.conLaiToiDa);
                if (pay > 0) {
                    item.soTienThanhToanInput = String(pay);
                    item.selected = true;
                    remaining -= pay;
                }
            }
        }

        setChiTietHoaDon(newList);
    };

    const handleToggleRow = (idx) => {
        const newList = [...chiTietHoaDon];
        const item = newList[idx];
        item.selected = !item.selected;

        if (!item.selected) {
            item.soTienThanhToanInput = "0";
        } else {
            item.soTienThanhToanInput = String(item.conLaiToiDa);
        }
        setChiTietHoaDon(newList);

        const newTotal = newList.reduce((sum, row) => sum + (Number(row.soTienThanhToanInput) || 0), 0);
        setSoTienThu(String(newTotal));
    };

    const handleRowAmountChange = (idx, value) => {
        const digits = value.replace(/[^\d]/g, "");
        const newList = [...chiTietHoaDon];
        newList[idx].soTienThanhToanInput = digits;
        newList[idx].selected = Number(digits) > 0;

        setChiTietHoaDon(newList);
        const newTotal = newList.reduce((sum, row) => sum + (Number(row.soTienThanhToanInput) || 0), 0);
        setSoTienThu(String(newTotal));
    };

    const tongPhanBo = useMemo(() => {
        return chiTietHoaDon.reduce((sum, item) => sum + (Number(item.soTienThanhToanInput) || 0), 0);
    }, [chiTietHoaDon]);

    const lechTien = (Number(soTienThu) || 0) - tongPhanBo;

    const isOverLimit = useMemo(() => {
        return chiTietHoaDon.some(item => (Number(item.soTienThanhToanInput) || 0) > item.conLaiToiDa);
    }, [chiTietHoaDon]);

    const minNgayThuStr = useMemo(() => {
        const selectedItems = chiTietHoaDon.filter(
            item => item.selected && Number(item.soTienThanhToanInput) > 0
        );
        if (selectedItems.length === 0) return "";

        const maxNgayHD = selectedItems.reduce((max, item) => {
            const d = new Date(item.hoaDon?.ngayXuatHoaDon || item.hoaDon?.createdAt || 0).getTime();
            return d > max ? d : max;
        }, 0);

        if (maxNgayHD === 0) return "";
        return toLocalDatetimeInput(new Date(maxNgayHD));
    }, [chiTietHoaDon]);

    const handleSave = async () => {
        setError("");

        if (tongPhanBo === 0) {
            setError("Phiếu thu phải phân bổ ít nhất 1 hóa đơn. Nếu muốn hủy, vui lòng xóa phiếu thu này.");
            return;
        }

        if (isOverLimit) {
            setError("Có hóa đơn bị nhập thanh toán vượt quá số nợ. Vui lòng kiểm tra các ô màu đỏ.");
            return;
        }

        if (lechTien !== 0) {
            setError(`Số tiền thu (${fmt(Number(soTienThu))}) đang lệch so với tổng tiền phân bổ bên dưới (${fmt(tongPhanBo)}).`);
            return;
        }

        const selectedItems = chiTietHoaDon.filter(
            item => item.selected && Number(item.soTienThanhToanInput) > 0
        );
        const maxNgayHD = selectedItems.reduce((max, item) => {
            const d = new Date(item.hoaDon?.ngayXuatHoaDon || 0).getTime();
            return d > max ? d : max;
        }, 0);

        if (maxNgayHD > 0 && new Date(ngayThu).setHours(0, 0, 0, 0) < new Date(maxNgayHD).setHours(0, 0, 0, 0)) {
            setError(`Ngày thu không được trước ngày xuất hóa đơn mới nhất (${new Date(maxNgayHD).toLocaleDateString("vi-VN")}).`);
            return;
        }

        try {
            let ngayGhiNhanISO = undefined;

            if (thangDoanhThu) {
                const [meshMonth, meshYear] = thangDoanhThu.split("/");
                ngayGhiNhanISO = dayjs()
                    .year(Number(meshYear))
                    .month(Number(meshMonth) - 1)
                    .date(15)
                    .startOf("day")
                    .toISOString();
            }

            const result = await dispatch(updatePhieuThu({
                id: phieuThu._id,
                data: {
                    ngayThu: ngayThu ? new Date(ngayThu).toISOString() : undefined,
                    ngayGhiNhanDoanhThu: ngayGhiNhanISO,
                    phuongThucThanhToan: phuongThuc,
                    noiDung,
                    danhSachHoaDon: chiTietHoaDon
                        .filter(item => item.selected && Number(item.soTienThanhToanInput) > 0)
                        .map(item => ({
                            hoaDon: item.hoaDon._id || item.hoaDon,
                            soTienThanhToan: Number(item.soTienThanhToanInput)
                        }))
                },
            })).unwrap();
            if (onSuccess) onSuccess(result.data);
        } catch (err) {
            setError(typeof err === "string" ? err : "Cập nhật thất bại");
        }
    };

    const handleSaveRef = useRef(null);
    handleSaveRef.current = handleSave;

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e) => {
            if (e.key === "F3") {
                e.preventDefault();
                handleSaveRef.current();
            }
            if (e.key === "F2") {
                e.preventDefault();
                if (phieuThu?._id) navigate(`/phieu-thu/${phieuThu._id}/print`);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, phieuThu, navigate]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (thangDropdownRef.current && !thangDropdownRef.current.contains(e.target)) {
                setIsOpenThang(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedThangLabel = monthYearOptions.find((o) => o.value === thangDoanhThu)?.label;
    const isFloating = isOpenThang || !!thangDoanhThu;

    const amountSuggestions = useMemo(() => {
        const digits = soTienThu.replace(/[^\d]/g, "");
        if (!digits) return [];
        const n = Number(digits);
        if (!n) return [];
        return [n * 10_000, n * 100_000, n * 1_000_000];
    }, [soTienThu]);

    const allChecked = chiTietHoaDon.length > 0 && chiTietHoaDon.every((item) => item.selected);
    const someChecked = chiTietHoaDon.some((item) => item.selected) && !allChecked;

    const handleToggleAll = () => {
        const newList = chiTietHoaDon.map((item) => {
            const willBeSelected = !allChecked;
            return {
                ...item,
                selected: willBeSelected,
                soTienThanhToanInput: willBeSelected ? String(item.conLaiToiDa) : "0",
            };
        });
        setChiTietHoaDon(newList);
        const newTotal = newList.reduce((sum, row) => sum + (Number(row.soTienThanhToanInput) || 0), 0);
        setSoTienThu(String(newTotal));
    };

    if (!open || !phieuThu) return null;

    const nk = phieuThu.nhaKhoaInfo || {};
    const ngt = phieuThu.nguoiTaoInfo || {};
    const tenKhach = nk.hoVaTen || nk.tenGiaoDich || "";
    const address = [nk.diaChiCuThe, nk.quanHuyen, nk.tinh].filter(Boolean).join(", ");

    return (
        <div>
            <div className="fixed inset-0 z-[1400] flex items-start justify-center sm:pt-4 sm:pb-4 overflow-y-auto">
                <div className="fixed inset-0 bg-black/40" onClick={onClose} />
                <div className="relative bg-gray-50 sm:rounded-2xl shadow-2xl w-full max-w-5xl sm:mx-4 flex flex-col h-screen sm:h-auto sm:max-h-[calc(100vh-32px)]">

                    <div className="flex items-center justify-between px-6 py-3.5 bg-[#29b6f6] sm:rounded-t-2xl shrink-0">
                        <h2 className="text-white font-semibold text-base tracking-wide">Chỉnh sửa Phiếu thu {phieuThu.soPhieuThu}</h2>
                        <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-1 transition">
                            <CloseIcon sx={{ fontSize: 20 }} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-base">{error}</div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-[50%_1fr_30%] gap-6 sm:gap-x-0">
                            <div>
                                <p className="text-base text-gray-400 mb-1">Công ty</p>
                                <div className="flex items-center gap-2 border-b-2 border-gray-200 pb-1">
                                    {tenKhach && (
                                        <div className="w-8 h-8 rounded-full bg-[#29b6f6] flex items-center justify-center shrink-0">
                                            <span className="text-white font-bold text-base">{getInitials(tenKhach)}</span>
                                        </div>
                                    )}
                                    <span className="text-base font-semibold text-gray-800">{tenKhach || "—"}</span>
                                </div>
                                {tenKhach && (
                                    <div className="mt-3 bg-[#e3f2fd] rounded-xl px-4 py-3 space-y-1 text-base">
                                        <div className="flex gap-2"><span className="text-gray-500 w-20 shrink-0">Địa chỉ:</span><span className="text-gray-700">{address || "—"}</span></div>
                                        <div className="flex gap-2"><span className="text-gray-500 w-20 shrink-0">Điện thoại:</span><span className="text-gray-500">{nk.soDienThoai || ""}</span></div>
                                        <div className="flex gap-2"><span className="text-gray-500 w-20 shrink-0">Mô tả:</span><span className="text-gray-700">{nk.moTa || ""}</span></div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 sm:col-start-3">
                                <div className="relative">
                                    <p className="text-base text-gray-400 mb-0.5">Tổng số tiền thu</p>
                                    <div className="border border-gray-200 rounded-xl px-4 py-3">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={fmt(soTienThu)}
                                            onChange={(e) => handleTotalAmountChange(e.target.value)}
                                            onFocus={() => setShowAmountSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowAmountSuggestions(false), 150)}
                                            className="w-full text-2xl font-bold text-gray-900 bg-transparent outline-none"
                                        />
                                    </div>
                                    {lechTien !== 0 && Number(soTienThu) > 0 && (
                                        <p className={`text-base font-semibold mt-1 text-right ${lechTien > 0 ? "text-orange-500" : "text-red-500"}`}>
                                            {lechTien > 0 ? `Còn dư: ${fmt(lechTien)}` : `Bị lệch: ${fmt(lechTien)}`}
                                        </p>
                                    )}

                                    {showAmountSuggestions && amountSuggestions.length > 0 && (
                                        <div className="absolute left-0 right-0 top-[60px] z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                                            {amountSuggestions.map((val) => (
                                                <div
                                                    key={val}
                                                    onMouseDown={() => handleTotalAmountChange(String(val))}
                                                    className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between"
                                                >
                                                    <span className="text-base font-semibold text-gray-800">{fmt(val)}</span>
                                                    <span className="text-base text-gray-400">₫</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <p className="text-base text-gray-400 mb-0.5">Ngày thu</p>
                                    <DateTimeField
                                      variant="standard"
                                      value={ngayThu || ""}
                                      onChange={setNgayThu}
                                      minDateTime={minNgayThuStr || undefined}
                                      maxDateTime={dayjs().format("YYYY-MM-DDTHH:mm")}
                                      clearable={false}
                                    />
                                </div>

                                <div ref={thangDropdownRef} className="relative">
                                    <div
                                        onClick={() => setIsOpenThang((p) => !p)}
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                setIsOpenThang((p) => !p);
                                            }
                                            if (e.key === "Escape") setIsOpenThang(false);
                                        }}
                                        className={`relative w-full cursor-pointer select-none border-b-2 pt-5 pb-2 rounded-t-md outline-none transition-colors ${isOpenThang
                                            ? "border-[#29b6f6] bg-sky-50/50"
                                            : "border-gray-200 hover:bg-gray-50/60"
                                            }`}
                                    >
                                        <span
                                            className={`absolute left-0 pointer-events-none transition-all duration-200 ${isFloating ? "top-0.5 text-[11px]" : "top-5 text-base"
                                                } ${isOpenThang ? "text-[#29b6f6]" : "text-gray-400"}`}
                                        >
                                            Tháng ghi nhận doanh thu
                                        </span>

                                        <div className="flex items-center justify-between min-h-[20px]">
                                            <span className={`text-base leading-5 text-gray-800`}>
                                                {selectedThangLabel ? `Tháng ${selectedThangLabel}` : "\u00A0"}
                                            </span>
                                            <CalendarMonthIcon
                                                sx={{ fontSize: 18 }}
                                                className={`flex-shrink-0 ${isOpenThang ? "text-[#29b6f6]" : "text-gray-400"}`}
                                            />
                                        </div>
                                    </div>

                                    {isOpenThang && (
                                        <div className="absolute z-20 left-0 right-0 mt-1.5 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 max-h-64 overflow-y-auto">
                                            {monthYearOptions.map((opt) => {
                                                const isSelected = opt.value === thangDoanhThu;
                                                return (
                                                    <div
                                                        key={opt.value}
                                                        onClick={() => {
                                                            setThangDoanhThu(opt.value);
                                                            setIsOpenThang(false);
                                                        }}
                                                        className={`flex items-center justify-between px-4 py-2.5 text-base cursor-pointer transition-colors hover:bg-sky-50 ${isSelected ? "bg-sky-50 text-[#29b6f6] font-semibold" : "text-gray-700"
                                                            }`}
                                                    >
                                                        Tháng {opt.label}
                                                        {isSelected && <CheckIcon sx={{ fontSize: 16 }} className="text-[#29b6f6]" />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <p className="text-base text-gray-400 mb-0.5">Phương thức thanh toán</p>
                                    <select value={phuongThuc} onChange={(e) => setPhuongThuc(e.target.value)}
                                        className="w-full border-b-2 border-gray-200 focus:border-[#29b6f6] bg-transparent text-base text-gray-800 py-1 outline-none appearance-none cursor-pointer">
                                        <option value="Tiền mặt">Tiền mặt</option>
                                        <option value="Chuyển khoản">Chuyển khoản</option>
                                    </select>
                                </div>
                                {ngt.hoVaTen && (
                                    <p className="text-base text-gray-400 text-right">
                                        <span className="font-medium text-gray-600">{ngt.hoVaTen}</span> tạo lúc {formatDateDisplay(phieuThu.ngayTao || phieuThu.createdAt)}
                                    </p>
                                )}
                            </div>
                        </div>

                        {isLoadingData ? (
                            <div className="flex justify-center items-center py-6">
                                <span className="text-gray-400 text-base">Đang tải dữ liệu hóa đơn...</span>
                            </div>
                        ) : chiTietHoaDon.length > 0 && (
                            <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[850px] text-base">
                                        <thead className="border-b border-gray-100">
                                            <tr className="text-gray-500 bg-gray-50/50">
                                                <th className="w-10 px-4 py-3 text-left whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        checked={allChecked}
                                                        ref={(el) => { if (el) el.indeterminate = someChecked; }}
                                                        onChange={handleToggleAll}
                                                        className="w-4 h-4 accent-[#29b6f6] cursor-pointer rounded"
                                                    />
                                                </th>
                                                <th className="px-4 py-3 text-left font-medium whitespace-nowrap">STT</th>
                                                <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Hóa đơn</th>
                                                <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Ngày xuất</th>
                                                <th className="px-4 py-3 text-right font-medium whitespace-nowrap">Giá trị</th>
                                                <th className="px-4 py-3 text-right font-medium whitespace-nowrap">Đã thanh toán</th>
                                                <th className="px-4 py-3 text-right font-medium whitespace-nowrap">Còn lại</th>
                                                <th className="px-4 py-3 text-right font-medium text-[#29b6f6] whitespace-nowrap">Thanh toán</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {chiTietHoaDon.map((item, idx) => {
                                                const hd = item.hoaDon || {};
                                                const giaTriHD = hd.giaTriThanhToan || item.giaTriHoaDon || 0;
                                                const daThanhToan = item.daThanhToanHienThi ?? (hd.daThanhToan || 0);
                                                const inputVal = Number(item.soTienThanhToanInput) || 0;
                                                const hasError = inputVal > item.conLaiToiDa;

                                                return (
                                                    <tr key={hd._id || idx} className={`border-b border-gray-50 last:border-0 transition ${item.selected ? "bg-blue-50/60" : "hover:bg-gray-50"}`}>
                                                        <td className="px-4 py-4">
                                                            <input
                                                                type="checkbox"
                                                                checked={item.selected}
                                                                onChange={() => handleToggleRow(idx)}
                                                                className="w-4 h-4 accent-[#29b6f6] cursor-pointer rounded"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-4 text-gray-500 whitespace-nowrap">{idx + 1}</td>
                                                        <td className="px-4 py-4 font-medium whitespace-nowrap">
                                                            {hd.soHoaDon?.startsWith("SDDK") ? (
                                                                <span className="text-orange-600 font-bold">
                                                                    Số dư đầu kỳ (Nợ cũ)
                                                                </span>
                                                            ) : (
                                                                <span
                                                                    className="text-[#29b6f6] cursor-pointer hover:underline"
                                                                    onClick={() => navigate(`/hoa-don/${hd._id}/edit`)}
                                                                >
                                                                    {hd.soHoaDon || formatSoHoaDon(hd._id)}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                                                            {hd.soHoaDon?.startsWith("SDDK")
                                                                ? "—"
                                                                : hd.ngayXuatHoaDon
                                                                    ? new Date(hd.ngayXuatHoaDon).toLocaleDateString("vi-VN")
                                                                    : "—"}
                                                        </td>
                                                        <td className="px-4 py-4 text-right text-gray-700 whitespace-nowrap">
                                                            {fmt(giaTriHD)}
                                                        </td>
                                                        <td className="px-4 py-4 text-right text-gray-500 whitespace-nowrap">
                                                            {fmt(daThanhToan)}
                                                        </td>
                                                        <td className="px-4 py-4 text-right text-gray-700 whitespace-nowrap">
                                                            {fmt(item.conLaiToiDa)}
                                                        </td>
                                                        <td className="px-4 py-4 text-right whitespace-nowrap">
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                disabled={!item.selected}
                                                                value={fmt(item.soTienThanhToanInput)}
                                                                onChange={(e) => handleRowAmountChange(idx, e.target.value)}
                                                                className={`w-28 text-right border-b-2 font-bold bg-transparent pb-0.5 outline-none transition-colors ${!item.selected ? "border-transparent text-gray-400"
                                                                    : hasError ? "border-red-400 text-red-600 focus:border-red-600"
                                                                        : "border-gray-200 text-[#29b6f6] focus:border-[#29b6f6]"
                                                                    }`}
                                                            />
                                                            {hasError && <p className="text-[10px] text-red-500 mt-1">Lố {fmt(inputVal - item.conLaiToiDa)} ₫</p>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-start pb-4 sm:pb-0">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-base text-gray-400 mb-1">Nội dung thu</p>
                                    <input type="text" value={noiDung} onChange={(e) => setNoiDung(e.target.value)}
                                        className="w-full border-b-2 border-gray-200 focus:border-[#29b6f6] bg-transparent text-base text-gray-800 py-1 outline-none" />
                                </div>
                            </div>
                            <div />
                        </div>
                    </div>

                    <div className="px-6 py-3 border-t bg-white sm:rounded-b-2xl flex items-center justify-between shrink-0">
                        <div />
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    if (phieuThu?._id) {
                                        navigate(`/phieu-thu/${phieuThu._id}/print`);
                                    }
                                }}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-base text-gray-600 hover:bg-gray-50 transition">
                                <PrintIcon sx={{ fontSize: 16 }} />
                                In phiếu thu (F2)
                            </button>
                            <button onClick={handleSave}
                                disabled={loading}
                                className="flex items-center gap-2 px-5 py-2 bg-[#29b6f6] hover:bg-[#0091ea] text-white rounded-lg text-base font-semibold transition disabled:opacity-50 shadow-sm">
                                {loading && (
                                    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                )}
                                <SaveOutlinedIcon sx={{ fontSize: 17 }} />
                                Lưu (F3)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}