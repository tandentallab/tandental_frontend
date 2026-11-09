import React, { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from "@mui/material";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../config/api";
import { deleteHoaDon } from "../../redux/slices/hoaDonSlice";
import { datTenKhongTrung, taiPdfHoaDon, tenFileHoaDon } from "../../utils/hoaDonPdf";

const fmtVND = (v) => new Intl.NumberFormat("vi-VN").format(Math.round(v || 0));
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("vi-VN") : "-");
const thongBaoLoi = (err) => err?.message || err?.response?.data?.message || String(err || "Lỗi không xác định");
const GIOI_HAN = 200;

// Bước 7: các hóa đơn Lưu tạm — Sửa, Xóa (trả đơn hàng về chờ xuất) hoặc Xuất lại PDF.
export default function HoaDonLuuTamDialog({ open, onClose, onDaThayDoi }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [danhSach, setDanhSach] = useState([]);
  const [tong, setTong] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loi, setLoi] = useState("");
  const [daChon, setDaChon] = useState([]);
  const [dangBan, setDangBan] = useState(false);

  const taiDanhSach = useCallback(async () => {
    setLoading(true);
    setLoi("");
    try {
      const res = await api.get("/hoa-don/all", { params: { trangThai: "Lưu tạm", page: 1, limit: GIOI_HAN } });
      setDanhSach(res.data?.data || []);
      setTong(res.data?.total || 0);
    } catch (err) {
      setLoi(thongBaoLoi(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setDaChon([]);
    taiDanhSach();
  }, [open, taiDanhSach]);

  const doiChon = (id) => setDaChon((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const chonTatCa = () => setDaChon(daChon.length === danhSach.length ? [] : danhSach.map((hd) => hd._id));

  const xuatPdf = async () => {
    const chon = danhSach.filter((hd) => daChon.includes(hd._id));
    const tenFiles = datTenKhongTrung(chon.map((hd) => tenFileHoaDon(hd.nhaKhoa?.hoVaTen, hd.createdAt)));

    setDangBan(true);
    const loiList = [];
    for (const [i, hd] of chon.entries()) {
      try {
        await taiPdfHoaDon(hd._id, tenFiles[i]);
      } catch (err) {
        loiList.push(`${hd.soHoaDon}: ${thongBaoLoi(err)}`);
      }
    }
    setDangBan(false);

    if (loiList.length === 0) toast.success(`Đã xuất ${chon.length} file PDF`);
    else toast.error(`Xuất lỗi ${loiList.length} file — ${loiList.join("; ")}`);
  };

  const xoa = async (hd) => {
    if (!window.confirm(`Xóa hóa đơn ${hd.soHoaDon} của ${hd.nhaKhoa?.hoVaTen || ""}? Các đơn hàng sẽ trở lại danh sách chờ xuất.`)) return;
    setDangBan(true);
    try {
      await dispatch(deleteHoaDon(hd._id)).unwrap();
      toast.success("Đã xóa hóa đơn, các đơn hàng đã trở lại danh sách chờ xuất");
      setDaChon((p) => p.filter((x) => x !== hd._id));
      onDaThayDoi?.();
      await taiDanhSach();
    } catch (err) {
      toast.error(`Không xóa được: ${thongBaoLoi(err)}`);
    } finally {
      setDangBan(false);
    }
  };

  return (
    <Dialog open={open} onClose={dangBan ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Hóa đơn lưu tạm</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress size={24} /></Box>
        ) : loi ? (
          <Alert severity="error">Không tải được danh sách: {loi}</Alert>
        ) : danhSach.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>Không có hóa đơn lưu tạm</Typography>
        ) : (
          <>
            {tong > danhSach.length && (
              <Alert severity="info" sx={{ mb: 1 }}>Đang hiện {danhSach.length}/{tong} hóa đơn mới nhất.</Alert>
            )}
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={daChon.length === danhSach.length}
                      indeterminate={daChon.length > 0 && daChon.length < danhSach.length}
                      onChange={chonTatCa}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Số hóa đơn</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Nha khoa</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Ngày tạo</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Giá trị</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {danhSach.map((hd) => (
                  <TableRow key={hd._id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox size="small" checked={daChon.includes(hd._id)} onChange={() => doiChon(hd._id)} />
                    </TableCell>
                    <TableCell>{hd.soHoaDon}</TableCell>
                    <TableCell>{hd.nhaKhoa?.hoVaTen || "-"}</TableCell>
                    <TableCell>{fmtDate(hd.createdAt)}</TableCell>
                    <TableCell align="right">{fmtVND(hd.giaTriThanhToan)}đ</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Button size="small" disabled={dangBan} onClick={() => navigate(`/hoa-don/${hd._id}/edit`)}>Sửa</Button>
                      <Button size="small" color="error" disabled={dangBan} onClick={() => xoa(hd)}>Xóa</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>
      <DialogActions>
        {dangBan && <CircularProgress size={18} sx={{ mr: 1 }} />}
        <Button onClick={onClose} disabled={dangBan}>Đóng</Button>
        <Button variant="contained" disabled={dangBan || daChon.length === 0} onClick={xuatPdf}>
          Xuất PDF ({daChon.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
}
