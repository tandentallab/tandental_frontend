import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, useTheme, useMediaQuery, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { api } from "../../config/api";
import { toast } from "sonner";
import WarrantyCardPrint from "./WarrantyCardPrint";
import { NHOM_MUA_GIUM } from "../../data/sanPhamConfig";

const generateQRCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let qr = "";
  for (let i = 0; i < 4; i += 1) {
    qr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return qr;
};

const addYearsToDate = (dateValue, years) => {
  if (!dateValue) return "";
  const start = new Date(dateValue);
  if (isNaN(start.getTime())) return "";
  const numYears = Number(years) || 0;
  const result = new Date(start.getFullYear() + numYears, start.getMonth(), start.getDate());
  if (isNaN(result.getTime())) return "";
  return result.toISOString().slice(0, 10);
};

const formatDateVN = (dateValue) => {
  if (!dateValue) return "---";
  return new Date(dateValue).toLocaleDateString("vi-VN");
};

const PhieuBaoHanhModal = ({ open, onClose, donHang, warranty, onSuccess }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [loading, setLoading] = useState(false);
  const [fullDonHang, setFullDonHang] = useState(null);
  const [generatedQR, setGeneratedQR] = useState("");
  const [productWarrantyConfigs, setProductWarrantyConfigs] = useState({});
  const [ghiChu, setGhiChu] = useState("");
  const [nhakhoabh, setNhakhoabh] = useState("");
  const [bacsibh, setBacsibh] = useState("");
  const [benhnhanbh, setBenhnhanbh] = useState("");
  const [mauTheList, setMauTheList] = useState([]);
  const [selectedMauTheId, setSelectedMauTheId] = useState("");
  const [mapGia, setMapGia] = useState({});
  const [warrantyState, setWarrantyState] = useState(null);
  const [openPrint, setOpenPrint] = useState(false);

  useEffect(() => {
    if (open) {
      setWarrantyState(warranty);
    }
  }, [open, warranty]);

  // Load bảng giá nha khoa
  useEffect(() => {
    const nhaKhoaId = donHang?.nhaKhoa?._id || donHang?.nhaKhoa || warranty?.nhaKhoa?._id || warranty?.nhaKhoa;
    if (open && nhaKhoaId) {
      api.get(`/bang-gia/nha-khoa/${nhaKhoaId}`)
        .then((res) => {
          const map = {};
          if (res.data) {
            res.data.forEach((item) => {
              if (item.sanPhamId) {
                map[item.sanPhamId.toString()] = item.donGia || 0;
              }
            });
          }
          setMapGia(map);
        })
        .catch((err) => {
          console.error("Lỗi fetch bang gia:", err);
        });
    }
  }, [open, donHang, warranty]);

  // Load mẫu thẻ và chi tiết đơn hàng
  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      try {
        setLoading(true);
        // 1. Fetch mẫu thẻ
        const mauRes = await api.get("/mau-the-bao-hanh");
        if (mauRes.data?.success) {
          setMauTheList(mauRes.data.data);
        }

        // 2. Fetch thông tin đơn hàng
        const orderId = donHang?._id || warranty?.donHang?._id || warranty?.donHang;
        let orderData = null;
        if (orderId) {
          try {
            const res = await api.get(`/donhang/${orderId}`);
            orderData = res.data?.data;
            setFullDonHang(orderData);
          } catch (orderErr) {
            console.warn("Đơn hàng liên kết không tồn tại hoặc đã bị xóa:", orderErr);
          }
        }

        // 3. Khởi tạo form dựa theo chế độ
        if (warranty) {
          setGhiChu(warranty.ghiChu || "");
          setNhakhoabh(warranty.nhakhoabh || warranty.nhaKhoa?.tenGiaoDich || warranty.nhaKhoa?.hoVaTen || orderData?.nhaKhoa?.tenGiaoDich || orderData?.nhaKhoa?.hoVaTen || "");
          setBacsibh(warranty.bacsibh || warranty.bacSi?.hoVaTen || orderData?.bacSi?.hoVaTen || "");
          setBenhnhanbh(warranty.benhnhanbh || warranty.benhNhan?.hoVaTen || orderData?.benhNhan?.hoVaTen || "");

          const attachedId = typeof warranty.mauThe === "object" ? warranty.mauThe?._id : warranty.mauThe;
          setSelectedMauTheId(attachedId || (mauRes.data?.data?.[0]?._id || ""));

          const initialConfigs = {};
          (warranty.danhSachBaoHanh || []).forEach((wItem, idx) => {
            const startDate = new Date(wItem.baoHanhTu);
            const endDate = new Date(wItem.baoHanhDen);
            const yearsDiff = endDate.getFullYear() - startDate.getFullYear();
            const expectedEnd = addYearsToDate(wItem.baoHanhTu, yearsDiff);
            const actualEndStr = endDate.toISOString().slice(0, 10);
            const isExactYears = expectedEnd === actualEndStr;

            initialConfigs[idx] = {
              customEndDate: isExactYears ? "" : actualEndStr,
              selectedYears: isExactYears ? yearsDiff : "",
              tenSanPhamBaoHanh: wItem.tenSanPhamBaoHanh || wItem.sanPham?.tenSanPham || "",
            };
          });
          setProductWarrantyConfigs(initialConfigs);
        } else {
          setGhiChu("");
          setNhakhoabh(orderData?.nhaKhoa?.tenGiaoDich || orderData?.nhaKhoa?.hoVaTen || "");
          setBacsibh(orderData?.bacSi?.hoVaTen || "");
          setBenhnhanbh(orderData?.benhNhan?.hoVaTen || "");
          setSelectedMauTheId(mauRes.data?.data?.[0]?._id || "");
          setProductWarrantyConfigs({});
          setGeneratedQR(generateQRCode());
        }
      } catch (error) {
        toast.error("Lỗi khi tải thông tin dữ liệu");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [open, donHang?._id, warranty?._id]);

  const maDonHang = useMemo(() => {
    if (fullDonHang) {
      return fullDonHang.maDonHang || `TAN${fullDonHang._id.substring(fullDonHang._id.length - 8).toUpperCase()}`;
    }
    return warranty?.maBaoHanh || "";
  }, [fullDonHang, warranty]);

  // Lọc sản phẩm đã có phiếu bảo hành từ database
  const sanPhamDaCoPhieu = fullDonHang?.phieuBaoHanh?.danhSachBaoHanh?.map(item =>
    item.sanPham?._id || item.sanPham
  ) || [];

  const availableProducts = useMemo(() => {
    if (warrantyState) {
      return warrantyState.danhSachBaoHanh || [];
    }
    const productOptions = fullDonHang?.danhSachSanPham || [];
    return productOptions.filter((sp) => {
      const spId = sp.sanPham?._id || sp.sanPham;
      const donGia = mapGia[spId] ?? sp.sanPham?.donGiaChung ?? 0;
      return !sanPhamDaCoPhieu.includes(spId) && sp.loaiDon === "Mới" && donGia > 0 && sp.sanPham?.nhomSanPham !== NHOM_MUA_GIUM;
    });
  }, [fullDonHang, warrantyState, mapGia, sanPhamDaCoPhieu]);

  // Khởi tạo mặc định năm bảo hành cho tạo mới
  useEffect(() => {
    if (availableProducts.length > 0 && Object.keys(productWarrantyConfigs).length === 0 && !warranty) {
      const initialConfigs = {};
      availableProducts.forEach((sp, idx) => {
        initialConfigs[idx] = {
          customEndDate: "",
          selectedYears: sp.sanPham?.baoHanhMacDinh || 0,
          tenSanPhamBaoHanh: sp.sanPham?.tenSanPham || sp.sanPham?.ten || "Sản phẩm",
        };
      });
      setProductWarrantyConfigs(initialConfigs);
    }
  }, [availableProducts, warranty]);

  const handleConfigChange = (idx, field, value) => {
    setProductWarrantyConfigs(prev => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        [field]: value
      }
    }));
  };

  const getCalculatedEndDate = (sp, config) => {
    if (!config) return "";
    if (config.customEndDate) return config.customEndDate;
    const baseDate = sp.baoHanhTu || fullDonHang?.ngayNhan;
    if (!baseDate) return "";
    if (config.selectedYears !== null && config.selectedYears !== "") {
      return addYearsToDate(baseDate, config.selectedYears);
    }
    const defaultYears = sp.sanPham?.baoHanhMacDinh || 0;
    return addYearsToDate(baseDate, defaultYears);
  };

  const handleSyncFromOrder = async () => {
    const orderId = fullDonHang?._id || donHang?._id || warranty?.donHang?._id || warranty?.donHang;
    if (!orderId) {
      toast.error("Không tìm thấy thông tin đơn hàng tương ứng");
      return;
    }

    try {
      setLoading(true);
      const res = await api.get(`/donhang/${orderId}`);
      if (res.data?.success) {
        const latestOrder = res.data.data;
        setFullDonHang(latestOrder);

        const nhaKhoaId = latestOrder.nhaKhoa?._id || latestOrder.nhaKhoa;
        const bangGiaRes = await api.get(`/bang-gia/nha-khoa/${nhaKhoaId}`).catch(() => null);
        const mapGiaLocal = {};
        if (bangGiaRes?.data) {
          bangGiaRes.data.forEach((item) => {
            if (item.sanPhamId) {
              mapGiaLocal[item.sanPhamId.toString()] = item.donGia || 0;
            }
          });
        }

        const formatViTri = (viTriArr) => {
          if (!viTriArr || viTriArr.length === 0) return "";
          return viTriArr
            .map((v) =>
              v.kieu === "Rời"
                ? v.soRang.join(", ")
                : `${v.soRang[0]}->${v.soRang[v.soRang.length - 1]}`
            )
            .join("; ");
        };

        const orderProducts = (latestOrder.danhSachSanPham || [])
          .filter((sp) => {
            const spId = sp.sanPham?._id || sp.sanPham;
            const donGia = mapGiaLocal[spId] ?? sp.sanPham?.donGiaChung ?? 0;
            return sp.loaiDon === "Mới" && donGia > 0 && sp.sanPham?.nhomSanPham !== NHOM_MUA_GIUM;
          })
          .map((sp) => ({
            sanPham: sp.sanPham,
            viTriRang: formatViTri(sp.viTri),
            soLuong: Number(sp.soLuong) || 1,
            mau: sp.mau || "",
            baoHanhTu: latestOrder.ngayNhan ? new Date(latestOrder.ngayNhan).toISOString() : new Date().toISOString(),
            baoHanhDen: addYearsToDate(latestOrder.ngayNhan || new Date(), sp.sanPham?.baoHanhMacDinh || 0),
          }));

        const newConfigs = {};
        const newAvailableProducts = orderProducts.map((op, idx) => {
          const existingIdx = Object.keys(productWarrantyConfigs).find((k) => {
            const product = availableProducts[k];
            const pId = product?.sanPham?._id || product?.sanPham;
            const opId = op.sanPham?._id || op.sanPham;
            return pId === opId; // So khớp theo sản phẩm ID để đồng bộ
          });

          if (existingIdx !== undefined) {
            newConfigs[idx] = productWarrantyConfigs[existingIdx];
            const oldProduct = availableProducts[existingIdx];
            // Đồng bộ dữ liệu mới nhất (vị trí răng, số lượng, ngày bảo hành, màu sắc...) từ đơn hàng
            return {
              ...oldProduct,
              viTriRang: op.viTriRang,
              soLuong: op.soLuong,
              mau: op.mau || oldProduct.mau,
              baoHanhTu: op.baoHanhTu,
              baoHanhDen: op.baoHanhDen,
            };
          }

          newConfigs[idx] = {
            customEndDate: "",
            selectedYears: op.sanPham?.baoHanhMacDinh || 0,
            tenSanPhamBaoHanh: op.sanPham?.tenSanPham || op.sanPham?.ten || "Sản phẩm",
          };
          return op;
        });

        toast.success("Đồng bộ dữ liệu đơn hàng thành công!");
        setProductWarrantyConfigs(newConfigs);
        if (warrantyState) {
          setWarrantyState((prev) => ({
            ...prev,
            danhSachBaoHanh: newAvailableProducts,
          }));
        }
      } else {
        toast.error("Lỗi đồng bộ thông tin đơn hàng");
      }
    } catch (error) {
      toast.error("Lỗi đồng bộ thông tin đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMauTheId) {
      toast.error("Vui lòng chọn mẫu thẻ trước khi lưu!");
      return;
    }

    if (availableProducts.length === 0) {
      toast.error("Không có sản phẩm nào để bảo hành");
      return;
    }

    try {
      setLoading(true);

      const danhSachBaoHanh = availableProducts.map((product, idx) => {
        const config = productWarrantyConfigs[idx] || {};
        const sanPhamId = product.sanPham?._id || product.sanPham;
        const endDate = getCalculatedEndDate(product, config);
        const startDate = product.baoHanhTu || (fullDonHang?.ngayNhan ? new Date(fullDonHang.ngayNhan).toISOString() : new Date().toISOString());
        const finalEndDate = endDate ? new Date(endDate).toISOString() : new Date().toISOString();

        return {
          sanPham: sanPhamId,
          viTriRang: product.viTriRang || product.viTri?.map((v) => {
            if (!v.soRang || v.soRang.length === 0) return "";
            if (v.kieu === "Rời" || v.soRang.length === 1) return v.soRang.join(", ");
            return `${v.soRang[0]}->${v.soRang[v.soRang.length - 1]}`;
          }).filter(Boolean).join("; ") || "---",
          soLuong: product.soLuong || 1,
          mau: product.mau || "",
          tenSanPhamBaoHanh: config.tenSanPhamBaoHanh || product.sanPham?.tenSanPham || product.sanPham?.ten || "",
          baoHanhTu: startDate,
          baoHanhDen: finalEndDate,
        };
      });

      const payload = {
        donHang: fullDonHang?._id || warranty?.donHang?._id || warranty?.donHang,
        danhSachBaoHanh,
        mauTheId: selectedMauTheId,
        mauThe: selectedMauTheId,
        ghiChu,
        nhakhoabh,
        bacsibh,
        benhnhanbh,
      };

      if (warrantyState) {
        // UPDATE MODE
        const res = await api.put(`/phieu-bao-hanh/${warrantyState._id}`, payload);
        if (res.data?.success) {
          toast.success("Cập nhật phiếu bảo hành thành công!");
          setProductWarrantyConfigs({});
          onSuccess?.(res.data.data);
          onClose(); // Đóng modal ở màn hình cập nhật khi lưu thành công
        } else {
          toast.error(res.data?.message || "Lỗi khi cập nhật");
        }
      } else {
        // CREATE MODE
        const res = await api.post("/phieu-bao-hanh", payload);
        if (res.data?.success) {
          toast.success(`Tạo phiếu bảo hành thành công! Mã: ${res.data.data.maBaoHanh}`);
          setProductWarrantyConfigs({});
          setWarrantyState(res.data.data); // Chuyển sang chế độ xem/in ấn
          onSuccess?.(res.data.data);
        } else {
          toast.error(res.data?.message || "Lỗi khi tạo phiếu bảo hành");
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Lỗi khi lưu phiếu bảo hành");
    } finally {
      setLoading(false);
    }
  };

  if (!open || (!fullDonHang && !warranty)) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle className="bg-blue-600 text-white font-bold flex justify-between items-center">
          <span>{warrantyState ? "Cập nhật Phiếu Bảo Hành" : "Thêm phiếu bảo hành"}</span>
          <IconButton onClick={onClose} size="small" sx={{ color: "white" }} className="hover:bg-blue-700">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent className="pt-6 flex flex-col gap-4 px-4 md:px-8">
          {/* 1. Mã bảo hành | Mẫu thẻ ở trên cùng */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <label className="text-base text-slate-600 font-bold block mb-2">Mã bảo hành</label>
              <TextField
                disabled
                value={warrantyState ? warrantyState.maBaoHanh : maDonHang}
                fullWidth
                size="small"
                inputProps={{ style: { fontSize: "14px", fontWeight: "bold" } }}
              />
            </div>
            <div>
              <label className="text-base text-slate-600 font-bold block mb-2">Mẫu thẻ *</label>
              <TextField
                select
                fullWidth
                size="small"
                value={selectedMauTheId || ""}
                onChange={(e) => setSelectedMauTheId(e.target.value)}
              >
                {mauTheList.map((mau) => (
                  <MenuItem key={mau._id} value={mau._id}>
                    {mau.tenMau}
                  </MenuItem>
                ))}
              </TextField>
            </div>
          </div>

          {/* 2. Nha khoa, Bác sĩ, Bệnh nhân */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextField
              label="Tên nha khoa trên thẻ"
              value={nhakhoabh}
              onChange={(e) => setNhakhoabh(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Bác sĩ"
              value={bacsibh}
              onChange={(e) => setBacsibh(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Tên bệnh nhân trên thẻ"
              value={benhnhanbh}
              onChange={(e) => setBenhnhanbh(e.target.value)}
              fullWidth
              size="small"
            />
          </div>

          {/* Điện thoại liên hệ */}
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Điện thoại"
              disabled
              value={fullDonHang?.nhaKhoa?.soDienThoai || "---"}
              fullWidth
              size="small"
            />
          </div>

          {/* 3. Danh sách sản phẩm + năm bảo hành */}
          <div className="flex flex-col gap-4 my-2">
            <label className="text-base text-slate-600 font-bold block">Danh sách sản phẩm bảo hành</label>
            {availableProducts.map((sp, idx) => {
              const config = productWarrantyConfigs[idx] || {};
              const calculatedEndDate = getCalculatedEndDate(sp, config);
              return (
                <div key={idx} className="border border-blue-100 rounded-xl p-4 bg-blue-50/10 flex flex-col gap-4 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1.5 w-full">
                      <span className="font-bold text-base text-slate-800">
                        {idx + 1}. {sp.sanPham?.tenSanPham || `Sản phẩm ${idx + 1}`}
                      </span>

                      <div className="flex flex-wrap gap-2 mt-1 w-full">
                        <div className="bg-sky-50 border border-sky-200 text-sky-800 text-base px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                          <span className="text-slate-500 font-medium">Vị trí:</span>
                          <span className="text-base font-bold">
                            {sp.viTriRang || (sp.viTri?.map((v) => {
                              if (!v.soRang || v.soRang.length === 0) return "";
                              if (v.kieu === "Rời" || v.soRang.length === 1) return v.soRang.join(", ");
                              return `${v.soRang[0]}->${v.soRang[v.soRang.length - 1]}`;
                            }).filter(Boolean).join("; ") || "---")}
                          </span>
                        </div>

                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-base px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                          <span className="text-slate-500 font-medium">Số lượng:</span>
                          <span className="text-base font-bold">{sp.soLuong || 1}</span>
                        </div>

                        {sp.mau && (
                          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-base px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                            <span className="text-slate-500 font-medium">Màu:</span>
                            <span className="text-base font-bold">{sp.mau}</span>
                          </div>
                        )}

                        <div className="bg-slate-50 border border-slate-200 text-slate-700 text-base px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                          <span className="text-slate-500 font-medium">Ngày bắt đầu:</span>
                          <span className="text-base font-bold text-slate-800">
                            {formatDateVN(sp.baoHanhTu || fullDonHang?.ngayNhan)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tên sản phẩm bảo hành */}
                  <div>
                    <label className="block text-base font-bold text-slate-600 mb-1.5">
                      Tên sản phẩm bảo hành:
                    </label>
                    <TextField
                      placeholder="Nhập tên sản phẩm bảo hành..."
                      value={config.tenSanPhamBaoHanh ?? ""}
                      onChange={(e) => handleConfigChange(idx, "tenSanPhamBaoHanh", e.target.value)}
                      fullWidth
                      size="small"
                      InputProps={{ className: "bg-white rounded-lg text-base" }}
                    />
                  </div>

                  {/* Controls for Year Select & Calendar Custom Date */}
                  <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
                    <div className="md:col-span-5">
                      <label className="block text-base font-bold text-slate-600 mb-1.5">
                        Theo số năm cố định:
                      </label>
                      <TextField
                        select
                        value={config.selectedYears ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleConfigChange(idx, "selectedYears", val === "" ? "" : Number(val));
                          handleConfigChange(idx, "customEndDate", "");
                        }}
                        fullWidth
                        size="small"
                        InputProps={{ className: "rounded-lg text-base bg-white" }}
                      >
                        <MenuItem value="">-- Chọn số năm --</MenuItem>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((year) => (
                          <MenuItem key={year} value={year}>
                            {year} năm
                          </MenuItem>
                        ))}
                      </TextField>
                    </div>

                    <div className="md:col-span-1 flex items-center justify-center pt-2 md:pt-0">
                      <span className="text-slate-400 text-base font-bold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                        hoặc
                      </span>
                    </div>

                    <div className="md:col-span-5">
                      <label className="block text-base font-bold text-slate-600 mb-1.5">
                        Chọn ngày tùy chỉnh cụ thể:
                      </label>
                      <TextField
                        type="date"
                        value={config.customEndDate || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleConfigChange(idx, "customEndDate", val);
                          handleConfigChange(idx, "selectedYears", "");
                        }}
                        fullWidth
                        size="small"
                        InputProps={{ className: "rounded-lg text-base bg-white" }}
                      />
                    </div>
                  </div>

                  {/* Calculated Date Banner */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 flex items-center justify-between">
                    <span className="font-bold text-base text-emerald-800 uppercase tracking-wide">
                      Thời hạn áp dụng mới:
                    </span>
                    <span className="text-base font-bold text-emerald-700 bg-white border border-emerald-100 px-3 py-1 rounded shadow-sm">
                      {formatDateVN(sp.baoHanhTu || fullDonHang?.ngayNhan)} <span className="mx-1 text-emerald-400">→</span> {formatDateVN(calculatedEndDate)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 4. Ghi chú dưới cùng */}
          <TextField
            label="Ghi chú"
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            fullWidth
            multiline
            rows={2}
            size="small"
          />
        </DialogContent>

        <DialogActions className="p-4 bg-white border-t border-slate-100 gap-2">
          {warrantyState && (
            <Button
              onClick={handleSyncFromOrder}
              variant="outlined"
              color="primary"
              disabled={loading}
              style={{ marginRight: "auto" }}
            >
              Cập nhật
            </Button>
          )}
          <Button onClick={onClose}>Hủy</Button>
          {warrantyState && (
            <Button
              onClick={() => setOpenPrint(true)}
              variant="contained"
              color="success"
            >
              In
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={loading || availableProducts.length === 0}
          >
            {loading ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogActions>
      </Dialog>

      {openPrint && warrantyState && (
        <WarrantyCardPrint
          open={openPrint}
          onClose={() => setOpenPrint(false)}
          warranty={warrantyState}
        />
      )}
    </>
  );
};

export default PhieuBaoHanhModal;
