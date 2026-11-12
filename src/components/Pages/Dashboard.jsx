import React, { useState, useEffect } from "react";
import { Box } from "@mui/material";
import { useTheme, useMediaQuery } from "@mui/material";
import Sidebar from "../Layout/Sidebar";
import Header from "../Layout/Header";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { getAuthSelector } from "../../redux/selector";
import {
  getDefaultPathForUser,
  hasRouteAccess,
} from "../../config/permissions";
import DonHangPage from "../DonHang/DonHangPage";
import DonHangForm from "../DonHang/DonHangForm";
import DonHangPrintPreview from "../DonHang/DonHangPrintPreview";
import DonHangDeliveryNotePrintPreview from "../DonHang/DonHangDeliveryNotePrintPreview";
import DashboardPage from "../Dashboard/DashboardPage";
import NhaKhoaPage from "../NhaKhoa/NhaKhoaPage";
import NguoiLienHePage from "../NguoiLienHe/NguoiLienHePage";
import BenhNhanPage from "../BenhNhan/BenhNhanPage";
import StaffPage from "../Staff/StaffPage";
import CongTy from "../Settings/CongTy";
import VaiTro from "../Settings/VaiTro";
import StaffProfile from "../Staff/StaffProfile";
import SanPhamPage from "../SanPham/SanPhamPage";
import CongDoanPage from "../CongDoan/CongDoanPage";
import HoaDonPage from "../HoaDon/HoaDonPage";
import DonHangChuaXuatPage from "../DonHangChuaXuat/DonHangChuaXuatPage";
import HoaDonDetail from "../HoaDon/HoaDonDetail";
import KeHoachGiaoHangTable from "../KeHoachGiaoHang/KeHoachGiaoHangTable";
import DonHenLaiPage from "../DonHenLai/DonHenLaiPage";
import HoaDonPrintPreview from "../HoaDon/HoaDonPrintPreview";
import BaoCaoDoanhThuPage from "../BaoCao/BaoCaoDoanhThuPage";
import BaoCaoKhachHangPage from "../BaoCao/BaoCaoKhachHangPage";
import DoanhSoKhachHangPage from "../BaoCao/DoanhSoKhachHangPage";
import DoanhSoSanPhamPage from "../BaoCao/DoanhSoSanPhamPage";
import DoanhSoThoiGianPage from "../BaoCao/DoanhSoThoiGianPage";
import NangSuatPage from "../BaoCao/NangSuatPage";
import BaoCaoPage from "../BaoCao/BaoCaoPage";
import PhieuThuPage from "../PhieuThu/PhieuThuPage";
import PhieuThuPrintPreview from "../PhieuThu/PhieuThuPrintPreview";
import NhanVienTable from "../NhanVien/NhanVienTable";
import BangLuongPage from "../BangLuong/BangLuongPage";
import PhieuBaoHanhPage from "../PhieuBaoHanh";
import MauTheBaoHanhPage from "../PhieuBaoHanh/MauTheBaoHanhPage";
import TextSnippetIcon from "@mui/icons-material/TextSnippet";
import NhanVienDetail from "../NhanVien/NhanVienDetail";
import GhiChuPage from "../GhiChu/GhiChuPage";
import NhaCungCapPage from "../NhaCungCap/NhaCungCapPage";
import KhoPage from "../Kho/KhoPage";
import NhapKhoPrintPreview from "../Kho/NhapXuatKho/NhapKhoPrintPreview";
import XuatKhoPrintPreview from "../Kho/NhapXuatKho/XuatKhoPrintPreview";
import NhapXuatPrintPreview from "../Kho/NhapXuatKho/NhapXuatPrintPreview";
import ChiPhiPage from "../ChiPhi/ChiPhiPage.jsx";
import LichSuLuongPage from "../BangLuong/LichSuLuongPage.jsx";

const Dashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [collapsed, setCollapsed] = useState(false);
  const { user } = useSelector(getAuthSelector);
  const location = useLocation();
  const isPrintPage = /\/(print|delivery-note)$/.test(location.pathname);
  const fallbackPath = getDefaultPathForUser(user);

  // Calculate responsive header height
  const getHeaderMarginTop = () => {
    // xs: 56px (Toolbar height) + 56px (search mobile) = 112px
    // sm+: Only Toolbar height (64px or 70px)
    // if (isMobile) {
    //   return 112; // 56 (toolbar) + 56 (search mobile)
    // }
    // On sm: 64px, on md+: 70px
    return 70;
  };

  const headerMarginTop = getHeaderMarginTop();

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    }
  }, [isMobile]);

  const renderProtected = (routePath, element) => {
    if (hasRouteAccess(user, routePath)) {
      return element;
    }

    return <Navigate to={fallbackPath} replace />;
  };

  return (
    <Box sx={{ display: "flex" }}>
      {!isPrintPage && (
        <Header onToggleSidebar={() => setCollapsed(!collapsed)} />
      )}
      {!isPrintPage && <Sidebar collapsed={collapsed} />}
      <Box
        component="main"
        className="bg-gray-100"
        sx={{
          transition: "all 0.3s",
          flexGrow: 1,
          minWidth: 0,
          mt: isPrintPage ? 0 : `${headerMarginTop}px`,
          minHeight: isPrintPage
            ? "100vh"
            : `calc(100vh - ${headerMarginTop}px)`,
          display: "flex",
          flexDirection: "column",
          transition: theme.transitions.create("margin-left", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Routes>
          <Route path="/" element={renderProtected("/", <DashboardPage />)} />
          <Route
            path="/don-hang/*"
            element={renderProtected("/don-hang", <DonHangPage />)}
          />
          <Route
            path="/donhang/create"
            element={renderProtected("/donhang", <DonHangForm />)}
          />
          <Route
            path="/donhang/:id/edit"
            element={renderProtected("/donhang", <DonHangForm />)}
          />
          <Route
            path="/donhang/:id/print"
            element={renderProtected("/donhang", <DonHangPrintPreview />)}
          />
          <Route
            path="/donhang/:id/delivery-note"
            element={renderProtected(
              "/donhang",
              <DonHangDeliveryNotePrintPreview />
            )}
          />
          <Route
            path="/phieu-bao-hanh"
            element={renderProtected("/phieu-bao-hanh", <PhieuBaoHanhPage />)}
          />
          <Route
            path="/mau-the-bao-hanh"
            element={renderProtected(
              "/mau-the-bao-hanh",
              <MauTheBaoHanhPage />
            )}
          />
          <Route
            path="/nha-khoa"
            element={renderProtected("/nha-khoa", <NhaKhoaPage />)}
          />
          <Route
            path="/nguoi-lien-he"
            element={renderProtected("/nguoi-lien-he", <NguoiLienHePage />)}
          />
          <Route
            path="/benh-nhan"
            element={renderProtected("/benh-nhan", <BenhNhanPage />)}
          />
          <Route
            path="/tai-khoan"
            element={renderProtected("/tai-khoan", <StaffPage />)}
          />
          <Route
            path="/cong-ty"
            element={renderProtected("/cong-ty", <CongTy />)}
          />
          <Route
            path="/quyen-su-dung"
            element={renderProtected("/quyen-su-dung", <VaiTro />)}
          />
          <Route
            path="/ho-so"
            element={renderProtected("/ho-so", <StaffProfile />)}
          />
          <Route
            path="/san-pham"
            element={renderProtected("/san-pham", <SanPhamPage />)}
          />
          <Route
            path="/cong-doan"
            element={renderProtected("/cong-doan", <CongDoanPage />)}
          />
          <Route
            path="/cho-xuat-hoa-don"
            element={renderProtected(
              "/cho-xuat-hoa-don",
              <DonHangChuaXuatPage />
            )}
          />
          <Route
            path="/hoa-don"
            element={renderProtected("/hoa-don", <HoaDonPage />)}
          />
          <Route
            path="/doanh-thu"
            element={renderProtected("/doanh-thu", <BaoCaoDoanhThuPage />)}
          />
          <Route
            path="/bao-cao/khach-hang"
            element={renderProtected("/bao-cao", <BaoCaoKhachHangPage />)}
          />
          <Route
            path="/bao-cao/doanh-so"
            element={renderProtected("/bao-cao", <DoanhSoKhachHangPage />)}
          />
          <Route
            path="/bao-cao/doanh-so-san-pham"
            element={renderProtected("/bao-cao", <DoanhSoSanPhamPage />)}
          />
          <Route
            path="/bao-cao/doanh-so-thoi-gian"
            element={renderProtected("/bao-cao", <DoanhSoThoiGianPage />)}
          />
          <Route
            path="/bao-cao/nang-suat"
            element={renderProtected("/bao-cao", <NangSuatPage />)}
          />
          <Route
            path="/bao-cao"
            element={renderProtected("/bao-cao", <BaoCaoPage />)}
          />

          <Route
            path="/chi-phi"
            element={renderProtected("/chi-phi", <ChiPhiPage />)}
          />
          <Route
            path="/phieu-bao-hanh"
            element={renderProtected("/phieu-bao-hanh", <PhieuBaoHanhPage />)}
          />
          <Route
            path="/mau-the-bao-hanh"
            element={renderProtected(
              "/mau-the-bao-hanh",
              <MauTheBaoHanhPage />
            )}
          />
          <Route
            path="/nha-khoa"
            element={renderProtected("/nha-khoa", <NhaKhoaPage />)}
          />
          <Route
            path="/nguoi-lien-he"
            element={renderProtected("/nguoi-lien-he", <NguoiLienHePage />)}
          />
          <Route
            path="/benh-nhan"
            element={renderProtected("/benh-nhan", <BenhNhanPage />)}
          />
          <Route
            path="/tai-khoan"
            element={renderProtected("/tai-khoan", <StaffPage />)}
          />
          <Route
            path="/cong-ty"
            element={renderProtected("/cong-ty", <CongTy />)}
          />
          <Route
            path="/quyen-su-dung"
            element={renderProtected("/quyen-su-dung", <VaiTro />)}
          />
          <Route
            path="/ho-so"
            element={renderProtected("/ho-so", <StaffProfile />)}
          />
          <Route
            path="/san-pham"
            element={renderProtected("/san-pham", <SanPhamPage />)}
          />
          <Route
            path="/cong-doan"
            element={renderProtected("/cong-doan", <CongDoanPage />)}
          />
          <Route
            path="/cho-xuat-hoa-don"
            element={renderProtected(
              "/cho-xuat-hoa-don",
              <DonHangChuaXuatPage />
            )}
          />
          {/* <Route path="/hoa-don" element={renderProtected("/hoa-don", <HoaDonTable />)} /> */}
          <Route
            path="/bao-cao"
            element={renderProtected("/bao-cao", <BaoCaoPage />)}
          />
          <Route
            path="/ke-hoach-giao-hang"
            element={renderProtected(
              "/ke-hoach-giao-hang",
              <KeHoachGiaoHangTable />
            )}
          />
          <Route
            path="/don-hen-lai"
            element={renderProtected("/don-hen-lai", <DonHenLaiPage />)}
          />
          <Route
            path="/hoa-don/:id/edit"
            element={renderProtected("/hoa-don", <HoaDonDetail></HoaDonDetail>)}
          ></Route>
          <Route
            path="/hoa-don/:id/print"
            element={renderProtected("/hoa-don", <HoaDonPrintPreview />)}
          />
          <Route
            path="/phieu-thu"
            element={renderProtected("/phieu-thu", <PhieuThuPage />)}
          />
          <Route
            path="/phieu-thu/:id/print"
            element={renderProtected("/phieu-thu", <PhieuThuPrintPreview />)}
          />
          <Route
            path="/nhan-vien"
            element={renderProtected(
              "/nhan-vien",
              <NhanVienTable></NhanVienTable>
            )}
          ></Route>
          <Route
            path="/lich-su-luong"
            element={renderProtected(
              "/lich-su-luong",
              <LichSuLuongPage></LichSuLuongPage>
            )}
          ></Route>
          <Route
            path="/nhan-vien/:id"
            element={renderProtected(
              "/nhan-vien",
              <NhanVienDetail></NhanVienDetail>
            )}
          ></Route>
          <Route
            path="/bang-luong"
            element={renderProtected(
              "/bang-luong",
              <BangLuongPage></BangLuongPage>
            )}
          ></Route>

          <Route
            path="/ghi-chu"
            element={renderProtected("/ghi-chu", <GhiChuPage></GhiChuPage>)}
          />
          <Route
            path="/kho"
            element={renderProtected("/kho", <KhoPage></KhoPage>)}
          />
          <Route
            path="/kho/phieu-nhap/:id/print"
            element={renderProtected("/kho", <NhapKhoPrintPreview />)}
          />
          <Route
            path="/kho/phieu-xuat/:id/print"
            element={renderProtected("/kho", <XuatKhoPrintPreview />)}
          />
          <Route
            path="/nhap-xuat/in-danh-sach"
            element={renderProtected("/kho", <NhapXuatPrintPreview />)}
          />

          <Route path="*" element={<Navigate to={fallbackPath} replace />} />
        </Routes>
      </Box>
    </Box>
  );
};

export default Dashboard;
