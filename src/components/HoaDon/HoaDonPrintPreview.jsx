import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../config/api";
import { useDispatch } from "react-redux";
import { fetchNhaKhoa } from "../../redux/slices/nhaKhoaSlice";
import HoaDonPrintSheet from "./HoaDonPrintSheet";

const HoaDonPrintPreview = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [hoaDon, setHoaDon] = useState(null);
  const [nhaKhoaInfo, setNhaKhoaInfo] = useState(null);
  const [phieuThuList, setPhieuThuList] = useState([]);
  const [company, setCompany] = useState(null);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchNhaKhoa());
    const fetchCompany = async () => {
      try {
        const res = await api.get('/cong-ty');
        if (res.data && res.data.data) {
          setCompany(res.data.data);
        }
      } catch (e) {
        console.error("Lỗi fetch thông tin công ty:", e);
      }
    };
    fetchCompany();
  }, [dispatch]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/hoa-don/${id}`);
        const found = res.data?.data || res.data;

        if (found) {
          setHoaDon(found);

          // Lấy lịch sử phiếu thu về bản in để tổng hợp Đã thanh toán
          try {
            const ptRes = await api.get(`/phieu-thu/hoa-don/${id}`);
            setPhieuThuList(ptRes.data?.data || ptRes.data || []);
          } catch (e) {
            setPhieuThuList([]);
          }

          const nhaKhoaId = typeof found.nhaKhoa === "string" ? found.nhaKhoa : found.nhaKhoa?._id;
          if (nhaKhoaId) {
            try {
              const nkRes = await api.get(`/nha-khoa/${nhaKhoaId}`);
              setNhaKhoaInfo(nkRes.data?.data || nkRes.data);
            } catch (e) {
              setNhaKhoaInfo(found.nhaKhoa);
            }
          }
        }
      } catch (err) {
        console.error("Lỗi:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  if (loading) return <div className="p-4 text-center">Đang tải dữ liệu in...</div>;
  if (!hoaDon) return <div className="p-4 text-center">Không tìm thấy dữ liệu</div>;

  return (
    <div className="h-screen flex flex-col bg-gray-200 overflow-hidden">
      <div className="h-10 bg-[#00a8df] flex justify-between items-center px-4 shrink-0 print:hidden z-[1000]">
        <span className="text-white font-medium text-base tracking-wide uppercase">Xem trước hóa đơn</span>
        <button onClick={() => navigate(-1)} className="text-white text-2xl hover:opacity-80 leading-none">&times;</button>
      </div>

      <div className="flex-1 overflow-y-auto pt-6 px-4 pb-4 scrollbar-thin w-full">
        <div className="w-full flex justify-center">
          <div
            className="print-area bg-white w-full max-w-[297mm] shadow-lg p-4 mb-2"
            style={{ fontFamily: "'Cambria', serif", fontSize: "10.5pt" }}
          >
            <HoaDonPrintSheet hoaDon={hoaDon} nhaKhoaInfo={nhaKhoaInfo} company={company} />
          </div>
        </div>
      </div>

      <div className="h-16 bg-white border-t flex justify-center items-center gap-4 shrink-0 print:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
        <button
          onClick={() => window.print()}
          className="bg-green-600 text-white px-10 py-2 rounded shadow font-bold hover:bg-green-700 transition transform active:scale-95"
        >
          IN HÓA ĐƠN
        </button>
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-500 text-white px-10 py-2 rounded shadow font-bold hover:bg-gray-600 transition transform active:scale-95"
        >
          QUAY LẠI
        </button>
      </div>

      <style>{`
        @media print {
          @page { 
            size: A4 landscape;
            margin: 10mm; 
          }
          html, body {
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100% !important; 
            max-width: 100% !important;
            border: none !important; 
            margin: 0 !important; 
            padding: 16px !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          table { 
            width: 100% !important; 
            border-collapse: collapse !important; 
            page-break-inside: auto;
          }
          tr { page-break-inside: avoid; page-break-after: auto; }
          .bg-gray-100 { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-gray-200 { background-color: #e5e7eb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};

export default HoaDonPrintPreview;