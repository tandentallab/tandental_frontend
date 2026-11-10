import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../config/api";
import { QRCodeSVG } from "qrcode.react";

import LocalPrintshopIcon from '@mui/icons-material/LocalPrintshop';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import { getTenSanPhamDong } from "../../data/sanPhamConfig";

const PRODUCTION_STAGE_CONFIG = {
  "Report Toàn Sứ": {
    stages: ["Đai", "CAD/CAM", "Sườn", "Đắp", "Mài"],
    percentages: [20, 30, 15, 15, 15],
  },
  "Report Hợp Kim": {
    stages: ["Đai", "Sáp", "Sườn", "Đắp", "Mài"],
    percentages: [20, 10, 20, 25, 25],
  },
};

const getActualProductionHours = (startValue, endValue) => {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (!startValue || !endValue || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;

  let totalMilliseconds = 0;
  const currentDay = new Date(start);
  currentDay.setHours(0, 0, 0, 0);
  const lastDay = new Date(end);
  lastDay.setHours(0, 0, 0, 0);

  while (currentDay <= lastDay) {
    const shiftStart = new Date(currentDay);
    shiftStart.setHours(8, 0, 0, 0);
    const shiftEnd = new Date(currentDay);
    shiftEnd.setHours(20, 0, 0, 0);
    const overlapStart = Math.max(start.getTime(), shiftStart.getTime());
    const overlapEnd = Math.min(end.getTime(), shiftEnd.getTime());
    if (overlapEnd > overlapStart) totalMilliseconds += overlapEnd - overlapStart;
    currentDay.setDate(currentDay.getDate() + 1);
  }

  return totalMilliseconds / (60 * 60 * 1000);
};

const addProductionHours = (startValue, hours) => {
  const result = new Date(startValue);
  let remainingMilliseconds = hours * 60 * 60 * 1000;

  while (remainingMilliseconds > 0) {
    const shiftStart = new Date(result);
    shiftStart.setHours(8, 0, 0, 0);
    const shiftEnd = new Date(result);
    shiftEnd.setHours(20, 0, 0, 0);

    if (result < shiftStart) {
      result.setHours(8, 0, 0, 0);
    } else if (result >= shiftEnd) {
      result.setDate(result.getDate() + 1);
      result.setHours(8, 0, 0, 0);
    } else {
      const availableMilliseconds = shiftEnd.getTime() - result.getTime();
      const elapsedMilliseconds = Math.min(remainingMilliseconds, availableMilliseconds);
      result.setTime(result.getTime() + elapsedMilliseconds);
      remainingMilliseconds -= elapsedMilliseconds;
      if (remainingMilliseconds < 1) remainingMilliseconds = 0;
    }
  }

  return result;
};

const getProductionStages = (donHang) => {
  const hasToanSu = (donHang.danhSachSanPham || []).some(
    (sp) => sp.sanPham?.nhomSanPham === "Report Toàn Sứ"
  );
  const group = hasToanSu ? "Report Toàn Sứ" : "Report Hợp Kim";
  const config = PRODUCTION_STAGE_CONFIG[group];
  if (!(donHang.danhSachSanPham || []).some((sp) => sp.sanPham?.nhomSanPham === group)) return [];

  const totalHours = getActualProductionHours(donHang.ngayNhan, donHang.henGiao);
  return config.stages.map((stage, index) => ({
    stage,
    percentage: config.percentages[index],
    hours: totalHours * config.percentages[index] / 100,
  }));
};

const DonHangPrintPreview = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [donHang, setDonHang] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/donhang/${id}`);
        // Handle both response structures
        const donHangData = res.data?.data || res.data;
        if (donHangData) {
          setDonHang(donHangData);
        } else {
          console.error("Không có dữ liệu trả về:", res.data);
        }
      } catch (err) {
        console.error("Lỗi fetch:", err.response?.status, err.message);
        if (err.response?.status === 404) {
          console.error("Không tìm thấy đơn hàng với ID:", id);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <div className="p-4">Đang tải...</div>;
  if (!donHang) return <div className="p-4">Không tìm thấy đơn hàng</div>;

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${min} - ${dd}/${mm}`;
  };

  const maDonHang = donHang.maDonHang || `TAN${donHang._id.substring(donHang._id.length - 8).toUpperCase()}`;

  const bacSi = donHang.bacSi?.hoVaTen || "";
  const benhNhan = donHang.benhNhan?.hoVaTen || "";
  const nhaKhoa =
    donHang.nhaKhoa?.tenGiaoDich || donHang.nhaKhoa?.hoVaTen || "";
  const productionStages = getProductionStages(donHang);
  let stageStartTime = new Date(donHang.ngayNhan);
  const orderDeadline = new Date(donHang.henGiao);
  const productionSchedule = productionStages.map((productionStage, index) => {
    const calculatedDeadline = addProductionHours(stageStartTime, productionStage.hours);
    const deadline = index === productionStages.length - 1
      ? new Date(Math.min(calculatedDeadline.getTime(), orderDeadline.getTime()))
      : calculatedDeadline;
    const schedule = {
      ...productionStage,
      startTime: stageStartTime,
      deadline,
    };
    stageStartTime = deadline;
    return {
      ...schedule,
    };
  });

  const buildTeethText = (viTri = []) => {
    if (!Array.isArray(viTri)) return "";
    const parts = viTri
      .map((v) => {
        if (!Array.isArray(v.soRang) || v.soRang.length === 0) return "";
        if (v.soRang.length === 1) return String(v.soRang[0]);
        return `${v.soRang[0]}->${v.soRang[v.soRang.length - 1]}`;
      })
      .filter(Boolean);
    return parts.join("; ");
  };

  return (
    <div className="min-h-screen bg-gray-300 relative">
      {/* Toolbar - chỉ hiện trên màn hình, ẩn khi in */}
      <div className="no-print h-10 bg-[#00a8ff] flex justify-between items-center px-4">
        <span className="text-white font-medium">PHIẾU CHỈ ĐỊNH</span>
        <button
          onClick={() => navigate(-1)}
          className="text-white text-2xl font-bold leading-none hover:text-gray-200 transition"
        >
          &times;
        </button>
      </div>

      <button
        onClick={() => window.print()}
        className="absolute bottom-5 right-5 w-12 h-12 text-white bg-green-600 shadow rounded-full"
        title="In"
      >
        <LocalPrintshopIcon />
      </button>

      {/* A5 preview wrapper */}
      <div className="flex justify-center py-6 px-4">
        <div
          className="print-area bg-white shadow-xl"
          style={{ width: "148mm", minHeight: "210mm", padding: "5mm", paddingTop: "20mm", fontFamily: "Segoe UI, serif", fontSize: "9pt", color: "#000", boxSizing: "border-box" }}
        >

          {/* Header: 3 cột */}
          <div style={{ display: "grid", gridTemplateColumns: "auto 50px auto", gap: "8px", marginBottom: "8px" }}>
            {/* Left */}
            <div>
              <div>
                <span style={{ display: "inline-block", minWidth: "80px" }}>Mã số: </span>
                <span style={{ fontWeight: "bold" }}>{maDonHang}</span>
              </div>
              <div>
                <span style={{ display: "inline-block", minWidth: "80px" }}>Nha khoa: </span>
                <span style={{ fontWeight: "bold" }}>{nhaKhoa || "---"}</span>
              </div>
              <div>
                <span style={{ display: "inline-block", minWidth: "80px" }}>Bác sĩ: </span>
                <span style={{ fontWeight: "bold" }}>{bacSi}</span>
              </div>
              <div>
                <span style={{ display: "inline-block", minWidth: "80px" }}>Bệnh nhân: </span>
                <span style={{ fontWeight: "bold" }}>{benhNhan}</span>
              </div>
            </div>

            {/* Center: QR */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "2px" }}>
              <QRCodeSVG value={maDonHang} size={56} level="L" />
            </div>

            {/* Right */}
            <div style={{ textAlign: "left", marginLeft: "auto" }}>
              <div>
                <span style={{ display: "inline-block", minWidth: "100px" }}>Nhận: </span>
                <span style={{ fontWeight: "bold" }}>{formatDateTime(donHang.ngayNhan)}</span>
              </div>
              <div>
                <span style={{ display: "inline-block", minWidth: "100px" }}>Giao: </span>
                <span style={{ fontWeight: "bold" }}>{formatDateTime(donHang.henGiao)}</span>
              </div>
              <div>
                <span style={{ display: "inline-block", minWidth: "100px" }}>Chỉ định giao: </span>
                <span style={{ fontWeight: "bold" }}>{(() => {
                  const allYct = (donHang.danhSachSanPham || []).flatMap(sp => sp.yeuCauThu || []);
                  if (donHang.trangThai === "Đang thử" && allYct.length > 0) {
                    const idx = donHang.buocThuHienTai ?? 0;
                    return allYct[idx]?.congDoan || "Hoàn thành";
                  }
                  return "Hoàn thành";
                })()}</span>
              </div>
            </div>
          </div>

          {/* Mốc thời gian sản xuất */}
          {productionStages.length > 0 && (
            <div className="mb-3 flex justify-between border border-black border-r-0">
              {productionSchedule.map(({ stage, deadline }) => (
                <div key={stage} className="flex-1 border-r border-black">
                  <div className="py-0.5 pl-1 border-b border-b-black">{stage}</div>
                  <div className="py-0.5 pl-1 font-bold">{formatDateTime(deadline)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Main product table */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px" }}>
            <thead>
              <tr style={{ borderTop: "1px solid #000", borderBottom: "1px solid #000" }}>
                <th style={{ border: "1px solid #000", padding: "0 6px", textAlign: "center", fontWeight: "normal", minWidth: "150px" }}>Loại phục hình</th>
                <th style={{ border: "1px solid #000", padding: "0 6px", textAlign: "center", fontWeight: "normal", width: "30px" }}>S.L</th>
                <th style={{ border: "1px solid #000", padding: "0 6px", textAlign: "center", fontWeight: "normal" }}>Răng</th>
                <th style={{ border: "1px solid #000", padding: "0 6px", textAlign: "center", fontWeight: "normal" }}>Màu</th>
                <th style={{ border: "1px solid #000", padding: "0 6px", textAlign: "center", fontWeight: "normal" }}>Loại</th>
              </tr>
            </thead>
            <tbody>
              {donHang.danhSachSanPham && donHang.danhSachSanPham.length > 0 ? (
                donHang.danhSachSanPham.map((sp, index) => (
                  <tr key={index}>
                    <td style={{ border: "1px solid #000", padding: "0 6px", fontWeight: "bold" }}>
                      {getTenSanPhamDong(sp) || "---"}
                    </td>
                    <td style={{ border: "1px solid #000", textAlign: "center", fontWeight: "bold" }}>
                      {sp.soLuong || 1}
                    </td>
                    <td style={{ border: "1px solid #000", textAlign: "center", fontWeight: "bold" }}>
                      {sp.viTriText || buildTeethText(sp.viTri) || ""}
                    </td>
                    <td style={{ border: "1px solid #000", textAlign: "center", fontWeight: "bold" }}>
                      {sp.mau || ""}
                    </td>
                    <td style={{ border: "1px solid #000", textAlign: "center", fontWeight: "bold" }}>
                      {
                        sp.loaiDon === "Hàng sửa" ? "Sửa" : sp.loaiDon === "Hàng bảo hành" ? "Bảo hành" : sp.loaiDon === "Hàng làm lại" ? "Làm lại" : "Mới"
                      }
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ border: "1px solid #000", padding: "6px", textAlign: "center" }}>---</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex justify-between gap-3">
            {/* Chỉ định / ghi chú */}
            <div className="w-2/3">
              {donHang.chiDinhBacSi && (
                <div style={{ marginBottom: "6px" }}>
                  <div>Chỉ định:</div>
                  <div style={{ fontWeight: "bold", whiteSpace: "pre-wrap" }}>{donHang.chiDinhBacSi}</div>
                </div>
              )}

              {donHang.nhaKhoa.moTa && (
                <div style={{ marginBottom: "6px" }}>
                  <div>Yêu cầu kỹ thuật:</div>
                  <div style={{ fontWeight: "bold", whiteSpace: "pre-wrap" }}>{donHang.nhaKhoa.moTa}</div>
                </div>
              )}
            </div>

            {/* Phụ kiện (chỉ hiện nếu có) */}
            {donHang.danhSachPhuKien && donHang.danhSachPhuKien.length > 0 && (
              <div className="w-1/3">
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ border: "1px solid #000", textAlign: "center", fontWeight: "normal" }}>Phụ kiện</th>
                      <th style={{ border: "1px solid #000", textAlign: "center", fontWeight: "normal" }}>S.L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donHang.danhSachPhuKien.map((pk, index) => (
                      <tr key={index}>
                        <td style={{ border: "1px solid #000", padding: "0 6px", fontWeight: "bold" }}>{pk.tenPhuKien}</td>
                        <td style={{ border: "1px solid #000", textAlign: "center", fontWeight: "bold" }}>{pk.soLuong}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A5 portrait;
            margin: 0;
          }
          html, body {
            background: white;
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          .print-area {
            box-shadow: none !important;
            width: 148mm !important;
            min-height: 210mm !important;
            padding: 10mm !important;
          }
          /* Hide everything except print-area */
          body > * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area {
            position: fixed;
            top: 2cm;
            left: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default DonHangPrintPreview;
