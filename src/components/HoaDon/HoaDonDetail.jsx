import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { fetchHoaDonById, updateHoaDon, deleteHoaDon, resetEditedHoaDonIds } from "../../redux/slices/hoaDonSlice";
import { fetchNhaKhoa } from "../../redux/slices/nhaKhoaSlice";
import { fetchPhieuThuByHoaDon } from "../../redux/slices/phieuThuSlice";
import { X, Printer, FileDown, Save, Upload, Trash2 } from "lucide-react";
import { exportHoaDonToExcel } from "../../utils/exportToExcel";
import HoaDonDetailTable from "./HoaDonDetailTable";
import PhieuThuModal from "../PhieuThu/PhieuThuModal";
import { toast } from "sonner";
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import DonHangChuaXuatModal from "../DonHangChuaXuat/DonHangChuaXuatModal";
import { taiPdfHoaDon, tenFileHoaDon } from "../../utils/hoaDonPdf";

const fmtVND = (v) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(v || 0));

const fmtMoneyInput = (v) =>
  v ? new Intl.NumberFormat("vi-VN").format(Math.round(Number(v) || 0)) : "";
const parseMoneyInput = (s) => parseInt(String(s).replace(/\D/g, ""), 10) || 0;

const fmtDateTime = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  return `${dt.toLocaleDateString("vi-VN")} ${dt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
};

const toLocalDateInput = (d) => {
  const dt = d ? new Date(d) : new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};

const CHINH_SACH_OPTIONS = [
  "Thanh toán trước",
  "Thanh toán ngay",
  "Thanh toán trong 7 ngày",
  "Thanh toán trong 10 ngày",
  "Thanh toán trong 30 ngày",
  "Thanh toán trong 60 ngày",
  "Thanh toán trong 90 ngày",
  "Thanh toán cuối tháng",
];

const TRANG_THAI_COLOR = {
  "Lưu tạm": "bg-blue-500 text-white",
  "Chưa thanh toán": "bg-orange-500 text-white",
  "Thanh toán một phần": "bg-yellow-500 text-white",
  "Đã thanh toán": "bg-green-500 text-white",
};

const HoaDonDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(true);
  const [hoaDon, setHoaDon] = useState(null);
  const [phieuThuList, setPhieuThuList] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [dangXuatPdf, setDangXuatPdf] = useState(false);
  const [ptOpen, setPtOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showXacNhanConfirm, setShowXacNhanConfirm] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // 🔥 State ghi nhớ ID gốc để không gửi thừa cho API
  const [initialDonHangIds, setInitialDonHangIds] = useState("");

  const [formState, setFormState] = useState({
    chinhSachThanhToan: "Thanh toán cuối tháng",
    ghiChuChoKhachHang: "",
    ghiChuNoiBo: "",
    chietKhauPhanTram: 0,
    chietKhauTien: 0,
    chietKhauMode: "phanTram",
    thuePhanTram: 0,
    thueTien: 0,
    thueMode: "phanTram",
    chiPhiKhac: 0,
    ngayXuatHoaDon: "",
  });

  // ================= LOAD DATA =================
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [nhaKhoaRes, hoaDonRes, ptRes] = await Promise.all([
          dispatch(fetchNhaKhoa()),
          dispatch(fetchHoaDonById(id)).unwrap(),
          dispatch(fetchPhieuThuByHoaDon(id)).unwrap().catch((ptErr) => {
            console.error("Không tải được phiếu thu:", ptErr);
            return [];
          })
        ]);

        const data = hoaDonRes.data;

        const mappedData = {
          ...data,
          danhSachSanPham: (data.danhSachSanPham || []).map((sp) => ({
            ...sp,
            giamGiaPhanTram: sp.thanhTien
              ? parseFloat(((sp.giamGia || 0) / sp.thanhTien * 100).toFixed(2))
              : 0,
          })),
        };

        setHoaDon(mappedData);

        const ids = [...new Set((mappedData.danhSachSanPham || []).map(sp => sp.donHang?._id || sp.donHang))].sort().join(',');
        setInitialDonHangIds(ids);

        const tongCongLoaded = mappedData.tongCong || 0;
        const chietKhauPhanTram =
          tongCongLoaded > 0
            ? Math.round(((mappedData.chietKhau || 0) / tongCongLoaded) * 100)
            : 0;

        const sauCKLoaded = tongCongLoaded - (mappedData.chietKhau || 0);
        const thueTienLoaded = Math.round(sauCKLoaded * ((mappedData.thue || 0) / 100));

        setFormState({
          chinhSachThanhToan: mappedData.chinhSachThanhToan || "Thanh toán cuối tháng",
          ghiChuChoKhachHang: mappedData.ghiChuChoKhachHang || "",
          ghiChuNoiBo: mappedData.ghiChuNoiBo || "",
          chietKhauPhanTram,
          chietKhauTien: mappedData.chietKhau || 0,
          chietKhauMode: mappedData.chietKhau > 0 ? "tienMat" : "phanTram",
          thuePhanTram: mappedData.thue || 0,
          thueTien: thueTienLoaded,
          thueMode: (mappedData.thue > 0 && mappedData.thue % 1 !== 0) ? "tienMat" : "phanTram",
          chiPhiKhac: mappedData.chiPhiKhac || 0,
          ngayXuatHoaDon: mappedData.ngayXuatHoaDon
            ? toLocalDateInput(mappedData.ngayXuatHoaDon)
            : "",
        });

        setPhieuThuList(ptRes?.data || ptRes || []);

      } catch (err) {
        console.error("Lỗi khi tải dữ liệu Hóa Đơn:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, dispatch]);

  const setField = (key, val) => {
    setFormState((p) => ({ ...p, [key]: val }));
    setIsDirty(true);
  };

  // ✅ FIX: dùng functional update → dep rỗng → callback stable, không tạo lại mỗi lần render
  const handleGiamGiaChange = useCallback((idx, val, loai) => {
    const value = Number(val) || 0;
    setHoaDon(prev => {
      const newList = [...prev.danhSachSanPham];
      const sp = { ...newList[idx] };
      const baseAmount = Number(sp.thanhTien) || 0;

      if (loai === "phanTram") {
        const percent = Math.min(100, Math.max(0, value));
        sp.giamGiaPhanTram = percent;
        sp.loaiGiamGia = "phanTram";
        sp.giamGia = Math.round(baseAmount * (percent / 100));
      } else {
        const amount = Math.min(baseAmount, Math.max(0, value));
        sp.giamGiaPhanTram = 0;
        sp.loaiGiamGia = "tienMat";
        sp.giamGia = amount;
      }

      sp.tongCongSanPham = baseAmount - sp.giamGia;
      newList[idx] = sp;
      return { ...prev, danhSachSanPham: newList };
    });
    setIsDirty(true);
  }, []); // ✅ dep rỗng

  // ✅ FIX: dùng functional update → dep rỗng → callback stable
  const handleGhiChuChange = useCallback((idx, val) => {
    setHoaDon(prev => {
      const newList = [...prev.danhSachSanPham];
      newList[idx] = { ...newList[idx], ghiChu: val };
      return { ...prev, danhSachSanPham: newList };
    });
    setIsDirty(true);
  }, []); // ✅ dep rỗng

  const minNgayXuatStr = useMemo(() => {
    if (!hoaDon?.danhSachSanPham) return "";
    let maxTime = 0;
    hoaDon.danhSachSanPham.forEach(sp => {
      const dt = sp.donHang?.ngayNhan;
      if (dt) {
        const t = new Date(dt).getTime();
        if (t > maxTime) maxTime = t;
      }
    });

    return maxTime > 0 ? toLocalDateInput(maxTime) : "";
  }, [hoaDon]);

  const handleNgayXuatChange = (e) => {
    const val = e.target.value;
    if (!val) { setField("ngayXuatHoaDon", val); return; }

    if (minNgayXuatStr && val < minNgayXuatStr) {
      const [y, m, d] = minNgayXuatStr.split("-");
      toast.error(`Ngày xuất hóa đơn không được nhỏ hơn ngày nhận mới nhất (${d}/${m}/${y})`);
      return;
    }
    const todayStr = toLocalDateInput();
    if (val > todayStr) {
      const [y, m, d] = todayStr.split("-");
      toast.error(`Ngày xuất hóa đơn không được vượt quá ngày hôm nay (${d}/${m}/${y})`);
      return;
    }
    setField("ngayXuatHoaDon", val);
  };

  const fin = useMemo(() => {
    if (!hoaDon) return {
      tongCong: 0, chietKhauTien: 0, chietKhauPhanTram: 0,
      thueTien: 0, thuePhanTram: 0, giaTriThanhToan: 0, tongDaThanhToan: 0, conLai: 0, noDauKy: 0
    };

    const tongCong = (hoaDon.danhSachSanPham || []).reduce((s, sp) => s + (sp.tongCongSanPham || 0), 0);

    const chietKhauTien = formState.chietKhauMode === "phanTram"
      ? Math.round(tongCong * (formState.chietKhauPhanTram / 100))
      : Math.min(Number(formState.chietKhauTien || 0), tongCong);

    const chietKhauPhanTram = formState.chietKhauMode === "tienMat"
      ? (tongCong > 0 ? parseFloat((chietKhauTien / tongCong * 100).toFixed(2)) : 0)
      : formState.chietKhauPhanTram;

    const sauCK = tongCong - chietKhauTien;

    const thueTien = formState.thueMode === "phanTram"
      ? Math.round(sauCK * (formState.thuePhanTram / 100))
      : Number(formState.thueTien || 0);

    const thuePhanTram = formState.thueMode === "tienMat"
      ? (sauCK > 0 ? parseFloat((thueTien / sauCK * 100).toFixed(2)) : 0)
      : formState.thuePhanTram;

    const phatSinhKyNay = sauCK + thueTien + Number(formState.chiPhiKhac || 0);
    const giaTriThanhToan = phatSinhKyNay;

    const noDauKy = Number(hoaDon.noDauKy || 0);

    const tongDaThanhToan = phieuThuList.reduce((sum, pt) => {
      let tien = 0;
      if (pt.danhSachHoaDon && Array.isArray(pt.danhSachHoaDon)) {
        const hdItem = pt.danhSachHoaDon.find((x) => x.hoaDon === id || x.hoaDon?._id === id);
        if (hdItem) tien += hdItem.soTienThanhToan;
      }
      return sum + tien;
    }, 0);

    const conLai = hoaDon.conLai || 0;

    return {
      tongCong, chietKhauTien, chietKhauPhanTram,
      thueTien, thuePhanTram, noDauKy, giaTriThanhToan, tongDaThanhToan, conLai
    };
  }, [hoaDon, formState, phieuThuList, id]);


  // ================= LƯU VÀ XÁC NHẬN =================
  const handleSave = async (isConfirm = false, exitAfter = false) => {
    try {
      const sauCK = fin.tongCong - fin.chietKhauTien;
      const thueChinhXac = formState.thueMode === "tienMat" && sauCK > 0
        ? (fin.thueTien / sauCK) * 100
        : fin.thuePhanTram;

      // 🔥 THÊM LOGIC GIỮ LẠI GIỜ PHÚT GỐC NẾU KHÔNG ĐỔI NGÀY
      const originalDateOnly = hoaDon.ngayXuatHoaDon ? toLocalDateInput(hoaDon.ngayXuatHoaDon) : "";
      const ngayXuatGuiDi = formState.ngayXuatHoaDon === originalDateOnly
        ? hoaDon.ngayXuatHoaDon // Bằng ngày cũ -> Giữ nguyên chuỗi ngày giờ gốc của DB
        : formState.ngayXuatHoaDon; // Khác ngày cũ -> Người dùng đã đổi ngày mới, chấp nhận 00:00:00

      const updateData = {
        ngayXuatHoaDon: ngayXuatGuiDi,
        chietKhau: Math.round(fin.chietKhauTien),
        thue: thueChinhXac,
        chiPhiKhac: Number(formState.chiPhiKhac),
        chinhSachThanhToan: formState.chinhSachThanhToan,
        ghiChuChoKhachHang: formState.ghiChuChoKhachHang,
        ghiChuNoiBo: formState.ghiChuNoiBo,
        danhSachSanPham: hoaDon.danhSachSanPham,
      };

      if (isConfirm) updateData.xacNhanHoaDon = true;

      if ((hoaDon.daThanhToan || 0) === 0) {
        updateData.danhSachDonHangIds = [...new Set(hoaDon.danhSachSanPham.map(sp => sp.donHang?._id || sp.donHang))];
      }

      const res = await dispatch(updateHoaDon({ id, data: updateData })).unwrap();

      if (!exitAfter) {
        setHoaDon({
          ...res.data,
          danhSachSanPham: (res.data.danhSachSanPham || []).map((sp) => ({
            ...sp,
            giamGiaPhanTram: sp.thanhTien
              ? parseFloat(((sp.giamGia || 0) / sp.thanhTien * 100).toFixed(2))
              : 0,
          })),
        });
        const newInitialIds = [...new Set((res.data.danhSachSanPham || []).map(sp => sp.donHang?._id || sp.donHang))].sort().join(',');
        setInitialDonHangIds(newInitialIds);
      }

      setIsDirty(false);

      if (isConfirm) {
        setShowXacNhanConfirm(false);
        toast.success("Hóa đơn đã được LƯU VÀ XÁC NHẬN thành công!");
      } else {
        toast.success("Đã lưu hóa đơn thành công!");
      }

      if (exitAfter) {
        sessionStorage.removeItem("hd_keep_data"); // 🔥 Thêm dòng này
        navigate(-1);
      }
    } catch (err) {
      toast.error("Lỗi: " + (err.message || err));
    }
  };

  const handleClose = () => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      navigate(-1);
    }
  };

  // ================= XÓA DÒNG =================
  // ✅ FIX: dùng functional update → dep rỗng → stable
  const handleRemoveDonHang = useCallback((donHangId) => {
    setHoaDon(prev => ({
      ...prev,
      danhSachSanPham: prev.danhSachSanPham.filter(
        sp => (sp.donHang?._id || sp.donHang) !== donHangId
      )
    }));
    setIsDirty(true);
  }, []); // ✅ dep rỗng

  const handleAddRowClick = useCallback(() => {
    setIsAddModalOpen(true);
  }, []);

  // 🔥 NHẬN DATA XỊN TỪ MODAL (CÓ SẴN TÊN VÀ GIÁ)
  const handleAddOrders = (selectedOrders, enrichedProducts) => {
    const currentIds = new Set(hoaDon.danhSachSanPham.map(sp => sp.donHang?._id || sp.donHang));
    const ordersToAdd = selectedOrders.filter(o => !currentIds.has(o._id));

    if (ordersToAdd.length === 0) return;

    const newProducts = enrichedProducts
      .filter(row => ordersToAdd.some(o => o._id === row.orderId))
      .map(row => ({
        donHang: row.rawOrder,
        sanPhamDonHangId: row.sanPhamDonHangId,
        sanPham: { _id: row.sanPhamId, tenSanPham: row.sanPham },
        tenSanPham: row.sanPham,
        loaiDon: row.loai,
        viTri: row.viTri,
        soLuong: row.soLuong,
        donGia: row.donGia,
        thanhTien: row.tongCong,
        giamGia: 0,
        giamGiaPhanTram: 0,
        loaiGiamGia: "phanTram",
        tongCongSanPham: row.tongCong,
        ghiChu: row.ghiChuTaiChinh || ""
      }));

    setHoaDon(prev => ({
      ...prev,
      danhSachSanPham: [...prev.danhSachSanPham, ...newProducts]
    }));
    setIsDirty(true);
  };

  const handlePrint = () => {
    navigate(`/hoa-don/${id}/print`);
  };

  const handleXuatPdf = async () => {
    if (isDirty) {
      toast.error("Vui lòng bấm Lưu trước khi xuất PDF");
      return;
    }
    const tenFile = tenFileHoaDon(hoaDon.nhaKhoa?.hoVaTen, hoaDon.createdAt);
    setDangXuatPdf(true);
    try {
      await taiPdfHoaDon(id, tenFile);
      toast.success(`Đã xuất ${tenFile}`);
    } catch (err) {
      toast.error(`Xuất PDF thất bại: ${err?.message || err}`);
    } finally {
      setDangXuatPdf(false);
    }
  };

  const handleDeleteClick = () => {
    if ((hoaDon.daThanhToan || 0) > 0) {
      toast.error("Không thể xóa hóa đơn đã có giao dịch thanh toán!");
      return;
    }
    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
    try {
      await dispatch(deleteHoaDon(id)).unwrap();
      setShowDeleteConfirm(false);
      sessionStorage.removeItem("hd_keep_data");
      navigate(-1);
      toast.success("Đã xóa hóa đơn");
    } catch (err) {
      console.error("Lỗi xóa hóa đơn:", err);
      toast.error("Không thể xóa hóa đơn lúc này!");
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-400">Đang tải...</div>;
  if (!hoaDon) return <div className="p-10 text-center text-red-500">Không tìm thấy hóa đơn!</div>;

  const initials = hoaDon.nhaKhoa?.hoVaTen?.slice(0, 2).toUpperCase() || "NK";
  const isLocked = (hoaDon.daThanhToan || 0) > 0;

  const renderFinancialBlock = () => (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <span className="text-gray-800 text-base">Tổng cộng</span>
        <span className="font-bold text-gray-900 text-[15px]">{fmtVND(fin.tongCong)}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-gray-800 text-base shrink-0">Chiết khấu</span>
        <div className="flex items-center flex-1 justify-end ml-4">
          <input
            type="number" min={0} max={100}
            disabled={isLocked}
            value={formState.chietKhauMode === "phanTram" ? formState.chietKhauPhanTram : fin.chietKhauPhanTram}
            onChange={(e) => {
              const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
              setFormState((p) => ({ ...p, chietKhauPhanTram: val, chietKhauMode: "phanTram" }));
              setIsDirty(true);
            }}
            className="w-12 border-b border-gray-400 text-center text-base outline-none bg-transparent pb-0.5 no-spinner"
          />
          <span className="mx-2 text-gray-800 text-base">% =</span>
          <input
            type="text" inputMode="numeric"
            disabled={isLocked}
            value={fmtMoneyInput(formState.chietKhauMode === "tienMat" ? formState.chietKhauTien : fin.chietKhauTien)}
            onChange={(e) => {
              const val = parseMoneyInput(e.target.value);
              setFormState((p) => ({ ...p, chietKhauTien: val, chietKhauMode: "tienMat" }));
              setIsDirty(true);
            }}
            className="w-[100px] text-right border-b border-gray-400 text-[16px] pb-0.5 outline-none bg-transparent"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-gray-800 text-base shrink-0">Thuế</span>
        <div className="flex items-center flex-1 justify-end ml-4">
          <input
            type="number" min={0} max={100}
            disabled={isLocked}
            value={formState.thueMode === "phanTram" ? formState.thuePhanTram : fin.thuePhanTram}
            onChange={(e) => {
              const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
              setFormState((p) => ({ ...p, thuePhanTram: val, thueMode: "phanTram" }));
              setIsDirty(true);
            }}
            className="w-12 border-b border-gray-400 text-center text-base outline-none bg-transparent pb-0.5 no-spinner"
          />
          <span className="mx-2 text-gray-800 text-base">% =</span>
          <input
            type="text" inputMode="numeric"
            disabled={isLocked}
            value={fmtMoneyInput(formState.thueMode === "tienMat" ? formState.thueTien : fin.thueTien)}
            onChange={(e) => {
              const val = parseMoneyInput(e.target.value);
              setFormState((p) => ({ ...p, thueTien: val, thueMode: "tienMat" }));
              setIsDirty(true);
            }}
            className="w-[100px] text-right border-b border-gray-400 text-[16px] pb-0.5 outline-none bg-transparent"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-gray-800 text-base shrink-0">Chi phí khác</span>
        <div className="flex items-center flex-1 justify-end ml-4">
          <input
            disabled={isLocked}
            type="text" inputMode="numeric"
            value={fmtMoneyInput(formState.chiPhiKhac)}
            onChange={(e) => setField("chiPhiKhac", parseMoneyInput(e.target.value))}
            className="w-[110px] border-b border-gray-400 text-right text-[16px] outline-none bg-transparent pb-0.5"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200/60 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-900 font-bold text-[15px]">Giá trị thanh toán</span>
          <span className="font-black text-gray-900 text-[16px]">{fmtVND(fin.giaTriThanhToan)}</span>
        </div>
        {(hoaDon.trangThai === "Thanh toán một phần" || hoaDon.trangThai === "Đã thanh toán") && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-gray-900 font-bold text-[15px]">Đã thanh toán</span>
              <span className="font-bold text-gray-900 text-[16px]">{fmtVND(fin.tongDaThanhToan)}</span>
            </div>

            {phieuThuList.length > 0 && (
              <div className="flex flex-col gap-1.5 pl-12">
                {phieuThuList.slice().reverse().map((pt, idx) => {
                  let tien = 0;
                  if (pt.danhSachHoaDon && Array.isArray(pt.danhSachHoaDon)) {
                    const hdItem = pt.danhSachHoaDon.find((x) => x.hoaDon === id || x.hoaDon?._id === id);
                    if (hdItem) tien += hdItem.soTienThanhToan;
                  }

                  if (tien === 0) return null;

                  const dateStr = pt.ngayThu
                    ? new Date(pt.ngayThu).toLocaleDateString("vi-VN")
                    : pt.createdAt
                      ? new Date(pt.createdAt).toLocaleDateString("vi-VN")
                      : "---";

                  return (
                    <div key={idx} className="flex items-center justify-between text-[14px] text-gray-700">
                      <span>{dateStr}</span>
                      <span>{fmtVND(tien)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <span className="text-gray-900 font-bold text-[16px]">Còn lại</span>
              <span className="font-black text-gray-900 text-lg">{fmtVND(fin.conLai)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[1300] bg-white flex flex-col text-gray-800 overflow-hidden overflow-y-auto pb-20">

      {showExitConfirm && (
        <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-sm mx-4">
            <p className="text-gray-900 font-semibold text-base mb-1.5">Thoát mà không lưu?</p>
            <p className="text-gray-500 text-base mb-6 leading-relaxed">
              Bạn có thay đổi chưa được lưu. Bạn muốn làm gì?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowExitConfirm(false); navigate(-1); }}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-base font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Không lưu
              </button>
              <button
                onClick={() => handleSave(false, true)}
                className="flex-1 px-4 py-2.5 bg-[#00a8df] text-white rounded-xl text-base font-bold hover:bg-sky-600 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Save className="w-4 h-4" /> Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-gray-900 font-bold text-lg">Xóa hóa đơn?</p>
            </div>
            <p className="text-gray-500 text-base mb-6 leading-relaxed">
              Hành động này không thể hoàn tác. Các đơn hàng trong hóa đơn này sẽ được trả về trạng thái <span className="font-semibold text-gray-700">Chờ xuất hóa đơn</span>.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-base font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={executeDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-base font-bold hover:bg-red-700 transition-colors shadow-sm"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {showXacNhanConfirm && (
        <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-sm mx-4">
            <p className="text-gray-900 font-bold text-lg mb-2">Xác nhận chốt hóa đơn?</p>
            <p className="text-gray-500 text-base mb-6 leading-relaxed">
              Hóa đơn sẽ được <b>Lưu</b> và chuyển sang trạng thái <b>Chưa thanh toán</b>.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowXacNhanConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-base font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => handleSave(true)}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl text-base font-bold hover:bg-green-700 transition-colors shadow-sm"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="h-12 bg-[#00a8df] flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-white text-base">
            Hóa đơn <span className="font-bold">{hoaDon.soHoaDon || "---"}</span>
          </h1>
          <span className={`text-base font-bold px-2 py-0.5 rounded ${TRANG_THAI_COLOR[hoaDon.trangThai] || "bg-orange-500 text-white"}`}>
            {hoaDon.trangThai}
          </span>
        </div>
        <button onClick={handleClose} className="text-white/80 hover:text-white p-1">
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="bg-white px-4 lg:px-6 py-4 flex flex-col lg:flex-row items-stretch gap-3 lg:gap-4 shrink-0">
        <div className="order-1 lg:hidden px-1">
          <p className="text-base text-gray-400 font-medium">Giá trị thanh toán</p>
          <p className="text-3xl font-black text-gray-900 leading-tight mt-1 mb-3">
            {fmtVND(fin.giaTriThanhToan)}
          </p>
          <p className="text-base text-gray-400 font-medium mt-4">Ngày xuất</p>
          <div className="flex items-center mt-0.5 mb-4">
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                disabled={isLocked}
                format="DD/MM/YYYY"
                minDate={minNgayXuatStr ? dayjs(minNgayXuatStr) : undefined}
                maxDate={dayjs()}
                value={formState.ngayXuatHoaDon ? dayjs(formState.ngayXuatHoaDon) : null}
                onChange={(val) => {
                  handleNgayXuatChange({ target: { value: val ? val.format("YYYY-MM-DD") : "" } });
                }}
                slotProps={{
                  textField: {
                    variant: "standard",
                    sx: {
                      width: 144,
                      "& input": { fontSize: "0.875rem", color: "#1f2937" },
                      "& .MuiInput-underline:before": { borderBottomColor: "#d1d5db" }
                    }
                  }
                }}
              />
            </LocalizationProvider>
          </div>
        </div>

        <div className="order-3 lg:hidden px-1 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-white font-bold text-base shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-base text-gray-400 font-medium">Nha khoa</p>
            <p className="font-bold text-gray-900 text-base leading-tight mt-0.5 uppercase">
              {hoaDon.nhaKhoa?.hoVaTen || "---"}
            </p>
          </div>
        </div>

        <div className="order-4 lg:order-2 lg:w-[40%] text-[13px] text-gray-700 space-y-1.5 p-4 bg-[#e6f7ff] rounded-xl flex flex-col justify-center shadow-sm border border-[#00a8df]/20">
          <p><span className="text-gray-500 inline-block w-20">Địa chỉ:</span><span className="font-medium">{hoaDon.nhaKhoa?.diaChiCuThe || ""}</span></p>
          <p><span className="text-gray-500 inline-block w-20">Điện thoại:</span><span className="font-medium">{hoaDon.nhaKhoa?.soDienThoai || ""}</span></p>
          <p><span className="text-gray-500 inline-block w-20">Mô tả:</span><span className="font-medium">{hoaDon.nhaKhoa?.moTa || ""}</span></p>
          <div className="pt-3 mt-1.5 border-t border-[#00a8df]/30 flex items-center justify-between">
            <span className="text-gray-700 font-bold uppercase text-base tracking-wide">
              Công nợ:
            </span>
            <span className="font-black text-gray-700 text-xl">
              {fmtVND(hoaDon.congNoNhaKhoa)}
            </span>
          </div>
        </div>

        <div className="order-5 lg:hidden px-1 py-4">
          <p className="text-base text-gray-400 font-medium">Chính sách thanh toán</p>
          <select
            disabled={isLocked}
            value={formState.chinhSachThanhToan}
            onChange={(e) => setField("chinhSachThanhToan", e.target.value)}
            className="border-0 border-b border-gray-300 text-base text-gray-800 outline-none bg-transparent pr-4 py-0.5 mt-0.5 w-full"
          >
            {CHINH_SACH_OPTIONS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>

        <div className="hidden lg:flex lg:order-1 lg:w-[30%] pr-4 flex-col gap-6 ">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-white font-bold text-base shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-base text-gray-400 font-medium">Nha khoa</p>
              <p className="font-bold text-gray-900 text-base leading-tight mt-0.5 uppercase">
                {hoaDon.nhaKhoa?.hoVaTen || "---"}
              </p>
            </div>
          </div>
          <div className="-mt-2">
            <p className="text-base text-gray-400 font-medium">Chính sách thanh toán</p>
            <select
              disabled={isLocked}
              value={formState.chinhSachThanhToan}
              onChange={(e) => setField("chinhSachThanhToan", e.target.value)}
              className="border-0 border-b border-gray-300 text-base text-gray-800 outline-none bg-transparent pr-4 py-0.5 mt-0.5 w-4/5"
            >
              {CHINH_SACH_OPTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="hidden lg:flex lg:order-3 lg:w-[30%] pl-8 flex-col justify-center ">
          <p className="text-base text-gray-400 font-medium">Giá trị thanh toán</p>
          <p className="text-3xl font-black text-gray-900 leading-tight mt-1 mb-3">
            {fmtVND(fin.giaTriThanhToan)}
          </p>
          <div className="flex flex-col gap-1">
            <p className="text-base text-gray-400 font-medium">Ngày xuất</p>
            <div className="flex items-center">
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  disabled={isLocked}
                  format="DD/MM/YYYY"
                  minDate={minNgayXuatStr ? dayjs(minNgayXuatStr) : undefined}
                  maxDate={dayjs()}
                  value={formState.ngayXuatHoaDon ? dayjs(formState.ngayXuatHoaDon) : null}
                  onChange={(val) => {
                    handleNgayXuatChange({ target: { value: val ? val.format("YYYY-MM-DD") : "" } });
                  }}
                  slotProps={{
                    textField: {
                      variant: "standard",
                      sx: {
                        width: 144,
                        "& input": { fontSize: "0.875rem", color: "#1f2937" },
                        "& .MuiInput-underline:before": { borderBottomColor: "#d1d5db" }
                      }
                    }
                  }}
                />
              </LocalizationProvider>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white flex flex-col">
        <HoaDonDetailTable
          rows={hoaDon.danhSachSanPham || []}
          navigate={navigate}
          handleGhiChuChange={handleGhiChuChange}
          handleGiamGiaChange={handleGiamGiaChange}
          isLocked={isLocked}
          canEditItems={!isLocked}
          onRemoveDonHang={handleRemoveDonHang}
          onAddRowClick={handleAddRowClick}
        />

        <div className="flex flex-col md:flex-row mt-6 bg-gray-50/30 shrink-0 items-stretch">
          <div className="w-full md:w-[60%] lg:w-[70%] p-4 md:p-6 space-y-6">
            <div>
              <p className="text-base text-gray-500 font-medium mb-1.5">Ghi chú cho khách hàng</p>
              <textarea
                value={formState.ghiChuChoKhachHang}
                onChange={(e) => setField("ghiChuChoKhachHang", e.target.value)}
                rows={2}
                className="w-full border-b border-gray-300 text-base outline-none resize-none bg-transparent focus:border-[#00a8df] transition-colors pb-1"
              />
            </div>
            <div>
              <p className="text-base text-gray-500 font-medium mb-1.5">Ghi chú nội bộ</p>
              <textarea
                value={formState.ghiChuNoiBo}
                onChange={(e) => setField("ghiChuNoiBo", e.target.value)}
                rows={2}
                className="w-full border-b border-gray-300 text-base outline-none resize-none bg-transparent focus:border-[#00a8df] transition-colors pb-1"
              />
            </div>
          </div>


          <div className="w-full md:w-[40%] lg:w-[30%] p-4 md:p-6 lg:p-8 flex flex-col justify-center border-t md:border-t-0 md:border-l border-gray-100">
            <div className="w-full md:max-w-none lg:max-w-[320px] lg:ml-auto space-y-4">
              {renderFinancialBlock()}
            </div>
          </div>
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-gray-200 flex items-center justify-between px-4 md:px-6 z-[1310] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-base text-gray-400 font-medium">
            Kế Toán Tạo lúc {fmtDateTime(hoaDon.createdAt)}
            {hoaDon.updatedAt && hoaDon.updatedAt !== hoaDon.createdAt && (
              <span className="ml-1.5 italic text-gray-500">
                (Đã sửa lúc: {fmtDateTime(hoaDon.updatedAt)})
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {(!isLocked && (hoaDon.trangThai === "Lưu tạm" || hoaDon.trangThai === "Chưa thanh toán")) && (
            <button
              onClick={handleDeleteClick}
              className="flex items-center gap-1.5 px-3 md:px-4 py-2 border border-red-200 bg-red-500 text-white rounded-2xl text-[13px] font-bold hover:bg-red-600 hover:border-red-300 transition-colors shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Xóa</span>
            </button>
          )}
          <button onClick={handlePrint} className="hidden md:flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-2xl text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-colors">
            <Printer className="w-4 h-4" /> In hóa đơn
          </button>
          <button
            onClick={handleXuatPdf}
            disabled={dangXuatPdf}
            className="flex items-center gap-1.5 px-3 md:px-4 py-2 border border-gray-300 rounded-2xl text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">{dangXuatPdf ? "Đang xuất..." : "Xuất PDF"}</span>
          </button>
          <button
            onClick={() => exportHoaDonToExcel(hoaDon)}
            className="hidden md:flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-2xl text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <FileDown className="w-4 h-4" /> Xuất excel
          </button>

          <button onClick={handlePrint} className="flex md:hidden items-center justify-center w-9 h-9 border border-gray-300 rounded-2xl text-gray-600 hover:bg-gray-50 transition-colors">
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={() => exportHoaDonToExcel(hoaDon)}
            className="flex md:hidden items-center justify-center w-9 h-9 border border-gray-300 rounded-2xl text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <FileDown className="w-4 h-4" />
          </button>

          {hoaDon.trangThai === "Lưu tạm" ? (
            <button
              onClick={() => setShowXacNhanConfirm(true)}
              className="px-3 md:px-5 py-2 bg-green-600 text-white rounded-2xl text-[13px] font-bold hover:bg-green-700 transition-colors shadow-sm"
            >
              Xác nhận
            </button>
          ) : (
            fin.conLai > 0 && (
              <button
                onClick={() => setPtOpen(true)}
                className="px-3 md:px-5 py-2 bg-[#4CAF50] text-white rounded-2xl text-[13px] font-bold hover:bg-green-600 transition-colors shadow-sm"
              >
                <span className="hidden sm:inline">Lập phiếu thu</span>
                <span className="sm:hidden">Phiếu thu</span>
              </button>
            )
          )}
          <button
            onClick={() => handleSave(false)}
            disabled={!isDirty}
            className={`flex items-center gap-1.5 px-4 md:px-6 py-2 rounded-2xl text-[13px] font-bold transition-all shadow-sm ${isDirty
              ? "bg-[#00a8df] text-white hover:bg-sky-600 hover:shadow-md"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
          >
            <Save className="w-4 h-4" />
            <span>Lưu</span>
          </button>
        </div>
      </footer>

      <PhieuThuModal
        open={ptOpen}
        onClose={() => setPtOpen(false)}
        onSuccess={() => {
          toast.success("Tạo phiếu thu thành công!");
          dispatch(resetEditedHoaDonIds());
          sessionStorage.removeItem("hd_keep_data");
          setTimeout(() => {
            navigate(-1);
          }, 300);
        }}
        initialNhaKhoaId={hoaDon?.nhaKhoa?._id}
        initialHoaDonId={hoaDon?._id}
      />

      <DonHangChuaXuatModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        selectedClinic={hoaDon.nhaKhoa?._id}
        onAddOrders={handleAddOrders}
      />
    </div>
  );
};

export default HoaDonDetail;