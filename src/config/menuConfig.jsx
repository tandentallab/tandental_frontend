import React from "react";
import {
  Dashboard,
  ShoppingCart,
  LocalHospital,
  Contacts,
  People,
  Assignment,
  Receipt,
  BarChart,
  Settings,
  Category,
  AccountTree,
  ReceiptLong,
  CreditCard,
  AccountBalance, // 1. Import thêm icon AccountBalance
} from "@mui/icons-material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import PaymentsIcon from "@mui/icons-material/Payments";
import BadgeIcon from "@mui/icons-material/Badge";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import HistoryIcon from "@mui/icons-material/History";
import EventRepeatIcon from "@mui/icons-material/EventRepeat";

export const MAIN_MENU = [
  { name: "Thống kê", router: "/", icon: <Dashboard /> },
  { name: "Đơn Hàng", router: "/don-hang", icon: <ShoppingCart /> },
  {
    name: "Kế Hoạch Giao Hàng",
    router: "/ke-hoach-giao-hang",
    icon: <Assignment />,
  },
  {
    name: "Đơn hẹn lại",
    router: "/don-hen-lai",
    icon: <EventRepeatIcon />,
  },
  {
    name: "Chờ xuất hóa đơn",
    router: "/cho-xuat-hoa-don",
    icon: <ReceiptLong />,
  },
  { name: "Hóa Đơn", router: "/hoa-don", icon: <RequestQuoteIcon /> },
  {
    name: "Phiếu Thu",
    router: "/phieu-thu",
    icon: <AccountBalanceWalletIcon />,
  },
  { name: "Phiếu Bảo Hành", router: "/phieu-bao-hanh", icon: <Receipt /> },
  {
    name: "Mẫu Thẻ Bảo Hành",
    router: "/mau-the-bao-hanh",
    icon: <CreditCard />,
  },
  { name: "Sản Phẩm", router: "/san-pham", icon: <Category /> },
  { name: "Công Đoạn", router: "/cong-doan", icon: <AccountTree /> },
  { name: "Kho", router: "/kho", icon: <Inventory2Icon /> },
];

export const CUSTOMER_MENU = [
  { name: "Nha Khoa", router: "/nha-khoa", icon: <LocalHospital /> },
  { name: "Người liên hệ", router: "/nguoi-lien-he", icon: <Contacts /> },
  { name: "Bệnh nhân", router: "/benh-nhan", icon: <People /> },
];

export const OTHER_MENU = [
  { name: "Báo Cáo", router: "/bao-cao", icon: <BarChart /> },
  {
    name: "Báo cáo doanh thu",
    router: "/doanh-thu",
    icon: <AttachMoneyIcon />,
  },
  { name: "Nhân viên", router: "/nhan-vien", icon: <BadgeIcon /> },
  { name: "Bảng lương", router: "/bang-luong", icon: <PaymentsIcon /> },
  { name: "Lịch sử lương", router: "/lich-su-luong", icon: <HistoryIcon /> },
  { name: "Chi phí", router: "/chi-phi", icon: <AccountBalance /> }, // 2. Thêm menu Chi phí vào đây
];

export const SETTING_MENU = [
  { name: "Tài khoản", router: "/tai-khoan", icon: <People /> },
  { name: "Công ty", router: "/cong-ty", icon: <LocalHospital /> },
  { name: "Quyền sử dụng", router: "/quyen-su-dung", icon: <People /> },
];

export const ALL_MENUS = [
  { title: "Menu Chính", items: MAIN_MENU },
  { title: "Khách Hàng", items: CUSTOMER_MENU },
  {
    title: "Khác",
    items: [
      ...OTHER_MENU,
      { name: "Ghi chú", router: "/ghi-chu", icon: <Assignment /> },
    ],
  },
  { title: "Thiết Lập", items: SETTING_MENU },
];
