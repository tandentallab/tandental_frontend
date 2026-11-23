import React, { useState } from "react";
import DateTimeField from "../common/dateRange/DateTimeField";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  MenuItem,
  IconButton,
  Stack,
  CircularProgress,
} from "@mui/material";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  timelineItemClasses,
} from "@mui/lab";

// Icons
import { Phone, Mail, Info, MessageSquare, Save, Trash2 } from "lucide-react";

// Redux Actions (Đảm bảo đường dẫn đúng với cấu trúc dự án của bạn)
import {
  createChamSoc,
  deleteChamSoc,
} from "../../redux/slices/chamSocKhachHangSlice";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";

export default function TabChamSocKhachHang({ nhaKhoaData }) {
  const dispatch = useDispatch();

  // 1. Lấy dữ liệu từ Redux Store
  const { data: logs, loading } = useSelector(
    (state) => state.chamSocKhachHang
  );

  // 2. Local State
  const [form, setForm] = useState({
    type: "CALL",
    content: "",
    result: "",
    nextCareDate: "",
  });

  // 3. Xử lý đóng/mở Modal

  // 4. Xử lý Thêm nhật ký mới
  const handleAddLog = async () => {
    if (!form.content) return;

    const payload = {
      nhaKhoaId: nhaKhoaData._id,
      hinhThuc: form.type,
      noiDung: form.content,
      ketQua: form.result,
      ngayHenTiep: form.nextCareDate,
    };

    const resultAction = await dispatch(createChamSoc(payload));
    if (createChamSoc.fulfilled.match(resultAction)) {
      // Reset form sau khi lưu thành công
      setForm({ type: "CALL", content: "", result: "", nextCareDate: "" });
    }
  };

  // 5. Xử lý Xóa nhật ký
  const handleDeleteLog = (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa nhật ký này?")) {
      dispatch(deleteChamSoc(id));
    }
  };

  // Cấu hình Icon & Màu sắc cho từng loại hình chăm sóc
  const getTypeConfig = (type) => {
    switch (type) {
      case "CALL":
        return {
          label: "Gọi điện",
          color: "#3b82f6",
          icon: <Phone size={14} />,
        };
      case "ZALO":
        return {
          label: "Zalo",
          color: "#0068ff",
          icon: <MessageSquare size={14} />,
        };
      case "EMAIL":
        return { label: "Email", color: "#10b981", icon: <Mail size={14} /> };
      default:
        return { label: "Khác", color: "#6b7280", icon: <Info size={14} /> };
    }
  };
  return (
    <Stack spacing={3}>
      <Box sx={{ bgcolor: "#f1f5f9", px: 3, py: 1.5 }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            color: "#475569",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <SupportAgentIcon /> LƯU LỊCH SỬ CHĂM SÓC KHÁCH HÀNG
        </Typography>
      </Box>
      {/* Form Nhập Log */}
      <Paper
        sx={{
          p: 3,
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* Form Nhập Log */}

        <Grid container spacing={2}>
          <Grid item xs={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Hình thức"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              SelectProps={{
                native: false,
              }}
            >
              <MenuItem value="CALL">Gọi điện</MenuItem>

              <MenuItem value="ZALO">Zalo</MenuItem>

              <MenuItem value="EMAIL">Email</MenuItem>

              <MenuItem value="OTHER">Khác...</MenuItem>
            </TextField>

            {form.type === "OTHER" && (
              <TextField
                fullWidth
                size="small"
                placeholder="Nhập hình thức (VD: Facebook, gặp trực tiếp...)"
                value={form.customType || ""}
                onChange={(e) =>
                  setForm({
                    ...form,

                    customType: e.target.value,
                  })
                }
                sx={{ mt: 1 }}
              />
            )}
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              label="Kết quả"
              value={form.result}
              onChange={(e) => setForm({ ...form, result: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={5}>
            <DateTimeField
              label="Hẹn chăm sóc tiếp"
              defaultTime="08:00"
              value={form.nextCareDate}
              onChange={(v) => setForm({ ...form, nextCareDate: v })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Nội dung trao đổi"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sx={{ textAlign: "right" }}>
            <Button
              variant="contained"
              startIcon={<Save size={18} />}
              onClick={handleAddLog}
            >
              Lưu nhật ký
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Timeline Lịch sử */}
      <Box>
        {loading ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : logs.length === 0 ? (
          <Typography align="center" color="text.secondary" sx={{ py: 4 }}>
            Chưa có lịch sử chăm sóc
          </Typography>
        ) : (
          <Timeline
            sx={{
              [`& .${timelineItemClasses.root}:before`]: {
                flex: 0,
                padding: 0,
              },
            }}
          >
            {logs.map((log) => {
              const config = getTypeConfig(log.hinhThuc);
              return (
                <TimelineItem key={log._id}>
                  <TimelineSeparator>
                    <TimelineDot sx={{ bgcolor: config.color }}>
                      <Box color="white">{config.icon}</Box>
                    </TimelineDot>
                    <TimelineConnector />
                  </TimelineSeparator>
                  <TimelineContent sx={{ pb: 3 }}>
                    <Paper
                      sx={{
                        p: 2,
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        position: "relative",
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteLog(log._id)}
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          color: "#94a3b8",
                        }}
                      >
                        <Trash2 size={14} />
                      </IconButton>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        mb={1}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            color: config.color,
                            mr: 2,
                          }}
                        >
                          {config.label.toUpperCase()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(log.createdAt).toLocaleString("vi-VN")}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {log.noiDung}
                      </Typography>
                      <Stack direction="row" spacing={2} mt={1}>
                        <Typography variant="caption">
                          Kết quả: <b>{log.ketQua || "N/A"}</b>
                        </Typography>
                        {log.ngayHenTiep && (
                          <Typography
                            variant="caption"
                            color="error"
                            sx={{ fontWeight: 600 }}
                          >
                            📅 Hẹn:{" "}
                            {new Date(log.ngayHenTiep).toLocaleString("vi-VN")}
                          </Typography>
                        )}
                      </Stack>
                    </Paper>
                  </TimelineContent>
                </TimelineItem>
              );
            })}
          </Timeline>
        )}
      </Box>
    </Stack>
  );
}
