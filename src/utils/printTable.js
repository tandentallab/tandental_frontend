import { format, parseISO } from "date-fns";

// Khổ in A4 ngang, lề 5mm mỗi bên → 287mm ≈ 1084px CSS
export const PRINT_PAGE_WIDTH = 1080;
const PRINT_FONT_SIZE = 12;
const CELL_EXTRA = 14; // padding 4px × 2 + viền + dư an toàn

// Thời gian rút gọn cho bản in: HH:mm dd/MM/yy
export const fmtPrintDT = (d) => {
  if (!d) return "—";
  const date = typeof d === "string" ? parseISO(d) : new Date(d);
  return isNaN(date.getTime()) ? "—" : format(date, "HH:mm dd/MM/yy");
};

// Số đơn cho bản in: bỏ tiền tố "TAN"
export const printMaDon = (order) => {
  const ma =
    order.maDonHang ||
    String(order._id).substring(String(order._id).length - 8).toUpperCase();
  return String(ma).replace(/^TAN/i, "");
};

let canvasCtx = null;
const measure = (text, bold) => {
  if (!canvasCtx) canvasCtx = document.createElement("canvas").getContext("2d");
  const family = getComputedStyle(document.body).fontFamily || "Arial, sans-serif";
  canvasCtx.font = `${bold ? "bold " : ""}${PRINT_FONT_SIZE}px ${family}`;
  return canvasCtx.measureText(String(text ?? "")).width;
};

/**
 * Tính độ rộng cột cho bảng in.
 * cols: mỗi phần tử là
 *   - "nowrap"  : rộng đúng bằng nội dung dài nhất, không bao giờ xuống hàng
 *   - "flex"    : cột Răng, lấy toàn bộ phần còn lại (trả về null)
 *   - number    : cột chữ, rộng theo nội dung dài nhất nhưng tối đa = số này;
 *                 chỉ nội dung vượt mức tối đa mới xuống hàng (vẫn hiện đủ)
 * rows: mảng các dòng, mỗi dòng là mảng chuỗi theo thứ tự cột
 */
export const calcPrintColWidths = (headers, rows, cols, minFlex = 220) => {
  const widths = cols.map((type, i) => {
    if (type === "flex") return null;
    let need = measure(headers[i], true);
    rows.forEach((r) => {
      need = Math.max(need, measure(r[i], false));
    });
    need = Math.ceil(need + CELL_EXTRA);
    return type === "nowrap" ? need : Math.min(need, type);
  });

  // Không đủ chỗ cho cột Răng → thu nhỏ đều các cột chữ (cột "nowrap" giữ nguyên)
  const fixedSum = widths.reduce((s, w) => s + (w || 0), 0);
  const overflow = fixedSum - (PRINT_PAGE_WIDTH - minFlex);
  if (overflow > 0) {
    const wrapIdx = cols.map((t, i) => (typeof t === "number" ? i : -1)).filter((i) => i >= 0);
    const wrapSum = wrapIdx.reduce((s, i) => s + widths[i], 0);
    if (wrapSum > 0) {
      const ratio = Math.max(0.4, (wrapSum - overflow) / wrapSum);
      wrapIdx.forEach((i) => {
        widths[i] = Math.max(60, Math.floor(widths[i] * ratio));
      });
    }
  }
  return widths;
};

// CSS dùng chung cho thân bảng in (scope = selector của vùng in)
export const printTableCss = (scope) => `
  ${scope} table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; margin: 0 !important; padding: 0 !important; }
  ${scope} thead { display: table-header-group !important; }
  ${scope} tr { page-break-inside: avoid !important; break-inside: avoid !important; }
  ${scope} td, ${scope} th { border: 1px solid black !important; padding: 2px 4px !important; font-size: ${PRINT_FONT_SIZE}px !important; line-height: 1.25 !important; vertical-align: middle !important; white-space: normal !important; overflow-wrap: anywhere !important; overflow: visible !important; }
  ${scope} th { background-color: #f3f4f6 !important; font-weight: bold !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  ${scope} td.nowrap, ${scope} th.nowrap { white-space: nowrap !important; }
`;
