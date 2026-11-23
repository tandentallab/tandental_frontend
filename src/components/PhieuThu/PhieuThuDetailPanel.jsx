import React, { useEffect, useState } from "react";
import PhieuThuEditModal from "./PhieuThuEditModal";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CloseIcon from "@mui/icons-material/Close";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import PrintIcon from "@mui/icons-material/Print";
import { useNavigate } from "react-router-dom";
import { Button } from "@mui/material";
import { api } from "../../config/api";

const formatNumber = (v) => new Intl.NumberFormat("vi-VN").format(v || 0);

const formatCurrency = (v) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    v || 0
  );

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatMonthYear = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `Tháng ${month}/${year}`;
};

const formatDateShort = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatSoPhieu = (id) =>
  id ? "TAN" + id.toString().slice(-8).toUpperCase() : "—";

// Helper to display soPhieuThu, falling back to _id-based format for old records
const displaySoPhieu = (phieuThu) =>
  phieuThu?.soPhieuThu || formatSoPhieu(phieuThu?._id);

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const InfoRow = ({ label, value, valueClass = "" }) => (
  <div className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0">
    <span className="text-base text-gray-500">{label}</span>
    <span
      className={`text-base text-gray-800 font-medium text-right ${valueClass}`}
    >
      {value ?? "—"}
    </span>
  </div>
);

export default function PhieuThuDetailPanel({ phieuThu: summary, onClose, onUpdated }) {
  const navigate = useNavigate();
  const isOpen = !!summary;
  const [openEdit, setOpenEdit] = useState(false);

  // Danh sách chỉ có dữ liệu tóm tắt — chi tiết (hóa đơn, liên hệ) tải khi mở panel
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");
  const summaryId = summary?._id;

  useEffect(() => {
    if (!summaryId) return;
    let cancelled = false;
    setLoadingDetail(true);
    setDetailError("");
    api.get(`/phieu-thu/${summaryId}`)
      .then((res) => { if (!cancelled) setDetail(res.data?.data || null); })
      .catch((err) => {
        if (!cancelled) setDetailError(err?.response?.data?.message || "Không tải được chi tiết phiếu thu");
      })
      .finally(() => { if (!cancelled) setLoadingDetail(false); });
    return () => { cancelled = true; };
  }, [summaryId]);

  const detailReady = !!detail && detail._id === summaryId;
  const phieuThu = summary && detailReady ? { ...summary, ...detail } : summary;

  const nk = phieuThu?.nhaKhoaInfo || {};
  const ngt = phieuThu?.nguoiTaoInfo || {};

  const danhSachHoaDon = phieuThu?.danhSachHoaDon || [];

  const tenKhach = nk.hoVaTen || nk.tenGiaoDich || "";
  const address = [nk.diaChiCuThe, nk.quanHuyen, nk.tinh]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-300 ${isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
          }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 pt-16 h-full w-full sm:w-[480px] bg-gray-100 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        {/* ── HEADER ── */}
        <div className="bg-[#29b6f6] text-white px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-base tracking-wide truncate">
              {displaySoPhieu(phieuThu)}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setOpenEdit(true)}
              disabled={!detailReady}
              title={detailReady ? "Chỉnh sửa" : "Đang tải chi tiết..."}
              className="p-1.5 rounded-full hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-wait"
            >
              <EditOutlinedIcon sx={{ fontSize: 20 }} />
            </button>
            <button
              onClick={onClose}
              title="Đóng"
              className="p-1.5 rounded-full hover:bg-white/20 transition"
            >
              <CloseIcon sx={{ fontSize: 20 }} />
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {phieuThu && (
            <>
              {/* ── Card 1: Khách hàng ── */}
              <div className="bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#29b6f6] flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-base">
                    {getInitials(tenKhach)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-base leading-tight">
                    {tenKhach || "—"}
                  </p>
                  {address && (
                    <p className="text-base text-[#29b6f6] mt-0.5 truncate">
                      Địa chỉ: {address}
                    </p>
                  )}
                  <p className="text-base text-[#29b6f6] mt-0.5">
                    Điện thoại:{" "}
                    <span className="text-gray-400">
                      {nk.soDienThoai || "Chưa có"}
                    </span>
                  </p>
                  {nk.email !== undefined && (
                    <p className="text-base text-[#29b6f6] mt-0.5">
                      Email:{" "}
                      <span className="text-gray-400">
                        {nk.email || "Chưa có"}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* ── Card 2: Số tiền thu + thông tin ── */}
              <div className="bg-white rounded-2xl shadow-sm px-4 pt-4 pb-2">
                {/* Amount header row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <AttachMoneyIcon
                        sx={{ fontSize: 18, color: "#16a34a" }}
                      />
                    </div>
                    <span className="text-base font-semibold text-gray-500 uppercase tracking-wider">
                      Số tiền thu
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">
                    {formatNumber(phieuThu.soTienThu)}
                  </span>
                </div>
                {/* Info rows */}
                <InfoRow
                  label="Phương thức thanh toán"
                  value={phieuThu.phuongThucThanhToan}
                />
                <InfoRow
                  label="Ghi nhận doanh thu"
                  value={formatMonthYear(phieuThu.ngayGhiNhanDoanhThu || phieuThu.ngayThu)}
                />
                <InfoRow
                  label="Ngày tạo"
                  value={formatDate(phieuThu.ngayTao || phieuThu.createdAt)}
                />
                <InfoRow
                  label="Người tạo"
                  value={phieuThu.nguoiTaoInfo?.HoTenNV || "-"}
                />
                {phieuThu.noiDung && (
                  <InfoRow label="Nội dung" value={phieuThu.noiDung} />
                )}
                {phieuThu.conThua > 0 && (
                  <InfoRow
                    label="Trả thừa"
                    value={formatCurrency(phieuThu.conThua)}
                    valueClass="text-orange-500"
                  />
                )}
              </div>

              {/* ── Card 3: Hóa đơn ── */}
              {!detailReady && (
                <div className="bg-white rounded-2xl shadow-sm px-4 py-6 text-center text-base text-gray-400">
                  {detailError || (loadingDetail ? "Đang tải hóa đơn..." : "")}
                </div>
              )}
              {detailReady && danhSachHoaDon.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm px-4 py-4">
                  <p className="font-semibold text-gray-800 text-base mb-3">
                    Hóa đơn {danhSachHoaDon.length > 1 ? `(${danhSachHoaDon.length})` : ""}
                  </p>
                  <div className="space-y-3">
                    {danhSachHoaDon.map((item, idx) => {
                      const hd = item.hoaDon || {};
                      const soTienThanhToan = item.soTienThanhToan || 0;
                      const daThanhToan = Math.max(0, (hd.daThanhToan || 0) - soTienThanhToan);
                      const giaTriHoaDon = hd.giaTriThanhToan || 0;
                      const conLai = (hd.conLai || 0) + soTienThanhToan;

                      return (
                        <div key={hd._id || idx} className={`${idx > 0 ? "border-t pt-3" : ""}`}>
                          <div className="flex justify-between items-center mb-2">
                            {/* 🔥 LOGIC HIỂN THỊ SDDK (Chữ cam, ẩn link) VÀ HÓA ĐƠN THƯỜNG */}
                            {hd.soHoaDon?.startsWith("SDDK") ? (
                              <span className="text-orange-600 font-bold text-base">
                                Số dư đầu kỳ (Nợ cũ)
                              </span>
                            ) : (
                              <Button
                                variant="text"
                                size="small"
                                sx={{ minWidth: 0, p: 0, fontSize: "0.875rem" }}
                                onClick={() => { navigate(`/hoa-don/${hd._id}/edit`); }}
                              >
                                {hd.soHoaDon || formatSoPhieu(hd._id)}
                              </Button>
                            )}

                            {/* 🔥 ẨN NGÀY XUẤT CHO SDDK */}
                            <span className="text-base text-gray-500">
                              {hd.soHoaDon?.startsWith("SDDK")
                                ? "—"
                                : formatDateShort(hd.ngayXuatHoaDon)}
                            </span>
                          </div>

                          <div className="space-y-0">
                            <InfoRow label="Giá trị hóa đơn:" value={formatNumber(giaTriHoaDon)} />
                            <InfoRow
                              label="Đã thanh toán:"
                              value={formatNumber(daThanhToan)}
                            />
                            <InfoRow
                              label="Số tiền còn lại:"
                              value={formatNumber(conLai)}
                              valueClass="text-blue-600 font-bold"
                            />
                            <InfoRow
                              label="Số tiền thanh toán:"
                              value={formatNumber(soTienThanhToan)}
                              valueClass={conLai > 0 ? "text-orange-500" : "text-green-600"}
                            />
                          </div>

                          {hd.trangThai && (
                            <div className="mt-2 flex justify-end">
                              <span className={`text-base px-3 py-1 rounded-full font-medium ${hd.trangThai === "Đã thanh toán"
                                ? "bg-green-100 text-green-700"
                                : hd.trangThai === "Thanh toán một phần"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                                }`}>
                                {hd.trangThai}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="shrink-0 px-4 py-3 bg-white border-t flex justify-end">
          <button
            onClick={() => {
              if (phieuThu?._id) {
                navigate(`/phieu-thu/${phieuThu._id}/print`);
              }
            }}
            className="flex items-center gap-2 text-base text-gray-600 hover:text-gray-900 transition px-3 py-1.5 rounded-lg hover:bg-gray-100"
          >
            <PrintIcon sx={{ fontSize: 16 }} />
            In phiếu thu
          </button>
        </div>
      </div>

      {openEdit && detailReady && (
        <PhieuThuEditModal
          phieuThu={phieuThu}
          open={openEdit}
          onClose={() => setOpenEdit(false)}
          onSuccess={(updated) => {
            setOpenEdit(false);
            if (onUpdated) onUpdated(updated);
            if (onClose) onClose();
          }}
        />
      )}
    </>
  );
}
