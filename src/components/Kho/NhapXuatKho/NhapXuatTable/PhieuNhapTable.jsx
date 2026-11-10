import { useRef, useEffect } from "react";
import { rowBase, borderBottom, imBg, formatNgay } from "./constants";

export default function PhieuNhapTable({ data, selectedId, onRowClick, hasMore, loadingMore, onLoadMore, onToggleVAT }) {
    const sentinelRef = useRef(null);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el || !onLoadMore) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) onLoadMore();
            },
            { threshold: 0.1 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasMore, loadingMore, onLoadMore]);

    return (
        <div className="flex flex-col flex-1 min-w-0">
            <div className="max-h-[600px] overflow-y-auto table-scroll">

                {/* ── TABLE — desktop (sm+) ── */}
                <table className="hidden sm:table w-full border-collapse text-base text-left bg-white">
                    <thead className="sticky top-0 z-10">
                        <tr className="shadow">
                            <th className={`${rowBase} ${imBg} w-40 truncate`}>Ngày nhập</th>
                            <th className={`${rowBase} ${imBg} w-36 truncate`}>Số phiếu</th>
                            <th className={`${rowBase} ${imBg}`}>Nhà cung cấp</th>
                            <th className={`${rowBase} ${imBg} w-36 truncate relative`}>Thành tiền</th>
                            <th className={`${rowBase} ${imBg} w-14`}>VAT</th>
                            <th className={`${rowBase} ${imBg} w-36 truncate`}>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr>
                                <td className={`${rowBase} text-gray-400`} colSpan={6}>Không có dữ liệu</td>
                            </tr>
                        ) : data.map((row) => {
                            const nccTen = row.nhaCungCap?.ten || "—";
                            const isSelected = row._id === selectedId;
                            return (
                                <tr
                                    key={row._id}
                                    onClick={() => onRowClick(row)}
                                    className={`cursor-pointer transition-colors ${isSelected ? "bg-sky-50" : "hover:bg-gray-50"}`}
                                >
                                    <td className={`${rowBase} ${borderBottom}`}>{formatNgay(row.ngayTao)}</td>
                                    <td className={`${rowBase} ${borderBottom}`}>{row.soPhieu}</td>
                                    <td className={`${rowBase} ${borderBottom}`}>{nccTen}</td>
                                    <td className={`${rowBase} ${borderBottom}`}>
                                        {(row.tongTien || 0).toLocaleString("vi-VN")}
                                    </td>
                                    <td
                                        className={`${borderBottom} pl-3`}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <label class="checkbox">
                                            <input
                                                type="checkbox"
                                                checked={!!row.VAT}
                                                onChange={(e) => onToggleVAT?.(row, e.target.checked)}
                                            />
                                            <span class="checkmark"></span>
                                        </label>
                                    </td>
                                    <td className={`${rowBase} ${borderBottom}`}>
                                        <div className="flex flex-col gap-1">
                                            <span className={`text-sm text-white font-medium px-1 py-0.5 w-fit ${row.trangThaiNhap === "Đã nhận" ? "bg-green-500" : "bg-yellow-500"
                                                }`}>
                                                {row.trangThaiNhap}
                                            </span>
                                            <span className={`text-sm text-white font-medium px-1 py-0.5 w-fit ${row.trangThaiThanhToan === "Đã thanh toán" ? "bg-green-500" : "bg-orange-400"
                                                }`}>
                                                {row.trangThaiThanhToan}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* ── CARD LIST — mobile (< sm) ── */}
                <div className="sm:hidden flex flex-col gap-2 p-2 bg-gray-50">
                    {data.length === 0 ? (
                        <p className="text-base text-gray-400 text-center py-6">Không có dữ liệu</p>
                    ) : data.map((row) => {
                        const nccTen = row.nhaCungCap?.ten || "—";
                        const isSelected = row._id === selectedId;
                        return (
                            <div
                                key={row._id}
                                onClick={() => onRowClick(row)}
                                className={`cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition-colors ${isSelected ? "border-sky-400 bg-sky-50" : "border-gray-200"}`}
                            >
                                {/* Header row: số phiếu + trạng thái */}
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-base text-gray-800">{row.soPhieu}</span>
                                    <div className="flex flex-col gap-1 items-end">
                                        <span className={`text-base text-white font-medium px-2 py-0.5 rounded ${row.trangThaiNhap === "Đã nhận" ? "bg-green-500" : "bg-yellow-500"
                                            }`}>
                                            {row.trangThaiNhap}
                                        </span>
                                        <span className={`text-base text-white font-medium px-2 py-0.5 rounded ${row.trangThaiThanhToan === "Đã thanh toán" ? "bg-green-500" : "bg-orange-400"
                                            }`}>
                                            {row.trangThaiThanhToan}
                                        </span>
                                    </div>
                                </div>
                                {/* Details */}
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-base text-gray-600">
                                    <span className="text-gray-400">Ngày nhập</span>
                                    <span>{formatNgay(row.ngayTao)}</span>

                                    <span className="text-gray-400">Nhà cung cấp</span>
                                    <span className="truncate">{nccTen}</span>

                                    <span className="text-gray-400">Thành tiền</span>
                                    <span className="font-medium text-gray-800">
                                        {(row.tongTien || 0).toLocaleString("vi-VN")} ₫
                                    </span>

                                    <span className="text-gray-400">VAT</span>
                                    <span onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={!!row.VAT}
                                            onChange={(e) => onToggleVAT?.(row, e.target.checked)}
                                            className="h-4 w-4 cursor-pointer accent-sky-500"
                                        />
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Sentinel */}
            <div ref={sentinelRef} className="h-1" />
        </div>
    );
}