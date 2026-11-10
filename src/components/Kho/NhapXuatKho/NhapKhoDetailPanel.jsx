import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
    fetchPhieuNhapKhoById,
    updatePhieuNhapKho,
    deletePhieuNhapKho,
    clearSelected,
} from "../../../redux/slices/phieuNhapKhoSlice";
import { toast } from "sonner";
import NhapKhoModal from "./NhapKhoModal";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LockIcon from "@mui/icons-material/Lock";
import LocalPrintshopIcon from "@mui/icons-material/LocalPrintshop";

function formatNgay(dateStr) {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${hh}:${min} ${dd}/${mm}/${yyyy}`;
}

function InfoRow({ label, value }) {
    return (
        <div className="flex items-start gap-2 text-base">
            <span className="text-gray-500 w-28 shrink-0">{label}:</span>
            <span>{value || "—"}</span>
        </div>
    );
}

/**
 * Props:
 *  phieu     – phieuNhapKho row object | null (null/undefined => modal closed)
 *  onClose   – () => void
 *  onUpdated – () => void  (refresh parent list)
 */
export default function NhapKhoDetailModal({ phieu, onClose, onUpdated }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [fullPhieu, setFullPhieu] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [updatingThanhToan, setUpdatingThanhToan] = useState(false);
    const [editingPhiPhatSinh, setEditingPhiPhatSinh] = useState(false);
    const [phiPhatSinhInput, setPhiPhatSinhInput] = useState(0);
    const [lyDoPhiPhatSinhInput, setLyDoPhiPhatSinhInput] = useState("");
    const [savingPhiPhatSinh, setSavingPhiPhatSinh] = useState(false);

    const { user } = useSelector(state => state.auth);

    // Reset local state when target changes / modal closes
    useEffect(() => {
        if (!phieu) {
            setFullPhieu(null);
            setEditingPhiPhatSinh(false);
            setShowDeleteConfirm(false);
        }
    }, [phieu]);

    // Fetch full detail whenever selected phieu changes
    useEffect(() => {
        if (!phieu?._id) return;
        setLoading(true);
        dispatch(fetchPhieuNhapKhoById(phieu._id))
            .unwrap()
            .then((res) => setFullPhieu(res.data || res))
            .catch(() => setFullPhieu(phieu))
            .finally(() => setLoading(false));
    }, [phieu?._id, dispatch]);

    function handleClose() {
        dispatch(clearSelected());
        onClose();
    }

    async function handleConfirmNhan() {
        if (!fullPhieu) return;

        const danhSach = fullPhieu.danhSachVatLieu || [];
        const invalidItems = danhSach.filter((item) => !item.donGia || Number(item.donGia) <= 0);
        if (invalidItems.length > 0) {
            toast.error(`Cần nhập giá vật liệu.`);
            return;
        }

        setUpdatingStatus(true);
        try {
            await dispatch(
                updatePhieuNhapKho({ id: fullPhieu._id, trangThaiNhap: "Đã nhận" })
            ).unwrap();
            const res = await dispatch(fetchPhieuNhapKhoById(fullPhieu._id)).unwrap();
            setFullPhieu(res.data || res);
            toast.success("Cập nhật: Đã nhận — tồn kho đã được cộng");
            onUpdated?.();
        } catch (err) {
            toast.error(err?.message || "Cập nhật thất bại");
        } finally {
            setUpdatingStatus(false);
        }
    }

    async function handleConfirmThanhToan() {
        if (!fullPhieu) return;

        const danhSach = fullPhieu.danhSachVatLieu || [];
        const invalidItems = danhSach.filter((item) => !item.donGia || Number(item.donGia) <= 0);
        if (invalidItems.length > 0) {
            toast.error(`Cần nhập giá vật liệu.`);
            return;
        }

        setUpdatingThanhToan(true);
        try {
            await dispatch(
                updatePhieuNhapKho({ id: fullPhieu._id, trangThaiThanhToan: "Đã thanh toán" })
            ).unwrap();
            const res = await dispatch(fetchPhieuNhapKhoById(fullPhieu._id)).unwrap();
            setFullPhieu(res.data || res);
            toast.success("Cập nhật: Đã thanh toán");
            onUpdated?.();
        } catch (err) {
            toast.error(err?.message || "Cập nhật thất bại");
        } finally {
            setUpdatingThanhToan(false);
        }
    }

    function handleOpenEditPhiPhatSinh() {
        if (isLocked) {
            toast.error("Phiếu đã nhận, không thể chỉnh sửa");
            return;
        }
        setPhiPhatSinhInput(fullPhieu?.phiPhatSinh || 0);
        setLyDoPhiPhatSinhInput(fullPhieu?.lyDoPhiPhatSinh || "");
        setEditingPhiPhatSinh(true);
    }

    async function handleSavePhiPhatSinh() {
        if (!fullPhieu) return;
        const phi = Number(phiPhatSinhInput) || 0;
        const lyDo = lyDoPhiPhatSinhInput.trim();
        if (phi > 0 && !lyDo) {
            toast.error("Vui lòng nhập lí do phí phát sinh");
            return;
        }
        setSavingPhiPhatSinh(true);
        try {
            await dispatch(
                updatePhieuNhapKho({
                    id: fullPhieu._id,
                    phiPhatSinh: phi,
                    lyDoPhiPhatSinh: phi > 0 ? lyDo : "",
                })
            ).unwrap();
            const res = await dispatch(fetchPhieuNhapKhoById(fullPhieu._id)).unwrap();
            setFullPhieu(res.data || res);
            toast.success("Cập nhật phí phát sinh thành công");
            setEditingPhiPhatSinh(false);
        } catch (err) {
            toast.error(err?.message || "Cập nhật thất bại");
        } finally {
            setSavingPhiPhatSinh(false);
        }
    }

    async function handleConfirmDelete() {
        try {
            await dispatch(deletePhieuNhapKho(fullPhieu._id)).unwrap();
            toast.success(`Đã xóa ${fullPhieu.soPhieu}`);
            onUpdated?.();
            handleClose();
        } catch (err) {
            toast.error(err?.message || "Xóa thất bại");
        } finally {
            setShowDeleteConfirm(false);
        }
    }

    function handleEditClose() {
        setShowEditModal(false);
        if (fullPhieu?._id) {
            dispatch(fetchPhieuNhapKhoById(fullPhieu._id))
                .unwrap()
                .then((res) => setFullPhieu(res.data || res))
                .catch(() => { });
        }
        onUpdated?.();
    }

    if (!phieu) return null;

    const isLocked = fullPhieu?.trangThaiNhap === "Đã nhận" && user?.quyenSuDung?.ten !== "Admin";
    const tongTien = (fullPhieu?.danhSachVatLieu || []).reduce(
        (s, i) => s + (i.thanhTien || 0),
        fullPhieu?.phiPhatSinh || 0
    );

    return (
        <>
            <div
                className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/40 sm:p-4"
                onClick={handleClose}
            >
                <div
                    className="w-full sm:max-w-5xl h-[85vh] sm:h-auto sm:max-h-[85vh] flex flex-col bg-white rounded-t-lg sm:rounded-lg shadow-xl overflow-hidden relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 sm:px-5 py-3 shrink-0 bg-sky-400">
                        <h3 className="font-semibold text-white text-sm sm:text-base pr-2 truncate">
                            {fullPhieu?.soPhieu || phieu?.soPhieu || "Phiếu nhập kho"}
                        </h3>
                        <div className="flex items-center gap-1 text-white shrink-0">
                            <button
                                onClick={() => {
                                    if (isLocked) {
                                        toast.error("Phiếu đã nhận, không thể chỉnh sửa");
                                        return;
                                    }
                                    setShowEditModal(true);
                                }}
                                title={isLocked ? "Phiếu đã nhận" : "Sửa phiếu"}
                                className={`w-8 h-8 flex items-center justify-center rounded-full transition ${isLocked ? "opacity-40 cursor-not-allowed" : "hover:bg-sky-500"}`}
                            >
                                <EditIcon sx={{ fontSize: 20 }} />
                            </button>
                            <button
                                onClick={() => {
                                    if (isLocked) {
                                        toast.error("Phiếu đã nhận, không thể xóa");
                                        return;
                                    }
                                    setShowDeleteConfirm(true);
                                }}
                                title={isLocked ? "Không thể xóa phiếu đã nhận" : "Xóa phiếu"}
                                className={`w-8 h-8 flex items-center justify-center rounded-full transition ${isLocked ? "opacity-40 cursor-not-allowed" : "hover:bg-sky-500"}`}
                            >
                                <DeleteIcon sx={{ fontSize: 20 }} />
                            </button>
                            <button
                                onClick={() => navigate(`/kho/phieu-nhap/${fullPhieu?._id || phieu?._id}/print`)}
                                title="In phiếu"
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sky-500 transition"
                            >
                                <LocalPrintshopIcon sx={{ fontSize: 20 }} />
                            </button>
                            <button
                                onClick={handleClose}
                                className="w-8 h-8 flex items-center justify-center text-white/90 hover:text-white hover:bg-sky-500 rounded-full text-xl leading-none"
                                aria-label="Đóng"
                            >
                                ×
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-32 text-base text-gray-400">
                                Đang tải...
                            </div>
                        ) : fullPhieu ? (
                            <div className="p-4 flex flex-col gap-5">
                                {/* Meta info */}
                                <div className="flex flex-col gap-2 bg-gray-100 rounded-lg p-3">
                                    {/* Trạng thái nhập */}
                                    <div className="flex items-center gap-2 text-base">
                                        <span className="text-gray-500 w-28 shrink-0">Nhập kho:</span>
                                        <span className={`text-base text-white font-medium px-2.5 py-0.5 ${fullPhieu.trangThaiNhap === "Đã nhận" ? "bg-green-500" : "bg-yellow-500"
                                            }`}>
                                            {fullPhieu.trangThaiNhap}
                                        </span>
                                    </div>
                                    {/* Trạng thái thanh toán */}
                                    <div className="flex items-center gap-2 text-base">
                                        <span className="text-gray-500 w-28 shrink-0">Thanh toán:</span>
                                        <span className={`text-base text-white font-medium px-2.5 py-0.5 ${fullPhieu.trangThaiThanhToan === "Đã thanh toán" ? "bg-green-500" : "bg-orange-400"
                                            }`}>
                                            {fullPhieu.trangThaiThanhToan}
                                        </span>
                                    </div>
                                    <InfoRow label="Ngày tạo" value={formatNgay(fullPhieu.ngayTao)} />
                                    {fullPhieu.ngayNhan && (
                                        <InfoRow label="Ngày nhận" value={formatNgay(fullPhieu.ngayNhan)} />
                                    )}
                                    <InfoRow label="Người tạo" value={fullPhieu.nguoiTao} />
                                    <InfoRow label="Nhà cung cấp" value={fullPhieu.nhaCungCap?.ten} />
                                    <InfoRow label="VAT" value={fullPhieu.VAT ? "CÓ" : "KHÔNG"} />
                                    {fullPhieu.ghiChu && (
                                        <InfoRow label="Ghi chú" value={fullPhieu.ghiChu} />
                                    )}
                                    {/* Phí phát sinh */}
                                    <div className="flex items-center gap-2 text-base">
                                        <span className="text-gray-500 w-28 shrink-0">Phí phát sinh:</span>
                                        {editingPhiPhatSinh ? (
                                            <div className="flex items-center gap-2 flex-1 flex-wrap">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    autoFocus
                                                    value={phiPhatSinhInput}
                                                    onChange={(e) => setPhiPhatSinhInput(e.target.value)}
                                                    className="border rounded px-2 py-1 text-base w-32 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Lí do (VD: phí vận chuyển)"
                                                    value={lyDoPhiPhatSinhInput}
                                                    onChange={(e) => setLyDoPhiPhatSinhInput(e.target.value)}
                                                    onKeyDown={(e) => e.key === "Enter" && handleSavePhiPhatSinh()}
                                                    className="border rounded px-2 py-1 text-base flex-1 min-w-[160px] focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleSavePhiPhatSinh}
                                                    disabled={savingPhiPhatSinh}
                                                    className="text-base font-medium text-white bg-green-500 hover:bg-green-600 px-2.5 py-1 rounded disabled:opacity-60"
                                                >
                                                    {savingPhiPhatSinh ? "..." : "Lưu"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingPhiPhatSinh(false)}
                                                    disabled={savingPhiPhatSinh}
                                                    className="text-base font-medium text-gray-600 hover:bg-gray-100 px-2.5 py-1 rounded border border-gray-300"
                                                >
                                                    Hủy
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span>
                                                    {fullPhieu.phiPhatSinh
                                                        ? Number(fullPhieu.phiPhatSinh).toLocaleString("vi-VN") + " ₫"
                                                        : "—"}
                                                    {fullPhieu.phiPhatSinh > 0 && fullPhieu.lyDoPhiPhatSinh && (
                                                        <span className="text-gray-500"> — {fullPhieu.lyDoPhiPhatSinh}</span>
                                                    )}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={handleOpenEditPhiPhatSinh}
                                                    title={isLocked ? "Phiếu đã nhận" : "Sửa phí phát sinh"}
                                                    className={`w-6 h-6 flex items-center justify-center rounded-full transition ${isLocked ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"
                                                        }`}
                                                >
                                                    <EditIcon sx={{ fontSize: 16 }} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Danh sách vật liệu */}
                                <div>
                                    <h3 className="text-base font-semibold text-gray-600 mb-2">
                                        Danh sách vật liệu ({fullPhieu.danhSachVatLieu?.length || 0})
                                    </h3>
                                    <div className="border border-gray-200 overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs sm:text-base whitespace-nowrap sm:whitespace-normal">
                                                <thead>
                                                    <tr className="bg-sky-100">
                                                        <th className="text-left py-1 px-2 font-normal text-gray-700">Vật liệu</th>
                                                        <th className="text-left py-1 px-2 font-normal text-gray-700">ĐVT</th>
                                                        <th className="text-right py-1 px-2 font-normal text-gray-700">SL</th>
                                                        <th className="text-right py-1 px-2 font-normal text-gray-700">Đơn giá</th>
                                                        <th className="text-right py-1 px-2 font-normal text-gray-700">Thành tiền</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(fullPhieu.danhSachVatLieu || []).map((item, i) => (
                                                        <tr
                                                            key={i}
                                                            className={`border-t border-gray-100 ${i % 2 === 1 ? "bg-gray-50" : "bg-white"}`}
                                                        >
                                                            <td
                                                                className="py-1 px-2"
                                                                title={item.vatLieu?.tenVatLieu || "—"}
                                                            >
                                                                {item.vatLieu?.tenVatLieu || "—"}
                                                            </td>
                                                            <td className="py-1 px-2 w-8 md:max-w-36 truncate"
                                                                title={item.vatLieu?.donViTinh || "—"}
                                                            >
                                                                {item.vatLieu?.donViTinh || "—"}
                                                            </td>
                                                            <td className="py-1 px-2 text-right w-8 md:w-20"
                                                                title={item.soLuong}
                                                            >{item.soLuong}</td>
                                                            <td className="py-1 px-2 text-right w-20 md:w-40"
                                                                title={(item.donGia || 0).toLocaleString("vi-VN")}
                                                            >
                                                                {(item.donGia || 0).toLocaleString("vi-VN")}
                                                            </td>
                                                            <td className="py-1 px-2 text-right font-medium w-20 md:w-40"
                                                                title={(item.thanhTien || 0).toLocaleString("vi-VN")}
                                                            >
                                                                {(item.thanhTien || 0).toLocaleString("vi-VN")}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="bg-sky-100 border-t border-gray-200">
                                                        <td
                                                            className="py-1 px-2 font-normal text-gray-700"
                                                            colSpan={4}
                                                        >
                                                            Tổng cộng
                                                        </td>
                                                        <td className="py-1 px-2 text-right font-medium">
                                                            {tongTien.toLocaleString("vi-VN")} ₫
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2">
                                    {/* Xác nhận nhận hàng */}
                                    {fullPhieu.trangThaiNhap === "Đã nhận" ? (
                                        <div className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-50 border border-green-200 text-base text-green-700">
                                            <LockIcon sx={{ fontSize: 16 }} />
                                            Đã nhập kho
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleConfirmNhan}
                                            disabled={updatingStatus}
                                            className="w-full py-2.5 rounded-lg text-base font-medium bg-green-500 text-white hover:bg-green-600 transition disabled:opacity-60"
                                        >
                                            {updatingStatus ? "Đang cập nhật..." : "Đánh dấu Đã nhận"}
                                        </button>
                                    )}

                                    {/* Xác nhận thanh toán */}
                                    {fullPhieu.trangThaiThanhToan === "Đã thanh toán" ? (
                                        <div className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-50 border border-blue-200 text-base text-blue-700">
                                            <LockIcon sx={{ fontSize: 16 }} />
                                            Đã thanh toán
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleConfirmThanhToan}
                                            disabled={updatingThanhToan}
                                            className="w-full py-2.5 rounded-lg text-base font-medium bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-60"
                                        >
                                            {updatingThanhToan ? "Đang cập nhật..." : "Đánh dấu Đã thanh toán"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {/* Delete confirm overlay */}
                    {showDeleteConfirm && (
                        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20 p-6">
                            <p className="text-center font-medium text-gray-800">
                                Xóa phiếu{" "}
                                <span className="text-red-600 font-semibold">{fullPhieu?.soPhieu}</span>?
                            </p>
                            <p className="text-base text-gray-500 text-center">
                                Thao tác này không thể hoàn tác.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-5 py-2 rounded-lg border border-gray-300 text-base text-gray-600 hover:bg-gray-100 transition"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    className="px-5 py-2 rounded-lg bg-red-500 text-white text-base font-medium hover:bg-red-600 transition"
                                >
                                    Xóa
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit modal (stacked above this modal) */}
            {showEditModal && fullPhieu && (
                <NhapKhoModal
                    open={showEditModal}
                    onClose={handleEditClose}
                    editData={fullPhieu}
                />
            )}
        </>
    );
}
