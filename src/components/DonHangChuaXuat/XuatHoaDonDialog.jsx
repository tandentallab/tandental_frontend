import React, { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, Typography,
} from "@mui/material";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../config/api";
import { createHoaDon, deleteHoaDon } from "../../redux/slices/hoaDonSlice";
import { fetchBangGiaByNhaKhoa } from "../../redux/slices/bangGiaSlice";
import { fetchSanPham } from "../../redux/slices/sanPhamSlice";
import TabBangGiaRieng from "../NhaKhoa/TabBangGiaRieng";
import { datTenKhongTrung, taiPdfHoaDon, tenFileHoaDon } from "../../utils/hoaDonPdf";

const fmtVND = (v) => new Intl.NumberFormat("vi-VN").format(Math.round(v || 0));
const thongBaoLoi = (err) => err?.message || err?.response?.data?.message || String(err || "Lỗi không xác định");

// Gom các đơn đã chọn theo nha khoa, giữ thứ tự chọn.
function nhomTheoNhaKhoa(selectedOrders) {
  const nhom = new Map();
  for (const order of selectedOrders) {
    const id = order.nhaKhoa?._id || order.nhaKhoa;
    if (!nhom.has(id)) nhom.set(id, { id, ten: order.nhaKhoa?.hoVaTen || "Nha khoa", orders: [] });
    nhom.get(id).orders.push(order);
  }
  return [...nhom.values()];
}

// Bước 3 → 6 của luồng xuất hóa đơn: tổng hợp, hỏi bảng giá riêng cho nha khoa
// mới, tạo hóa đơn Lưu tạm cho từng nha khoa, xuất PDF và lưu xuống máy.
export default function XuatHoaDonDialog({ open, selectedOrders, tuNgay, denNgay, onClose, onDaThayDoi }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const nhom = useMemo(() => nhomTheoNhaKhoa(selectedOrders), [selectedOrders]);

  const [buoc, setBuoc] = useState("tongHop"); // tongHop | bangGia | dangXuat | ketQua
  const [nhaKhoaMoi, setNhaKhoaMoi] = useState(null); // null = đang kiểm tra
  const [loiKiemTra, setLoiKiemTra] = useState("");
  const [daTraLoiBangGia, setDaTraLoiBangGia] = useState(false);
  const [tabBangGia, setTabBangGia] = useState(0);
  const [tienDo, setTienDo] = useState({});
  const [ketQua, setKetQua] = useState([]);
  const [dangXoa, setDangXoa] = useState(null);

  // Mở lại hộp thoại thì bắt đầu lại từ đầu.
  useEffect(() => {
    if (!open) return;
    setBuoc("tongHop");
    setNhaKhoaMoi(null);
    setLoiKiemTra("");
    setDaTraLoiBangGia(false);
    setTabBangGia(0);
    setTienDo({});
    setKetQua([]);

    const ids = nhomTheoNhaKhoa(selectedOrders).map((n) => n.id);
    api.get("/hoa-don/nha-khoa-chua-co-hoa-don", { params: { ids: ids.join(",") } })
      .then((res) => setNhaKhoaMoi(res.data?.data || []))
      .catch((err) => {
        setNhaKhoaMoi([]);
        setLoiKiemTra(thongBaoLoi(err));
      });
    // selectedOrders cố định trong lúc hộp thoại đang mở
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const nhomMoi = useMemo(() => nhom.filter((n) => nhaKhoaMoi?.includes(n.id)), [nhom, nhaKhoaMoi]);
  const nhaKhoaDangSuaGia = nhomMoi[tabBangGia];

  useEffect(() => {
    if (buoc !== "bangGia" || !nhaKhoaDangSuaGia) return;
    dispatch(fetchBangGiaByNhaKhoa(nhaKhoaDangSuaGia.id));
  }, [buoc, nhaKhoaDangSuaGia, dispatch]);

  const moBangGia = () => {
    setDaTraLoiBangGia(true);
    setTabBangGia(0);
    dispatch(fetchSanPham());
    setBuoc("bangGia");
  };

  const handleXuat = async () => {
    const thang = new Date();
    const tenFiles = datTenKhongTrung(nhom.map((n) => tenFileHoaDon(n.ten, thang)));

    setBuoc("dangXuat");
    const results = [];
    for (const [i, n] of nhom.entries()) {
      const kq = { id: n.id, ten: n.ten, tenFile: tenFiles[i], hoaDon: null, daLuu: false, loi: "" };
      results.push(kq);
      try {
        setTienDo((p) => ({ ...p, [n.id]: "Đang tạo hóa đơn..." }));
        const res = await dispatch(createHoaDon({
          nhaKhoaId: n.id,
          danhSachDonHangIds: n.orders.map((o) => o._id),
          tuNgay,
          denNgay,
        })).unwrap();
        kq.hoaDon = res?.data || res;

        setTienDo((p) => ({ ...p, [n.id]: "Đang tạo PDF..." }));
        await taiPdfHoaDon(kq.hoaDon._id, kq.tenFile);
        kq.daLuu = true;
        setTienDo((p) => ({ ...p, [n.id]: "Xong" }));
      } catch (err) {
        kq.loi = thongBaoLoi(err);
        setTienDo((p) => ({ ...p, [n.id]: "Lỗi" }));
      }
    }

    setKetQua(results);
    setBuoc("ketQua");
    onDaThayDoi?.({ nhaKhoaDaTao: results.filter((r) => r.hoaDon).map((r) => r.id) });

    const soLoi = results.filter((r) => !r.daLuu).length;
    if (soLoi === 0) toast.success(`Đã xuất ${results.length} hóa đơn`);
    else toast.error(`${soLoi} nha khoa xuất chưa thành công, xem chi tiết trong bảng`);
  };

  const xuatLai = async (kq) => {
    try {
      await taiPdfHoaDon(kq.hoaDon._id, kq.tenFile);
      setKetQua((list) => list.map((r) => (r.id === kq.id ? { ...r, daLuu: true, loi: "" } : r)));
      toast.success("Đã xuất PDF");
    } catch (err) {
      toast.error(`Xuất PDF thất bại: ${thongBaoLoi(err)}`);
    }
  };

  const xoaHoaDon = async (kq) => {
    if (!window.confirm(`Xóa hóa đơn ${kq.hoaDon.soHoaDon} của ${kq.ten}? Các đơn hàng sẽ trở lại danh sách chờ xuất.`)) return;
    setDangXoa(kq.id);
    try {
      await dispatch(deleteHoaDon(kq.hoaDon._id)).unwrap();
      setKetQua((list) => list.map((r) => (r.id === kq.id ? { ...r, daXoa: true } : r)));
      onDaThayDoi?.({});
      toast.success("Đã xóa hóa đơn, các đơn hàng đã trở lại danh sách chờ xuất");
    } catch (err) {
      toast.error(`Không xóa được: ${thongBaoLoi(err)}`);
    } finally {
      setDangXoa(null);
    }
  };

  const dangBan = buoc === "dangXuat";
  const dangKiemTra = nhaKhoaMoi === null;
  const canHoiBangGia = !dangKiemTra && nhomMoi.length > 0 && !daTraLoiBangGia;

  return (
    <Dialog open={open} onClose={dangBan ? undefined : onClose} maxWidth={buoc === "bangGia" ? "lg" : "md"} fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {buoc === "bangGia" ? "Cập nhật bảng giá riêng cho nha khoa mới" : buoc === "ketQua" ? "Kết quả xuất hóa đơn" : "Tạo hóa đơn"}
      </DialogTitle>

      <DialogContent dividers>
        {(buoc === "tongHop" || buoc === "dangXuat") && (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Nha khoa</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Số đơn</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{dangBan ? "Tiến độ" : ""}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {nhom.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>
                      {n.ten}
                      {nhaKhoaMoi?.includes(n.id) && <Chip label="Nha khoa mới" size="small" color="warning" sx={{ ml: 1 }} />}
                    </TableCell>
                    <TableCell align="right">{n.orders.length}</TableCell>
                    <TableCell>{dangBan ? tienDo[n.id] || "Chờ..." : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {dangKiemTra && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
                <CircularProgress size={16} /> <Typography variant="body2">Đang kiểm tra nha khoa mới...</Typography>
              </Box>
            )}
            {loiKiemTra && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Không kiểm tra được nha khoa mới ({loiKiemTra}). Bạn vẫn có thể xuất hóa đơn.
              </Alert>
            )}
            {canHoiBangGia && (
              <Alert
                severity="info"
                sx={{ mt: 2 }}
                action={
                  <>
                    <Button color="inherit" size="small" onClick={() => setDaTraLoiBangGia(true)}>Không</Button>
                    <Button color="inherit" size="small" variant="outlined" onClick={moBangGia}>Có</Button>
                  </>
                }
              >
                {nhomMoi.length} nha khoa chưa từng có hóa đơn ({nhomMoi.map((n) => n.ten).join(", ")}).
                Có muốn cập nhật bảng giá riêng không?
              </Alert>
            )}
          </>
        )}

        {buoc === "bangGia" && nhaKhoaDangSuaGia && (
          <>
            <Tabs value={tabBangGia} onChange={(_e, v) => setTabBangGia(v)} variant="scrollable" sx={{ mb: 2 }}>
              {nhomMoi.map((n) => <Tab key={n.id} label={n.ten} sx={{ textTransform: "none" }} />)}
            </Tabs>
            <TabBangGiaRieng
              key={nhaKhoaDangSuaGia.id}
              nhaKhoaData={{ _id: nhaKhoaDangSuaGia.id, hoVaTen: nhaKhoaDangSuaGia.ten }}
              handleClose={() => dispatch(fetchBangGiaByNhaKhoa(nhaKhoaDangSuaGia.id))}
            />
          </>
        )}

        {buoc === "ketQua" && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Nha khoa</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Hóa đơn</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>File PDF</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {ketQua.map((kq) => (
                <TableRow key={kq.id}>
                  <TableCell>{kq.ten}</TableCell>
                  <TableCell>
                    {kq.daXoa ? (
                      <Typography variant="body2" color="text.secondary">Đã xóa</Typography>
                    ) : kq.hoaDon ? (
                      <>{kq.hoaDon.soHoaDon} · {fmtVND(kq.hoaDon.giaTriThanhToan)}đ</>
                    ) : (
                      <Typography variant="body2" color="error">Chưa tạo được: {kq.loi}</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {kq.hoaDon && !kq.daXoa && (kq.daLuu
                      ? kq.tenFile
                      : <Typography variant="body2" color="error">Lỗi PDF: {kq.loi}</Typography>)}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    {kq.hoaDon && !kq.daXoa && (
                      <>
                        {!kq.daLuu && <Button size="small" onClick={() => xuatLai(kq)}>Xuất lại PDF</Button>}
                        <Button size="small" onClick={() => navigate(`/hoa-don/${kq.hoaDon._id}/edit`)}>Sửa</Button>
                        <Button size="small" color="error" disabled={dangXoa === kq.id} onClick={() => xoaHoaDon(kq)}>Xóa</Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>

      <DialogActions>
        {buoc === "tongHop" && (
          <>
            <Button onClick={onClose}>Huỷ</Button>
            <Button variant="contained" disabled={dangKiemTra || canHoiBangGia} onClick={handleXuat}>
              Xuất hóa đơn
            </Button>
          </>
        )}
        {buoc === "bangGia" && (
          <Button variant="contained" onClick={() => setBuoc("tongHop")}>Xong, quay lại</Button>
        )}
        {buoc === "dangXuat" && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1 }}>
            <CircularProgress size={18} /> <Typography variant="body2">Đang xuất, vui lòng không đóng trang...</Typography>
          </Box>
        )}
        {buoc === "ketQua" && <Button variant="contained" onClick={onClose}>Đóng</Button>}
      </DialogActions>
    </Dialog>
  );
}
