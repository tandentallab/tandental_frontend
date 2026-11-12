import dayjs from 'dayjs';

// In phiếu tóm tắt năng suất ngay (không trang xem trước).
// Khổ & kiểu chữ giống "Phiếu giao hàng": rộng 72mm, Cambria 13px, sát lề trái.
// In qua iframe ẩn để không bị CSS in của trang báo cáo (A4) chi phối.

const fmt = (n) => (n || 0).toLocaleString('vi-VN');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const ROWS = [
    { key: 'moi', label: 'Mới' },
    { key: 'sua', label: 'Sửa' },
    { key: 'lamLaiBaoHanh', label: 'Làm lại/BH' },
];

const buildHtml = ({ company, rangeText, tongHop }) => {
    const row = (label, b, isTong) => `
        <tr class="${isTong ? 'tong' : ''}">
            <td>${esc(label)}</td>
            <td class="num">${fmt(b.hopKim)}</td>
            <td class="num">${fmt(b.toanSu)}</td>
            <td class="num b">${fmt(b.tong)}</td>
        </tr>`;

    return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>Phiếu năng suất</title>
<style>
    html, body { margin: 0; padding: 0; background: #fff; color: #000; }
    .print-area {
        width: 72mm; margin-left: 0; margin-right: auto;
        padding: 4mm 0; box-sizing: border-box;
        font-family: Cambria, Georgia, serif; font-size: 13px; line-height: 1.5;
    }
    .center { text-align: center; }
    .title { font-weight: 700; font-size: 16px; }
    .mt2 { margin-top: 8px; }
    .dash { border-bottom: 1px dashed #6b7280; margin-top: 8px; }
    .line { border-bottom: 1px solid #d1d5db; margin-top: 12px; }
    table { width: 100%; table-layout: fixed; border-collapse: collapse; margin-top: 12px; }
    th, td { padding: 4px 0; }
    th { font-weight: 700; text-align: left; border-bottom: 1px solid #6b7280; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .b { font-weight: 700; }
    tr.tong td { font-weight: 700; border-top: 1px solid #6b7280; }
</style>
</head>
<body>
<div class="print-area">
    <div class="center">
        ${company?.Ten ? `<div class="title">${esc(company.Ten)}</div>` : ''}
        ${company?.DienThoai ? `<div style="font-size:16px">Điện thoại: ${esc(company.DienThoai)}</div>` : ''}
        <div class="title mt2">BÁO CÁO NĂNG SUẤT</div>
        <div>${esc(rangeText)}</div>
        <div class="dash"></div>
    </div>
    <table>
        <colgroup>
            <col style="width:34%" /><col style="width:21%" /><col style="width:21%" /><col style="width:24%" />
        </colgroup>
        <thead>
            <tr><th>Loại</th><th class="num">HK</th><th class="num">TS</th><th class="num">Tổng</th></tr>
        </thead>
        <tbody>
            ${ROWS.map((r) => row(r.label, tongHop[r.key], false)).join('')}
            ${row('Tổng cộng', tongHop.tong, true)}
        </tbody>
    </table>
    <div class="line"></div>
    <div class="center mt2">In lúc ${dayjs().format('HH:mm DD/MM/YYYY')}</div>
</div>
</body>
</html>`;
};

export const printPhieuNangSuat = (data) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    Object.assign(iframe.style, {
        position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0',
    });
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    const doc = win.document;
    doc.open();
    doc.write(buildHtml(data));
    doc.close();

    const cleanup = () => setTimeout(() => iframe.remove(), 500);
    win.onafterprint = cleanup;

    // Đợi font/bố cục sẵn sàng rồi mở hộp thoại in
    setTimeout(() => {
        win.focus();
        win.print();
        // Dự phòng cho trình duyệt không bắn onafterprint
        setTimeout(() => { if (document.body.contains(iframe)) iframe.remove(); }, 60000);
    }, 150);
};
