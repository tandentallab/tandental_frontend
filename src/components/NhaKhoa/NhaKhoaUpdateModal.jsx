import React, { useEffect, useState } from "react";
import {
  Modal,
  Box,
  TextField,
  Button,
  CircularProgress,
  Typography,
  MenuItem,
} from "@mui/material";

import { useDispatch, useSelector } from "react-redux";
import { updateNhaKhoa } from "../../redux/slices/nhaKhoaSlice";
import vietnamProvinces from "../../utils/vietNamProvinces";

export default function NhaKhoaUpdateModal({ open, setOpen, data }) {
  const dispatch = useDispatch();

  const { loading } = useSelector((state) => state.nhaKhoa);

  // Nha khoa liên kết CRM: tên, SĐT, email, địa chỉ, tỉnh do CRM quản lý,
  // phải sửa bên CRM (backend cũng bỏ qua các trường này).
  const tuCrm = Boolean(data?.maCrm);

  const [form, setForm] = useState({
    hoVaTen: "",
    email: "",
    soDienThoai: "",
    diaChiCuThe: "",
    tinh: "",
    quocGia: "",
    website: "",
    moTa: "",
  });

  // ===== LOAD DATA =====
  useEffect(() => {
    if (data) {
      setForm({
        hoVaTen: data.hoVaTen || "",
        email: data.email || "",
        soDienThoai: data.soDienThoai || "",
        diaChiCuThe: data.diaChiCuThe || "",
        tinh: data.tinh || "",
        quocGia: data.quocGia || "",
        website: data.website || "",
        moTa: data.moTa || "",
      });
    }
  }, [data]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    try {
      await dispatch(
        updateNhaKhoa({
          id: data._id,
          data: form,
        })
      ).unwrap();

      setOpen(false);
    } catch (err) {
      console.log("Update lỗi:", err);
    }
  };

  return (
    <Modal open={open} onClose={() => setOpen(false)}>
      <Box
        sx={{
          backgroundColor: "white",
          width: {
            xs: "95%",
            sm: "90%",
            md: 700,
          },
          maxHeight: "90vh",
          overflowY: "auto",
          p: {
            xs: 2,
            sm: 3,
          },
          mx: "auto",
          mt: {
            xs: 3,
            sm: 6,
          },
          borderRadius: "20px",
          boxShadow: 24,
        }}
      >
        {/* HEADER */}
        <Box
          sx={{
            backgroundColor: "#0091ea",
            px: 2,
            py: 1.5,
            mb: 3,
            borderRadius: "10px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "white",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: {
                xs: "16px",
                sm: "20px",
              },
            }}
          >
            Cập Nhật Nha Khoa
          </Typography>
        </Box>

        {tuCrm && (
          <Typography sx={{ mb: 2, fontSize: 14, color: "text.secondary" }}>
            Tên, SĐT, email, địa chỉ và tỉnh do CRM quản lý — sửa bên CRM, lab sẽ tự cập nhật.
          </Typography>
        )}

        {/* FORM */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
            },
            gap: 2,
          }}
        >
          <TextField
            label="Tên"
            value={form.hoVaTen}
            onChange={(e) => handleChange("hoVaTen", e.target.value)}
            disabled={tuCrm}
            fullWidth
          />

          <TextField
            label="Email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            disabled={tuCrm}
            fullWidth
          />

          <TextField
            label="SĐT"
            value={form.soDienThoai}
            onChange={(e) => handleChange("soDienThoai", e.target.value)}
            disabled={tuCrm}
            fullWidth
          />

          <TextField
            label="Website"
            value={form.website}
            onChange={(e) => handleChange("website", e.target.value)}
            fullWidth
          />

          <TextField
            label="Địa chỉ cụ thể"
            value={form.diaChiCuThe}
            onChange={(e) => handleChange("diaChiCuThe", e.target.value)}
            disabled={tuCrm}
            fullWidth
          />

          <TextField
            select
            label="Tỉnh / Thành phố"
            fullWidth
            value={form.tinh}
            onChange={(e) => handleChange("tinh", e.target.value)}
            disabled={tuCrm}
          >
            {/* Tỉnh lấy từ CRM có thể không nằm trong danh sách */}
            {form.tinh && !vietnamProvinces.includes(form.tinh) && (
              <MenuItem value={form.tinh}>{form.tinh}</MenuItem>
            )}
            {vietnamProvinces.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Quốc gia"
            value={form.quocGia}
            onChange={(e) => handleChange("quocGia", e.target.value)}
            fullWidth
          />

          {/* MÔ TẢ */}
          <Box
            sx={{
              gridColumn: {
                xs: "span 1",
                sm: "span 2",
              },
            }}
          >
            <TextField
              label="Mô tả"
              value={form.moTa}
              onChange={(e) => handleChange("moTa", e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </Box>

        {/* ACTION */}
        <Box
          sx={{
            display: "flex",
            justifyContent: {
              xs: "stretch",
              sm: "flex-end",
            },
            flexDirection: {
              xs: "column",
              sm: "row",
            },
            gap: 2,
            mt: 4,
          }}
        >
          <Button
            variant="outlined"
            onClick={() => setOpen(false)}
            sx={{
              width: {
                xs: "100%",
                sm: "auto",
              },
            }}
          >
            Hủy
          </Button>

          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            sx={{
              width: {
                xs: "100%",
                sm: "auto",
              },
            }}
          >
            {loading ? <CircularProgress size={20} /> : "Cập nhật"}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
