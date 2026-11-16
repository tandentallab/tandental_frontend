import React, { useState, useEffect } from "react";
import {
  Modal,
  Box,
  TextField,
  Typography,
  MenuItem,
  Button,
  IconButton,
  FormControlLabel,
  Checkbox,
  Grid,
  InputAdornment,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import { useDispatch, useSelector } from "react-redux";
import { createSanPham, updateSanPham } from "../../redux/slices/sanPhamSlice";
import {
  LOAI_TINH_OPTIONS,
  NHOM_SAN_PHAM_OPTIONS,
} from "../../data/sanPhamConfig";
import ChonCongDoanModal from "./ChonCongDoanModal";
import { toast } from "sonner";

// 👉 DANH SÁCH DROPDOWN BẢO HÀNH CHO SẴN
const BAO_HANH_OPTIONS = [1, 2, 3, 4, 5];
const INITIAL_FORM = {
  tenSanPham: "",
  donGiaChung: "",
  loaiTinh: "Răng",
  nhomSanPham: "Gia Công Sườn",
  loaiSanPham: "Cố định",
  moTa: "",
  loai: "Sản xuất",
  coMauRang: true,
  khongDongBoCrm: false,
  quyTrinh: [],
  baoHanhMacDinh: "0",
};

export default function SanPhamModal({
  isEdit = false,
  editData = null,
  open,
  handleClose,
  initialName = "",
  onCreated,
}) {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.sanPham || {});
  const [openCD, setOpenCD] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      if (isEdit && editData) {
        setForm({
          ...INITIAL_FORM,
          ...editData,
          donGiaChung: editData.donGiaChung?.toString() || "",
          quyTrinh: editData.quyTrinh || [],
          baoHanhMacDinh: (editData.baoHanhMacDinh || 0).toString(),
        });
      } else {
        setForm({ ...INITIAL_FORM, tenSanPham: initialName || "" });
      }
      setErrors({});
    }
  }, [isEdit, editData, open, initialName]);

  const handlePriceChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    setForm((prev) => ({ ...prev, donGiaChung: value }));
    if (errors.donGiaChung)
      setErrors((prev) => ({ ...prev, donGiaChung: false }));
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: false }));
  };

  const validateForm = () => {
    let newErrors = {};
    if (!form.tenSanPham?.trim()) newErrors.tenSanPham = true;
    if (!form.donGiaChung) newErrors.donGiaChung = true;
    if (!form.quyTrinh || form.quyTrinh.length === 0) newErrors.quyTrinh = true;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      const payload = {
        ...form,
        donGiaChung: Number(form.donGiaChung),
        baoHanhMacDinh: Number(form.baoHanhMacDinh),
      };
      if (isEdit) {
        await dispatch(
          updateSanPham({ id: editData._id, data: payload })
        ).unwrap();
        handleClose();
      } else {
        const result = await dispatch(createSanPham(payload)).unwrap();
        if (onCreated) onCreated(result);
        handleClose();
      }
    } catch (err) {
      toast.error(`Lỗi: ${err?.message || JSON.stringify(err)}`);
    }
  };

  return (
    <>
      <Modal open={open} onClose={handleClose}>
        <Box className="bg-white w-[95%] md:w-[850px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
          <div className="bg-[#0091ea] px-4 py-2 flex justify-between items-center shrink-0 text-white">
            <Typography variant="h6" className="font-medium text-[16px]">
              {isEdit ? "Cập nhật sản phẩm" : "Thêm sản phẩm"}
            </Typography>
            <IconButton onClick={handleClose} color="inherit" size="small">
              <CloseIcon />
            </IconButton>
          </div>

          <div className="p-4 md:p-6 overflow-y-auto">
            <Grid container spacing={4}>
              <Grid
                item
                xs={12}
                md={8}
                className="border-b md:border-b-0 md:border-r border-gray-100 pb-6 md:pb-0 pr-0 md:pr-6"
              >
                <div className="flex flex-col gap-6">
                  <TextField
                    label="Tên *"
                    variant="standard"
                    fullWidth
                    error={errors.tenSanPham}
                    value={form.tenSanPham || ""}
                    onChange={(e) => handleChange("tenSanPham", e.target.value)}
                    InputLabelProps={{
                      shrink: true,
                      style: {
                        color: errors.tenSanPham ? "#d32f2f" : "#f57c00",
                        fontWeight: "bold",
                      },
                    }}
                  />
                  <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                    <TextField
                      select
                      label="Loại tính *"
                      variant="standard"
                      className="w-full sm:w-[30%]"
                      value={form.loaiTinh || "Răng"}
                      onChange={(e) => handleChange("loaiTinh", e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    >
                      {LOAI_TINH_OPTIONS.map((o) => (
                        <MenuItem key={o} value={o}>
                          {o}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Đơn giá chung *"
                      variant="standard"
                      className="w-full sm:flex-1"
                      error={errors.donGiaChung}
                      value={
                        form.donGiaChung
                          ? Number(form.donGiaChung).toLocaleString("vi-VN")
                          : ""
                      }
                      onChange={handlePriceChange}
                      InputLabelProps={{
                        shrink: true,
                        style: {
                          color: errors.donGiaChung ? "#d32f2f" : "#03a9f4",
                          fontWeight: "bold",
                        },
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <span className="text-[#03a9f4] font-bold">đ</span>
                          </InputAdornment>
                        ),
                      }}
                    />
                    <FormControlLabel
                      className="m-0 mb-1"
                      control={
                        <Checkbox
                          checked={form.coMauRang || false}
                          onChange={(e) =>
                            handleChange("coMauRang", e.target.checked)
                          }
                          color="success"
                          size="small"
                        />
                      }
                      label={
                        <span className="text-[13px] font-medium">
                          Có màu răng
                        </span>
                      }
                    />
                    <FormControlLabel
                      className="m-0 mb-1"
                      control={
                        <Checkbox
                          checked={form.khongDongBoCrm || false}
                          onChange={(e) =>
                            handleChange("khongDongBoCrm", e.target.checked)
                          }
                          color="warning"
                          size="small"
                        />
                      }
                      label={
                        <span className="text-[13px] font-medium whitespace-nowrap">
                          Không đồng bộ CRM
                        </span>
                      }
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                    <TextField
                      select
                      label="Loại sản phẩm"
                      variant="standard"
                      className="w-full sm:w-1/2"
                      value={form.loaiSanPham || "Cố định"}
                      onChange={(e) =>
                        handleChange("loaiSanPham", e.target.value)
                      }
                      InputLabelProps={{ shrink: true }}
                    >
                      <MenuItem value="Cố định">Cố định</MenuItem>
                      <MenuItem value="Miễn phí">Miễn phí</MenuItem>
                      <MenuItem value="Tháo lắp">Tháo lắp</MenuItem>
                    </TextField>
                    <TextField
                      select
                      label="Nhóm sản phẩm"
                      variant="standard"
                      className="w-full sm:w-1/2"
                      value={form.nhomSanPham || "Gia Công Sườn"}
                      onChange={(e) =>
                        handleChange("nhomSanPham", e.target.value)
                      }
                      InputLabelProps={{ shrink: true }}
                    >
                      {NHOM_SAN_PHAM_OPTIONS.map((o) => (
                        <MenuItem key={o} value={o}>
                          {o}
                        </MenuItem>
                      ))}
                    </TextField>
                  </div>

                  <TextField
                    select
                    label="Thời gian bảo hành mặc định"
                    variant="standard"
                    fullWidth
                    value={form.baoHanhMacDinh || "0"}
                    onChange={(e) =>
                      handleChange("baoHanhMacDinh", e.target.value)
                    }
                    InputLabelProps={{ shrink: true }}
                  >
                    <MenuItem value="0">Không có bảo hành</MenuItem>
                    <MenuItem value="1">1 năm</MenuItem>
                    <MenuItem value="2">2 năm</MenuItem>
                    <MenuItem value="3">3 năm</MenuItem>
                    <MenuItem value="4">4 năm</MenuItem>
                    <MenuItem value="5">5 năm</MenuItem>
                    <MenuItem value="6">6 năm</MenuItem>
                    <MenuItem value="7">7 năm</MenuItem>
                    <MenuItem value="8">8 năm</MenuItem>
                    <MenuItem value="9">9 năm</MenuItem>
                    <MenuItem value="10">10 năm</MenuItem>
                  </TextField>

                  <TextField
                    label="Mô tả"
                    variant="standard"
                    fullWidth
                    multiline
                    minRows={1}
                    maxRows={2}
                    value={form.moTa || ""}
                    onChange={(e) => handleChange("moTa", e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </div>
              </Grid>

              <Grid
                item
                xs={12}
                md={4}
                className="flex flex-col items-center pt-2 md:pt-4 pl-0 md:pl-4"
              >
                <Typography
                  className={`font-bold text-[11px] mb-4 text-center ${errors.quyTrinh ? "text-red-500" : "text-[#f57c00]"
                    }`}
                >
                  {errors.quyTrinh
                    ? "* Chưa thiết lập quy trình!"
                    : "* Quy trình sản xuất"}
                </Typography>
                <Box
                  className={`rounded-xl p-3 cursor-pointer border transition w-full ${errors.quyTrinh
                      ? "bg-red-50 border-red-300"
                      : "bg-blue-50 hover:border-blue-400"
                    }`}
                  onClick={() => setOpenCD(true)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <Typography className="text-gray-800 text-[13px] font-bold italic">
                      Công đoạn sản xuất
                    </Typography>
                    <AddCircleIcon
                      className={
                        errors.quyTrinh ? "text-red-500" : "text-green-500"
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1 max-h-[250px] overflow-y-auto pr-1">
                    {form.quyTrinh?.map((step, idx) => (
                      <Typography
                        key={idx}
                        className="text-[12px] text-gray-700 bg-white px-2 py-1 rounded shadow-sm border border-gray-100 mb-1"
                      >
                        {idx + 1}. {step.tenCongDoan}
                      </Typography>
                    ))}
                  </div>
                </Box>
              </Grid>
            </Grid>
          </div>

          <div className="p-3 flex justify-end bg-gray-50 border-t shrink-0">
            <Button
              variant="contained"
              disabled={loading}
              onClick={handleSubmit}
              startIcon={<SaveIcon />}
              className="bg-[#cfd8dc] hover:bg-blue-600 text-gray-700 hover:text-white px-8"
            >
              {isEdit ? "Cập nhật" : "Lưu"}
            </Button>
          </div>
        </Box>
      </Modal>
      <ChonCongDoanModal
        open={openCD}
        onClose={() => setOpenCD(false)}
        onConfirm={(steps) => handleChange("quyTrinh", steps)}
        currentSteps={form.quyTrinh || []}
      />
    </>
  );
}
