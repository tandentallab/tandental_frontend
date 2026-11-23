import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  MenuItem,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import PrintIcon from "@mui/icons-material/Print";
import { api } from "../../config/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchNhaKhoa } from "../../redux/slices/nhaKhoaSlice";
import ExportDateSelector from "../common/ExportDateSelector";
import { toISODateRange } from "../../utils/exportDatePresets";
import WarrantyCardPrint from "../DonHang/WarrantyCardPrint";
import PhieuBaoHanhModal from "../DonHang/PhieuBaoHanhModal";

// Helper functions (Giữ nguyên logic gốc)

const PAGE_SIZE = 30;

const formatDateVN = (dateValue) => {
  if (!dateValue) return "---";
  return new Date(dateValue).toLocaleDateString("vi-VN");
};

const PhieuBaoHanhPage = () => {
  const [phieuList, setPhieuList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Lazy loading: tải từng trang PAGE_SIZE phiếu, cuộn tới cuối thì tải tiếp
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const requestIdRef = useRef(0);
  const sentinelDesktopRef = useRef(null);
  const sentinelMobileRef = useRef(null);
  const hasMore = phieuList.length < totalCount;

  const [nhaKhoaFilter, setNhaKhoaFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState({ startDate: null, endDate: null });

  const dispatch = useDispatch();
  const nhaKhoaState = useSelector((state) => state.nhaKhoa);
  const nhaKhoaOptions = nhaKhoaState?.data || [];

  const [editingPhieu, setEditingPhieu] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [printPhieu, setPrintPhieu] = useState(null);

  const navigate = useNavigate();

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load danh sách phiếu bảo hành
  useEffect(() => {
    dispatch(fetchNhaKhoa());
  }, [dispatch]);

  // Tải 1 trang: trang 1 thay toàn bộ danh sách, trang sau nối thêm vào cuối.
  // requestId để bỏ kết quả cũ khi bộ lọc đổi giữa chừng.
  const loadPage = useCallback(
    async (pageNum) => {
      const requestId = ++requestIdRef.current;
      const laTrangDau = pageNum === 1;
      laTrangDau ? setLoading(true) : setLoadingMore(true);
      try {
        const dateRange = toISODateRange(dateFilter);
        const res = await api.get("/phieu-bao-hanh", {
          params: {
            page: pageNum,
            limit: PAGE_SIZE,
            search: debouncedSearch,
            nhaKhoaId: nhaKhoaFilter,
            fromDate: dateRange.fromISO,
            toDate: dateRange.toISO,
          },
        });
        if (requestId !== requestIdRef.current) return;
        if (res.data?.success) {
          const data = res.data.data || [];
          setPhieuList((prev) => {
            if (laTrangDau) return data;
            const daCo = new Set(prev.map((p) => p._id));
            return [...prev, ...data.filter((p) => !daCo.has(p._id))];
          });
          setTotalCount(res.data.total || 0);
          setPage(pageNum);
        } else {
          toast.error("Lỗi khi tải danh sách phiếu bảo hành");
        }
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        toast.error(error.response?.data?.message || "Lỗi khi tải dữ liệu");
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [debouncedSearch, nhaKhoaFilter, dateFilter]
  );

  // Đổi bộ lọc / làm mới → tải lại từ trang 1
  useEffect(() => {
    loadPage(1);
  }, [loadPage, reloadKey]);

  const loadPhieuList = () => setReloadKey((k) => k + 1);

  // Sentinel cuối danh sách vào viewport → tải trang tiếp theo
  useEffect(() => {
    const els = [sentinelDesktopRef.current, sentinelMobileRef.current].filter(Boolean);
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && hasMore && !loading && !loadingMore) {
          loadPage(page + 1);
        }
      },
      { rootMargin: "200px" }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, loadPage]);

  // Mở modal edit
  const handleOpenEdit = (phieu) => {
    setEditingPhieu(phieu);
    setIsEditModalOpen(true);
  };

  // Xóa phiếu bảo hành (Giữ nguyên)
  const handleDelete = async (phieuId) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa phiếu bảo hành này?")) return;

    try {
      const res = await api.delete(`/phieu-bao-hanh/${phieuId}`);
      if (res.data?.success) {
        toast.success("Xóa phiếu bảo hành thành công");
        // Bỏ khỏi danh sách tại chỗ để giữ vị trí cuộn
        setPhieuList((prev) => prev.filter((p) => p._id !== phieuId));
        setTotalCount((t) => Math.max(0, t - 1));
      } else {
        toast.error(res.data?.message || "Lỗi khi xóa");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi xóa");
    }
  };

  const conBaoHanh = (item) => new Date(item.baoHanhDen) >= new Date();

  const renderBadgeBH = (item) =>
    conBaoHanh(item) ? (
      <span className="text-[10px] leading-4 font-bold px-1 rounded bg-emerald-100 text-emerald-700 whitespace-nowrap">Còn BH</span>
    ) : (
      <span className="text-[10px] leading-4 font-bold px-1 rounded bg-rose-100 text-rose-700 whitespace-nowrap">Hết BH</span>
    );

  // 1 dòng / sản phẩm: tên · vị trí · SL · màu · thời hạn · trạng thái
  const renderItemBH = (item, idx) => (
    <div key={idx} className="flex flex-wrap items-center gap-x-2 leading-5 py-0.5">
      <span className="font-semibold text-slate-800">
        {idx + 1}. {item.tenSanPhamBaoHanh || item.sanPham?.tenSanPham || item.sanPham || "---"}
      </span>
      {(item.viTriRang || item.soLuong || item.mau) && (
        <span className="text-slate-500 text-sm">
          {[
            item.viTriRang && `Vị trí: ${item.viTriRang}`,
            item.soLuong && `SL: ${item.soLuong}`,
            item.mau && `Màu: ${item.mau}`,
          ].filter(Boolean).join(" · ")}
        </span>
      )}
      <span className="text-blue-700 text-sm whitespace-nowrap">
        {formatDateVN(item.baoHanhTu)} → {formatDateVN(item.baoHanhDen)}
      </span>
      {renderBadgeBH(item)}
    </div>
  );

  const moTraCuu = (phieu) => {
    const qrCode = phieu.maQR || phieu.maBaoHanh || "";
    window.open(`${window.location.origin}/tra-cuu-bao-hanh/?qrcode=${qrCode}`, "_blank");
  };

  const moDonHang = (phieu) => {
    if (phieu.donHang?._id) navigate(`/donhang/${phieu.donHang._id}/edit`);
  };

  // Dòng trạng thái cuối danh sách: đang tải thêm / đã hiển thị bao nhiêu
  const renderTrangThaiTai = () =>
    phieuList.length > 0 && (
      <div className="px-3 py-1.5 text-sm text-center text-slate-500 border-t border-slate-100 bg-white">
        {loadingMore
          ? "Đang tải thêm..."
          : hasMore
            ? `Đã hiển thị ${phieuList.length} / ${totalCount} phiếu — cuộn xuống để tải thêm`
            : `Đã hiển thị tất cả ${totalCount} phiếu`}
      </div>
    );

  const renderHanhDong = (phieu) => (
    <div className="flex justify-center items-center">
      <Tooltip title="Check thẻ bảo hành">
        <IconButton size="small" sx={{ p: 0.5 }} className="text-teal-600" onClick={() => moTraCuu(phieu)}>
          <QrCodeScannerIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="In thẻ bảo hành">
        <IconButton size="small" sx={{ p: 0.5 }} className="text-purple-600" onClick={() => setPrintPhieu(phieu)}>
          <PrintIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Chỉnh sửa">
        <IconButton size="small" sx={{ p: 0.5 }} className="text-blue-600" onClick={() => handleOpenEdit(phieu)}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Xóa bỏ">
        <IconButton size="small" sx={{ p: 0.5 }} className="text-rose-600" onClick={() => handleDelete(phieu._id)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </div>
  );

  return (
    <div className="p-3 bg-gray-100">
      {/* Bộ lọc: 1 hàng trên desktop */}
      <div className="mb-3 bg-white p-2.5 rounded-lg shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center gap-2">
        <div className="w-full md:w-auto">
          <ExportDateSelector
            placeholder="Chọn ngày tạo"
            value={dateFilter}
            onChange={(dates) => {
              setDateFilter(dates);
            }}
          />
        </div>
        <TextField
          select
          size="small"
          value={nhaKhoaFilter}
          onChange={(e) => {
            setNhaKhoaFilter(e.target.value);
          }}
          className="w-full md:w-60 bg-slate-50/50 rounded-lg"
          SelectProps={{
            displayEmpty: true,
          }}
        >
          <MenuItem value="all">
            <span className="text-slate-500">Tất cả nha khoa</span>
          </MenuItem>
          {nhaKhoaOptions.map((nk) => (
            <MenuItem key={nk._id} value={nk._id}>
              {nk.tenNhaKhoa || nk.hoVaTen || "Không tên"}
            </MenuItem>
          ))}
        </TextField>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TextField
            placeholder="Tìm theo mã phiếu, mã đơn hàng, tên bệnh nhân..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
            size="small"
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon className="text-slate-400" fontSize="small" />
                </InputAdornment>
              ),
              className: "bg-slate-50/50 rounded-lg text-base",
            }}
          />
          <IconButton
            onClick={loadPhieuList}
            disabled={loading}
            title="Làm mới dữ liệu"
            className="text-slate-600 hover:bg-slate-100 shrink-0"
            sx={{ width: 36, height: 36, borderRadius: "8px" }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </div>
      </div>

      {/* Desktop: Table Layout */}
      <div className="hidden md:block">
        <TableContainer
          component={Paper}
          elevation={0}
          className="border border-slate-200 rounded-lg shadow-sm overflow-hidden"
        >
          <div className="overflow-x-auto">
            <Table
              size="small"
              sx={{
                minWidth: 1000,
                "& .MuiTableCell-root": { px: 1, py: 0.5, verticalAlign: "top", fontSize: "0.95rem" },
                "& .MuiTableCell-head": { py: 0.75, fontWeight: 600, color: "#334155", whiteSpace: "nowrap", verticalAlign: "middle" },
              }}
            >
              <TableHead className="bg-slate-50">
                <TableRow>
                  <TableCell>Mã BH</TableCell>
                  <TableCell>Mã đơn hàng</TableCell>
                  <TableCell>Bệnh nhân</TableCell>
                  <TableCell>Nha khoa</TableCell>
                  <TableCell>Sản phẩm & thời hạn bảo hành</TableCell>
                  <TableCell>Ghi chú</TableCell>
                  <TableCell align="center" style={{ width: 130 }}>Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {phieuList.length > 0 ? (
                  phieuList.map((phieu) => (
                    <TableRow key={phieu._id} hover>
                      <TableCell className="font-bold text-blue-600 whitespace-nowrap">
                        {phieu.maBaoHanh}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => moDonHang(phieu)}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {phieu.donHang?.maDonHang || phieu.maBaoHanh || "---"}
                        </button>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">
                        {phieu.benhNhan?.hoVaTen || "---"}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {phieu.nhaKhoa?.hoVaTen || phieu.nhaKhoa?.tenGiaoDich || "---"}
                      </TableCell>
                      <TableCell style={{ minWidth: 380 }}>
                        <div className="max-h-32 overflow-y-auto divide-y divide-slate-100">
                          {phieu.danhSachBaoHanh?.map(renderItemBH)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-slate-500 max-w-[200px] truncate" title={phieu.ghiChu}>
                          {phieu.ghiChu || "---"}
                        </div>
                      </TableCell>
                      <TableCell align="center" sx={{ py: "2px !important" }}>
                        {renderHanhDong(phieu)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center" className="text-slate-400 font-medium" sx={{ py: "32px !important" }}>
                      {loading ? "Đang tải dữ liệu..." : "Không tìm thấy dữ liệu phiếu bảo hành phù hợp"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {renderTrangThaiTai()}
          <div ref={sentinelDesktopRef} className="h-1" />
        </TableContainer>
      </div>

      {/* Mobile: Card Layout */}
      <div className="md:hidden space-y-2">
        {phieuList.length > 0 ? (
          phieuList.map((phieu) => (
            <Paper
              key={phieu._id}
              elevation={0}
              className="px-3 py-2 border border-slate-200 border-l-4 border-l-blue-500 rounded-lg bg-white"
            >
              <div className="flex justify-between items-center gap-2">
                <div className="min-w-0">
                  <span className="font-bold text-blue-600">{phieu.maBaoHanh}</span>
                  <span className="text-slate-400 mx-1">·</span>
                  <button
                    type="button"
                    onClick={() => moDonHang(phieu)}
                    className="font-medium text-slate-700 hover:text-blue-600"
                  >
                    {phieu.donHang?.maDonHang || "---"}
                  </button>
                </div>
                {renderHanhDong(phieu)}
              </div>
              <div className="text-sm text-slate-600 leading-5">
                <span className="font-semibold text-slate-900">{phieu.benhNhan?.hoVaTen || "---"}</span>
                <span className="mx-1">·</span>
                {phieu.nhaKhoa?.hoVaTen || phieu.nhaKhoa?.tenGiaoDich || "---"}
              </div>
              {phieu.danhSachBaoHanh?.length > 0 && (
                <div className="mt-1 pt-1 border-t border-slate-100 divide-y divide-slate-100">
                  {phieu.danhSachBaoHanh.map(renderItemBH)}
                </div>
              )}
              {phieu.ghiChu && (
                <div className="mt-1 text-sm text-slate-500 italic">Ghi chú: {phieu.ghiChu}</div>
              )}
            </Paper>
          ))
        ) : (
          <div className="py-8 text-center text-slate-400 font-medium bg-white rounded-lg border border-slate-200">
            {loading ? "Đang tải dữ liệu..." : "Không tìm thấy dữ liệu phiếu bảo hành phù hợp"}
          </div>
        )}
        {phieuList.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            {renderTrangThaiTai()}
          </div>
        )}
        <div ref={sentinelMobileRef} className="h-1" />
      </div>

      {/* Unified Edit Modal */}
      {isEditModalOpen && editingPhieu && (
        <PhieuBaoHanhModal
          open={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingPhieu(null);
          }}
          warranty={editingPhieu}
          onSuccess={() => {
            loadPhieuList();
          }}
        />
      )}

      {/* Dialog in thẻ bảo hành */}
      {printPhieu && (
        <WarrantyCardPrint
          open={!!printPhieu}
          onClose={() => setPrintPhieu(null)}
          warranty={printPhieu}
        />
      )}
    </div>
  );
};

export default PhieuBaoHanhPage;
