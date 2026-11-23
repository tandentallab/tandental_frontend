import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  useMediaQuery,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  deleteDonHang,
  updateCongDoanTrangThai,
  advanceTrangThai,
} from "../../redux/slices/donHangSlice";
import { toast } from "sonner";
import { api } from "../../config/api";
import PhieuBaoHanhModal from "./PhieuBaoHanhModal";
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PrintIcon from '@mui/icons-material/Print';
import CheckIcon from '@mui/icons-material/Check';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import { getAuthSelector } from "../../redux/selector";
import { hasRouteAccess } from "../../config/permissions";
import GhiChuAddModal from "../GhiChu/GhiChuAddModal";
import { NHOM_MUA_GIUM } from "../../data/sanPhamConfig";

const DonHangDetailPanel = (props) => {
  const { donHang, onClose } = props;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isVerySmall = useMediaQuery("(max-width:550px)");

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(getAuthSelector);
  const [activeTab, setActiveTab] = useState("chitiet");
  const [isPhieuBaoHanhOpen, setIsPhieuBaoHanhOpen] = useState(false);
  const [isAddTodoOpen, setIsAddTodoOpen] = useState(false);
  const [warranty, setWarranty] = useState(null);
  const [selectedProductIndex, setSelectedProductIndex] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null); // { spIndex, thuTu, top, right }
  const [isOpen, setIsOpen] = useState(false);
  const [fullDonHang, setFullDonHang] = useState(donHang);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (donHang) {
      const id = requestAnimationFrame(() => setIsOpen(true));
      return () => cancelAnimationFrame(id);
    } else {
      setIsOpen(false);
    }
  }, [!!donHang]);

  // Thêm useEffect để fetch dữ liệu chi tiết khi donHang._id thay đổi
  useEffect(() => {
    if (donHang?._id) {
      api.get(`/donhang/${donHang._id}`) // Gọi đúng API chi tiết (có populate)
        .then((res) => {
          setFullDonHang(res.data.data);
        })
        .catch((err) => console.error("Lỗi fetch full donHang:", err));
    }
  }, [donHang?._id]);

  // Close dropdown on outside click or scroll
  useEffect(() => {
    if (!openDropdown) return;
    const handler = () => setOpenDropdown(null);
    document.addEventListener("click", handler);
    document.addEventListener("scroll", handler, true);
    return () => {
      document.removeEventListener("click", handler);
      document.removeEventListener("scroll", handler, true);
    };
  }, [openDropdown]);

  const maDonHang = fullDonHang
    ? fullDonHang.maDonHang ||
    `TAN${fullDonHang._id.substring(fullDonHang._id.length - 8).toUpperCase()}`
    : "";

  // Fetch warranty when donHang changes
  useEffect(() => {
    if (donHang?._id) {
      api
        .get(`/phieu-bao-hanh/don-hang/${donHang._id}`)
        .then((res) => {
          setWarranty(res.data?.data || null);
        })
        .catch((err) => {
          setWarranty(null);
        });
    }
  }, [donHang?._id]);

  const trangThaiColor = {
    "Chờ xử lý": "bg-yellow-200 text-yellow-900",
    "Đang sản xuất": "bg-blue-200 text-blue-900",
    "Đang thử": "bg-purple-200 text-purple-900",
    "Hoàn thành": "bg-green-200 text-green-900",
    "Đã giao": "bg-gray-200 text-gray-800",
  };

  const isLocked = fullDonHang?.trangThai === "Đã giao" || !!fullDonHang?.daXuatHoaDon;

  const handleEdit = () => {
    if (isLocked) {
      toast.error("Đơn hàng đã xuất hóa đơn / đã giao, không thể chỉnh sửa");
      return;
    }
    navigate(`/donhang/${donHang._id}/edit`);
  };

  const handlePrint = () => {
    navigate(`/donhang/${donHang._id}/print`);
  };

  const handleDelete = () => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
    const currentRole = currentUser?.quyenSuDung?.ten;

    if (currentRole !== "Admin") {
      toast.error("Không có quyền xóa");
      return;
    }

    if (isLocked) {
      toast.error("Đơn hàng đã xuất hóa đơn / đã giao, không thể xóa");
      return;
    }
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    const promise = dispatch(deleteDonHang(donHang._id)).unwrap();
    toast.promise(promise, {
      loading: "Đang xóa...",
      success: `Đã xóa đơn hàng ${maDonHang}`,
      error: (err) => err || "Xóa đơn hàng thất bại",
    });
    promise.then(() => onClose()).catch(() => { });
  };

  // --- Luồng trạng thái theo yêu cầu thử ---
  const getOrderedTrials = (danhSachSanPham) =>
    (danhSachSanPham || []).flatMap((sp) => sp.yeuCauThu || []);

  const getFlowButton = (dh) => {
    if (!dh) return null;
    const trials = getOrderedTrials(dh.danhSachSanPham);
    const { trangThai, buocThuHienTai } = dh;
    if (trangThai === "Hoàn thành" || trangThai === "Đã giao") return { type: "done" };
    if (trials.length === 0) return { type: "hoan_thanh" };
    if (trangThai === "Đang thử") return { type: "san_xuat_tiep" };
    // "Chờ xử lý" hoặc "Đang sản xuất"
    const nextIndex = buocThuHienTai == null ? 0 : buocThuHienTai + 1;
    if (nextIndex < trials.length) {
      return { type: "thu", congDoan: trials[nextIndex].congDoan, index: nextIndex };
    }
    return { type: "hoan_thanh" };
  };

  const handleAdvanceStatus = (flowBtn) => {
    if (!flowBtn || flowBtn.type === "done") return;
    let newTrangThai;
    let newBuocThuHienTai = undefined;
    if (flowBtn.type === "thu") {
      newTrangThai = "Đang thử";
      newBuocThuHienTai = flowBtn.index;
    } else if (flowBtn.type === "san_xuat_tiep") {
      newTrangThai = "Đang sản xuất";
      newBuocThuHienTai = donHang.buocThuHienTai == null ? 0 : donHang.buocThuHienTai;
    } else if (flowBtn.type === "hoan_thanh") {
      newTrangThai = "Hoàn thành";
    }
    const promise = dispatch(
      advanceTrangThai({ id: donHang._id, trangThai: newTrangThai, buocThuHienTai: newBuocThuHienTai })
    ).unwrap();
    toast.promise(promise, {
      loading: "Đang cập nhật...",
      success: `Đơn hàng ${maDonHang}: ${newTrangThai}`,
      error: (err) => err || "Cập nhật trạng thái thất bại",
    });
  };

  const renderFlowButton = () => {
    const flowBtn = getFlowButton(donHang);
    if (!flowBtn) return null;
    if (flowBtn.type === "done") {
      return (
        <button disabled className="flex-1 py-2 rounded-lg font-medium text-base bg-green-100 text-green-700 border border-green-200 cursor-default flex items-center justify-center gap-1.5">
          <CheckIcon sx={{ fontSize: 18 }} /> Đã hoàn thành
        </button>
      );
    }
    if (flowBtn.type === "hoan_thanh") {
      return (
        <button
          onClick={() => handleAdvanceStatus(flowBtn)}
          className="flex-1 py-2 rounded-lg font-medium text-base bg-green-500 hover:bg-green-600 text-white transition flex items-center justify-center gap-1.5"
        >
          <CheckIcon sx={{ fontSize: 18 }} /> Hoàn thành
        </button>
      );
    }
    if (flowBtn.type === "san_xuat_tiep") {
      return (
        <button
          onClick={() => handleAdvanceStatus(flowBtn)}
          className="flex-1 py-2 rounded-lg font-medium text-base bg-blue-500 hover:bg-blue-600 text-white transition flex items-center justify-center gap-1.5"
        >
          <PlayArrowIcon sx={{ fontSize: 18 }} /> Sản xuất tiếp
        </button>
      );
    }
    if (flowBtn.type === "thu") {
      return (
        <button
          onClick={() => handleAdvanceStatus(flowBtn)}
          className="flex-1 py-2 rounded-lg font-medium text-base bg-purple-500 hover:bg-purple-600 text-white transition flex items-center justify-center gap-1.5"
        >
          {flowBtn.congDoan}
        </button>
      );
    }
    return null;
  };

  const renderViTriText = (viTriArr, viTriText) => {
    if (viTriText) return viTriText;
    if (!viTriArr || viTriArr.length === 0) return null;
    return viTriArr
      .map((v) =>
        v.kieu === "Rời"
          ? v.soRang.join(", ")
          : `${v.soRang[0]}->${v.soRang[v.soRang.length - 1]}`
      )
      .join("; ");
  };

  const tabs = [
    { key: "chitiet", label: "Chi tiết" },
    { key: "sanxuat", label: "Sản xuất" },
    { key: "ghichu", label: "Ghi chú" },
  ];

  const handleOpenPhieuBaoHanh = () => {
    setIsPhieuBaoHanhOpen(true);
  };

  const handleOpenPrintWarranty = () => {
    // Deprecated, print is handled inside the unified modal
  };
  const CONG_DOAN_TRANG_THAI_OPTIONS = ["Chưa sẵn sàng", "Chờ sản xuất"];

  const CONG_DOAN_TRANG_THAI_STYLE = {
    "Chưa sẵn sàng": "text-gray-500",
    "Chờ sản xuất": "text-cyan-600 font-medium",
  };

  const panelTop = isVerySmall ? 0 : 70;
  const panelWidth = isVerySmall ? "100%" : "530px";
  const panelHeight = `calc(100vh - ${panelTop}px)`;

  const getCongDoanTrangThai = (sp, thuTu) => {
    const found = sp.trangThaiCongDoan?.find((cd) => cd.thuTu === thuTu);
    return found?.trangThai || "Chưa sẵn sàng";
  };

  const handleCongDoanStatusChange = (spIndex, thuTu, trangThai) => {
    setOpenDropdown(null);
    dispatch(
      updateCongDoanTrangThai({ id: donHang._id, spIndex, thuTu, trangThai })
    )
      .unwrap()
      .catch((err) => toast.error(err || "Cập nhật thất bại"));
  };

  const totalCongDoanCount = donHang?.danhSachSanPham?.reduce(
    (sum, sp) => sum + (sp.sanPham?.quyTrinh?.length || 0),
    0
  ) || 0;

  const doneCongDoanCount = donHang?.danhSachSanPham?.reduce((sum, sp) => {
    const quyTrinh = sp.sanPham?.quyTrinh || [];
    return sum + quyTrinh.filter((cd) => {
      const found = sp.trangThaiCongDoan?.find((t) => t.thuTu === cd.thuTu);
      return found?.trangThai === "Hoàn thành";
    }).length;
  }, 0) || 0;

  const conLaiCongDoan = totalCongDoanCount - doneCongDoanCount;

  const groupedNhatKy = (donHang?.nhatKyChinhSua || []).filter(e => e.hanhDong !== "Chỉnh sửa đơn hàng (không có thay đổi)").reduce((acc, entry) => {
    const d = new Date(entry.thoiGian);
    const dateKey = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(entry);
    return acc;
  }, {});

  const hasWarranty = warranty && (
    (warranty.danhSachBaoHanh && warranty.danhSachBaoHanh.length > 0) || warranty.isValid
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed left-0 right-0 bottom-0 bg-black/20 transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        style={{ zIndex: props.fullscreen ? 2998 : (isVerySmall ? 1249 : 1199), top: `${panelTop}px` }}
        onClick={onClose}
      />

      {/* Slide-out panel */}
      <div
        className={`fixed right-0 flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        style={{ zIndex: props.fullscreen ? 2999 : (isVerySmall ? 1250 : 1200), top: `${panelTop}px`, width: panelWidth, height: panelHeight, maxHeight: panelHeight, paddingBottom: isMobile ? "80px" : "0" }}
      >
        {/* Header */}
        <div className="bg-[#4fc3f7] border-b px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-white">
            <div onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-500 hover:cursor-pointer transition-all duration-100">
              <ArrowForwardIcon onClick={onClose} sx={{ fontSize: 22 }} />
            </div>
            <span className="text-xl">{maDonHang}</span>
          </div>
          {!props.fullscreen && (
            <div className="flex items-center gap-2 shrink-0 text-white">
              <div onClick={handleEdit} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-500 hover:cursor-pointer transition-all duration-100">
                <EditIcon sx={{ fontSize: 22 }} />
              </div>
              <div onClick={handleDelete} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-500 hover:cursor-pointer transition-all duration-100">
                <DeleteIcon sx={{ fontSize: 22 }} />
              </div>
            </div>
          )}
        </div>

        {/* NhaKhoa row */}
        {donHang && (
          <div className="border-b px-4 py-3 flex items-center gap-3 bg-white shrink-0">
            <div className="w-9 h-9 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold text-base shrink-0 uppercase">
              {(donHang.nhaKhoa?.tenGiaoDich || donHang.nhaKhoa?.hoVaTen || "?").charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-800 text-lg truncate">
                  {donHang.nhaKhoa?.tenGiaoDich || donHang.nhaKhoa?.hoVaTen || "—"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b shrink-0 bg-gray-100">
          {[
            { key: "chitiet", label: "Chi tiết" },
            { key: "sanxuat", label: `Sản xuất${donHang ? ` (${donHang.danhSachSanPham?.length || 0})` : ""}` },
            { key: "ghichu", label: "Ghi chú" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 flex-1 text-base font-medium transition border-b-2 ${activeTab === tab.key ? "border-teal-600 text-teal-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {donHang && activeTab === "chitiet" && (
            <div className="flex flex-col">
              {/* Info rows */}
              <div className="px-4 py-3 flex flex-col gap-1 text-base border-b">
                {donHang.bacSi?.hoVaTen && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 w-32 shrink-0">Bác sĩ:</span>
                    <span className="font-medium text-gray-800">{donHang.bacSi.hoVaTen}</span>
                  </div>
                )}
                {donHang.benhNhan?.hoVaTen && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 w-32 shrink-0">Bệnh nhân:</span>
                    <span className="font-medium text-gray-800">{donHang.benhNhan.hoVaTen}</span>
                  </div>
                )}
                {donHang.yeuCauHoanThanh && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 w-32 shrink-0">Y/c hoàn thành:</span>
                    <span className="font-medium text-gray-800">
                      {new Date(donHang.yeuCauHoanThanh).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
                    </span>
                  </div>
                )}
                {donHang.henGiao && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 w-32 shrink-0">Hẹn giao:</span>
                    <span className="font-medium text-gray-800">
                      {new Date(donHang.henGiao).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
                    </span>
                  </div>
                )}
                {donHang.chiDinhBacSi && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 w-32 shrink-0">Chỉ định:</span>
                    <span className="font-medium text-gray-800 whitespace-pre-wrap">{donHang.chiDinhBacSi}</span>
                  </div>
                )}
              </div>

              {/* Products */}
              <div className="px-4 py-3 border-b">
                <h4 className="font-semibold mb-2">
                  {donHang.danhSachSanPham?.length || 0} sản phẩm
                </h4>
                {donHang.danhSachSanPham?.length > 0 ? (
                  donHang.danhSachSanPham.map((sp, idx) => (
                    <div key={idx} className="mb-1 last:mb-0">
                      <div className="flex gap-1 items-center font-medium ">
                        <div className="text-base">{{ "Hàng sửa": "Sửa", "Hàng làm lại": "Làm lại", "Hàng bảo hành": "Bảo hành" }[sp.loaiDon] ?? sp.loaiDon}</div>
                        -
                        <div className="text-base">{sp.soLuong}</div>
                        <div className="text-base">{sp.sanPham?.tenSanPham || "N/A"}</div>
                      </div>
                      {(sp.viTri?.length > 0 || sp.viTriText) && (
                        <div className="text-base text-gray-700">• Vị trí: {renderViTriText(sp.viTri, sp.viTriText)}</div>
                      )}
                      {sp.mau && <div className="text-base text-gray-700">• Màu: {sp.mau}</div>}
                      {sp.ghiChu && <div className="text-base text-gray-700">• {sp.ghiChu}</div>}
                      {sp.sanPham?.nhomSanPham === NHOM_MUA_GIUM && sp.donGia !== null && sp.donGia !== undefined && (
                        <div className="text-base text-gray-700">
                          • Đơn giá: <span className="font-medium text-black">{Number(sp.donGia).toLocaleString("vi-VN")} đ</span>
                          {sp.soLuong > 1 && <> × {sp.soLuong} = <span className="font-medium text-black">{(Number(sp.donGia) * sp.soLuong).toLocaleString("vi-VN")} đ</span></>}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 text-base italic">Chưa có sản phẩm</div>
                )}

                {((hasWarranty || donHang?.danhSachSanPham?.some((sp) => sp.loaiDon === "Mới")) || hasRouteAccess(user, "/ghi-chu")) && (
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {(hasWarranty || donHang?.danhSachSanPham?.some((sp) => sp.loaiDon === "Mới")) && (
                      <button
                        onClick={() => setIsPhieuBaoHanhOpen(true)}
                        className={`font-medium text-base px-3 py-1.5 rounded-full text-white flex items-center gap-2 transition-colors ${hasWarranty ? "bg-teal-500 hover:bg-teal-600" : "bg-slate-500 hover:bg-slate-600"}`}
                      >
                        <ReceiptIcon sx={{ fontSize: 18 }} /> Thẻ bảo hành
                      </button>
                    )}
                    {hasRouteAccess(user, "/ghi-chu") && (
                      <button
                        onClick={() => setIsAddTodoOpen(true)}
                        className="font-medium text-base px-3 py-1.5 rounded-full text-white flex items-center transition-colors bg-blue-500 hover:bg-blue-600"
                      >
                        Thêm ghi chú
                      </button>
                    )}
                  </div>
                )}
                {/* --------------------------------------------------- */}
              </div>

              {/* Phụ kiện */}
              {donHang.danhSachPhuKien?.length > 0 && (
                <div className="px-4 py-3 border-b">
                  <h4 className="font-semibold mb-2">Phụ kiện</h4>
                  <div className="flex flex-col gap-1">
                    {donHang.danhSachPhuKien.map((pk, idx) => (
                      <div key={idx} className="text-base">
                        {pk.soLuong} {pk.tenPhuKien}
                        {pk.soHuu && <span className="text-base ml-1">• {pk.soHuu}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nhật ký chỉnh sửa */}
              {Object.keys(groupedNhatKy).length > 0 && (
                <div className="px-4 py-3">
                  <h4 className="font-semibold mb-2">Nhật ký chỉnh sửa</h4>
                  {Object.entries(groupedNhatKy).reverse().map(([dateKey, entries]) => (
                    <div key={dateKey} className="mb-3">
                      <div className="text-base font-medium mb-1">{dateKey}</div>
                      {entries.map((entry, i) => {
                        const t = new Date(entry.thoiGian);
                        const timeStr = t.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
                        return (
                          <div key={i} className="flex gap-2 text-base mb-1 ml-3">
                            <span className="text-gray-600 text-base pt-0.5">{timeStr}</span>
                            <span>
                              <span className="font-medium text-gray-800">{entry.nguoiThuc}</span>
                              <span className="text-gray-600 ml-1">{entry.hanhDong}</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {donHang && activeTab === "sanxuat" && (
            <div className="p-4">
              {donHang.danhSachSanPham?.map((sp, spIdx) => {
                const quyTrinh = sp.sanPham?.quyTrinh
                  ? [...sp.sanPham.quyTrinh].sort((a, b) => a.thuTu - b.thuTu)
                  : [];
                return (
                  <div key={spIdx} className="mb-4 border rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-gray-50 border-b px-3 py-2">
                      <div className="font-semibold text-gray-800 text-base">
                        {sp.sanPham?.tenSanPham || `Sản phẩm ${spIdx + 1}`}
                      </div>
                      {(sp.viTri?.length > 0 || sp.viTriText || sp.mau) && (
                        <div className="text-base text-gray-600 mt-0.5">
                          {(sp.viTri?.length > 0 || sp.viTriText) && <><span className="font-medium text-black">{sp.soLuong}</span>{sp.viTri?.length > 0 ? " răng" : ""}: <span className="font-medium text-black">{renderViTriText(sp.viTri, sp.viTriText)}</span></>}
                          {sp.mau && <span className="ml-1">– Màu răng: <span className="font-medium text-black">{sp.mau}</span></span>}
                        </div>
                      )}
                    </div>
                    <div className="divide-y">
                      {quyTrinh.length > 0 ? (
                        quyTrinh.map((cd, i) => {
                          const currentStatus = getCongDoanTrangThai(sp, cd.thuTu);
                          const isDropOpen = openDropdown?.spIndex === spIdx && openDropdown?.thuTu === cd.thuTu;
                          return (
                            <div key={i} className="flex items-center justify-between px-3 py-1.5 text-base font-medium hover:bg-gray-50">
                              <span className="text-gray-700">{cd.thuTu}. {cd.tenCongDoan}</span>
                              <div className="relative shrink-0">
                                <button
                                  onClick={(e) => {
                                    if (props.fullscreen) return;
                                    e.stopPropagation();
                                    if (isDropOpen) {
                                      setOpenDropdown(null);
                                    } else {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setOpenDropdown({ spIndex: spIdx, thuTu: cd.thuTu, top: rect.bottom + 4, right: window.innerWidth - rect.right });
                                    }
                                  }}
                                  className={`text-base px-2 py-1 rounded transition ${CONG_DOAN_TRANG_THAI_STYLE[currentStatus]} ${props.fullscreen ? "cursor-default" : "hover:bg-gray-100"}`}
                                >
                                  {currentStatus}
                                </button>
                                {isDropOpen && ReactDOM.createPortal(
                                  <div
                                    style={{ top: openDropdown.top, right: openDropdown.right }}
                                    className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] min-w-[150px]"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {CONG_DOAN_TRANG_THAI_OPTIONS.map((opt) => (
                                      <button
                                        key={opt}
                                        onClick={() => handleCongDoanStatusChange(spIdx, cd.thuTu, opt)}
                                        className={`block w-full text-left px-3 py-2 text-base hover:bg-gray-50 transition ${opt === currentStatus ? "font-semibold text-cyan-600" : "text-gray-700"}`}
                                      >
                                        {opt}
                                      </button>
                                    ))}
                                  </div>,
                                  document.body
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="px-3 py-3 text-base text-gray-400 italic">Chưa có thông tin công đoạn</div>
                      )}
                    </div>
                  </div>
                );
              })}
              {(!donHang.danhSachSanPham || donHang.danhSachSanPham.length === 0) && (
                <div className="text-gray-400 text-base italic text-center mt-8">Chưa có sản phẩm</div>
              )}
            </div>
          )}

          {donHang && activeTab === "ghichu" && (
            <div className="p-4 flex flex-col gap-4 text-base">
              <NoteBlock label="Chỉ định của bác sĩ" value={donHang.chiDinhBacSi} />
              <NoteBlock label="Ghi chú chung" value={donHang.ghiChuChung} />
              <NoteBlock label="Ghi chú tài chính" value={donHang.ghiChuTaiChinh} />
              <NoteBlock label="Ghi chú sản xuất" value={donHang.ghiChuSanXuat} />
            </div>
          )}
        </div>

        {/* Bottom bar */}
        {!props.fullscreen && (
          <div className="border-t bg-white px-3 py-2.5 flex gap-2 shrink-0">
            {renderFlowButton()}
            <button
              onClick={() => navigate(`/donhang/${donHang._id}/print`)}
              className="flex-1 py-2 rounded-lg font-medium text-base bg-blue-500 hover:bg-blue-600 text-white transition flex items-center justify-center gap-1.5"
            >
              <PrintIcon />
              Phiếu chỉ định
            </button>
            <button
              onClick={() => navigate(`/donhang/${donHang._id}/delivery-note`)}
              className="flex-1 py-2 rounded-lg font-medium text-base bg-orange-500 hover:bg-orange-600 text-white transition flex items-center justify-center gap-1.5"
            >
              <LocalShippingIcon />
              Phiếu giao hàng
            </button>
          </div>
        )}
      </div >

      {donHang && isPhieuBaoHanhOpen && (
        <PhieuBaoHanhModal
          open={isPhieuBaoHanhOpen}
          onClose={() => setIsPhieuBaoHanhOpen(false)}
          donHang={donHang}
          warranty={warranty}
          onSuccess={(newWarranty) => {
            setWarranty(newWarranty);
          }}
        />
      )}

      {donHang && isAddTodoOpen && (
        <GhiChuAddModal
          open={isAddTodoOpen}
          onClose={() => setIsAddTodoOpen(false)}
          initialMaDonHang={maDonHang}
          initialDonHangId={donHang._id}
        />
      )}

      {/* Delete confirm dialog */}
      <Dialog
        open={showDeleteConfirm}
        sx={{ zIndex: 9999 }}
        onClose={() => setShowDeleteConfirm(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>
          Xác nhận xóa đơn hàng
        </DialogTitle>

        <DialogContent>
          <p>
            Bạn có chắc chắn muốn xóa đơn hàng <strong>{maDonHang}</strong>?
          </p>
          <p className="text-base text-gray-500 mt-1">
            Hành động này không thể hoàn tác.
          </p>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setShowDeleteConfirm(false)}
            variant="outlined"
            color="inherit"
          >
            Hủy
          </Button>

          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
          >
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const NoteBlock = ({ label, value }) => (
  <div>
    <h4 className="font-semibold text-gray-700 mb-1.5">{label}</h4>
    <div className="bg-gray-50 rounded-lg p-3 text-gray-700 min-h-[56px] border border-gray-100">
      {value || <span className="text-gray-400 italic">Không có</span>}
    </div>
  </div>
);

export default DonHangDetailPanel;