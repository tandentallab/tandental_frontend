import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { api } from "../../config/api";
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import CustomDateRangePicker from "../common/CustomDateRangePicker";
import { createDonHang, updateDonHang } from "../../redux/slices/donHangSlice";
import DanhSachPhuKien from "./DanhSachPhuKien";
import ChonViTriRangModal from "./ChonViTriRangModal";
import ChonViTriHamModal from "./ChonViTriHamModal";
import SanPhamModal from "../SanPham/SanPhamModal";
import ChonDonHangCuModal from "./ChonDonHangCuModal";
import DonHangDetailPanel from "./DonHangDetailPanel";
import PhieuBaoHanhModal from "./PhieuBaoHanhModal";
import PhieuBaoHanhList from "./PhieuBaoHanhList";
import WarrantyCardPrint from "./WarrantyCardPrint";
import { toast } from "sonner";
import { hasExplicitPermission, hasRouteAccess, ORDER_DELIVERY_TIME_PERMISSION } from "../../config/permissions";
import GhiChuAddModal from "../GhiChu/GhiChuAddModal";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import { NHOM_MUA_GIUM } from "../../data/sanPhamConfig";

// ===== QUICK ADD MODALS =====
const QuickAddModal = ({ open, onClose, title, children, onSubmit, loading }) => {
  if (!open) return null;
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <h3 className="font-bold text-base mb-4 text-blue-700">{title}</h3>
        <div className="flex flex-col gap-3">{children}</div>
        <div className="flex gap-2 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-1.5 text-base rounded border border-gray-300 text-gray-600 hover:bg-gray-50">Hủy</button>
          <button onClick={onSubmit} disabled={loading} className="px-4 py-1.5 text-base rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50">
            {loading ? "Đang lưu..." : "Thêm"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ===== LOADING SPINNER =====
const LoadingSpinner = ({ label = "Đang tải..." }) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
    <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
    <span className="text-base">{label}</span>
  </div>
);

const QuickAddField = ({ label, value, onChange, placeholder, type = "text" }) => (
  <div>
    <label className="text-base text-gray-500">{label}</label>
    {type === "select" ? (
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full border-b border-gray-300 outline-none py-1 text-base mt-1 bg-transparent">
        {placeholder}
      </select>
    ) : type === "textarea" ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={2}
        className="w-full border border-gray-200 rounded outline-none py-1 px-2 text-base mt-1 resize-none" placeholder={placeholder} />
    ) : (
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        className="w-full border-b border-gray-300 outline-none py-1 text-base mt-1" placeholder={placeholder} />
    )}
  </div>
);

const SearchInput = ({
  value,
  onChange,
  options = [],
  placeholder,
  label,
  showAddNew = false,
  onAddNew,
  onOpen,
  loading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (value && options.length > 0) {
      const selectedOpt = options.find((o) => o._id === value);
      if (selectedOpt) setSearchTerm(selectedOpt.nameDisplay || "");
    } else if (!value) {
      setSearchTerm("");
    }
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Mở dropdown + gọi callback để component cha lazy-fetch dữ liệu khi cần
  const openDropdown = () => {
    setIsOpen(true);
    if (onOpen) onOpen();
  };

  const filteredOptions = options.filter((opt) =>
    (opt?.nameDisplay || "")
      .toLowerCase()
      .includes((searchTerm || "").toLowerCase())
  );

  const avatarChar = searchTerm ? searchTerm.charAt(0).toUpperCase() : "?";

  return (
    <div className="flex items-center gap-3 relative" ref={wrapperRef}>
      <div className="w-8 h-8 rounded-full bg-gray-300 text-white flex items-center justify-center font-bold text-base shrink-0 uppercase">
        {avatarChar}
      </div>
      <div className="flex-1 relative">
        {label && (
          <label className="text-[11px] text-gray-500 absolute -top-3 left-0">
            {label}
          </label>
        )}
        <input
          type="text"
          className="w-full border-b border-gray-300 outline-none pb-1 text-base bg-transparent focus:border-blue-500"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            openDropdown();
            if (value) onChange("");
          }}
          onFocus={openDropdown}
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm("");
              onChange("");
            }}
            className="absolute right-0 top-0 text-gray-400 hover:text-gray-600 font-bold"
          >
            &times;
          </button>
        )}
        {isOpen && (
          <div className="absolute top-full left-0 w-full mt-1 bg-white border shadow-lg rounded z-[100] max-h-60 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-2 text-base text-gray-500 italic">
                Đang tải...
              </div>
            ) : filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt._id}
                  className="px-3 py-2 text-base hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    setSearchTerm(opt.nameDisplay);
                    onChange(opt._id);
                    setIsOpen(false);
                  }}
                >
                  {opt.nameDisplay}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-base text-gray-500 italic">
                Không tìm thấy kết quả
              </div>
            )}
            {showAddNew && (
              <div
                onClick={() => {
                  setIsOpen(false);
                  if (onAddNew) onAddNew(searchTerm);
                }}
                className="px-3 py-2 border-t text-green-600 font-medium hover:bg-gray-50 cursor-pointer flex items-center gap-2"
              >
                <span>+</span> Thêm mới
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Convert Date to local datetime string for date/time inputs (YYYY-MM-DDTHH:mm)
const toLocalDT = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const DonHangForm = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  // Current user for nhật ký
  const { user } = useSelector((state) => state.auth);
  const nguoiThuc = user?.HoTenNV || "Điều Phối";
  const canEditDeliveryTime = !isEditMode || hasExplicitPermission(user, ORDER_DELIVERY_TIME_PERMISSION);

  const [nhaKhoasList, setNhaKhoasList] = useState([]);
  const [allBacSi, setAllBacSi] = useState([]);
  const [allBenhNhan, setAllBenhNhan] = useState([]);
  const [sanPhamList, setSanPhamList] = useState([]);
  const [selectedNhaKhoaInfo, setSelectedNhaKhoaInfo] = useState(null);

  // Cờ đánh dấu đã fetch xong / đang fetch dữ liệu lớn (nha khoa, bác sĩ, bệnh nhân)
  // để chỉ fetch 1 lần khi người dùng thực sự mở dropdown, không fetch ngay khi vào trang
  const [nhaKhoaLoaded, setNhaKhoaLoaded] = useState(false);
  const [bacSiLoaded, setBacSiLoaded] = useState(false);
  const [benhNhanLoaded, setBenhNhanLoaded] = useState(false);
  const [loadingNhaKhoa, setLoadingNhaKhoa] = useState(false);
  const [loadingBacSi, setLoadingBacSi] = useState(false);
  const [loadingBenhNhan, setLoadingBenhNhan] = useState(false);

  // Quick-add modal states
  const [yeuCauThuModal, setYeuCauThuModal] = useState({ open: false, spIndex: null });
  const [quickAddNhaKhoa, setQuickAddNhaKhoa] = useState({ open: false, loading: false, form: { hoVaTen: "", tenGiaoDich: "", soDienThoai: "", email: "", website: "", diaChiCuThe: "", tinh: "", moTa: "" } });
  const [quickAddBacSi, setQuickAddBacSi] = useState({ open: false, loading: false, form: { hoVaTen: "", email: "", soDienThoai: "", tieuDe: "", moTa: "" } });
  const [quickAddBenhNhan, setQuickAddBenhNhan] = useState({ open: false, loading: false, form: { hoVaTen: "", soHoSo: "", gioiTinh: "", tinh: "", quanHuyen: "" } });

  const [isViewOnly, setIsViewOnly] = useState(false);
  // Khi ở chế độ sửa đơn, trang cần gọi API lấy dữ liệu đơn hàng trước khi hiển thị form
  const [isPageLoading, setIsPageLoading] = useState(isEditMode);
  const [isDirty, setIsDirty] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const markDirty = () => { if (!isViewOnly) setIsDirty(true); };

  const [isViTriModalOpen, setIsViTriModalOpen] = useState(false);
  const [editingSpIndex, setEditingSpIndex] = useState(null);
  const [isSanPhamModalOpen, setIsSanPhamModalOpen] = useState(false);
  const [sanPhamModalIndex, setSanPhamModalIndex] = useState(null);
  const [quickAddSanPhamName, setQuickAddSanPhamName] = useState("");
  const [viTriHamModal, setViTriHamModal] = useState({ open: false, index: null });
  const [donHangGocView, setDonHangGocView] = useState(null); // { _id } để xem detail panel đơn gốc

  // <-- THÊM MỚI: State quản lý Modal Chọn Đơn Cũ
  const [modalDonHangCuInfo, setModalDonHangCuInfo] = useState({
    isOpen: false,
    index: null,
    loaiDon: "",
  });

  // State cho Modal Phiếu Bảo Hành
  const [isPhieuBaoHanhModalOpen, setIsPhieuBaoHanhModalOpen] = useState(false);
  const [phieuBaoHanhList, setPhieuBaoHanhList] = useState([]);
  const [openPrintWarranty, setOpenPrintWarranty] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState(null);
  const [isAddTodoOpen, setIsAddTodoOpen] = useState(false);
  const [tempGhiChuIds, setTempGhiChuIds] = useState([]);

  // Date picker anchor elements
  const [ngayNhanAnchor, setNgayNhanAnchor] = useState(null);
  const [yeuCauHoanThanhAnchor, setYeuCauHoanThanhAnchor] = useState(null);
  const [henGiaoAnchor, setHenGiaoAnchor] = useState(null);

  // Hẹn giao gốc khi tải đơn – dùng để phát hiện dời ngày hẹn về sau
  const originalHenGiaoRef = useRef("");
  const [lyDoHenLaiModal, setLyDoHenLaiModal] = useState({ open: false, value: "" });

  const [formData, setFormData] = useState({
    nhaKhoa: "",
    bacSi: "",
    benhNhan: "",
    ngayNhan: toLocalDT(new Date()),
    yeuCauHoanThanh: (() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return toLocalDT(tomorrow);
    })(),
    henGiao: (() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return toLocalDT(tomorrow);
    })(),
    danhSachSanPham: [
      {
        loaiDon: "Mới",
        sanPham: "",
        viTri: [],
        viTriText: "",
        soLuong: 0,
        mau: "",
        ghiChu: "",
        donGia: null,
        yeuCauThu: [],
      },
    ],
    danhSachPhuKien: [],
    chiDinhBacSi: "",
    ghiChuChung: "",
    ghiChuTaiChinh: "",
    ghiChuSanXuat: "",
  });

  const fetchSanPhamData = async () => {
    try {
      const res = await api.get("/sanpham");
      setSanPhamList(
        (res.data.data || res.data || []).map((sp) => ({
          ...sp,
          nameDisplay: sp.tenSanPham,
        }))
      );
    } catch (err) {
      console.log(err);
    }
  };

  // Gộp danh sách cũ + danh sách mới fetch về, loại trùng theo _id
  // (dùng để giữ lại các bản ghi đã "seed" tạm từ dữ liệu populate khi sửa đơn)
  const mergeById = (prev, incoming) => {
    const map = new Map(prev.map((x) => [x._id, x]));
    incoming.forEach((item) => map.set(item._id, item));
    return Array.from(map.values());
  };

  // ===== LAZY FETCH: chỉ gọi API khi người dùng thực sự mở dropdown =====
  const fetchNhaKhoaData = async () => {
    if (nhaKhoaLoaded || loadingNhaKhoa) return;
    setLoadingNhaKhoa(true);
    try {
      const res = await api.get("/nhakhoa");
      const list = (res.data.data || res.data || []).map((nk) => ({
        ...nk,
        nameDisplay: nk.tenGiaoDich || nk.hoVaTen,
      }));
      setNhaKhoasList((prev) => mergeById(prev, list));
      setNhaKhoaLoaded(true);
    } catch (err) {
      console.error("Lỗi tải nha khoa:", err);
      toast.error("Không thể tải danh sách nha khoa");
    } finally {
      setLoadingNhaKhoa(false);
    }
  };

  const fetchBacSiData = async () => {
    if (bacSiLoaded || loadingBacSi) return;
    setLoadingBacSi(true);
    try {
      const res = await api.get("/nguoilienhe");
      const list = (res.data.data || res.data || []).map((bs) => ({
        ...bs,
        nameDisplay: bs.hoVaTen,
      }));
      setAllBacSi((prev) => mergeById(prev, list));
      setBacSiLoaded(true);
    } catch (err) {
      console.error("Lỗi tải bác sĩ:", err);
      toast.error("Không thể tải danh sách bác sĩ");
    } finally {
      setLoadingBacSi(false);
    }
  };

  const fetchBenhNhanData = async () => {
    if (benhNhanLoaded || loadingBenhNhan) return;
    setLoadingBenhNhan(true);
    try {
      const res = await api.get("/benhnhan");
      const list = (res.data.data || res.data || []).map((bn) => ({
        ...bn,
        nameDisplay: bn.hoVaTen,
      }));
      setAllBenhNhan((prev) => mergeById(prev, list));
      setBenhNhanLoaded(true);
    } catch (err) {
      console.error("Lỗi tải bệnh nhân:", err);
      toast.error("Không thể tải danh sách bệnh nhân");
    } finally {
      setLoadingBenhNhan(false);
    }
  };

  useEffect(() => {
    fetchSanPhamData();
  }, []);

  const bacSiList = formData.nhaKhoa
    ? allBacSi.filter(
      (bs) => (bs.nhaKhoa?._id || bs.nhaKhoa) === formData.nhaKhoa
    )
    : [];
  const benhNhanList = formData.nhaKhoa
    ? allBenhNhan.filter(
      (bn) => (bn.nhaKhoa?._id || bn.nhaKhoa) === formData.nhaKhoa
    )
    : [];

  useEffect(() => {
    if (isEditMode) {
      api
        .get(`/donhang/${id}`)
        .then((res) => {
          const dh = res.data.data;
          if (dh.trangThai === "Đã giao" || dh.daXuatHoaDon) {
            setIsViewOnly(true);
          }

          // Seed tạm nha khoa/bác sĩ/bệnh nhân đang chọn từ dữ liệu populate sẵn có
          // của đơn hàng, để hiển thị đúng tên mà KHÔNG cần fetch cả danh sách lớn.
          // Danh sách đầy đủ (để tìm kiếm/đổi lựa chọn) vẫn sẽ chỉ fetch khi mở dropdown.
          if (dh.nhaKhoa && typeof dh.nhaKhoa === "object") {
            setNhaKhoasList((prev) =>
              mergeById(prev, [
                { ...dh.nhaKhoa, nameDisplay: dh.nhaKhoa.tenGiaoDich || dh.nhaKhoa.hoVaTen },
              ])
            );
          }
          if (dh.bacSi && typeof dh.bacSi === "object") {
            const nhaKhoaId = dh.nhaKhoa?._id || dh.nhaKhoa;
            setAllBacSi((prev) =>
              mergeById(prev, [
                {
                  ...dh.bacSi,
                  nhaKhoa: dh.bacSi.nhaKhoa ?? nhaKhoaId,
                  nameDisplay: dh.bacSi.hoVaTen,
                },
              ])
            );
          }
          if (dh.benhNhan && typeof dh.benhNhan === "object") {
            const nhaKhoaId = dh.nhaKhoa?._id || dh.nhaKhoa;
            setAllBenhNhan((prev) =>
              mergeById(prev, [
                {
                  ...dh.benhNhan,
                  nhaKhoa: dh.benhNhan.nhaKhoa ?? nhaKhoaId,
                  nameDisplay: dh.benhNhan.hoVaTen,
                },
              ])
            );
          }

          originalHenGiaoRef.current = dh.henGiao ? toLocalDT(dh.henGiao) : "";
          setFormData({
            ...dh,
            nhaKhoa: dh.nhaKhoa?._id || dh.nhaKhoa,
            bacSi: dh.bacSi?._id || dh.bacSi,
            benhNhan: dh.benhNhan?._id || dh.benhNhan,
            ngayNhan: dh.ngayNhan ? toLocalDT(dh.ngayNhan) : "",
            yeuCauHoanThanh: dh.yeuCauHoanThanh ? toLocalDT(dh.yeuCauHoanThanh) : "",
            henGiao: dh.henGiao ? toLocalDT(dh.henGiao) : "",
            danhSachSanPham: (dh.danhSachSanPham || []).map((sp) => ({
              ...sp,
              sanPham: sp.sanPham?._id || sp.sanPham || "",
              donHangCu: sp.donHangCu?._id || sp.donHangCu || null,
              yeuCauThu: sp.yeuCauThu || [],
              viTriText: sp.viTriText || "",
            })),
          });
        })
        .catch(() => toast.error("Không thể tải thông tin đơn hàng"))
        .finally(() => setIsPageLoading(false));
    }
  }, [id, isEditMode]);

  // Fetch phiếu bảo hành
  useEffect(() => {
    if (isEditMode && id) {
      api
        .get(`/phieu-bao-hanh/don-hang/${id}`)
        .then((res) => {
          const warranty = res.data?.data || res.data;
          // Convert single warranty to array
          const warrantyArray = warranty ? (Array.isArray(warranty) ? warranty : [warranty]) : [];
          setPhieuBaoHanhList(warrantyArray);
        })
        .catch((err) => {
          console.error("Lỗi fetch phiếu bảo hành:", err);
          setPhieuBaoHanhList([]);
        });
    }
  }, [id, isEditMode]);

  useEffect(() => {
    if (formData.nhaKhoa) {
      setSelectedNhaKhoaInfo(
        nhaKhoasList.find((nk) => nk._id === formData.nhaKhoa)
      );
    } else {
      setSelectedNhaKhoaInfo(null);
    }
  }, [formData.nhaKhoa, nhaKhoasList]);

  // Keyboard shortcuts: F3 = Save, F4 = Print
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "F3") {
        e.preventDefault();
        if (!isViewOnly && !lyDoHenLaiOpenRef.current) handleSaveRef.current();
      } else if (e.key === "F4" && isEditMode) {
        e.preventDefault();
        navigate(`/donhang/${id}/print`);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditMode, id]);

  const handleInputChange = (e) => {
    markDirty();
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ===== QUICK-ADD HANDLERS =====
  const handleQuickAddNhaKhoa = async () => {
    const { form } = quickAddNhaKhoa;
    if (!form.hoVaTen && !form.tenGiaoDich) { toast.error("Vui lòng nhập tên nha khoa"); return; }
    setQuickAddNhaKhoa(s => ({ ...s, loading: true }));
    try {
      const res = await api.post("/nhakhoa", form);
      const newItem = { ...(res.data?.data || res.data), nameDisplay: (res.data?.data || res.data).tenGiaoDich || (res.data?.data || res.data).hoVaTen };
      setNhaKhoasList(prev => [...prev, newItem]);
      setFormData(f => ({ ...f, nhaKhoa: newItem._id, bacSi: "", benhNhan: "" }));
      setQuickAddNhaKhoa({ open: false, loading: false, form: { hoVaTen: "", tenGiaoDich: "", soDienThoai: "", email: "", website: "", diaChiCuThe: "", tinh: "", moTa: "" } });
      toast.success("Đã thêm nha khoa");
    } catch (err) { toast.error(err.response?.data?.message || "Lỗi thêm nha khoa"); setQuickAddNhaKhoa(s => ({ ...s, loading: false })); }
  };

  const handleQuickAddBacSi = async () => {
    const { form } = quickAddBacSi;
    if (!form.hoVaTen) { toast.error("Vui lòng nhập tên bác sĩ"); return; }
    if (!formData.nhaKhoa) { toast.error("Vui lòng chọn nha khoa trước"); return; }
    setQuickAddBacSi(s => ({ ...s, loading: true }));
    try {
      const res = await api.post("/nguoilienhe", { ...form, nhaKhoa: formData.nhaKhoa });
      const newItem = { ...(res.data?.data || res.data), nameDisplay: (res.data?.data || res.data).hoVaTen };
      setAllBacSi(prev => [...prev, newItem]);
      setFormData(f => ({ ...f, bacSi: newItem._id }));
      setQuickAddBacSi({ open: false, loading: false, form: { hoVaTen: "", email: "", soDienThoai: "", tieuDe: "", moTa: "" } });
      toast.success("Đã thêm bác sĩ");
    } catch (err) { toast.error(err.response?.data?.message || "Lỗi thêm bác sĩ"); setQuickAddBacSi(s => ({ ...s, loading: false })); }
  };

  const handleQuickAddBenhNhan = async () => {
    const { form } = quickAddBenhNhan;
    if (!form.hoVaTen) { toast.error("Vui lòng nhập tên bệnh nhân"); return; }
    if (!formData.nhaKhoa) { toast.error("Vui lòng chọn nha khoa trước"); return; }
    setQuickAddBenhNhan(s => ({ ...s, loading: true }));
    try {
      const res = await api.post("/benhnhan", { ...form, nhaKhoa: formData.nhaKhoa });
      const newItem = { ...(res.data?.data || res.data), nameDisplay: (res.data?.data || res.data).hoVaTen };
      setAllBenhNhan(prev => [...prev, newItem]);
      setFormData(f => ({ ...f, benhNhan: newItem._id }));
      setQuickAddBenhNhan({ open: false, loading: false, form: { hoVaTen: "", soHoSo: "", gioiTinh: "", tinh: "", quanHuyen: "" } });
      toast.success("Đã thêm bệnh nhân");
    } catch (err) { toast.error(err.response?.data?.message || "Lỗi thêm bệnh nhân"); setQuickAddBenhNhan(s => ({ ...s, loading: false })); }
  };

  // <-- THÊM MỚI: Xử lý bật Modal khi chọn Hàng sửa/Làm lại
  const handleSanPhamChange = (index, field, value) => {
    // SearchInput gọi onChange("") khi người dùng bấm nút x hoặc bắt đầu gõ lại để tìm sản phẩm khác
    // (chỉ là thao tác xoá tạm ô tìm kiếm, chưa phải chọn sản phẩm mới) -> bỏ qua, không đụng tới formData,
    // để tránh xoá mất vị trí/số lượng/... trước khi người dùng thực sự chọn xong sản phẩm B.
    if (field === "sanPham" && !value) return;

    markDirty();
    const newDsSp = [...formData.danhSachSanPham];
    const oldRow = newDsSp[index]; // giữ lại dòng cũ để so sánh loaiTinh trước khi ghi đè
    // FIX: Clone object con để tránh mutate state trực tiếp
    newDsSp[index] = { ...oldRow, [field]: value };

    // Khi thực sự chọn 1 sản phẩm mới → chỉ reset các trường phụ thuộc nếu loaiTinh thay đổi.
    // Nếu sản phẩm mới cùng loaiTinh với sản phẩm cũ, giữ nguyên vị trí/số lượng/màu/ghi chú/yêu cầu thử.
    if (field === "sanPham") {
      const oldLoaiTinh = getLoaiTinh(oldRow.sanPham);
      const newLoaiTinh = getLoaiTinh(value);
      const sameLoaiTinh = Boolean(oldRow.sanPham) && oldLoaiTinh != null && oldLoaiTinh === newLoaiTinh
        && isMuaGium(oldRow.sanPham) === isMuaGium(value);

      if (!sameLoaiTinh) {
        newDsSp[index].viTri = [];
        newDsSp[index].viTriText = "";
        newDsSp[index].soLuong = 1;
        newDsSp[index].mau = "";
        newDsSp[index].ghiChu = "";
        newDsSp[index].yeuCauThu = [];
        newDsSp[index].donGia = null;
      }
      // else: cùng loaiTinh → giữ nguyên toàn bộ các trường khác
    }

    // Nếu đổi loại đơn sang Sửa/Bảo hành/Làm lại
    if (field === "loaiDon" && ["Hàng sửa", "Hàng làm lại", "Hàng bảo hành"].includes(value)) {
      if (!formData.benhNhan) {
        toast.error("Vui lòng chọn Bệnh nhân ở cột trái trước để hệ thống tìm đơn hàng cũ!");
        // Tự động trả UI về "Mới" một cách an toàn
        newDsSp[index].loaiDon = "Mới";
        setFormData({ ...formData, danhSachSanPham: newDsSp });
        return;
      }

      // Nếu đã có bệnh nhân -> Cập nhật state và bật Modal
      setFormData({ ...formData, danhSachSanPham: newDsSp });
      setModalDonHangCuInfo({ isOpen: true, index: index, loaiDon: value });
      return;
    }

    // Trường hợp cập nhật các field khác (sanPham, soLuong, mau, ghiChu...)
    setFormData({ ...formData, danhSachSanPham: newDsSp });
  };

  // <-- THÊM MỚI: Đắp dữ liệu từ đơn cũ sang dòng hiện tại
  const handleApplyOldOrder = (oldOrder) => {
    markDirty();
    const index = modalDonHangCuInfo.index;
    const newDsSp = [...formData.danhSachSanPham];
    const spCu = oldOrder.danhSachSanPham || [];

    // Lỡ đơn cũ lỗi không có sản phẩm nào thì đóng Modal luôn
    if (spCu.length === 0) {
      setModalDonHangCuInfo({ isOpen: false, index: null, loaiDon: "" });
      return;
    }

    // Map toàn bộ sản phẩm của đơn cũ thành mảng các dòng mới
    const mappedProducts = spCu.map(sp => ({
      loaiDon: modalDonHangCuInfo.loaiDon, // 🔥 ÉP CỨNG loại đơn (Sửa/Bảo hành/Làm lại) cho TẤT CẢ
      donHangCu: oldOrder._id,             // Map ID đơn hàng gốc cho TẤT CẢ
      sanPham: sp.sanPham?._id || sp.sanPham || "",
      viTri: sp.viTri || [],
      viTriText: sp.viTriText || "",
      soLuong: sp.soLuong || 1,
      mau: sp.mau || "",
      ghiChu: sp.ghiChu || "",
      donGia: sp.donGia ?? null,
    }));

    // XÓA dòng hiện tại (nơi user vừa bấm mở Modal) 
    // VÀ CHÈN toàn bộ mảng sản phẩm vừa map được vào đúng vị trí đó
    newDsSp.splice(index, 1, ...mappedProducts);

    setFormData({
      ...formData,
      danhSachSanPham: newDsSp,
      // Tự động copy ghi chú từ đơn gốc nếu hiện tại đang trống
      chiDinhBacSi: formData.chiDinhBacSi || oldOrder.chiDinhBacSi || "",
      ghiChuChung: formData.ghiChuChung || oldOrder.ghiChuChung || "",
      ghiChuTaiChinh: formData.ghiChuTaiChinh || oldOrder.ghiChuTaiChinh || "",
      ghiChuSanXuat: formData.ghiChuSanXuat || oldOrder.ghiChuSanXuat || "",
    });
    setModalDonHangCuInfo({ isOpen: false, index: null, loaiDon: "" });
  };

  const handleRemoveSanPham = (index) => {
    markDirty();
    const newDsSp = [...formData.danhSachSanPham];
    newDsSp.splice(index, 1);
    setFormData({ ...formData, danhSachSanPham: newDsSp });
  };

  const handleClose = () => {
    if (isDirty && !isViewOnly) {
      setShowExitWarning(true);
    } else {
      navigate(-1);
    }
  };

  const handleViewDonHangGoc = async (donHangCuId) => {
    const id = typeof donHangCuId === 'object' ? donHangCuId._id : donHangCuId;
    if (!id) return;
    try {
      const res = await api.get(`/donhang/${id}`);
      setDonHangGocView(res.data?.data || res.data);
    } catch {
      toast.error("Không thể tải đơn hàng gốc");
    }
  };

  const handleDateChange = (field, date, time) => {
    if (field === "henGiao" && !canEditDeliveryTime) return;
    markDirty();
    if (!date) { setFormData(f => ({ ...f, [field]: "" })); return; }
    setFormData(f => ({ ...f, [field]: `${date}T${time || "00:00"}` }));
  };

  const handleSaveViTri = (dataViTri) => {
    markDirty();
    const newDsSp = [...formData.danhSachSanPham];
    newDsSp[editingSpIndex] = { ...newDsSp[editingSpIndex], viTri: dataViTri };

    const loaiTinh = getLoaiTinh(newDsSp[editingSpIndex].sanPham);
    if (loaiTinh !== "Răng (không đếm)") {
      let totalTeeth = 0;
      dataViTri.forEach((item) => { totalTeeth += item.soRang.length; });
      if (totalTeeth > 32) totalTeeth = 32;
      if (totalTeeth === 0) totalTeeth = 1;
      newDsSp[editingSpIndex].soLuong = totalTeeth;
    }

    setFormData({ ...formData, danhSachSanPham: newDsSp });
    setIsViTriModalOpen(false);
  };

  const handleSave = () => {
    if (isSubmitting) return;
    const errors = [];

    if (!formData.nhaKhoa) errors.push("Chưa chọn Nha Khoa");
    if (!formData.benhNhan) errors.push("Chưa chọn Bệnh Nhân");

    if (!formData.ngayNhan) {
      errors.push("Chưa nhập Ngày nhận");
    }
    if (!formData.henGiao) {
      errors.push("Chưa nhập Hẹn giao");
    } else if (formData.ngayNhan && new Date(formData.henGiao) < new Date(formData.ngayNhan)) {
      errors.push("Hẹn giao không được trước Ngày nhận");
    }
    if (
      formData.yeuCauHoanThanh &&
      formData.ngayNhan &&
      new Date(formData.yeuCauHoanThanh) < new Date(formData.ngayNhan)
    ) {
      errors.push("Y/c hoàn thành không được trước Ngày nhận");
    }
    if (
      formData.yeuCauHoanThanh &&
      formData.henGiao &&
      new Date(formData.henGiao) < new Date(formData.yeuCauHoanThanh)
    ) {
      errors.push("Hẹn giao không được trước Y/c hoàn thành");
    }

    if (formData.danhSachSanPham.length === 0) {
      errors.push("Chưa có sản phẩm nào trong đơn hàng");
    } else {
      formData.danhSachSanPham.forEach((sp, i) => {
        if (!sp.sanPham) errors.push(`Dòng ${i + 1}: Chưa chọn sản phẩm`);
        else if (isMuaGium(sp.sanPham)) {
          if (!(sp.ghiChu || "").trim()) errors.push(`Dòng ${i + 1}: Mua giùm nha khoa — nhập tên món hàng ở ô Ghi chú`);
          if (sp.donGia === null || sp.donGia === undefined || sp.donGia === "") errors.push(`Dòng ${i + 1}: Mua giùm nha khoa — chưa nhập đơn giá`);
        }
      });
    }

    if (errors.length > 0) {
      toast.error(errors[0], { duration: 4000 });
      return;
    }

    // Sửa đơn: dời ngày Hẹn giao về sau (so theo phần ngày) → bắt buộc nhập lý do
    const oldHenGiaoDate = (originalHenGiaoRef.current || "").split("T")[0];
    const newHenGiaoDate = (formData.henGiao || "").split("T")[0];
    if (isEditMode && oldHenGiaoDate && newHenGiaoDate > oldHenGiaoDate) {
      setLyDoHenLaiModal({ open: true, value: formData.lyDoHenLai || "" });
      return;
    }

    submitDonHang();
  };

  const handleConfirmLyDoHenLai = () => {
    const lyDo = lyDoHenLaiModal.value.trim();
    if (!lyDo) {
      toast.error("Vui lòng nhập lý do hẹn lại");
      return;
    }
    setLyDoHenLaiModal({ open: false, value: "" });
    submitDonHang({ lyDoHenLai: lyDo });
  };

  const submitDonHang = (extraData = {}) => {
    if (isSubmitting) return;
    // Convert date strings to ISO format for backend; strip read-only nhật ký from payload
    const { nhatKyChinhSua: _nk, ...formBase } = formData;
    const dataToSend = {
      ...formBase,
      ...extraData,
      // Strip empty ObjectId fields to avoid Mongoose cast errors
      bacSi: formData.bacSi || undefined,
      ngayNhan: formData.ngayNhan ? new Date(formData.ngayNhan).toISOString() : null,
      yeuCauHoanThanh: formData.yeuCauHoanThanh ? new Date(formData.yeuCauHoanThanh).toISOString() : null,
      henGiao: formData.henGiao ? new Date(formData.henGiao).toISOString() : null,
      // Nhật ký: create adds initial entry; update appends a new entry
      ...(isEditMode
        ? { nhatKyLogEntry: { nguoiThuc: nguoiThuc, hanhDong: "Chỉnh sửa đơn hàng" } }
        : { nguoiThucDuyet: nguoiThuc }),
      ...(!isEditMode && tempGhiChuIds.length > 0 ? { ghiChuIds: tempGhiChuIds } : {}),
    };

    setIsSubmitting(true);
    const action = isEditMode
      ? updateDonHang({ id, data: dataToSend })
      : createDonHang(dataToSend);
    const promise = dispatch(action).unwrap();
    toast.promise(promise, {
      loading: isEditMode ? "Đang lưu thay đổi..." : "Đang tạo đơn hàng...",
      success: (result) =>
        isEditMode
          ? `Cập nhật đơn hàng thành công!`
          : `Tạo đơn hàng thành công! Mã: ${result?.maDonHang || ""}`,
      error: (err) =>
        typeof err === "string"
          ? err
          : isEditMode
            ? "Cập nhật thất bại"
            : "Tạo đơn hàng thất bại",
    });
    promise.then((result) => {
      if (!isEditMode && result?._id) {
        navigate(`/donhang/${result._id}/print`, { replace: true });
      } else {
        navigate(-1);
      }
    }).catch(() => { }).finally(() => { setIsSubmitting(false); });
  };

  const handleSaveRef = useRef(null);
  handleSaveRef.current = handleSave;
  const lyDoHenLaiOpenRef = useRef(false);
  lyDoHenLaiOpenRef.current = lyDoHenLaiModal.open;

  const getLoaiTinh = (sanPhamId) => {
    if (!sanPhamId) return null;
    const sp = sanPhamList.find((s) => s._id === sanPhamId);
    return sp?.loaiTinh || null;
  };

  // Sản phẩm đại diện "Mua giùm nha khoa": nhập tay đơn giá, ghi chú = tên món hàng
  const isMuaGium = (sanPhamId) => {
    if (!sanPhamId) return false;
    const sp = sanPhamList.find((s) => s._id === sanPhamId);
    return sp?.nhomSanPham === NHOM_MUA_GIUM;
  };

  const formatDonGiaInput = (value) =>
    value === null || value === undefined || value === "" ? "" : Number(value).toLocaleString("vi-VN");

  const parseDonGiaInput = (raw) => {
    const digits = String(raw || "").replace(/\D/g, "");
    return digits === "" ? null : Number(digits);
  };

  const renderViTriText = (spRow) => {
    if (spRow?.viTriText) return spRow.viTriText;
    const viTriArr = spRow?.viTri;
    if (!viTriArr || viTriArr.length === 0) return "";
    return viTriArr
      .map((v) =>
        v.kieu === "Rời"
          ? v.soRang.join(", ")
          : `${v.soRang[0]}->${v.soRang[v.soRang.length - 1]}`
      )
      .join("; ");
  };
  // Filter only valid warranties for print button
  const validWarranties = (phieuBaoHanhList || []).filter(
    (pbh) => pbh && pbh.danhSachBaoHanh && Array.isArray(pbh.danhSachBaoHanh) && pbh.danhSachBaoHanh.length > 0
  );
  return (
    <div className="fixed inset-0 z-[1299] bg-white flex flex-col w-full h-full overflow-hidden">
      {/* Top bar */}
      <div className="h-10 bg-[#00a8ff] flex justify-between items-center px-4 shrink-0">
        <span className="text-white font-medium text-base flex items-center gap-2">
          {isViewOnly ? "Xem đơn hàng (chỉ đọc)" : isEditMode ? "Chỉnh sửa đơn hàng" : "Tạo đơn hàng mới"}
          {formData.maDonHang && (
            <span className="bg-white/20 text-white text-base font-bold px-2 py-0.5 rounded">
              {formData.maDonHang}
            </span>
          )}
        </span>
        <button
          onClick={handleClose}
          className="text-white text-2xl font-bold leading-none hover:text-gray-200 transition"
        >
          &times;
        </button>
      </div>

      {/* Body: main form */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {isPageLoading ? (
          <LoadingSpinner label="Đang tải thông tin đơn hàng..." />
        ) : (
          <>
            {/* Main form (scrollable) */}
            <div className="flex-1 overflow-y-auto pb-4">
              <div className="w-full flex flex-col">
                {/* Section 1: Customer info + clinic info + dates */}
                <div className="flex flex-col sm:flex-row gap-0 w-full border-b border-gray-200">
                  <div className="w-full sm:w-[30%] p-4 flex flex-col gap-6 border-b sm:border-b-0">
                    <SearchInput
                      label="Nha khoa"
                      options={nhaKhoasList}
                      value={formData.nhaKhoa}
                      onChange={(val) => {
                        setFormData({
                          ...formData,
                          nhaKhoa: val,
                          bacSi: "",
                          benhNhan: "",
                        });
                      }}
                      showAddNew={true}
                      onAddNew={(term) => setQuickAddNhaKhoa(s => ({ ...s, open: true, form: { ...s.form, hoVaTen: term || "" } }))}
                      onOpen={fetchNhaKhoaData}
                      loading={loadingNhaKhoa}
                    />
                    <SearchInput
                      label="Bác sĩ"
                      options={bacSiList}
                      value={formData.bacSi}
                      onChange={(val) => setFormData({ ...formData, bacSi: val })}
                      showAddNew={true}
                      onAddNew={(term) => setQuickAddBacSi(s => ({ ...s, open: true, form: { ...s.form, hoVaTen: term || "" } }))}
                      onOpen={fetchBacSiData}
                      loading={loadingBacSi}
                    />
                    <SearchInput
                      label="Bệnh nhân"
                      options={benhNhanList}
                      value={formData.benhNhan}
                      onChange={(val) =>
                        setFormData({ ...formData, benhNhan: val })
                      }
                      showAddNew={true}
                      onAddNew={(term) => setQuickAddBenhNhan(s => ({ ...s, open: true, form: { ...s.form, hoVaTen: term || "" } }))}
                      onOpen={fetchBenhNhanData}
                      loading={loadingBenhNhan}
                    />
                  </div>
                  <div className="w-full sm:w-[40%] p-4 flex flex-col gap-2">
                    <div className="bg-[#d7f3ff] w-full h-full p-3 rounded-xl">
                      <div>
                        <span className="text-gray-600">Tên nha khoa:</span>
                        <span className="font-bold text-gray-800 ml-1">
                          {selectedNhaKhoaInfo?.nameDisplay || ""}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Địa chỉ:</span>
                        <span className="font-bold text-gray-800 ml-1">
                          {selectedNhaKhoaInfo?.diaChiCuThe || ""}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Điện thoại:</span>
                        <span className="font-bold text-gray-800 ml-1">
                          {selectedNhaKhoaInfo?.soDienThoai || ""}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Mô tả:</span>
                        <span className="font-bold text-gray-800 ml-1">
                          {selectedNhaKhoaInfo?.moTa || ""}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full sm:w-[30%] p-4 flex flex-col gap-4 border-t sm:border-t-0">
                    {/* Ngày nhận */}
                    <div className="flex items-center gap-2">
                      <label className="text-gray-500 inline-block w-32">Ngày nhận:</label>
                      <button
                        type="button"
                        onClick={(e) => setNgayNhanAnchor(e.currentTarget)}
                        className="border-b border-gray-400 px-1 py-1 min-w-[90px] text-left hover:border-blue-500 transition-colors"
                      >
                        {formData.ngayNhan?.split("T")[0]
                          ? dayjs(formData.ngayNhan.split("T")[0]).format("DD/MM/YYYY")
                          : "--/--/----"}
                      </button>
                      <CustomDateRangePicker
                        open={Boolean(ngayNhanAnchor)}
                        anchorEl={ngayNhanAnchor}
                        onClose={() => setNgayNhanAnchor(null)}
                        initialDates={{ start: formData.ngayNhan?.split("T")[0] || "", end: "" }}
                        onApply={(dates) => {
                          if (dates.start) handleDateChange("ngayNhan", dates.start, formData.ngayNhan?.split("T")[1] || "00:00");
                          setNgayNhanAnchor(null);
                        }}
                      />
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <TimePicker
                          ampm={false}
                          value={formData.ngayNhan?.split("T")[1] ? dayjs(`2000-01-01T${formData.ngayNhan.split("T")[1]}`) : null}
                          onChange={val => handleDateChange("ngayNhan", formData.ngayNhan?.split("T")[0] || "", val ? val.format("HH:mm") : "00:00")}
                          slotProps={{ textField: { size: "small", variant: "standard", inputProps: { style: { fontSize: "0.875rem", width: "6rem" } } } }}
                        />
                      </LocalizationProvider>
                    </div>
                    {/* Y/c hoàn thành */}
                    <div className="flex items-center gap-2">
                      <label className="text-gray-500 inline-block w-32">Y/c hoàn thành:</label>
                      <button
                        type="button"
                        onClick={(e) => setYeuCauHoanThanhAnchor(e.currentTarget)}
                        className="border-b border-gray-400 px-1 py-1 min-w-[90px] text-left hover:border-blue-500 transition-colors"
                      >
                        {formData.yeuCauHoanThanh?.split("T")[0]
                          ? dayjs(formData.yeuCauHoanThanh.split("T")[0]).format("DD/MM/YYYY")
                          : "--/--/----"}
                      </button>
                      <CustomDateRangePicker
                        open={Boolean(yeuCauHoanThanhAnchor)}
                        anchorEl={yeuCauHoanThanhAnchor}
                        onClose={() => setYeuCauHoanThanhAnchor(null)}
                        initialDates={{ start: formData.yeuCauHoanThanh?.split("T")[0] || "", end: "" }}
                        onApply={(dates) => {
                          if (dates.start) handleDateChange("yeuCauHoanThanh", dates.start, formData.yeuCauHoanThanh?.split("T")[1] || "00:00");
                          setYeuCauHoanThanhAnchor(null);
                        }}
                      />
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <TimePicker
                          ampm={false}
                          value={formData.yeuCauHoanThanh?.split("T")[1] ? dayjs(`2000-01-01T${formData.yeuCauHoanThanh.split("T")[1]}`) : null}
                          onChange={val => handleDateChange("yeuCauHoanThanh", formData.yeuCauHoanThanh?.split("T")[0] || "", val ? val.format("HH:mm") : "00:00")}
                          slotProps={{ textField: { size: "small", variant: "standard", inputProps: { style: { fontSize: "0.875rem", width: "6rem" } } } }}
                        />
                      </LocalizationProvider>
                    </div>
                    {/* Hẹn giao */}
                    <div className="flex items-center gap-2">
                      <label className="text-gray-500 inline-block w-32">Hẹn giao:</label>
                      <button
                        type="button"
                        onClick={(e) => setHenGiaoAnchor(e.currentTarget)}
                        disabled={!canEditDeliveryTime || isViewOnly}
                        className="border-b border-gray-400 px-1 py-1 min-w-[90px] text-left hover:border-blue-500 transition-colors"
                      >
                        {formData.henGiao?.split("T")[0]
                          ? dayjs(formData.henGiao.split("T")[0]).format("DD/MM/YYYY")
                          : "--/--/----"}
                      </button>
                      <CustomDateRangePicker
                        open={Boolean(henGiaoAnchor)}
                        anchorEl={henGiaoAnchor}
                        onClose={() => setHenGiaoAnchor(null)}
                        initialDates={{ start: formData.henGiao?.split("T")[0] || "", end: "" }}
                        onApply={(dates) => {
                          if (dates.start) handleDateChange("henGiao", dates.start, formData.henGiao?.split("T")[1] || "00:00");
                          setHenGiaoAnchor(null);
                        }}
                      />
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <TimePicker
                          ampm={false}
                          disabled={!canEditDeliveryTime || isViewOnly}
                          value={formData.henGiao?.split("T")[1] ? dayjs(`2000-01-01T${formData.henGiao.split("T")[1]}`) : null}
                          onChange={val => handleDateChange("henGiao", formData.henGiao?.split("T")[0] || "", val ? val.format("HH:mm") : "00:00")}
                          slotProps={{ textField: { size: "small", variant: "standard", inputProps: { style: { fontSize: "0.875rem", width: "6rem" } } } }}
                        />
                      </LocalizationProvider>
                    </div>
                  </div>
                </div>

                {/* Section 2: Products table */}
                <div className="w-full bg-white shadow-sm border-t border-b border-gray-200">

                  {/* ── Desktop table (md+) ── */}
                  <div className="hidden md:block">
                    <table className="w-full min-w-[600px] text-base text-left">
                      <thead className="bg-[#f0f9ff] text-gray-600 border-b">
                        <tr>
                          <th className="p-3 w-32 font-medium">Loại</th>
                          <th className="p-3 w-[30%] font-medium">Sản phẩm</th>
                          <th className="p-3 w-52 font-medium">
                            {formData.danhSachSanPham.some((sp) => isMuaGium(sp.sanPham)) ? "Vị trí / Đơn giá" : "Vị trí"}
                          </th>
                          <th className="p-3 w-52 text-center font-medium">
                            Số lượng
                          </th>
                          <th className="p-3 w-52 font-medium">Màu</th>
                          <th className="p-3 font-medium">Ghi chú</th>
                          <th className="p-3 w-32 text-center font-medium">Yêu cầu thử</th>
                          <th className="p-3 w-12 text-center"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.danhSachSanPham.map((sp, index) => (
                          <React.Fragment key={index}>
                            <tr className="border-b bg-[#e1f5fe]">
                              <td className="p-2">
                                <select
                                  value={sp.loaiDon}
                                  onChange={(e) =>
                                    handleSanPhamChange(
                                      index,
                                      "loaiDon",
                                      e.target.value
                                    )
                                  }
                                  className="w-full border-b border-blue-200 p-1 outline-none bg-transparent"
                                >
                                  <option value="Mới">Mới</option>
                                  <option value="Hàng sửa">Hàng sửa</option>
                                  <option value="Hàng làm lại">Hàng làm lại</option>
                                  <option value="Hàng bảo hành">Hàng bảo hành</option>
                                </select>
                                {["Hàng sửa", "Hàng làm lại", "Hàng bảo hành"].includes(sp.loaiDon) && sp.donHangCu && (
                                  <button
                                    type="button"
                                    onClick={() => handleViewDonHangGoc(sp.donHangCu)}
                                    className="text-base text-blue-600 px-3 py-1 underline"
                                  >
                                    Xem đh gốc
                                  </button>
                                )}
                              </td>
                              <td className="p-2 align-top pt-3">
                                <SearchInput
                                  placeholder="Tìm sản phẩm..."
                                  options={sanPhamList}
                                  value={sp.sanPham}
                                  onChange={(val) =>
                                    handleSanPhamChange(index, "sanPham", val)
                                  }
                                  showAddNew={true}
                                  onAddNew={(term) => {
                                    setSanPhamModalIndex(index);
                                    setQuickAddSanPhamName(term || "");
                                    setIsSanPhamModalOpen(true);
                                  }}
                                />
                              </td>
                              <td className="p-2">
                                {(() => {
                                  if (isMuaGium(sp.sanPham)) {
                                    return (
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="text"
                                          inputMode="numeric"
                                          value={formatDonGiaInput(sp.donGia)}
                                          onFocus={(e) => e.target.select()}
                                          onChange={(e) => handleSanPhamChange(index, "donGia", parseDonGiaInput(e.target.value))}
                                          placeholder="Đơn giá..."
                                          className="w-full border-b border-blue-200 p-1 outline-none bg-transparent text-right font-semibold text-gray-700"
                                        />
                                        <span className="text-gray-500">đ</span>
                                      </div>
                                    );
                                  }
                                  const loaiTinh = getLoaiTinh(sp.sanPham);
                                  if (loaiTinh === "Bán hàm" || loaiTinh === "Hàm") {
                                    return (
                                      <div
                                        onClick={() => setViTriHamModal({ open: true, index })}
                                        className="w-full border-b border-blue-200 p-1 bg-transparent cursor-pointer text-blue-600 hover:text-blue-800 min-h-[30px] flex items-center"
                                      >
                                        {sp.viTriText || (
                                          <span className="text-blue-400 italic font-medium">Chọn vị trí...</span>
                                        )}
                                      </div>
                                    );
                                  }
                                  if (loaiTinh === "Khác") {
                                    return (
                                      <input
                                        type="text"
                                        value={sp.viTriText || ""}
                                        onChange={(e) => handleSanPhamChange(index, "viTriText", e.target.value)}
                                        placeholder="Nhập vị trí..."
                                        className="w-full border-b border-blue-200 p-1 outline-none bg-transparent text-base"
                                      />
                                    );
                                  }
                                  return (
                                    <div
                                      onClick={() => {
                                        setEditingSpIndex(index);
                                        setIsViTriModalOpen(true);
                                      }}
                                      className="w-full border-b border-blue-200 p-1 bg-transparent cursor-pointer text-blue-600 hover:text-blue-800 min-h-[30px] flex items-center"
                                    >
                                      {renderViTriText(sp) || (
                                        <span className="text-blue-400 italic font-medium">
                                          Chọn răng...
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={sp.soLuong}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) =>
                                    handleSanPhamChange(index, "soLuong", parseInt(e.target.value))
                                  }
                                  className="w-full border-b border-blue-200 p-1 outline-none bg-transparent text-center font-bold text-gray-700"
                                />
                              </td>
                              <td className="p-2">
                                {isMuaGium(sp.sanPham) ? (
                                  <span className="block text-center text-gray-400">—</span>
                                ) : (
                                  <input
                                    type="text"
                                    value={sp.mau}
                                    onChange={(e) =>
                                      handleSanPhamChange(index, "mau", e.target.value)
                                    }
                                    className="w-full border-b border-blue-200 p-1 outline-none bg-transparent"
                                  />
                                )}
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={sp.ghiChu}
                                  onChange={(e) =>
                                    handleSanPhamChange(index, "ghiChu", e.target.value)
                                  }
                                  placeholder={isMuaGium(sp.sanPham) ? "Tên món hàng (bắt buộc)..." : ""}
                                  className={`w-full border-b p-1 outline-none bg-transparent ${isMuaGium(sp.sanPham) && !(sp.ghiChu || "").trim() ? "border-orange-400" : "border-blue-200"}`}
                                />
                              </td>
                              <td className="p-2 text-center">
                                {isMuaGium(sp.sanPham) ? (
                                  <span className="text-gray-400">—</span>
                                ) : (
                                <button
                                  type="button"
                                  onClick={() => setYeuCauThuModal({ open: true, spIndex: index })}
                                  className={`text-base rounded px-2 py-1 whitespace-nowrap transition font-medium border ${(sp.yeuCauThu || []).length > 0
                                    ? "bg-blue-500 text-white border-blue-500 hover:bg-blue-600"
                                    : "bg-white text-blue-500 border-blue-300 hover:bg-blue-50"
                                    }`}
                                >
                                  {(sp.yeuCauThu || []).length > 0
                                    ? `Yêu cầu thử (${sp.yeuCauThu.length})`
                                    : "Yêu cầu thử"}
                                </button>
                                )}
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  onClick={() => handleRemoveSanPham(index)}
                                  className="text-gray-400 hover:text-red-500 transition"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                    className="w-5 h-5 mx-auto"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                    />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          </React.Fragment>
                        ))}
                        <tr>
                          <td colSpan="8" className="p-0 bg-[#f0f9ff]">
                            <button
                              onClick={() => {
                                markDirty();
                                setFormData({
                                  ...formData,
                                  danhSachSanPham: [
                                    ...formData.danhSachSanPham,
                                    {
                                      loaiDon: "Mới",
                                      sanPham: "",
                                      viTri: [],
                                      viTriText: "",
                                      soLuong: 1,
                                      mau: "",
                                      ghiChu: "",
                                      donGia: null,
                                      yeuCauThu: [],
                                    },
                                  ],
                                });
                              }}
                              className="w-full py-4 px-6 text-green-600 font-bold hover:bg-blue-100 cursor-pointer flex items-center justify-start gap-2 transition"
                            >
                              <span className="text-3xl leading-none font-black">+</span>
                              <span className="text-base mt-1">Thêm sản phẩm</span>
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* ── Mobile card layout (< md) ── */}
                  <div className="block md:hidden">
                    {formData.danhSachSanPham.map((sp, index) => (
                      <div key={index} className="border-b border-blue-100 bg-[#e1f5fe] p-3 space-y-2">
                        {/* Card header */}
                        <div className="flex items-center justify-between">
                          <span className="text-base font-semibold text-blue-700 uppercase tracking-wide">
                            Sản phẩm #{index + 1}
                          </span>
                          <button
                            onClick={() => handleRemoveSanPham(index)}
                            className="text-gray-400 hover:text-red-500 transition"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                              />
                            </svg>
                          </button>
                        </div>

                        {/* Loại */}
                        <div>
                          <label className="block text-base text-gray-500 mb-1">Loại</label>
                          <select
                            value={sp.loaiDon}
                            onChange={(e) => handleSanPhamChange(index, "loaiDon", e.target.value)}
                            className="w-full border border-blue-200 rounded p-2 text-base outline-none bg-white"
                          >
                            <option value="Mới">Mới</option>
                            <option value="Hàng sửa">Hàng sửa</option>
                            <option value="Hàng làm lại">Hàng làm lại</option>
                            <option value="Hàng bảo hành">Hàng bảo hành</option>
                          </select>
                          {["Hàng sửa", "Hàng làm lại", "Hàng bảo hành"].includes(sp.loaiDon) && sp.donHangCu && (
                            <button
                              type="button"
                              onClick={() => handleViewDonHangGoc(sp.donHangCu)}
                              className="text-base text-blue-600 underline mt-1"
                            >
                              Xem đh gốc
                            </button>
                          )}
                        </div>

                        {/* Sản phẩm */}
                        <div>
                          <label className="block text-base text-gray-500 mb-1">Sản phẩm</label>
                          <SearchInput
                            placeholder="Tìm sản phẩm..."
                            options={sanPhamList}
                            value={sp.sanPham}
                            onChange={(val) => handleSanPhamChange(index, "sanPham", val)}
                            showAddNew={true}
                            onAddNew={(term) => {
                              setSanPhamModalIndex(index);
                              setQuickAddSanPhamName(term || "");
                              setIsSanPhamModalOpen(true);
                            }}
                          />
                        </div>

                        {/* Vị trí (hoặc Đơn giá nếu Mua giùm nha khoa) */}
                        <div>
                          <label className="block text-base text-gray-500 mb-1">
                            {isMuaGium(sp.sanPham) ? "Đơn giá" : "Vị trí"}
                          </label>
                          {(() => {
                            if (isMuaGium(sp.sanPham)) {
                              return (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={formatDonGiaInput(sp.donGia)}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => handleSanPhamChange(index, "donGia", parseDonGiaInput(e.target.value))}
                                    placeholder="Nhập đơn giá..."
                                    className="w-full border border-blue-200 rounded p-2 outline-none bg-white text-right font-semibold text-gray-700 text-base"
                                  />
                                  <span className="text-gray-500">đ</span>
                                </div>
                              );
                            }
                            const loaiTinh = getLoaiTinh(sp.sanPham);
                            if (loaiTinh === "Bán hàm" || loaiTinh === "Hàm") {
                              return (
                                <div
                                  onClick={() => setViTriHamModal({ open: true, index })}
                                  className="w-full border border-blue-200 rounded p-2 bg-white cursor-pointer text-blue-600 hover:text-blue-800 min-h-[38px] flex items-center text-base"
                                >
                                  {sp.viTriText || (
                                    <span className="text-blue-400 italic">Chọn vị trí...</span>
                                  )}
                                </div>
                              );
                            }
                            if (loaiTinh === "Khác") {
                              return (
                                <input
                                  type="text"
                                  value={sp.viTriText || ""}
                                  onChange={(e) => handleSanPhamChange(index, "viTriText", e.target.value)}
                                  placeholder="Nhập vị trí..."
                                  className="w-full border border-blue-200 rounded p-2 outline-none bg-white text-base"
                                />
                              );
                            }
                            return (
                              <div
                                onClick={() => {
                                  setEditingSpIndex(index);
                                  setIsViTriModalOpen(true);
                                }}
                                className="w-full border border-blue-200 rounded p-2 bg-white cursor-pointer text-blue-600 hover:text-blue-800 min-h-[38px] flex items-center text-base"
                              >
                                {renderViTriText(sp) || (
                                  <span className="text-blue-400 italic">Chọn răng...</span>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Số lượng + Màu */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-base text-gray-500 mb-1">Số lượng</label>
                            <input
                              type="number"
                              min="0"
                              value={sp.soLuong}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) =>
                                handleSanPhamChange(index, "soLuong", parseInt(e.target.value))
                              }
                              className="w-full border border-blue-200 rounded p-2 outline-none bg-white text-center font-bold text-gray-700 text-base"
                            />
                          </div>
                          {!isMuaGium(sp.sanPham) && (
                          <div>
                            <label className="block text-base text-gray-500 mb-1">Màu</label>
                            <input
                              type="text"
                              value={sp.mau}
                              onChange={(e) => handleSanPhamChange(index, "mau", e.target.value)}
                              className="w-full border border-blue-200 rounded p-2 outline-none bg-white text-base"
                            />
                          </div>
                          )}
                        </div>

                        {/* Ghi chú (Mua giùm nha khoa: tên món hàng) */}
                        <div>
                          <label className="block text-base text-gray-500 mb-1">
                            {isMuaGium(sp.sanPham) ? "Ghi chú (tên món hàng) *" : "Ghi chú"}
                          </label>
                          <input
                            type="text"
                            value={sp.ghiChu}
                            onChange={(e) => handleSanPhamChange(index, "ghiChu", e.target.value)}
                            placeholder={isMuaGium(sp.sanPham) ? "Tên món hàng..." : ""}
                            className={`w-full border rounded p-2 outline-none bg-white text-base ${isMuaGium(sp.sanPham) && !(sp.ghiChu || "").trim() ? "border-orange-400" : "border-blue-200"}`}
                          />
                        </div>

                        {/* Yêu cầu thử */}
                        {!isMuaGium(sp.sanPham) && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setYeuCauThuModal({ open: true, spIndex: index })}
                            className={`w-full text-base rounded px-3 py-2 transition font-medium border ${(sp.yeuCauThu || []).length > 0
                              ? "bg-blue-500 text-white border-blue-500 hover:bg-blue-600"
                              : "bg-white text-blue-500 border-blue-300 hover:bg-blue-50"
                              }`}
                          >
                            {(sp.yeuCauThu || []).length > 0
                              ? `Yêu cầu thử (${sp.yeuCauThu.length})`
                              : "Yêu cầu thử"}
                          </button>
                        </div>
                        )}
                      </div>
                    ))}

                    {/* Add product button (mobile) */}
                    <button
                      onClick={() => {
                        markDirty();
                        setFormData({
                          ...formData,
                          danhSachSanPham: [
                            ...formData.danhSachSanPham,
                            {
                              loaiDon: "Mới",
                              sanPham: "",
                              viTri: [],
                              viTriText: "",
                              soLuong: 1,
                              mau: "",
                              ghiChu: "",
                              donGia: null,
                              yeuCauThu: [],
                            },
                          ],
                        });
                      }}
                      className="w-full py-4 px-6 bg-[#f0f9ff] text-green-600 font-bold hover:bg-blue-100 cursor-pointer flex items-center justify-start gap-2 transition"
                    >
                      <span className="text-3xl leading-none font-black">+</span>
                      <span className="text-base mt-1">Thêm sản phẩm</span>
                    </button>
                  </div>

                </div>

                {/* Section 3: Notes + accessories */}
                <div className="w-full border-t border-gray-200 shadow-sm">
                  <div className="flex flex-col sm:flex-row">
                    {/* Left: notes (flex-1) */}
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex flex-col sm:flex-row border-b border-gray-100">
                        {/* Chỉ định của bác sĩ */}
                        <div className="flex-1 p-4 border-b sm:border-b-0 sm:border-r border-gray-100 flex flex-col gap-1">
                          <label className="text-base text-gray-400 font-medium uppercase tracking-wide">Chỉ định của bác sĩ</label>
                          <textarea
                            name="chiDinhBacSi"
                            value={formData.chiDinhBacSi}
                            onChange={handleInputChange}
                            rows={4}
                            className="w-full min-h-20 md:min-h-36 outline-none text-base text-gray-700 bg-transparent placeholder-gray-300"
                            placeholder="Nhập chỉ định bác sĩ..."
                          />
                        </div>
                        {/* Ghi chú */}
                        <div className="flex-1 p-4 flex flex-col gap-1">
                          <label className="text-base text-gray-400 font-medium uppercase tracking-wide">Ghi chú</label>
                          <textarea
                            name="ghiChuChung"
                            value={formData.ghiChuChung}
                            onChange={handleInputChange}
                            rows={4}
                            className="w-full min-h-20 md:min-h-36 outline-none text-base text-gray-700 bg-transparent placeholder-gray-300"
                            placeholder="Nhập ghi chú..."
                          />
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row border-gray-100">
                        {/* Ghi chú tài chính */}
                        <div className="flex-1 p-4 border-b sm:border-b-0 sm:border-r border-gray-100 flex flex-col gap-1">
                          <label className="text-base text-gray-400 font-medium uppercase tracking-wide">Ghi chú về tài chính</label>
                          <textarea
                            name="ghiChuTaiChinh"
                            value={formData.ghiChuTaiChinh}
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full min-h-20 md:min-h-36 outline-none text-base text-gray-700 bg-transparent placeholder-gray-300"
                            placeholder="Nhập ghi chú tài chính..."
                          />
                        </div>
                        {/* Ghi chú sản xuất */}
                        <div className="flex-1 p-4 flex flex-col gap-1">
                          <label className="text-base text-gray-400 font-medium uppercase tracking-wide">Ghi chú sản xuất</label>
                          <textarea
                            name="ghiChuSanXuat"
                            value={formData.ghiChuSanXuat || ""}
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full min-h-20 md:min-h-36 outline-none text-base text-gray-700 bg-transparent placeholder-gray-300"
                            placeholder="Nhập ghi chú sản xuất..."
                          />
                        </div>
                      </div>
                    </div>
                    {/* Right: phụ kiện */}
                    <div className="sm:w-[350px] border-t sm:border-t-0 sm:border-l border-gray-200 p-4 shrink-0">
                      <DanhSachPhuKien
                        phuKienDaChon={formData.danhSachPhuKien}
                        setPhuKienDaChon={(data) =>
                          setFormData({ ...formData, danhSachPhuKien: data })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer save bar */}
      {!isPageLoading && (
        <div className="bg-gray-100 px-4 sm:px-6 py-3 flex flex-wrap justify-between items-center gap-2 border-t z-10 shadow-lg shrink-0">
          <div className="flex flex-wrap gap-2">
            {isEditMode && (
              <button
                onClick={() => navigate(`/donhang/${id}/print`)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-1.5 rounded text-base flex items-center gap-1"
                title="In đơn hàng (F4)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V2m12 0v7M6 13H2v8a2 2 0 002 2h16a2 2 0 002-2v-8h-4m0 0V9m0 4v8m-6-8h4" />
                </svg>
                In đơn hàng (F4)
              </button>
            )}
            {isEditMode && (
              <button
                onClick={() => navigate(`/donhang/${id}/delivery-note`)}
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-1.5 rounded text-base"
              >
                In Phiếu giao hàng
              </button>
            )}
            {isEditMode && !isViewOnly && formData.danhSachSanPham?.some(sp => sp.loaiDon === "Mới") && (
              <button
                onClick={() => {
                  if (!formData._id) { toast.error("Vui lòng lưu đơn hàng trước khi thêm thẻ bảo hành"); return; }
                  setIsPhieuBaoHanhModalOpen(true);
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded text-base"
              >
                + Thêm thẻ bảo hành
              </button>
            )}
            {isEditMode && validWarranties.length > 0 && (
              <button
                onClick={() => { setSelectedWarranty(validWarranties[0]); setOpenPrintWarranty(true); }}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-1.5 rounded text-base flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V2m12 0v7M6 13H2v8a2 2 0 002 2h16a2 2 0 002-2v-8h-4m0 0V9m0 4v8m-6-8h4" />
                </svg>
                In thẻ bảo hành
              </button>
            )}
            {!isViewOnly && hasRouteAccess(user, "/ghi-chu") && (
              <button
                type="button"
                onClick={() => setIsAddTodoOpen(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded text-base flex items-center"
              >
                Thêm ghi chú
              </button>
            )}

          </div>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="bg-[#4CAF50] hover:bg-green-600 text-white px-8 py-2 rounded shadow-md font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ display: isViewOnly ? 'none' : undefined }}
          >
            {isSubmitting ? "Đang lưu..." : "Lưu (F3)"}
          </button>
        </div>
      )}

      <>
        {isAddTodoOpen && (
          <GhiChuAddModal
            open={isAddTodoOpen}
            onClose={() => setIsAddTodoOpen(false)}
            initialMaDonHang={formData.maDonHang || (id ? `TAN${id.substring(id.length - 8).toUpperCase()}` : "")}
            initialDonHangId={id}
            onSuccess={(newGhiChu) => {
              if (!isEditMode && newGhiChu && newGhiChu._id) {
                setTempGhiChuIds((prev) => [...prev, newGhiChu._id]);
              }
            }}
          />
        )}

        <ChonViTriRangModal
          isOpen={isViTriModalOpen}
          onClose={() => setIsViTriModalOpen(false)}
          initialViTri={formData.danhSachSanPham[editingSpIndex]?.viTri || []}
          onSave={handleSaveViTri}
        />

        {isSanPhamModalOpen && (
          <SanPhamModal
            open={isSanPhamModalOpen}
            initialName={quickAddSanPhamName}
            onCreated={(newProduct) => {
              const newItem = { ...newProduct, nameDisplay: newProduct.tenSanPham };
              setSanPhamList((prev) => [...prev, newItem]);
              if (sanPhamModalIndex !== null) {
                handleSanPhamChange(sanPhamModalIndex, "sanPham", newProduct._id);
              }
              setIsSanPhamModalOpen(false);
              setQuickAddSanPhamName("");
              setSanPhamModalIndex(null);
            }}
            handleClose={() => {
              setIsSanPhamModalOpen(false);
              setQuickAddSanPhamName("");
              setSanPhamModalIndex(null);
            }}
          />
        )}

        <ChonDonHangCuModal
          isOpen={modalDonHangCuInfo.isOpen}
          onClose={() =>
            setModalDonHangCuInfo({ isOpen: false, index: null, loaiDon: "" })
          }
          onSelect={handleApplyOldOrder}
          patientId={formData.benhNhan}
          nhaKhoaName={selectedNhaKhoaInfo?.nameDisplay}
          bacSiName={bacSiList.find((b) => b._id === formData.bacSi)?.nameDisplay}
          benhNhanName={
            benhNhanList.find((b) => b._id === formData.benhNhan)?.nameDisplay
          }
          loaiDon={modalDonHangCuInfo.loaiDon}
        />

        <ChonViTriHamModal
          open={viTriHamModal.open}
          onClose={() => setViTriHamModal({ open: false, index: null })}
          loaiTinh={viTriHamModal.index !== null ? getLoaiTinh(formData.danhSachSanPham[viTriHamModal.index]?.sanPham) : ""}
          initialValue={viTriHamModal.index !== null ? (formData.danhSachSanPham[viTriHamModal.index]?.viTriText || "") : ""}
          onSave={(val) => {
            if (viTriHamModal.index !== null) {
              markDirty();
              const loaiTinh = getLoaiTinh(formData.danhSachSanPham[viTriHamModal.index]?.sanPham);
              const newDsSp = [...formData.danhSachSanPham];
              newDsSp[viTriHamModal.index] = { ...newDsSp[viTriHamModal.index], viTriText: val };
              if (loaiTinh === "Bán hàm" || loaiTinh === "Hàm") {
                const count = val ? val.split(", ").filter(Boolean).length : 0;
                newDsSp[viTriHamModal.index].soLuong = count || 1;
              }
              setFormData({ ...formData, danhSachSanPham: newDsSp });
            }
          }}
        />
      </>

      <PhieuBaoHanhModal
        open={isPhieuBaoHanhModalOpen}
        onClose={() => setIsPhieuBaoHanhModalOpen(false)}
        donHang={formData}
        onSuccess={() => {
          setIsPhieuBaoHanhModalOpen(false);
          if (id) {
            api.get(`/phieu-bao-hanh/don-hang/${id}`)
              .then((res) => {
                const warranty = res.data?.data || res.data;
                const warrantyArray = warranty ? (Array.isArray(warranty) ? warranty : [warranty]) : [];
                setPhieuBaoHanhList(warrantyArray);
              })
              .catch(() => { });
          }
        }}
      />
      {selectedWarranty && (
        <WarrantyCardPrint
          open={openPrintWarranty}
          onClose={() => setOpenPrintWarranty(false)}
          warranty={selectedWarranty}
          donHang={formData}
        />
      )}

      {/* Modal cảnh báo thoát chưa lưu */}
      {showExitWarning && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-xl mx-4">
            <div className="flex items-center gap-3 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7 text-yellow-500 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <h3 className="font-bold text-base text-gray-800">Thoát mà chưa lưu?</h3>
            </div>
            <p className="text-base text-gray-600 mb-5">Bạn có thay đổi chưa được lưu. Nếu thoát, các thay đổi sẽ bị mất.</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowExitWarning(false)}
                className="px-4 py-1.5 text-base rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Ở lại
              </button>
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-1.5 text-base rounded bg-red-500 text-white hover:bg-red-600"
              >
                Thoát không lưu
              </button>
              <button
                onClick={() => { setShowExitWarning(false); handleSaveRef.current(); }}
                className="px-4 py-1.5 text-base rounded bg-blue-500 text-white hover:bg-blue-600"
              >
                Lưu và thoát
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Overlay xem đơn hàng gốc */}
      {donHangGocView && ReactDOM.createPortal(
        <DonHangDetailPanel donHang={donHangGocView} onClose={() => setDonHangGocView(null)} fullscreen />,
        document.body
      )}

      {/* Yêu cầu thử modal */}
      {yeuCauThuModal.open && yeuCauThuModal.spIndex !== null && (() => {
        const spIdx = yeuCauThuModal.spIndex;
        const sp = formData.danhSachSanPham[spIdx];
        const items = sp?.yeuCauThu || [];
        const addItem = (congDoan) => {
          const newDsSp = [...formData.danhSachSanPham];
          newDsSp[spIdx] = { ...newDsSp[spIdx], yeuCauThu: [...items, { congDoan, ngayTao: new Date().toISOString() }] };
          setFormData(f => ({ ...f, danhSachSanPham: newDsSp }));
        };
        const removeItem = (i) => {
          const newDsSp = [...formData.danhSachSanPham];
          newDsSp[spIdx] = { ...newDsSp[spIdx], yeuCauThu: items.filter((_, idx) => idx !== i) };
          setFormData(f => ({ ...f, danhSachSanPham: newDsSp }));
        };
        return ReactDOM.createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={() => setYeuCauThuModal({ open: false, spIndex: null })}>
            <div className="bg-white rounded-xl shadow-2xl w-[420px] max-w-[95vw] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between bg-[#00a8ff] px-4 py-3">
                <span className="text-white font-semibold text-base">Yêu cầu thử</span>
                <button type="button" onClick={() => setYeuCauThuModal({ open: false, spIndex: null })} className="text-white hover:text-blue-200 transition text-xl leading-none">&times;</button>
              </div>
              <div className="px-4 pt-4 pb-2">
                <table className="w-full text-base border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 text-base">
                      <th className="text-left pb-2 w-10">STT</th>
                      <th className="text-left pb-2">Công đoạn</th>
                      <th className="text-left pb-2">Ngày tạo</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 && (
                      <tr><td colSpan={4} className="py-4 text-center text-gray-400 text-base italic">Chưa có yêu cầu nào</td></tr>
                    )}
                    {items.map((item, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 text-gray-500 text-base">{i + 1}</td>
                        <td className="py-2 font-medium text-gray-800">{item.congDoan}</td>
                        <td className="py-2 text-gray-500 text-base">{new Date(item.ngayTao).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}</td>
                        <td className="py-2 text-center">
                          <button type="button" onClick={() => removeItem(i)} className="text-orange-400 hover:text-red-500 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 px-4 pb-3">
                <button type="button" onClick={() => addItem("Thử Sườn")} className="flex-1 bg-[#00a8ff] hover:bg-blue-600 text-white text-base font-semibold rounded-full py-2 transition">+ Thử Sườn</button>
                <button type="button" onClick={() => addItem("Thử sứ thô")} className="flex-1 bg-[#00a8ff] hover:bg-blue-600 text-white text-base font-semibold rounded-full py-2 transition">+ Thử sứ thô</button>
              </div>
              <div className="flex justify-end px-4 pb-4">
                <button type="button" onClick={() => setYeuCauThuModal({ open: false, spIndex: null })} className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-base font-medium rounded px-5 py-1.5 transition">Xác nhận</button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* Quick-add: Nha Khoa */}
      <QuickAddModal
        open={quickAddNhaKhoa.open}
        onClose={() => setQuickAddNhaKhoa(s => ({ ...s, open: false }))}
        title="+ Thêm Nha Khoa"
        onSubmit={handleQuickAddNhaKhoa}
        loading={quickAddNhaKhoa.loading}
      >
        <QuickAddField label="Tên nha khoa *" value={quickAddNhaKhoa.form.hoVaTen} placeholder="Tên nha khoa..." onChange={v => setQuickAddNhaKhoa(s => ({ ...s, form: { ...s.form, hoVaTen: v } }))} />
        <QuickAddField label="Tên giao dịch" value={quickAddNhaKhoa.form.tenGiaoDich} placeholder="Tên giao dịch..." onChange={v => setQuickAddNhaKhoa(s => ({ ...s, form: { ...s.form, tenGiaoDich: v } }))} />
        <QuickAddField label="Email" value={quickAddNhaKhoa.form.email} placeholder="Email..." onChange={v => setQuickAddNhaKhoa(s => ({ ...s, form: { ...s.form, email: v } }))} />
        <QuickAddField label="SĐT" value={quickAddNhaKhoa.form.soDienThoai} placeholder="Số điện thoại..." onChange={v => setQuickAddNhaKhoa(s => ({ ...s, form: { ...s.form, soDienThoai: v } }))} />
        <QuickAddField label="Website" value={quickAddNhaKhoa.form.website} placeholder="achau.com.vn..." onChange={v => setQuickAddNhaKhoa(s => ({ ...s, form: { ...s.form, website: v } }))} />
        <QuickAddField label="Địa chỉ cụ thể" value={quickAddNhaKhoa.form.diaChiCuThe} placeholder="Địa chỉ..." onChange={v => setQuickAddNhaKhoa(s => ({ ...s, form: { ...s.form, diaChiCuThe: v } }))} />
        <QuickAddField label="Tỉnh / Thành phố" value={quickAddNhaKhoa.form.tinh} placeholder="Hồ Chí Minh..." onChange={v => setQuickAddNhaKhoa(s => ({ ...s, form: { ...s.form, tinh: v } }))} />
        <QuickAddField label="Mô tả" type="textarea" value={quickAddNhaKhoa.form.moTa} placeholder="Mô tả..." onChange={v => setQuickAddNhaKhoa(s => ({ ...s, form: { ...s.form, moTa: v } }))} />
      </QuickAddModal>

      {/* Quick-add: Bác Sĩ */}
      <QuickAddModal
        open={quickAddBacSi.open}
        onClose={() => setQuickAddBacSi(s => ({ ...s, open: false }))}
        title="+ Thêm Bác Sĩ"
        onSubmit={handleQuickAddBacSi}
        loading={quickAddBacSi.loading}
      >
        <QuickAddField label="Họ và tên *" value={quickAddBacSi.form.hoVaTen} placeholder="Tên bác sĩ..." onChange={v => setQuickAddBacSi(s => ({ ...s, form: { ...s.form, hoVaTen: v } }))} />
        <QuickAddField label="Email" value={quickAddBacSi.form.email} placeholder="Email..." onChange={v => setQuickAddBacSi(s => ({ ...s, form: { ...s.form, email: v } }))} />
        <QuickAddField label="SĐT" value={quickAddBacSi.form.soDienThoai} placeholder="Số điện thoại..." onChange={v => setQuickAddBacSi(s => ({ ...s, form: { ...s.form, soDienThoai: v } }))} />
        <QuickAddField label="Tiêu đề" value={quickAddBacSi.form.tieuDe} placeholder="Bác sĩ / Nha sĩ..." onChange={v => setQuickAddBacSi(s => ({ ...s, form: { ...s.form, tieuDe: v } }))} />
        <QuickAddField label="Mô tả" type="textarea" value={quickAddBacSi.form.moTa} placeholder="Mô tả..." onChange={v => setQuickAddBacSi(s => ({ ...s, form: { ...s.form, moTa: v } }))} />
        {!formData.nhaKhoa && <p className="text-base text-orange-500">⚠ Vui lòng chọn nha khoa trước</p>}
      </QuickAddModal>

      {/* Quick-add: Bệnh Nhân */}
      <QuickAddModal
        open={quickAddBenhNhan.open}
        onClose={() => setQuickAddBenhNhan(s => ({ ...s, open: false }))}
        title="+ Thêm Bệnh Nhân"
        onSubmit={handleQuickAddBenhNhan}
        loading={quickAddBenhNhan.loading}
      >
        <QuickAddField label="Tên *" value={quickAddBenhNhan.form.hoVaTen} placeholder="Tên bệnh nhân..." onChange={v => setQuickAddBenhNhan(s => ({ ...s, form: { ...s.form, hoVaTen: v } }))} />
        <QuickAddField label="Số hồ sơ" value={quickAddBenhNhan.form.soHoSo} placeholder="Số hồ sơ..." onChange={v => setQuickAddBenhNhan(s => ({ ...s, form: { ...s.form, soHoSo: v } }))} />
        <div>
          <label className="text-base text-gray-500">Giới tính</label>
          <select value={quickAddBenhNhan.form.gioiTinh} onChange={e => setQuickAddBenhNhan(s => ({ ...s, form: { ...s.form, gioiTinh: e.target.value } }))}
            className="w-full border-b border-gray-300 outline-none py-1 text-base mt-1 bg-transparent">
            <option value="">-- Chọn --</option>
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
          </select>
        </div>
        <QuickAddField label="Tỉnh / Thành phố" value={quickAddBenhNhan.form.tinh} placeholder="Hồ Chí Minh..." onChange={v => setQuickAddBenhNhan(s => ({ ...s, form: { ...s.form, tinh: v } }))} />
        <QuickAddField label="Quận / Huyện" value={quickAddBenhNhan.form.quanHuyen} placeholder="Bình Thạnh..." onChange={v => setQuickAddBenhNhan(s => ({ ...s, form: { ...s.form, quanHuyen: v } }))} />
        {!formData.nhaKhoa && <p className="text-base text-orange-500">⚠ Vui lòng chọn nha khoa trước</p>}
      </QuickAddModal>

      {/* Lý do hẹn lại khi dời Hẹn giao */}
      {lyDoHenLaiModal.open && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setLyDoHenLaiModal({ open: false, value: "" })} />
          <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-bold text-base mb-2 text-blue-700">Lý do hẹn lại</h3>
            <p className="text-base text-gray-500 mb-3">
              Hẹn giao được dời từ {dayjs(originalHenGiaoRef.current.split("T")[0]).format("DD/MM/YYYY")} sang{" "}
              {dayjs(formData.henGiao.split("T")[0]).format("DD/MM/YYYY")}.
            </p>
            <textarea
              autoFocus
              value={lyDoHenLaiModal.value}
              onChange={e => setLyDoHenLaiModal(s => ({ ...s, value: e.target.value }))}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleConfirmLyDoHenLai();
                }
              }}
              rows={3}
              className="w-full border border-gray-200 rounded outline-none py-1 px-2 text-base resize-none focus:ring-1 focus:ring-blue-400"
              placeholder="Nhập lý do hẹn lại..."
            />
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setLyDoHenLaiModal({ open: false, value: "" })} className="px-4 py-1.5 text-base rounded border border-gray-300 text-gray-600 hover:bg-gray-50">Hủy</button>
              <button onClick={handleConfirmLyDoHenLai} disabled={isSubmitting} className="px-4 py-1.5 text-base rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50">
                Lưu
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

/* ===== Right side panel ===== */
const RightSidePanel = ({
  formData,
  setFormData,
  handleInputChange,
  phieuBaoHanhList = [],
  donHangId,
  onRefreshPhieuBaoHanh,
}) => {
  const [activeTab, setActiveTab] = useState("ghichu");

  // Filter only valid warranties
  const validWarranties = (phieuBaoHanhList || []).filter(
    (pbh) => pbh && pbh.danhSachBaoHanh && Array.isArray(pbh.danhSachBaoHanh) && pbh.danhSachBaoHanh.length > 0
  );

  return (
    <div className="w-full md:w-72 max-h-[280px] md:max-h-none border-t md:border-t-0 md:border-l bg-white flex flex-col shrink-0 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b shrink-0">
        {[
          { key: "sanxuat", label: "Sản xuất" },
          { key: "ghichu", label: "Ghi chú" },
          ...(validWarranties.length > 0 ? [{
            key: "baohanhc",
            label: "Bảo hành",
            badge: validWarranties.length,
          }] : []),
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 text-base font-medium transition border-b-2 relative ${activeTab === tab.key
              ? "border-blue-500 text-blue-700 bg-blue-50"
              : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-base rounded-full w-5 h-5 flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === "sanxuat" && (
          <div className="flex flex-col gap-3">
            <h4 className="text-base font-semibold text-gray-700">
              Phụ kiện đi kèm
            </h4>
            <DanhSachPhuKien
              phuKienDaChon={formData.danhSachPhuKien}
              setPhuKienDaChon={(data) =>
                setFormData({ ...formData, danhSachPhuKien: data })
              }
            />
          </div>
        )}

        {activeTab === "ghichu" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-base text-gray-500 font-medium">
                Chỉ định của bác sĩ
              </label>
              <textarea
                name="chiDinhBacSi"
                value={formData.chiDinhBacSi}
                onChange={handleInputChange}
                rows={3}
                className="w-full border rounded p-2 text-base outline-none resize-none focus:ring-1 focus:ring-blue-400"
                placeholder="Nhập chỉ định..."
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-base text-gray-500 font-medium">
                Ghi chú chung
              </label>
              <textarea
                name="ghiChuChung"
                value={formData.ghiChuChung}
                onChange={handleInputChange}
                rows={4}
                className="w-full border rounded p-2 text-base outline-none resize-none focus:ring-1 focus:ring-blue-400"
                placeholder="Nhập ghi chú..."
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-base text-gray-500 font-medium">
                Ghi chú tài chính
              </label>
              <textarea
                name="ghiChuTaiChinh"
                value={formData.ghiChuTaiChinh}
                onChange={handleInputChange}
                rows={3}
                className="w-full border rounded p-2 text-base outline-none resize-none focus:ring-1 focus:ring-blue-400"
                placeholder="Nhập ghi chú tài chính..."
              />
            </div>
          </div>
        )}

        {activeTab === "baohanhc" && (
          <div className="flex flex-col gap-2">
            <PhieuBaoHanhList
              phieuBaoHanhList={validWarranties}
              donHangId={donHangId}
              onDelete={onRefreshPhieuBaoHanh}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DonHangForm;