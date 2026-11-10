import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../../config/api";
import LocalPrintshopIcon from "@mui/icons-material/LocalPrintshop";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const NhapKhoPrintPreview = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [phieu, setPhieu] = useState(null);
    const [congTy, setCongTy] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [resPhieu, resCongTy] = await Promise.all([
                    api.get(`/phieu-nhap-kho/${id}`),
                    api.get("/cong-ty"),
                ]);
                setPhieu(resPhieu.data?.data || resPhieu.data);
                setCongTy(resCongTy.data?.data || resCongTy.data);
            } catch (err) {
                console.error("Lỗi fetch:", err);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchData();
    }, [id]);

    if (loading) return <div className="p-4">Đang tải...</div>;
    if (!phieu) return <div className="p-4">Không tìm thấy phiếu nhập kho</div>;

    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    };

    const formatCurrency = (value) =>
        new Intl.NumberFormat("vi-VN").format(value || 0);

    const tienVatLieu = (phieu.danhSachVatLieu || []).reduce(
        (s, i) => s + (i.thanhTien || 0),
        0
    );
    const phiPhatSinh = Number(phieu.phiPhatSinh) || 0;
    const tongTien = tienVatLieu + phiPhatSinh;

    return (
        <div className="min-h-screen bg-gray-200">
            {/* Toolbar */}
            <div className="h-10 bg-sky-500 flex justify-between items-center px-4 print:hidden">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-white hover:text-gray-200 transition"
                    >
                        <ArrowBackIcon sx={{ fontSize: 20 }} />
                    </button>
                    <span className="text-white font-medium text-base">PHIẾU NHẬP KHO</span>
                </div>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1 text-white hover:text-gray-200 transition text-base"
                >
                    <LocalPrintshopIcon sx={{ fontSize: 20 }} />
                    In phiếu
                </button>
            </div>

            {/* Print area */}
            <div className="flex flex-col items-center py-6 px-4">
                <div
                    className="print-area bg-white shadow-lg border border-gray-300"
                    style={{
                        width: "210mm",
                        minHeight: "148mm",
                        padding: "8mm 10mm",
                        boxSizing: "border-box",
                    }}
                >
                    {/* Header */}
                    <div style={{ marginBottom: "2.5mm", display: "flex" }}>
                        <div style={{ flex: 2 }}>
                            <p style={{ margin: 0, fontWeight: "bold", fontSize: "9pt", textTransform: "uppercase" }}>
                                {congTy?.Ten || ""}
                            </p>
                            <p style={{ margin: "0.5mm 0 0", fontSize: "7.5pt" }}>{congTy?.DiaChi || ""}</p>
                            <p style={{ margin: "0.5mm 0 0", fontSize: "7.5pt" }}>SĐT: {congTy?.DienThoai || ""}</p>
                        </div>

                        <div style={{ flex: 1, textAlign: "right" }}>
                            <p style={{ margin: 0, fontWeight: "bold", fontSize: "9pt", textTransform: "uppercase" }}>
                                {phieu?.nhaCungCap?.ten || ""}
                            </p>
                        </div>
                    </div>

                    {/* Title */}
                    <div style={{ textAlign: "center", margin: "2mm 0 3mm" }}>
                        <h1 style={{ margin: 0, fontSize: "13pt", fontWeight: "bold", textTransform: "uppercase" }}>
                            PHIẾU NHẬP KHO
                        </h1>
                        <div style={{ fontSize: "8pt", marginTop: "0.5mm", color: "#555" }}>
                            Số phiếu: {phieu.soPhieu || "—"}
                        </div>
                        <div style={{ fontSize: "8pt", color: "#555" }}>
                            Ngày tạo: {formatDate(phieu.ngayTao)}
                        </div>
                    </div>

                    {/* Info */}
                    <div style={{ fontSize: "9pt", lineHeight: "1.5", marginBottom: "2.5mm" }}>
                        <div>
                            <p style={{ minWidth: "100px", display: "inline-block", margin: 0 }}>Người lập phiếu:</p>
                            {phieu.nguoiTao || "—"}
                        </div>
                        {phieu.ghiChu && (
                            <div>
                                <span style={{ minWidth: "100px", display: "inline-block" }}>Ghi chú:</span>
                                <span>{phieu.ghiChu}</span>
                            </div>
                        )}
                    </div>

                    {/* Table */}
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "8.5pt",
                            marginBottom: "2.5mm",
                        }}
                    >
                        <thead>
                            <tr>
                                <th style={thStyle({ textAlign: "center", width: "7%" })}>STT</th>
                                <th style={thStyle({ textAlign: "left", width: "35%" })}>Tên vật liệu</th>
                                <th style={thStyle({ textAlign: "left", width: "14%" })}>ĐVT</th>
                                <th style={thStyle({ textAlign: "center", width: "9%" })}>SL</th>
                                <th style={thStyle({ textAlign: "right", width: "18%" })}>Đơn giá</th>
                                <th style={thStyle({ textAlign: "right", width: "18%" })}>Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(phieu.danhSachVatLieu || []).map((item, i) => (
                                <tr key={i}>
                                    <td style={tdStyle({ textAlign: "center" })}>{i + 1}</td>
                                    <td style={tdStyle()}>{item.vatLieu?.tenVatLieu || "—"}</td>
                                    <td style={tdStyle()}>{item.vatLieu?.donViTinh || "—"}</td>
                                    <td style={tdStyle({ textAlign: "center" })}>{item.soLuong}</td>
                                    <td style={tdStyle({ textAlign: "right" })}>
                                        {formatCurrency(item.donGia)} ₫
                                    </td>
                                    <td style={tdStyle({ textAlign: "right" })}>
                                        {formatCurrency(item.thanhTien)} ₫
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            {phiPhatSinh > 0 && (
                                <>
                                    <tr>
                                        <td style={tdStyle({ textAlign: "center" })} colSpan={5}>
                                            Tiền vật liệu
                                        </td>
                                        <td style={tdStyle({ textAlign: "right" })}>
                                            {formatCurrency(tienVatLieu)} ₫
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={tdStyle({ textAlign: "center" })} colSpan={5}>
                                            Phí phát sinh
                                            {phieu.lyDoPhiPhatSinh ? ` (${phieu.lyDoPhiPhatSinh})` : ""}
                                        </td>
                                        <td style={tdStyle({ textAlign: "right" })}>
                                            {formatCurrency(phiPhatSinh)} ₫
                                        </td>
                                    </tr>
                                </>
                            )}
                            <tr style={{ fontWeight: "bold" }}>
                                <td style={tdStyle({ textAlign: "center" })} colSpan={5}>
                                    Tổng cộng
                                </td>
                                <td style={tdStyle({ textAlign: "right" })}>
                                    {formatCurrency(tongTien)} ₫
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* Signatures */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginTop: "3mm",
                            fontSize: "8.5pt",
                            textAlign: "center",
                        }}
                    >
                        <div style={{ width: "30%" }}>
                            <div style={{ fontWeight: "bold" }}>Người lập phiếu</div>
                            <div style={{ fontSize: "7pt", color: "#555", marginBottom: "7mm" }}>(Ký, họ tên)</div>
                            <div>{phieu.nguoiTao || ""}</div>
                        </div>
                        <div style={{ width: "30%" }}>
                            <div style={{ fontWeight: "bold" }}>Thủ kho</div>
                            <div style={{ fontSize: "7pt", color: "#555", marginBottom: "7mm" }}>(Ký, họ tên)</div>
                            <div>&nbsp;</div>
                        </div>
                        <div style={{ width: "30%" }}>
                            <div style={{ fontWeight: "bold" }}>Giám đốc</div>
                            <div style={{ fontSize: "7pt", color: "#555", marginBottom: "7mm" }}>(Ký, họ tên)</div>
                            <div>&nbsp;</div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    body { background: white; }
                    .print\\:hidden { display: none !important; }
                    .print-area {
                        box-shadow: none !important;
                        border: none !important;
                        width: 100% !important;
                        min-height: 0 !important;
                        padding: 6mm 8mm !important;
                    }
                    @page { size: A5 landscape; margin: 8mm; }
                }
            `}</style>
        </div>
    );
};

const thStyle = (extra = {}) => ({
    border: "1px solid #aaa",
    padding: "1.5mm 2mm",
    fontWeight: "bold",
    ...extra,
});

const tdStyle = (extra = {}) => ({
    border: "1px solid #aaa",
    padding: "1.2mm 2mm",
    ...extra,
});

export default NhapKhoPrintPreview;