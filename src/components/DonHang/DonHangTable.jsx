import React, { useState, useEffect } from 'react';
import { getTenSanPhamDong } from "../../data/sanPhamConfig";

const DEFAULT_COL_WIDTHS = [135, 135, 200, 80, 200, 80, 120, 100, 50, 120, 120, 135];

const DonHangTable = ({ data, selectedId, onRowClick }) => {
    const isDataValid = Array.isArray(data);
    const renderData = isDataValid ? data : [];

    const [colWidths, setColWidths] = useState(DEFAULT_COL_WIDTHS);
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);

    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    const handleResizeMouseDown = (e, colIndex) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startWidth = colWidths[colIndex];

        const onMouseMove = (moveEvent) => {
            const newWidth = Math.max(60, startWidth + moveEvent.clientX - startX);
            setColWidths((prev) => {
                const next = [...prev];
                next[colIndex] = newWidth;
                return next;
            });
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const formatDateTime = (value) => {
        if (!value) return "";
        const d = new Date(value);
        if (isNaN(d.getTime())) return "";
        return d.toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatDate = (value) => {
        if (!value) return "";
        const d = new Date(value);
        if (isNaN(d.getTime())) return "";
        return d.toLocaleDateString("vi-VN");
    };

    const loaiDonPrefix = { "Mới": "Mới", "Hàng sửa": "Sửa", "Hàng làm lại": "Làm lại", "Hàng bảo hành": "Bảo hành" };

    const renderViTri = (viTri) => {
        if (!Array.isArray(viTri) || viTri.length === 0) return "";
        return viTri.map((vt) => {
            const soRang = vt?.soRang || [];
            if (soRang.length === 0) return "";
            if (vt?.kieu === "Cầu") {
                return `${soRang[0]}->${soRang[soRang.length - 1]}`;
            }
            return soRang.join(", ");
        }).filter(Boolean).join("; ");
    };

    const renderTomTatRang = (danhSachSanPham) => {
        if (!Array.isArray(danhSachSanPham) || danhSachSanPham.length === 0) return "";
        return danhSachSanPham.map((sp) => {
            const prefix = loaiDonPrefix[sp?.loaiDon] || "";
            const soLuong = sp?.soLuong || 1;
            const tenSanPham = getTenSanPhamDong(sp);
            return [prefix, " - ", soLuong, tenSanPham].filter(Boolean).join(" ");
        }).join(" | ");
    };

    const getMaDonHang = (dh) => dh?.maDonHang || `TAN${(dh?._id?.substring?.(dh._id.length - 8) || "").toUpperCase()}`;

    const totalWidth = colWidths.reduce((a, b) => a + b, 0);

    const ResizeHandle = ({ idx }) => (
        <div
            onMouseDown={(e) => handleResizeMouseDown(e, idx)}
            className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize group-hover:bg-blue-300 hover:bg-blue-400 active:bg-blue-500 z-20 transition-colors"
        />
    );

    const thBase = "px-3 py-3 select-none relative group overflow-hidden";

    const renderMobileOrders = renderData.flatMap((dh) => {
        if (!dh?.danhSachSanPham?.length) {
            return [{ ...dh, sanPham: null }];
        }

        return dh.danhSachSanPham.map((sp) => ({
            ...dh,
            sanPham: sp,
        }));
    });

    return (
        <div>
            {isMobile ? (
                /* ── MOBILE: Card list ── */
                <div>
                    {renderMobileOrders.length === 0 ? (
                        <p className="text-center py-8 text-gray-500 text-base">Không có dữ liệu đơn hàng</p>
                    ) : (
                        renderMobileOrders.map((dh, index) => (
                            <div
                                key={`${dh?._id || index}-${dh?.sanPham?._id || index}`}
                                onClick={() => onRowClick(dh)}
                                className={`mb-3 rounded-md shadow bg-white ${trangThaiTopBorder[dh?.trangThai] || ''}`}
                            >
                                <div className="flex items-center justify-between border-b border-b-gray-100 px-2 py-1 mb-1">
                                    <p className="text-gray-400">Số</p>
                                    <p>
                                        {getMaDonHang(dh)}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between border-b border-b-gray-100 px-2 py-1 mb-1">
                                    <p className="text-gray-400">Nhận lúc</p>
                                    <p>
                                        {formatDateTime(dh?.ngayNhan)}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between border-b border-b-gray-100 px-2 py-1 mb-1">
                                    <p className="text-gray-400">Nha khoa</p>
                                    <p>
                                        {dh?.nhaKhoa?.tenGiaoDich || dh?.nhaKhoa?.hoVaTen}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between border-b border-b-gray-100 px-2 py-1 mb-1">
                                    <p className="text-gray-400">Bác sĩ</p>
                                    <p>
                                        {dh?.bacSi?.hoVaTen}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between border-b border-b-gray-100 px-2 py-1 mb-1">
                                    <p className="text-gray-400">Bệnh nhân</p>
                                    <p>
                                        {dh?.benhNhan?.hoVaTen}
                                    </p>
                                </div>
                                {
                                    dh?.sanPham && (
                                        <div className="flex items-center justify-between border-b border-b-gray-100 px-2 py-1 mb-1">
                                            <p className="text-gray-400">Sản phẩm</p>
                                            <p>
                                                {renderTomTatRang([dh.sanPham])}
                                            </p>
                                        </div>
                                    )
                                }
                            </div>
                        ))
                    )}
                </div>
            ) : (
                /* ── DESKTOP: Table ── */
                <div className="overflow-x-auto">
                    <table
                        className="text-left bg-white border"
                        style={{ tableLayout: 'fixed', width: totalWidth, minWidth: '100%' }}
                    >
                        <colgroup>
                            {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
                        </colgroup>
                        <thead className="text-sky-500 font-medium border-b sticky top-0 z-10">
                            <tr>
                                <th className={thBase}>Nhận lúc<ResizeHandle idx={0} /></th>
                                <th className={thBase}>Số<ResizeHandle idx={1} /></th>
                                <th className={thBase}>Nha khoa<ResizeHandle idx={2} /></th>
                                <th className={`${thBase} hidden md:table-cell`}>Bác sĩ<ResizeHandle idx={3} /></th>
                                <th className={`${thBase} hidden md:table-cell`}>Bệnh nhân<ResizeHandle idx={4} /></th>
                                <th className={`${thBase} hidden lg:table-cell`}>Loại<ResizeHandle idx={5} /></th>
                                <th className={`${thBase} hidden lg:table-cell`}>Sản phẩm<ResizeHandle idx={6} /></th>
                                <th className={`${thBase} hidden lg:table-cell`}>Màu<ResizeHandle idx={7} /></th>
                                <th className={`${thBase} hidden lg:table-cell`}>S.L<ResizeHandle idx={8} /></th>
                                <th className={`${thBase} hidden lg:table-cell`}>Vị trí răng<ResizeHandle idx={9} /></th>
                                <th className={thBase}>Trạng thái<ResizeHandle idx={10} /></th>
                                <th className={thBase}>Hẹn giao<ResizeHandle idx={11} /></th>
                                <th className={`${thBase} hidden xl:table-cell`}>Ghi chú<ResizeHandle idx={12} /></th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700">
                            {renderData.length === 0 ? (
                                <tr>
                                    <td colSpan="13" className="text-center py-8 text-gray-500">
                                        Không có dữ liệu đơn hàng
                                    </td>
                                </tr>
                            ) : (() => {
                                const flatRows = renderData.flatMap((dh) => {
                                    const dssp = dh?.danhSachSanPham || [];
                                    if (dssp.length === 0) return [{ dh, sp: null, spIdx: 0 }];
                                    return dssp.map((sp, spIdx) => ({ dh, sp, spIdx }));
                                });
                                return flatRows.map(({ dh, sp, spIdx }) => (
                                    <tr
                                        key={`${dh?._id || Math.random()}_${spIdx}`}
                                        className={`border-b cursor-pointer transition-colors ${selectedId === dh?._id ? 'bg-sky-200 border-sky-200' : 'hover:bg-gray-50'}`}
                                        onClick={() => onRowClick(dh)}
                                    >
                                        <td className="px-3 truncate">{formatDateTime(dh?.ngayNhan)}</td>
                                        <td className="px-3 truncate">{getMaDonHang(dh)}</td>
                                        <td className="px-3 truncate">{dh?.nhaKhoa?.tenGiaoDich || dh?.nhaKhoa?.hoVaTen}</td>
                                        <td className="px-3 truncate hidden md:table-cell">{dh?.bacSi?.hoVaTen}</td>
                                        <td className="px-3 truncate hidden md:table-cell">{dh?.benhNhan?.hoVaTen}</td>
                                        <td className="px-3 truncate hidden lg:table-cell">{sp ? (loaiDonPrefix[sp?.loaiDon] || "Mới") : ""}</td>
                                        <td className="px-3 py-2 hidden lg:table-cell">
                                            <div className="truncate">{getTenSanPhamDong(sp)}</div>
                                        </td>
                                        <td className="px-3 py-2 truncate hidden lg:table-cell">{sp?.mau || ""}</td>
                                        <td className="px-3 py-2 truncate hidden lg:table-cell text-center">{sp ? (sp?.soLuong || 1) : ""}</td>
                                        <td className="px-3 py-2 hidden lg:table-cell">
                                            {(sp?.sanPham?.loaiTinh === "Răng" || sp?.sanPham?.loaiTinh === "Răng (không đếm)")
                                                ? <div className="truncate">{sp ? renderViTri(sp?.viTri) : ""}</div>
                                                : <div className="truncate">{sp ? (sp?.viTriText || "") : ""}</div>
                                            }
                                        </td>
                                        <td className="px-3 truncate text-white"><TrangThaiBadge value={dh?.trangThai} /></td>
                                        <td className="px-3 truncate">{formatDateTime(dh?.henGiao)}</td>
                                        <td className="px-3 truncate hidden xl:table-cell" title={dh?.ghiChuChung || ""}>{dh?.ghiChuChung || ""}</td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const TrangThaiBadge = ({ value }) => {
    const map = {
        "Chờ xử lý": "bg-yellow-500",
        "Đang sản xuất": "bg-blue-500",
        "Đang thử": "bg-purple-500",
        "Hoàn thành": "bg-green-500",
    };
    return (
        <span className={`px-2 py-1 font-medium ${map[value] || 'bg-gray-100 text-gray-600'}`}>
            {value || 'Chờ xử lý'}
        </span>
    );
};

const trangThaiTopBorder = {
    "Chờ xử lý": "border-t-2 border-yellow-500",
    "Đang sản xuất": "border-t-2 border-blue-500",
    "Đang thử": "border-t-2 border-purple-500",
    "Hoàn thành": "border-t-2 border-green-500",
};

export default DonHangTable;
