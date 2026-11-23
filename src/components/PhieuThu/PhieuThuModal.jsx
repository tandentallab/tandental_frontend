﻿import React, { useEffect, useState, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  createPhieuThu,
  fetchHoaDonChuaThanhToan,
} from "../../redux/slices/phieuThuSlice";
import { fetchNhaKhoa } from "../../redux/slices/nhaKhoaSlice";
import CloseIcon from "@mui/icons-material/Close";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import dayjs from "dayjs";
import DateTimeField from "../common/dateRange/DateTimeField";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CheckIcon from "@mui/icons-material/Check";

const toLocalDatetimeInput = (d) => {
  const dt = d ? new Date(d) : new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(
    dt.getDate()
  )}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};

const fmt = (v) => new Intl.NumberFormat("vi-VN").format(v || 0);
const formatSoHoaDon = (hd) => hd?.soHoaDon || "-";
const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function PhieuThuModal({ open, onClose, onSuccess, initialNhaKhoaId, initialHoaDonId }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const nhaKhoaList = useSelector((s) => s.nhaKhoa.data);
  const { hoaDonChuaThanhToan, loadingHoaDon, loading } = useSelector(
    (s) => s.phieuThu
  );

  const [isOpenThang, setIsOpenThang] = useState(false);
  const thangDropdownRef = useRef(null);
  const [selectedNhaKhoa, setSelectedNhaKhoa] = useState("");
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedHDs, setSelectedHDs] = useState({});
  const [soTienThuInput, setSoTienThuInput] = useState("");
  const [ngayThu, setNgayThu] = useState(toLocalDatetimeInput(new Date()));

  const [thangDoanhThu, setThangDoanhThu] = useState("");

  const [phuongThuc, setPhuongThuc] = useState("Chuyển khoản");
  const [noiDung, setNoiDung] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [autoSelected, setAutoSelected] = useState(false);
  const searchRef = useRef(null);

  const monthYearOptions = useMemo(() => {
    if (!hoaDonChuaThanhToan || hoaDonChuaThanhToan.length === 0) {
      const hiểnThịMặcĐịnh = dayjs().format("MM/YYYY");
      return [{ value: hiểnThịMặcĐịnh, label: hiểnThịMặcĐịnh }];
    }

    const oldestTimestamp = hoaDonChuaThanhToan.reduce((min, hd) => {
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
  }, [hoaDonChuaThanhToan]);

  useEffect(() => {
    dispatch(fetchNhaKhoa());
  }, [dispatch]);

  useEffect(() => {
    if (open && initialNhaKhoaId) {
      setSelectedNhaKhoa(initialNhaKhoaId);
    }
  }, [open, initialNhaKhoaId]);

  useEffect(() => {
    if (open && initialNhaKhoaId && nhaKhoaList.length > 0) {
      const nk = nhaKhoaList.find(n => n._id === initialNhaKhoaId);
      if (nk) setSearch(nk.hoVaTen || nk.tenGiaoDich || "");
    }
  }, [open, initialNhaKhoaId, nhaKhoaList]);

  useEffect(() => {
    if (selectedNhaKhoa) {
      dispatch(fetchHoaDonChuaThanhToan(selectedNhaKhoa));
    }
  }, [selectedNhaKhoa, dispatch]);

  useEffect(() => {
    if (open && initialHoaDonId && hoaDonChuaThanhToan.length > 0 && !autoSelected) {
      const stringId = initialHoaDonId.toString();
      const hd = hoaDonChuaThanhToan.find(
        h => h._id.toString() === stringId
      );
      if (hd) {
        setSelectedHDs({ [stringId]: { soTienThanhToan: hd.conLai || 0 } });
        setSoTienThuInput(String(hd.conLai || 0));
        setAutoSelected(true);
      }
    }
  }, [open, initialHoaDonId, hoaDonChuaThanhToan, autoSelected]);

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

  useEffect(() => {
    if (!open) {
      setAutoSelected(false);
    }
  }, [open]);

  const selectedNhaKhoaObj = useMemo(
    () => nhaKhoaList.find((nk) => nk._id === selectedNhaKhoa) || null,
    [nhaKhoaList, selectedNhaKhoa]
  );

  const filteredNhaKhoa = useMemo(() => {
    if (!search.trim()) return nhaKhoaList;
    const s = search.toLowerCase();
    return nhaKhoaList.filter(
      (nk) =>
        (nk.hoVaTen || "").toLowerCase().includes(s) ||
        (nk.tenGiaoDich || "").toLowerCase().includes(s)
    );
  }, [nhaKhoaList, search]);

  const handleSelectNhaKhoa = (nk) => {
    setSelectedNhaKhoa(nk._id);
    setSearch(nk.hoVaTen || nk.tenGiaoDich || "");
    setShowDropdown(false);
    setSelectedHDs({});
    setSoTienThuInput("");
  };

  const handleClearNhaKhoa = () => {
    setSelectedNhaKhoa("");
    setSearch("");
    setSelectedHDs({});
    setSoTienThuInput("");
  };

  const handleToggleHD = (hdId) => {
    let next;
    if (selectedHDs[hdId]) {
      next = { ...selectedHDs };
      delete next[hdId];
    } else {
      const hd = hoaDonChuaThanhToan.find((h) => h._id === hdId);
      next = { ...selectedHDs, [hdId]: { soTienThanhToan: hd?.conLai || 0 } };
    }
    const total = Object.values(next).reduce(
      (s, v) => s + (v.soTienThanhToan || 0),
      0
    );
    setSelectedHDs(next);
    setSoTienThuInput(total > 0 ? String(total) : "");
  };

  const handleAmountChange = (hdId, rawValue, maxVal) => {
    const digits = rawValue.replace(/[^\d]/g, "");
    const num = Number(digits) || 0;

    let next;
    if (num > 0) {
      next = {
        ...selectedHDs,
        [hdId]: { soTienThanhToan: Math.min(num, maxVal) },
      };
    } else {
      next = { ...selectedHDs };
      delete next[hdId];
    }

    const total = Object.values(next).reduce(
      (s, v) => s + (v.soTienThanhToan || 0),
      0
    );
    setSelectedHDs(next);
    setSoTienThuInput(total > 0 ? String(total) : "");
  };

  const allChecked =
    hoaDonChuaThanhToan.length > 0 &&
    hoaDonChuaThanhToan.every((hd) => !!selectedHDs[hd._id]);
  const someChecked =
    hoaDonChuaThanhToan.some((hd) => !!selectedHDs[hd._id]) && !allChecked;

  const handleToggleAll = () => {
    if (allChecked) {
      setSelectedHDs({});
      setSoTienThuInput("");
    } else {
      const next = {};
      hoaDonChuaThanhToan.forEach((hd) => {
        next[hd._id] = { soTienThanhToan: hd.conLai || 0 };
      });
      const total = Object.values(next).reduce(
        (s, v) => s + (v.soTienThanhToan || 0),
        0
      );
      setSelectedHDs(next);
      setSoTienThuInput(total > 0 ? String(total) : "");
    }
  };

  const handleSoTienThuInput = (raw) => {
    const digits = raw.replace(/[^\d]/g, "");
    let total = Number(digits) || 0;
    const tongConNoHienTai = hoaDonChuaThanhToan.reduce((sum, hd) => sum + (hd.conLai || 0), 0);

    if (total > tongConNoHienTai) {
      total = tongConNoHienTai;
    }

    setSoTienThuInput(total > 0 ? String(total) : "");

    let remaining = total;
    const nextSelected = {};
    const checkedHDs = [];
    const uncheckedHDs = [];

    hoaDonChuaThanhToan.forEach(hd => {
      if (selectedHDs[hd._id]) checkedHDs.push(hd);
      else uncheckedHDs.push(hd);
    });

    const sortFn = (a, b) => {
      const timeA = new Date(a.ngayXuatHoaDon || a.createdAt || 0).getTime();
      const timeB = new Date(b.ngayXuatHoaDon || b.createdAt || 0).getTime();
      return timeA - timeB;
    };

    checkedHDs.sort(sortFn);
    uncheckedHDs.sort(sortFn);

    for (const hd of checkedHDs) {
      if (remaining <= 0) break;
      const pay = Math.min(remaining, hd.conLai || 0);
      if (pay > 0) {
        nextSelected[hd._id] = { soTienThanhToan: pay };
        remaining -= pay;
      }
    }

    if (remaining > 0) {
      for (const hd of uncheckedHDs) {
        if (remaining <= 0) break;
        const pay = Math.min(remaining, hd.conLai || 0);
        if (pay > 0) {
          nextSelected[hd._id] = { soTienThanhToan: pay };
          remaining -= pay;
        }
      }
    }

    setSelectedHDs(nextSelected);
  };

  const tongThuTien = useMemo(
    () =>
      Object.values(selectedHDs).reduce(
        (s, v) => s + (v.soTienThanhToan || 0),
        0
      ),
    [selectedHDs]
  );

  const tongConNo = useMemo(() => {
    if (!hoaDonChuaThanhToan.length) return 0;
    return (
      hoaDonChuaThanhToan.reduce((s, hd) => s + (hd.conLai || 0), 0) -
      tongThuTien
    );
  }, [hoaDonChuaThanhToan, tongThuTien]);

  const minNgayThuStr = useMemo(() => {
    const selectedHoaDons = hoaDonChuaThanhToan.filter(
      (hd) => selectedHDs[hd._id] && selectedHDs[hd._id].soTienThanhToan > 0
    );
    if (selectedHoaDons.length === 0) return "";

    const maxNgayHD = selectedHoaDons.reduce((max, hd) => {
      const d = new Date(hd.ngayXuatHoaDon || hd.createdAt || 0).getTime();
      return d > max ? d : max;
    }, 0);

    if (maxNgayHD === 0) return "";
    return toLocalDatetimeInput(new Date(maxNgayHD));
  }, [hoaDonChuaThanhToan, selectedHDs]);

  const handleSubmit = async () => {
    setSubmitError("");
    if (!selectedNhaKhoa) {
      setSubmitError("Vui lòng chọn khách hàng.");
      return;
    }

    if (!thangDoanhThu) {
      setSubmitError("Vui lòng chọn Tháng ghi nhận doanh thu.");
      return;
    }

    const tongConNoHienTai = hoaDonChuaThanhToan.reduce((sum, hd) => sum + (hd.conLai || 0), 0);
    if (tongThuTien > tongConNoHienTai) {
      setSubmitError(`Số tiền thu không được vượt quá tổng công nợ (${fmt(tongConNoHienTai)} ₫).`);
      return;
    }

    const selectedHoaDons = hoaDonChuaThanhToan.filter(hd => selectedHDs[hd._id] && selectedHDs[hd._id].soTienThanhToan > 0);
    const maxNgayHD = selectedHoaDons.reduce((max, hd) => {
      const d = new Date(hd.ngayXuatHoaDon || 0).getTime();
      return d > max ? d : max;
    }, 0);

    if (maxNgayHD > 0 && new Date(ngayThu).setHours(0, 0, 0, 0) < new Date(maxNgayHD).setHours(0, 0, 0, 0)) {
      setSubmitError(`Ngày thu không được trước ngày xuất hóa đơn mới nhất (${new Date(maxNgayHD).toLocaleDateString("vi-VN")}).`);
      return;
    }

    const entries = Object.entries(selectedHDs);
    if (!entries.length) {
      setSubmitError("Vui lòng chọn ít nhất một hóa đơn.");
      return;
    }

    for (const [, { soTienThanhToan }] of entries) {
      if (!soTienThanhToan || soTienThanhToan <= 0) {
        setSubmitError("Số tiền thanh toán phải lớn hơn 0.");
        return;
      }
    }

    try {
      const [meshMonth, meshYear] = thangDoanhThu.split("/");
      const ngayGhiNhanISO = dayjs()
        .year(Number(meshYear))
        .month(Number(meshMonth) - 1)
        .date(15)
        .startOf("day")
        .toISOString();

      await dispatch(
        createPhieuThu({
          nhaKhoaId: selectedNhaKhoa,
          soTienThu: tongThuTien,
          danhSachHoaDon: entries.map(([hdId, { soTienThanhToan }]) => ({
            hoaDon: hdId,
            soTienThanhToan,
          })),
          ngayThu: new Date(ngayThu).toISOString(),
          ngayGhiNhanDoanhThu: ngayGhiNhanISO,
          noiDung,
          phuongThucThanhToan: phuongThuc,
        })
      ).unwrap();

      setSubmitSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSubmitSuccess(false);
        handleClose();
      }, 800);
    } catch (err) {
      setSubmitError(
        typeof err === "string" ? err : "Có lỗi xảy ra khi tạo phiếu thu."
      );
    }
  };

  const handleClose = () => {
    setSelectedNhaKhoa("");
    setSearch("");
    setSelectedHDs({});
    setSoTienThuInput("");
    setNgayThu(toLocalDatetimeInput(new Date()));
    setThangDoanhThu("");
    setPhuongThuc("Chuyển khoản");
    setNoiDung("");
    setSubmitError("");
    setSubmitSuccess(false);
    setAutoSelected(false);
    onClose();
  };

  const handleSubmitRef = useRef(null);
  handleSubmitRef.current = handleSubmit;

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "F3") {
        e.preventDefault();
        handleSubmitRef.current();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!open) return null;

  const tenKhach =
    selectedNhaKhoaObj?.hoVaTen || selectedNhaKhoaObj?.tenGiaoDich || "";
  const address = selectedNhaKhoaObj
    ? [
      selectedNhaKhoaObj.diaChiCuThe,
      selectedNhaKhoaObj.quanHuyen,
      selectedNhaKhoaObj.tinh,
    ]
      .filter(Boolean)
      .join(", ")
    : "";

  return (
    <div className="fixed inset-0 z-[1400] flex items-start justify-center sm:pt-4 sm:pb-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-gray-50 sm:rounded-2xl shadow-2xl w-full max-w-5xl sm:mx-4 flex flex-col h-screen sm:h-auto sm:max-h-[calc(100vh-32px)]">

        <div className="flex items-center justify-between px-6 py-3.5 bg-[#29b6f6] sm:rounded-t-2xl shrink-0">
          <h2 className="text-white font-semibold text-base tracking-wide">
            Lập phiếu thu
          </h2>
          <button
            onClick={handleClose}
            className="text-white hover:bg-white/20 rounded-full p-1 transition"
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-base">
              {submitError}
            </div>
          )}
          {submitSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2 text-base">
              Tạo phiếu thu thành công!
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-[50%_1fr_30%] gap-6 sm:gap-x-0">
            <div>
              <p className="text-base text-gray-400 mb-1">Công ty</p>
              <div className="relative" ref={searchRef}>
                <div className="flex items-center border-b-2 border-gray-300 focus-within:border-[#29b6f6] pb-1 gap-2">
                  {tenKhach && (
                    <div className="w-8 h-8 rounded-full bg-[#29b6f6] flex items-center justify-center shrink-0">
                      <span className="text-white font-bold text-base">
                        {getInitials(tenKhach)}
                      </span>
                    </div>
                  )}
                  <input
                    type="text"
                    value={search}
                    placeholder="-- Chọn khách hàng --"
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setShowDropdown(true);
                      if (!e.target.value) handleClearNhaKhoa();
                    }}
                    className="flex-1 text-base font-semibold text-gray-800 bg-transparent outline-none placeholder-gray-400"
                  />
                  {selectedNhaKhoa && (
                    <button
                      onClick={handleClearNhaKhoa}
                      className="text-gray-400 hover:text-gray-600 text-lg leading-none shrink-0"
                    >
                      &times;
                    </button>
                  )}
                </div>
                {showDropdown && filteredNhaKhoa.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
                    {filteredNhaKhoa.map((nk) => (
                      <div
                        key={nk._id}
                        onMouseDown={() => handleSelectNhaKhoa(nk)}
                        className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer"
                      >
                        <p className="text-base font-medium text-gray-800">
                          {nk.hoVaTen || nk.tenGiaoDich}
                        </p>
                        {nk.moTa && (
                          <p className="text-base text-gray-400 truncate">
                            {nk.moTa}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedNhaKhoaObj && (
                <div className="mt-3 bg-[#e3f2fd] rounded-xl px-4 py-3 space-y-1 text-base">
                  <div className="flex gap-2">
                    <span className="text-gray-500 w-20 shrink-0">Địa chỉ:</span>
                    <span className="text-gray-700">{address || "—"}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-500 w-20 shrink-0">Điện thoại:</span>
                    <span className="text-gray-500">
                      {selectedNhaKhoaObj.soDienThoai || ""}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-500 w-20 shrink-0">Mô tả:</span>
                    <span className="text-gray-700">
                      {selectedNhaKhoaObj.moTa || ""}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 sm:col-start-3">
              <div>
                <p className="text-base text-gray-400 mb-1">Tổng số tiền thu</p>
                <div className="border border-gray-200 rounded-xl px-4 py-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={soTienThuInput ? fmt(soTienThuInput) : ""}
                    onChange={(e) => handleSoTienThuInput(e.target.value)}
                    placeholder="Nhập để tự phân bổ..."
                    className="w-full text-2xl font-bold text-gray-900 bg-transparent outline-none placeholder:text-gray-300 placeholder:text-base placeholder:font-normal"
                  />
                </div>
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
                  className={`relative w-full cursor-pointer select-none border-b-2 pt-5 pb-2 rounded-t-md outline-none transition-colors ${!thangDoanhThu
                    ? "border-[#f97316] hover:bg-orange-50/40"
                    : isOpenThang
                      ? "border-[#29b6f6] bg-sky-50/50"
                      : "border-gray-200 hover:bg-gray-50/60"
                    }`}
                >
                  <span
                    className={`absolute left-0 pointer-events-none transition-all duration-200 ${isFloating ? "top-0.5 text-[11px]" : "top-5 text-base"
                      } ${!thangDoanhThu ? "text-[#f97316] font-semibold" : "text-gray-400"}`}
                  >
                    Tháng ghi nhận doanh thu
                  </span>

                  <div className="flex items-center justify-between min-h-[20px]">
                    <span className={`text-base leading-5 ${!thangDoanhThu ? "text-[#f97316] font-semibold" : "text-gray-800"}`}>
                      {selectedThangLabel ? `Tháng ${selectedThangLabel}` : "\u00A0"}
                    </span>
                    <CalendarMonthIcon
                      sx={{ fontSize: 18 }}
                      className={`flex-shrink-0 ${!thangDoanhThu ? "text-[#f97316]" : "text-gray-400"}`}
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

                {!thangDoanhThu && (
                  <p className="text-[#f97316] text-[12px] font-semibold mt-1 tracking-wide">
                    Đây là nội dung bắt buộc
                  </p>
                )}
              </div>

              <div>
                <p className="text-base text-gray-400 mb-0.5">
                  Phương thức thanh toán
                </p>
                <select
                  value={phuongThuc}
                  onChange={(e) => setPhuongThuc(e.target.value)}
                  className="w-full border-b-2 border-gray-200 focus:border-[#29b6f6] bg-transparent text-base text-gray-800 py-1 outline-none appearance-none cursor-pointer"
                >
                  <option value="Tiền mặt">Tiền mặt</option>
                  <option value="Chuyển khoản">Chuyển khoản</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">
            {loadingHoaDon ? (
              <div className="text-center py-8 text-gray-400 text-base">
                Đang tải...
              </div>
            ) : !selectedNhaKhoa ? (
              <div className="text-center py-8 text-gray-300 text-base">
                Chọn khách hàng để xem hóa đơn
              </div>
            ) : hoaDonChuaThanhToan.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-base">
                Không có hóa đơn chưa thanh toán
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-base">
                  <thead className="border-b border-gray-100">
                    <tr className="text-gray-500">
                      <th className="w-10 px-4 py-3 text-left whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          ref={(el) => {
                            if (el) el.indeterminate = someChecked;
                          }}
                          onChange={handleToggleAll}
                          className="w-4 h-4 accent-[#29b6f6] cursor-pointer rounded"
                        />
                      </th>
                      <th className="px-4 py-3 text-left font-medium whitespace-nowrap">STT</th>
                      <th className="px-4 py-3 text-left font-medium whitespace-nowrap">
                        Hóa đơn
                      </th>
                      <th className="px-4 py-3 text-left font-medium whitespace-nowrap">
                        Ngày xuất
                      </th>
                      <th className="px-4 py-3 text-right font-medium whitespace-nowrap">
                        Giá trị
                      </th>
                      <th className="px-4 py-3 text-right font-medium whitespace-nowrap">
                        Đã thanh toán
                      </th>
                      <th className="px-4 py-3 text-right font-medium whitespace-nowrap">
                        Còn lại
                      </th>
                      <th className="px-4 py-3 text-right font-medium whitespace-nowrap">
                        Thanh toán
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...hoaDonChuaThanhToan]
                      .sort((a, b) => {
                        const timeA = new Date(a.ngayXuatHoaDon || a.createdAt || 0).getTime();
                        const timeB = new Date(b.ngayXuatHoaDon || b.createdAt || 0).getTime();
                        return timeB - timeA;
                      })
                      .map((hd, idx) => {
                        const checked = !!selectedHDs[hd._id];
                        return (
                          <tr
                            key={hd._id}
                            className={`border-b border-gray-50 last:border-0 transition-colors ${checked ? "bg-blue-50/60" : "hover:bg-gray-50"
                              }`}
                          >
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleToggleHD(hd._id)}
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
                                  onClick={() => {
                                    handleClose();
                                    navigate(`/hoa-don/${hd._id}/edit`);
                                  }}
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
                              {fmt(hd.giaTriThanhToan)}
                            </td>
                            <td className="px-4 py-4 text-right text-gray-500 whitespace-nowrap">
                              {fmt(hd.daThanhToan)}
                            </td>
                            <td className="px-4 py-4 text-right text-gray-700 whitespace-nowrap">
                              {fmt(hd.conLai)}
                            </td>
                            <td className="px-4 py-4 text-right whitespace-nowrap">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={
                                  selectedHDs[hd._id]?.soTienThanhToan
                                    ? fmt(selectedHDs[hd._id].soTienThanhToan)
                                    : ""
                                }
                                placeholder="0"
                                onChange={(e) =>
                                  handleAmountChange(
                                    hd._id,
                                    e.target.value,
                                    hd.conLai
                                  )
                                }
                                className="w-28 border-b-2 border-gray-200 focus:border-[#29b6f6] bg-transparent text-right text-base text-gray-800 outline-none py-0.5"
                              />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 items-start">
            <div className="space-y-4">
              <div>
                <p className="text-base text-gray-400 mb-1">Nội dung thu</p>
                <input
                  type="text"
                  value={noiDung}
                  onChange={(e) => setNoiDung(e.target.value)}
                  placeholder=""
                  className="w-full border-b-2 border-gray-200 focus:border-[#29b6f6] bg-transparent text-base text-gray-800 py-1 outline-none"
                />
              </div>
            </div>

            <div className="flex items-start justify-end pt-1 pb-4 sm:pb-0">
              <div className="text-right">
                <span className="text-base text-gray-500 mr-4">Còn nợ</span>
                <span className="text-xl font-bold text-gray-900">
                  {fmt(Math.max(0, tongConNo))}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t bg-white sm:rounded-b-2xl flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-5 py-2 border border-gray-300 rounded-lg text-base text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-[#29b6f6] hover:bg-[#0091ea] text-white rounded-lg text-base font-semibold transition disabled:opacity-50 shadow-sm"
          >
            {loading && (
              <svg
                className="animate-spin w-4 h-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
            )}
            <SaveOutlinedIcon sx={{ fontSize: 17 }} />
            Lưu (F3)
          </button>
        </div>
      </div>
    </div>
  );
}