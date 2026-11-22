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

// Hỏi thư mục lưu MỘT lần cho cả lượt xuất (Chrome/Edge). Phải gọi ngay trong
// sự kiện click, trước mọi await. Trả về:
//   - handle thư mục: các file sau ghi thẳng vào đó, không hỏi lại;
//   - null: trình duyệt không hỗ trợ → tải về như thường (Downloads).
// Người dùng bấm Huỷ → ném lỗi AbortError để dừng lượt xuất.
export async function chonThuMucLuu() {
  if (typeof window === "undefined" || typeof window.showDirectoryPicker !== "function") return null;
  return window.showDirectoryPicker({ id: "hoa-don-pdf", mode: "readwrite", startIn: "downloads" });
}

export const laHuyChonThuMuc = (err) => err?.name === "AbortError";

async function tonTai(thuMuc, ten) {
  try {
    await thuMuc.getFileHandle(ten);
    return true;
  } catch {
    return false;
  }
}

// Không ghi đè file sẵn có trong thư mục: thêm " (1)", " (2)"... như trình duyệt.
async function tenChuaDung(thuMuc, tenFile) {
  if (!(await tonTai(thuMuc, tenFile))) return tenFile;
  const goc = tenFile.replace(/\.pdf$/i, "");
  for (let i = 1; ; i++) {
    const ten = `${goc} (${i}).pdf`;
    if (!(await tonTai(thuMuc, ten))) return ten;
  }
}

async function ghiVaoThuMuc(thuMuc, tenFile, blob) {
  const ten = await tenChuaDung(thuMuc, tenFile);
  const fileHandle = await thuMuc.getFileHandle(ten, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
  return ten;
}

// Tạo PDF rồi lưu. Có thuMuc (từ chonThuMucLuu) thì ghi thẳng vào thư mục đó;
// không có thì tải về như file thông thường. Trả về tên file thực tế đã lưu.
export async function taiPdfHoaDon(hoaDonId, tenFile, thuMuc = null) {
  const [{ taoPdfHoaDon }, duLieu] = await Promise.all([import("./hoaDonPdfRender"), taiDuLieuInHoaDon(hoaDonId)]);
  const blob = await taoPdfHoaDon(duLieu);
  if (thuMuc) return ghiVaoThuMuc(thuMuc, tenFile, blob);
  taiXuong(tenFile, blob);
  return tenFile;
}
