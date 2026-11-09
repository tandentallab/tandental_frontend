import { api } from "../config/api";

// Xuất hóa đơn ra file PDF theo đúng mẫu in "Giấy báo thanh toán" và tải về máy.

const VN_TZ = "Asia/Ho_Chi_Minh";

// [tên nha khoa]-[MM-YYYY].pdf, tháng theo giờ Việt Nam của ngày tạo hóa đơn.
export function tenFileHoaDon(tenNhaKhoa, ngayTao = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: VN_TZ, month: "2-digit", year: "numeric" })
    .formatToParts(new Date(ngayTao));
  const thang = parts.find((p) => p.type === "month").value;
  const nam = parts.find((p) => p.type === "year").value;

  const ten = String(tenNhaKhoa || "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/, "");

  return `${ten || "Hoa don"}-${thang}-${nam}.pdf`;
}

// Thêm " (2)", " (3)"... cho tên trùng để file sau không ghi đè file trước.
export function datTenKhongTrung(tenFiles) {
  const daDung = new Map();
  return tenFiles.map((ten) => {
    const key = ten.toLowerCase();
    const lan = (daDung.get(key) || 0) + 1;
    daDung.set(key, lan);
    return lan === 1 ? ten : ten.replace(/\.pdf$/i, ` (${lan}).pdf`);
  });
}

export async function taiDuLieuInHoaDon(hoaDonId) {
  const [hoaDonRes, companyRes] = await Promise.all([
    api.get(`/hoa-don/${hoaDonId}`),
    api.get("/cong-ty").catch(() => null),
  ]);
  const hoaDon = hoaDonRes.data?.data || hoaDonRes.data;
  return { hoaDon, nhaKhoaInfo: hoaDon?.nhaKhoa, company: companyRes?.data?.data || null };
}

function taiXuong(tenFile, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = tenFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Tạo PDF rồi tải về như mọi file thông thường. Nơi lưu do trình duyệt quyết
// định: mặc định vào Downloads; bật "Hỏi vị trí lưu từng tệp trước khi tải
// xuống" trong cài đặt trình duyệt để được chọn thư mục mỗi lần tải.
export async function taiPdfHoaDon(hoaDonId, tenFile) {
  const [{ taoPdfHoaDon }, duLieu] = await Promise.all([import("./hoaDonPdfRender"), taiDuLieuInHoaDon(hoaDonId)]);
  taiXuong(tenFile, await taoPdfHoaDon(duLieu));
}
