// In bảng năng suất — cùng form với bản in "Kế hoạch giao hàng":
// A4 ngang, lề 5mm, tiêu đề in hoa căn giữa, bảng viền đen, ô đệm 2px 4px, chữ 12px.
// In qua iframe ẩn → mở hộp thoại in ngay, không bị CSS in của trang báo cáo chi phối.

const fmt = (n) => (n || 0).toLocaleString('vi-VN');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const LOAI = [
    { key: 'moi', label: 'Mới' },
    { key: 'sua', label: 'Sửa' },
    { key: 'lamLaiBaoHanh', label: 'Làm lại / Bảo hành' },
];

const cells = (b) => [
    ...LOAI.flatMap((l) => [b[l.key].hopKim, b[l.key].toanSu]),
    b.tong.hopKim, b.tong.toanSu, b.tong.tong,
];

const buildHtml = ({ rangeText, rows, tongHop, isMonthly, fontFamily }) => {
    const bodyRows = rows.map((r) => `
        <tr>
            <td class="c nowrap">${esc(r.label)}</td>
            ${cells(r).map((v, i, a) => `<td class="n${i === a.length - 1 ? ' b' : ''}">${fmt(v)}</td>`).join('')}
        </tr>`).join('');

    return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>Báo cáo năng suất</title>
<style>
    @page { size: A4 landscape; margin: 5mm; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: ${fontFamily}; }
    h2 { margin: 0 0 2px 0; text-align: center; font-size: 16px; font-weight: bold; text-transform: uppercase; }
    .sub { margin: 0 0 6px 0; text-align: center; font-size: 12px; }
    table { width: 100%; table-layout: fixed; border-collapse: collapse; margin: 0; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    td, th { border: 1px solid black; padding: 2px 4px; font-size: 12px; line-height: 1.25; vertical-align: middle; }
    th { background-color: #f3f4f6; font-weight: bold; text-align: center;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    th.sub2 { font-weight: normal; }
    .c { text-align: center; }
    .n { text-align: right; font-variant-numeric: tabular-nums; }
    .b { font-weight: bold; }
    .nowrap { white-space: nowrap; }
    tr.tong td { font-weight: bold; background-color: #f3f4f6;
                 -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style>
</head>
<body>
    <h2>Báo cáo năng suất</h2>
    <p class="sub">Ngày hẹn giao: ${esc(rangeText)}</p>
    <table>
        <colgroup>
            <col style="width:12%" />
            ${'<col />'.repeat(9)}
        </colgroup>
        <thead>
            <tr>
                <th rowspan="2">${isMonthly ? 'Tháng' : 'Ngày'}</th>
                ${LOAI.map((l) => `<th colspan="2">${l.label}</th>`).join('')}
                <th colspan="3">Tổng</th>
            </tr>
            <tr>
                ${LOAI.map(() => '<th class="sub2">Hợp Kim</th><th class="sub2">Toàn Sứ</th>').join('')}
                <th class="sub2">Hợp Kim</th><th class="sub2">Toàn Sứ</th><th>Tổng</th>
            </tr>
        </thead>
        <tbody>
            ${bodyRows || '<tr><td colspan="10" class="c">Không có số liệu</td></tr>'}
            <tr class="tong">
                <td class="c">Tổng</td>
                ${cells(tongHop).map((v) => `<td class="n">${fmt(v)}</td>`).join('')}
            </tr>
        </tbody>
    </table>
</body>
</html>`;
};

export const printBangNangSuat = ({ rangeText, rows, tongHop, isMonthly }) => {
    const fontFamily = getComputedStyle(document.body).fontFamily || 'Arial, sans-serif';

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    Object.assign(iframe.style, {
        position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0',
    });
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    const doc = win.document;
    doc.open();
    doc.write(buildHtml({ rangeText, rows, tongHop, isMonthly, fontFamily }));
    doc.close();

    win.onafterprint = () => setTimeout(() => iframe.remove(), 500);

    setTimeout(() => {
        win.focus();
        win.print();
        // Dự phòng cho trình duyệt không bắn onafterprint
        setTimeout(() => { if (document.body.contains(iframe)) iframe.remove(); }, 60000);
    }, 150);
};
