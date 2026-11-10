import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../config/api";
import { getTenSanPhamDong } from "../../data/sanPhamConfig";

const DonHangDeliveryNotePrintPreview = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [donHang, setDonHang] = useState(null);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [resDonHang, resCompany] = await Promise.all([
          api.get(`/donhang/${id}`),
          api.get('/cong-ty')
        ]);

        const donHangData = resDonHang.data?.data || resDonHang.data;
        if (donHangData) {
          setDonHang(donHangData);
        } else {
          console.error("Không có dữ liệu:", resDonHang.data);
        }

        if (resCompany.data && resCompany.data.data) {
          setCompany(resCompany.data.data);
        }
      } catch (err) {
        console.error("Lỗi fetch:", err.response?.status, err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <div className="p-4">Đang tải...</div>;
  if (!donHang) return <div className="p-4">Không tìm thấy đơn hàng</div>;

  const formatDateTime = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const nhaKhoaTen =
    donHang.nhaKhoa?.tenGiaoDich || donHang.nhaKhoa?.hoVaTen || "";
  const bacSi = donHang.bacSi?.hoVaTen || "";
  const benhNhan = donHang.benhNhan?.hoVaTen || "";

  const buildTeethTextWithR = (viTri = []) => {
    if (!Array.isArray(viTri)) return "";
    const parts = viTri
      .map((v) => {
        if (!Array.isArray(v.soRang) || v.soRang.length === 0) return "";
        if (v.soRang.length === 1) return `R${v.soRang[0]}`;
        return `R${v.soRang[0]}->${v.soRang[v.soRang.length - 1]}`;
      })
      .filter(Boolean);
    return parts.join("; ");
  };

  const sanPhamList = donHang.danhSachSanPham || [];
  const sanPhamText = sanPhamList
    .map((sp) => {
      // 1. Xác định Loại đơn hàng (Mới, Sửa, Làm lại, Bảo hành)
      let loaiPrefix = "";
      const loai = sp.loaiDon || "";
      if (loai === "Hàng sửa" || loai === "Sửa") {
        loaiPrefix = "Sửa ";
      } else if (loai === "Hàng làm lại" || loai === "Làm lại") {
        loaiPrefix = "Làm lại ";
      } else if (loai === "Hàng bảo hành" || loai === "Bảo hành" || loai === "Bảo hảnh") {
        loaiPrefix = "Bảo hành ";
      }

      // 2. Số lượng
      const soLuong = sp.soLuong || 1;

      // 3. Tên sản phẩm
      const ten = getTenSanPhamDong(sp);

      // 4. Vị trí răng (thêm chữ R vào trước)
      const viTriText = sp.viTriText || buildTeethTextWithR(sp.viTri || sp.viTriRang);

      // 5. Màu sắc (đặt trong dấu ngoặc tròn)
      const mau = sp.mau ? `(${sp.mau})` : "";

      const parts = [
        loaiPrefix ? loaiPrefix.trim() : "",
        soLuong,
        ten,
        viTriText,
        mau
      ].filter(Boolean);

      return parts.join(" ");
    })
    .filter(Boolean)
    .join("\n");

  const phuKienList = donHang.danhSachPhuKien || [];
  const phuKienText = phuKienList
    .map((pk) => `${pk.soLuong || 1} ${pk.tenPhuKien}`)
    .filter(Boolean)
    .join(", ");

  return (
    <div className="min-h-screen bg-gray-200">
      <div className="h-10 bg-[#00a8ff] flex justify-between items-center px-4">
        <span className="text-white font-medium text-base">Phiếu giao hàng</span>
        <button
          onClick={() => navigate(-1)}
          className="text-white text-2xl font-bold leading-none hover:text-gray-200 transition"
        >
          &times;
        </button>
      </div>

      <div className="flex flex-col items-center print:items-start py-6 px-4 print:p-0">
        <div
          className="print-area bg-white w-full max-w-[300px] shadow-lg border border-gray-400 p-6 print:p-0"
          style={{ fontFamily: "Cambria, Georgia, serif", fontSize: "13px" }}
        >
          <div className="text-center">
            <div className="font-bold text-base">{company?.Ten || ""}</div>
            <div className="text-base">{company?.DienThoai ? `Điện thoại: ${company.DienThoai}` : ""}</div>
            <div className="text-base font-bold mt-2">PHIẾU GIAO HÀNG</div>
            <div className="border-b border-dashed border-gray-500 mt-2" />
          </div>

          <div className="mt-3 grid grid-cols-[78px_1fr] gap-y-1">
            <span>Nha khoa:</span>
            <span className="font-bold">{nhaKhoaTen || "---"}</span>
            <span>Bác sĩ:</span>
            <span className="font-bold">{bacSi || "---"}</span>
            <span>Bệnh nhân:</span>
            <span className="font-bold">{benhNhan || "---"}</span>
            <span>Sản phẩm:</span>
            <span className="font-bold" style={{ whiteSpace: "pre-line" }}>{sanPhamText || "---"}</span>
          </div>

          <div className="border-b border-gray-300 mt-3" />
          <div className="mt-2 text-left">
            <span>Ghi chú SX: </span>
            <span className="font-bold">{donHang.ghiChuSanXuat || "---"}</span>
          </div>

          <div className="border-b border-gray-300 mt-3" />
          <div className="text-center mt-2">Xin cảm ơn quý Nha khoa!</div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            In trang này (Ctrl+P)
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition"
          >
            Quay lại
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          html, body {
            background: white !important;
          }
          .print-area {
            box-shadow: none !important;
            border: none !important;
            width: 72mm !important;
            max-width: 100% !important;
            margin-left: 0 !important;
            margin-right: auto !important;
            padding: 4mm 0 !important;
            box-sizing: border-box !important;
          }
          button {
            display: none !important;
          }
          .h-10, .mt-4 {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default DonHangDeliveryNotePrintPreview;
