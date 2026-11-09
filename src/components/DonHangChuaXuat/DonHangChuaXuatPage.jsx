import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, CircularProgress } from "@mui/material";
import DonHangChuaXuatTable from "./DonHangChuaXuatTable";
import DonHangChuaXuatSidebar from "./DonHangChuaXuatFilter";
import XuatHoaDonDialog from "./XuatHoaDonDialog";
import HoaDonLuuTamDialog from "./HoaDonLuuTamDialog";
import {
  fetchCountDonHangChuaXuat,
  fetchDonHangChuaHoaDon,
  fetchNgayXuatHoaDonGanNhatAll,
} from "../../redux/slices/hoaDonSlice";
import { fetchAllBangGia } from "../../redux/slices/bangGiaSlice";

export default function DonHangChuaXuatPage() {
  const dispatch = useDispatch();

  const { loadingMeta } = useSelector((state) => state.hoaDon);
  const { loading: loadingBangGia } = useSelector((state) => state.bangGia);
  const isInitialLoading = loadingMeta || loadingBangGia;

  // 1. Khởi tạo trực tiếp từ sessionStorage
  const [selectedClinic, setSelectedClinic] = useState(() => {
    return sessionStorage.getItem("donHang_selectedClinic") || null;
  });
  // Đơn đã chọn của MỌI nha khoa — giữ nguyên khi chuyển sang nha khoa khác.
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [xuatHoaDon, setXuatHoaDon] = useState(null); // { tuNgay, denNgay } khi đang mở
  const [moLuuTam, setMoLuuTam] = useState(false);

  const soDonDaChonTheoNhaKhoa = useMemo(() => {
    const map = {};
    selectedOrders.forEach((o) => {
      const id = o.nhaKhoa?._id || o.nhaKhoa;
      map[id] = (map[id] || 0) + 1;
    });
    return map;
  }, [selectedOrders]);

  const taiLaiDanhSach = useCallback(() => {
    dispatch(fetchCountDonHangChuaXuat());
    dispatch(fetchNgayXuatHoaDonGanNhatAll());
    dispatch(fetchAllBangGia());
    if (selectedClinic) dispatch(fetchDonHangChuaHoaDon(selectedClinic));
  }, [dispatch, selectedClinic]);

  // Bỏ chọn các đơn đã được tạo hóa đơn.
  const handleDaThayDoi = useCallback(({ nhaKhoaDaTao = [] } = {}) => {
    if (nhaKhoaDaTao.length > 0) {
      const daTao = new Set(nhaKhoaDaTao);
      setSelectedOrders((prev) => prev.filter((o) => !daTao.has(o.nhaKhoa?._id || o.nhaKhoa)));
    }
    taiLaiDanhSach();
  }, [taiLaiDanhSach]);

  // 2. Thêm useEffect để lưu trữ mỗi khi state thay đổi
  useEffect(() => {
    if (selectedClinic) {
      sessionStorage.setItem("donHang_selectedClinic", selectedClinic);
    } else {
      sessionStorage.removeItem("donHang_selectedClinic");
    }
  }, [selectedClinic]);

  // Chỉ fetch metadata cho sidebar + bảng giá
  // Đơn hàng sẽ được fetch lazy khi user click vào từng nha khoa
  useEffect(() => {
    dispatch(fetchCountDonHangChuaXuat());
    dispatch(fetchNgayXuatHoaDonGanNhatAll());
    dispatch(fetchAllBangGia());
  }, [dispatch]);

  return (
    <div
      className="flex flex-col md:flex-row bg-white flex-1 overflow-hidden relative"
      style={{ maxHeight: 'calc(100vh - 70px)' }}
    >
      {isInitialLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm gap-3">
          <CircularProgress size={32} sx={{ color: "#00a8df" }} />
          <span className="text-base text-gray-500">Đang tải dữ liệu...</span>
        </div>
      )}
      <div className="w-full md:w-auto md:h-full max-h-[35vh] md:max-h-none flex-shrink-0 border-b md:border-b-0 md:border-r overflow-y-auto">
        <DonHangChuaXuatSidebar
          selectedClinic={selectedClinic}
          setSelectedClinic={setSelectedClinic}
          soDonDaChonTheoNhaKhoa={soDonDaChonTheoNhaKhoa}
        />
      </div>

      <div className="flex-1 flex flex-col md:overflow-hidden md:min-h-0 pt-2 md:pt-0 min-h-[580px]">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base">Chờ xuất Hóa đơn</span>
          </div>
          <Button variant="outlined" size="small" onClick={() => setMoLuuTam(true)}>
            Hóa đơn lưu tạm
          </Button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden min-h-[520px] md:min-h-0">
          <DonHangChuaXuatTable
            selectedClinic={selectedClinic}
            selectedOrders={selectedOrders}
            setSelectedOrders={setSelectedOrders}
            onTaoHoaDon={setXuatHoaDon}
          />
        </div>
      </div>

      <XuatHoaDonDialog
        open={Boolean(xuatHoaDon)}
        selectedOrders={selectedOrders}
        tuNgay={xuatHoaDon?.tuNgay}
        denNgay={xuatHoaDon?.denNgay}
        onClose={() => {
          setXuatHoaDon(null);
          dispatch(fetchAllBangGia()); // bước bảng giá riêng có thể đã thay dữ liệu giá
        }}
        onDaThayDoi={handleDaThayDoi}
      />
      <HoaDonLuuTamDialog open={moLuuTam} onClose={() => setMoLuuTam(false)} onDaThayDoi={taiLaiDanhSach} />
    </div>
  );
}