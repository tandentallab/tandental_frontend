import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import HoaDonPrintSheet from "../components/HoaDon/HoaDonPrintSheet";

// Phần nặng của việc tạo PDF (html2canvas + jsPDF), chỉ tải khi thực sự xuất —
// xem taiPdfHoaDon trong hoaDonPdf.js.

// Khổ A4 ngang, lề 10mm như bản in.
const PAGE_W_MM = 297;
const PAGE_H_MM = 210;
const MARGIN_MM = 10;
// Bề rộng nội dung khi dựng ảnh (~277mm ở 96dpi), giữ bố cục giống bản in.
const SHEET_WIDTH_PX = 1047;
const RENDER_SCALE = 2;

// Vị trí ngắt trang an toàn (đáy mỗi dòng bảng), tính theo pixel của ảnh.
function layDiemNgatTrang(container) {
  const top = container.getBoundingClientRect().top;
  return [...container.querySelectorAll("tr")]
    .map((tr) => Math.round((tr.getBoundingClientRect().bottom - top) * RENDER_SCALE))
    .sort((a, b) => a - b);
}

function canvasThanhPdf(canvas, diemNgat) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  const contentW = PAGE_W_MM - MARGIN_MM * 2;
  const contentH = PAGE_H_MM - MARGIN_MM * 2;
  const mmPerPx = contentW / canvas.width;
  const pageHPx = Math.floor(contentH / mmPerPx);

  let start = 0;
  let first = true;
  while (start < canvas.height) {
    let end = Math.min(start + pageHPx, canvas.height);
    if (end < canvas.height) {
      // Ngắt ở đáy dòng gần nhất để không cắt ngang một dòng.
      const ngat = diemNgat.filter((y) => y > start && y <= end).pop();
      if (ngat) end = ngat;
    }

    const page = document.createElement("canvas");
    page.width = canvas.width;
    page.height = end - start;
    const ctx = page.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, page.width, page.height);
    ctx.drawImage(canvas, 0, start, canvas.width, page.height, 0, 0, canvas.width, page.height);

    if (!first) pdf.addPage();
    pdf.addImage(page.toDataURL("image/jpeg", 0.92), "JPEG", MARGIN_MM, MARGIN_MM, contentW, page.height * mmPerPx);
    first = false;
    start = end;
  }
  return pdf.output("blob");
}

export async function taoPdfHoaDon({ hoaDon, nhaKhoaInfo, company }) {
  const host = document.createElement("div");
  Object.assign(host.style, { position: "fixed", left: "-100000px", top: "0", width: `${SHEET_WIDTH_PX}px` });
  document.body.appendChild(host);
  const root = createRoot(host);

  // Tailwind đặt img { display: block } khiến html2canvas đo sai đường chân chữ
  // (nó chèn tạm vào body một div ẩn, nowrap, chứa span + img để đo), chữ bị vẽ
  // lệch xuống đè lên đường kẻ ô. Selector chỉ khớp phần tử đo đó, và chỉ bật
  // trong lúc tạo PDF.
  const suaDoChu = document.createElement("style");
  suaDoChu.textContent = 'body > div[style*="white-space: nowrap"] > img { display: inline !important; }';
  document.head.appendChild(suaDoChu);

  try {
    flushSync(() => {
      root.render(
        <div style={{ background: "#ffffff", color: "#000000", fontFamily: "'Cambria', serif", fontSize: "10.5pt" }}>
          <HoaDonPrintSheet hoaDon={hoaDon} nhaKhoaInfo={nhaKhoaInfo} company={company} />
        </div>
      );
    });
    if (document.fonts?.ready) await document.fonts.ready;

    const sheet = host.firstElementChild;
    const diemNgat = layDiemNgatTrang(sheet);
    const canvas = await html2canvas(sheet, { scale: RENDER_SCALE, backgroundColor: "#ffffff", logging: false });
    return canvasThanhPdf(canvas, diemNgat);
  } finally {
    root.unmount();
    host.remove();
    suaDoChu.remove();
  }
}

