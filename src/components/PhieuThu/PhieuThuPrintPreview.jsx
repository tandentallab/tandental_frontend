import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../config/api";
import { numberToWords } from "../../utils/numberToWords";

// Ưu tiên userAgentData.mobile, fallback regex UA (iPad đời mới báo UA desktop → coi là máy tính)
const isMobileDevice = () => {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.userAgentData?.mobile === "boolean") return navigator.userAgentData.mobile;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
};

const copyToClipboard = async (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    if (!document.execCommand("copy")) throw new Error("execCommand copy thất bại");
  } finally {
    document.body.removeChild(textarea);
  }
};

const PhieuThuPrintPreview = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [phieuThu, setPhieuThu] = useState(null);
  const [congTy, setCongTy] = useState(null);
  const [isMobile] = useState(isMobileDevice);

  // Scale phiếu (rộng cố định 210mm) cho vừa chiều rộng màn hình
  const containerRef = useRef(null);
  const paperRef = useRef(null);
  const [paperSize, setPaperSize] = useState({ scale: 1, width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    const paper = paperRef.current;
    if (!container || !paper) return;

    const update = () => {
      const width = paper.offsetWidth;
      const height = paper.offsetHeight;
      const scale = width > 0 ? Math.min(1, container.clientWidth / width) : 1;
      setPaperSize({ scale, width, height });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    ro.observe(paper);
    return () => ro.disconnect();
  }, [loading, phieuThu]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [resPhieu, resCongTy] = await Promise.all([
          api.get(`/phieu-thu/${id}`),
          api.get("/cong-ty"),
        ]);
        setPhieuThu(resPhieu.data?.data || resPhieu.data);
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
  if (!phieuThu) return <div className="p-4">Không tìm thấy phiếu thu</div>;

  const danhSachHoaDon = phieuThu.danhSachHoaDon || [];
  const firstHoaDon = danhSachHoaDon[0]?.hoaDon || {};
  const nhaKhoa = firstHoaDon.nhaKhoa || {};
  const bacSi = phieuThu.bacSi || {};
  const diaChiNhaKhoa = [
    nhaKhoa.diaChiCuThe,
    nhaKhoa.quanHuyen,
    nhaKhoa.tinh,
    nhaKhoa.quocGia,
  ]
    .filter(Boolean)
    .join(", ");

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("vi-VN").format(value || 0);
  };

  const getDayName = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const days = [
      "Chủ Nhật",
      "Thứ Hai",
      "Thứ Ba",
      "Thứ Tư",
      "Thứ Năm",
      "Thứ Sáu",
      "Thứ Bảy",
    ];
    return days[d.getDay()];
  };

  const maPhieuThu = phieuThu.soPhieuThu || `PT${phieuThu._id.substring(phieuThu._id.length - 8).toUpperCase()}`;
  const printDate = phieuThu.ngayThu || phieuThu.ngayTao || new Date();
  const soTienText = numberToWords(phieuThu.soTienThu);

  const handleShare = async () => {
    const url = window.location.href;
    if (isMobile && navigator.share) {
      try {
        await navigator.share({ title: `Phiếu thu ${maPhieuThu}`, url });
      } catch (err) {
        if (err?.name !== "AbortError") toast.error("Không thể chia sẻ liên kết");
      }
      return;
    }
    try {
      await copyToClipboard(url);
      toast.success("Đã sao chép liên kết");
    } catch (err) {
      console.error("Lỗi sao chép:", err);
      toast.error("Không thể sao chép liên kết");
    }
  };

  return (
    <div className="min-h-screen bg-gray-200">
      <div className="h-10 bg-[#00a8ff] flex justify-between items-center px-4">
        <span className="text-white font-medium text-base">PHIẾU THU</span>
        <button
          onClick={() => navigate(-1)}
          className="text-white text-2xl font-bold leading-none hover:text-gray-200 transition"
        >
          &times;
        </button>
      </div>

      <div className="flex flex-col items-center py-6 px-4">
        <div ref={containerRef} className="w-full flex justify-center">
        <div
          className="print-scale-wrapper"
          style={paperSize.width ? { width: paperSize.width * paperSize.scale, height: paperSize.height * paperSize.scale } : undefined}
        >
        <div ref={paperRef} className="print-area bg-white shadow-lg border border-gray-300" style={{ width: "210mm", fontFamily: "Cambria", padding: "10mm", display: "flex", flexDirection: "column", transform: `scale(${paperSize.scale})`, transformOrigin: "top left" }}>
          {/* Header */}
          <div style={{ marginBottom: "6mm" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "3mm" }}>
              <div style={{ flex: 2 }}>
                <p style={{ margin: 0, fontWeight: "bold", fontSize: "11pt", textTransform: "uppercase" }}>{congTy?.Ten || ""}</p>
                <p style={{ fontSize: "9pt" }}>{congTy?.DiaChi || ""}</p>
              </div>
              <div style={{ marginTop: "1mm", flex: 1, textAlign: "right", fontSize: "9pt" }}>
                <div>QĐ số 15/2006/QĐ-BTC</div>
                <div>ngày 20/03/2006 của BTC</div>
              </div>
            </div>
            <div style={{ borderTop: "1px solid #ccc", paddingTop: "3mm", textAlign: "center" }}>
              <h1 style={{ margin: "0 0", fontSize: "15pt", fontWeight: "bold", textTransform: "uppercase" }}>PHIẾU THU</h1>
              <div style={{ fontSize: "9pt" }}>{maPhieuThu}</div>
              <div style={{ fontSize: "9pt" }}>{getDayName(printDate)}, {formatDate(printDate)}</div>
            </div>
          </div>

          {/* Thông tin người nộp */}
          <div style={{ marginBottom: "3mm", fontSize: "11pt", lineHeight: "2" }}>
            <div style={{ display: "flex", gap: "4px" }}>
              <span style={{ minWidth: "105px" }}>Người nộp tiền:</span>
              <strong>{bacSi.hoVaTen || nhaKhoa.hoVaTen || "---"}</strong>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              <span style={{ minWidth: "105px" }}>Địa chỉ:</span>
              <strong>{diaChiNhaKhoa || "---"}</strong>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              <span style={{ minWidth: "105px" }}>Nội dung thu:</span>
              <strong>{phieuThu.noiDung || "---"}</strong>
            </div>
            <div style={{ display: "flex", gap: "4px", alignItems: "baseline" }}>
              <span style={{ minWidth: "105px" }}>Số tiền thu:</span>
              <strong style={{ fontSize: "11pt", width: "3cm", display: "inline-block" }}>{formatCurrency(phieuThu.soTienThu)} đ</strong>
              <span style={{ marginLeft: "20px" }}>Bằng chữ:</span>
              <strong style={{ fontSize: "11pt", flex: 1 }}>{soTienText}</strong>
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
                {danhSachHoaDon.map((item, idx) => {
                  const hd = item.hoaDon || {};
                  const soTienThanhToan = item.soTienThanhToan || 0;
                  const daTTruocLanNay = item.daTTruocLanNay || 0;
                  return (
                    <tr key={hd._id || idx}>
                      <td style={{ border: "1px solid #999", padding: "1.5mm 2mm" }}>
                        {hd.soHoaDon || (hd._id ? `TAN${hd._id.substring(hd._id.length - 8).toUpperCase()}` : "---")}
                      </td>
                      <td style={{ border: "1px solid #999", padding: "1.5mm 2mm", textAlign: "right" }}>{formatCurrency(hd.giaTriThanhToan || 0)}</td>
                      <td style={{ border: "1px solid #999", padding: "1.5mm 2mm", textAlign: "right" }}>{formatCurrency(daTTruocLanNay)}</td>
                      <td style={{ border: "1px solid #999", padding: "1.5mm 2mm", textAlign: "right" }}>{formatCurrency((hd.giaTriThanhToan || 0) - daTTruocLanNay)}</td>
                      <td style={{ border: "1px solid #999", padding: "1.5mm 2mm", textAlign: "right" }}>{formatCurrency(soTienThanhToan)}</td>
                    </tr>
                  );
                })}
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
        </div>

        {/* Print / Share Buttons */}
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => window.print()}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            In phiếu thu
          </button>
          <button
            onClick={handleShare}
            className="px-6 py-2 bg-white text-blue-600 border border-blue-500 rounded hover:bg-blue-50"
          >
            {isMobile ? "Chia sẻ" : "Sao chép liên kết"}
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A5 landscape; margin: 0; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area {
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
            transform: none !important;
          }
        }
      `}</style>
    </div >
  );
};

export default PhieuThuPrintPreview;