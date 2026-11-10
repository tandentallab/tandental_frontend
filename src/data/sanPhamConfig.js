// File: src/data/sanPhamConfig.js

export const LOAI_TINH_OPTIONS = [
    "Khác", "Răng", "Răng (không đếm)", "Bán hàm", "Hàm"
];

export const LOAI_SAN_PHAM_OPTIONS = [
    "Cố định", "Miễn phí", "Tháo lắp"
];

export const NHOM_SAN_PHAM_OPTIONS = [
    "Dịch vụ miễn phí", "Gia Công Sườn", "Mua giùm nha khoa", "Report Hợp Kim", "Report Toàn Sứ", "Tháo Lắp"
];

// Nhóm sản phẩm đại diện: khi tạo đơn nhập tay đơn giá + ghi chú (= tên món hàng)
export const NHOM_MUA_GIUM = "Mua giùm nha khoa";

// Tên hiển thị của 1 dòng sản phẩm trong đơn hàng (sanPham đã populate).
// Mua giùm nha khoa → "Mua giùm nha khoa: <ghi chú>" để thấy được tên món hàng.
export const getTenSanPhamDong = (sp) => {
    const ten = sp?.sanPham?.tenSanPham || "";
    if (sp?.sanPham?.nhomSanPham === NHOM_MUA_GIUM && sp?.ghiChu) return `${ten}: ${sp.ghiChu}`;
    return ten;
};

export const LOAI_OPTIONS = [
    "Sản xuất", "Dịch vụ"
];