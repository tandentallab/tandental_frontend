import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../../config/api";

/* ================= 1. GET BAO CAO SẢN LƯỢNG (GIỮ NGUYÊN) ================= */
export const fetchTopProductsBaoCao = createAsyncThunk(
    "baoCao/fetchTopProducts",
    async (params, { rejectWithValue }) => {
        try {
            const res = await api.get("/baocao/top-products", { params });
            return res.data.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Lỗi lấy báo cáo");
        }
    }
);

export const fetchDetailedReport = createAsyncThunk(
    "baoCao/fetchDetailedReport",
    async (params, { rejectWithValue }) => {
        try {
            const res = await api.get("/baocao/detailed-report", { params });
            return res.data.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Lỗi lấy báo cáo");
        }
    }
);

/* ================= 2. GET BÁO CÁO DOANH THU (GIỮ NGUYÊN) ================= */
export const fetchBaoCaoDoanhThuThang = createAsyncThunk(
    "baoCao/fetchBaoCaoDoanhThuThang",
    async ({ thang, nam }, { rejectWithValue }) => {
        try {
            const res = await api.get("/baocao/doanh-thu-thang", { params: { thang, nam } });
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Lỗi lấy báo cáo doanh thu");
        }
    }
);

export const upsertGhiChu = createAsyncThunk(
    "baoCao/upsertGhiChu",
    async ({ id, thang, nam, noiDung }, { rejectWithValue }) => {
        try {
            const res = await api.put(`/nhakhoa/${id}/ghi-chu`, { thang, nam, noiDung });
            return { nhaKhoaId: id, noiDung };
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Lưu ghi chú thất bại");
        }
    }
);

/* ================= 3. GET SẢN LƯỢNG THEO KHÁCH HÀNG (GIỮ NGUYÊN) ================= */
export const fetchSanLuongKhachHang = createAsyncThunk(
    "baoCao/fetchSanLuongKhachHang",
    async (params, { rejectWithValue }) => {
        try {
            const res = await api.get("/baocao/san-luong-khach-hang", { params });
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Lỗi lấy báo cáo sản lượng khách hàng");
        }
    }
);

/* ================= 4. GET DOANH SỐ THEO KHÁCH HÀNG (GIỮ NGUYÊN) ================= */
export const fetchDoanhSoKhachHang = createAsyncThunk(
    "baoCao/fetchDoanhSoKhachHang",
    async (params, { rejectWithValue }) => {
        try {
            const res = await api.get("/baocao/doanh-so-khach-hang", { params });
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Lỗi lấy báo cáo doanh số khách hàng");
        }
    }
);

/* ================= 5. GET DOANH SỐ THEO SẢN PHẨM (GIỮ NGUYÊN) ================= */
export const fetchDoanhSoSanPham = createAsyncThunk(
    "baoCao/fetchDoanhSoSanPham",
    async (params, { rejectWithValue }) => {
        try {
            const res = await api.get("/baocao/doanh-so-san-pham", { params });
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Lỗi lấy báo cáo doanh số sản phẩm");
        }
    }
);

/* ================= 6. GET DOANH SỐ THEO THỜI GIAN (THÊM MỚI) ================= */
export const fetchDoanhSoThoiGian = createAsyncThunk(
    "baoCao/fetchDoanhSoThoiGian",
    async (params, { rejectWithValue }) => {
        try {
            // Gọi API mới tạo
            const res = await api.get("/baocao/doanh-so-thoi-gian", { params });
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Lỗi lấy báo cáo doanh số thời gian");
        }
    }
);

/* ================= 7. GET NĂNG SUẤT (ĐẾM RĂNG HK / TS) ================= */
export const fetchNangSuat = createAsyncThunk(
    "baoCao/fetchNangSuat",
    async (params, { rejectWithValue }) => {
        try {
            const res = await api.get("/baocao/nang-suat", { params });
            return res.data.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Lỗi lấy báo cáo năng suất");
        }
    }
);

/* ================= SLICE ================= */
const baoCaoSlice = createSlice({
    name: "baoCao",
    initialState: {
        data: [],
        detailedData: [],
        loading: false,
        detailedLoading: false,
        error: null,

        doanhThuData: null,
        doanhThuLoading: false,
        doanhThuError: null,
        notes: {},

        sanLuongKhachHangData: null,
        sanLuongKhachHangLoading: false,
        sanLuongKhachHangError: null,

        doanhSoKhachHangData: null,
        doanhSoKhachHangLoading: false,
        doanhSoKhachHangError: null,

        doanhSoSanPhamData: null,
        doanhSoSanPhamLoading: false,
        doanhSoSanPhamError: null,

        // --- State của trang Doanh số Thời gian (THÊM MỚI) ---
        doanhSoThoiGianData: null,
        doanhSoThoiGianLoading: false,
        doanhSoThoiGianError: null,

        nangSuatData: null,
        nangSuatLoading: false,
        nangSuatError: null,
    },

    reducers: {
        clearBaoCaoData: (state) => {
            state.data = [];
            state.detailedData = [];
            state.error = null;
            state.doanhThuData = null;
            state.doanhThuError = null;
            state.notes = {};
            state.sanLuongKhachHangData = null;
            state.sanLuongKhachHangError = null;
            state.doanhSoKhachHangData = null;
            state.doanhSoKhachHangError = null;
            state.doanhSoSanPhamData = null;
            state.doanhSoSanPhamError = null;

            // Clear state doanh số thời gian
            state.doanhSoThoiGianData = null;
            state.doanhSoThoiGianError = null;

            state.nangSuatData = null;
            state.nangSuatError = null;
        }
    },

    extraReducers: (builder) => {
        builder
            /* ===== CASE CỦA SẢN LƯỢNG ===== */
            .addCase(fetchTopProductsBaoCao.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTopProductsBaoCao.fulfilled, (state, action) => {
                state.loading = false;
                state.data = action.payload || [];
            })
            .addCase(fetchTopProductsBaoCao.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchDetailedReport.pending, (state) => {
                state.detailedLoading = true;
                state.error = null;
            })
            .addCase(fetchDetailedReport.fulfilled, (state, action) => {
                state.detailedLoading = false;
                state.detailedData = action.payload || [];
            })
            .addCase(fetchDetailedReport.rejected, (state, action) => {
                state.detailedLoading = false;
                state.error = action.payload;
            })

            /* ===== CASE CỦA DOANH THU ===== */
            .addCase(fetchBaoCaoDoanhThuThang.pending, (state) => {
                state.doanhThuLoading = true;
                state.doanhThuError = null;
            })
            .addCase(fetchBaoCaoDoanhThuThang.fulfilled, (state, action) => {
                state.doanhThuLoading = false;
                state.doanhThuData = action.payload;

                const notesMap = {};
                const chiTiet = action.payload?.chiTiet || [];
                chiTiet.forEach((row) => {
                    if (row.ghiChu) notesMap[row.nhaKhoaId] = row.ghiChu;
                });
                state.notes = notesMap;
            })
            .addCase(fetchBaoCaoDoanhThuThang.rejected, (state, action) => {
                state.doanhThuLoading = false;
                state.doanhThuError = action.payload;
            })
            .addCase(upsertGhiChu.fulfilled, (state, action) => {
                const { nhaKhoaId, noiDung } = action.payload;
                state.notes[nhaKhoaId] = noiDung;
            })

            /* ===== CASE CỦA SẢN LƯỢNG KHÁCH HÀNG ===== */
            .addCase(fetchSanLuongKhachHang.pending, (state) => {
                state.sanLuongKhachHangLoading = true;
                state.sanLuongKhachHangError = null;
            })
            .addCase(fetchSanLuongKhachHang.fulfilled, (state, action) => {
                state.sanLuongKhachHangLoading = false;
                state.sanLuongKhachHangData = action.payload;
            })
            .addCase(fetchSanLuongKhachHang.rejected, (state, action) => {
                state.sanLuongKhachHangLoading = false;
                state.sanLuongKhachHangError = action.payload;
            })

            /* ===== CASE CỦA DOANH SỐ KHÁCH HÀNG ===== */
            .addCase(fetchDoanhSoKhachHang.pending, (state) => {
                state.doanhSoKhachHangLoading = true;
                state.doanhSoKhachHangError = null;
            })
            .addCase(fetchDoanhSoKhachHang.fulfilled, (state, action) => {
                state.doanhSoKhachHangLoading = false;
                state.doanhSoKhachHangData = action.payload;
            })
            .addCase(fetchDoanhSoKhachHang.rejected, (state, action) => {
                state.doanhSoKhachHangLoading = false;
                state.doanhSoKhachHangError = action.payload;
            })

            /* ===== CASE CỦA DOANH SỐ SẢN PHẨM ===== */
            .addCase(fetchDoanhSoSanPham.pending, (state) => {
                state.doanhSoSanPhamLoading = true;
                state.doanhSoSanPhamError = null;
            })
            .addCase(fetchDoanhSoSanPham.fulfilled, (state, action) => {
                state.doanhSoSanPhamLoading = false;
                state.doanhSoSanPhamData = action.payload;
            })
            .addCase(fetchDoanhSoSanPham.rejected, (state, action) => {
                state.doanhSoSanPhamLoading = false;
                state.doanhSoSanPhamError = action.payload;
            })

            /* ===== CASE CỦA DOANH SỐ THỜI GIAN (THÊM MỚI) ===== */
            .addCase(fetchDoanhSoThoiGian.pending, (state) => {
                state.doanhSoThoiGianLoading = true;
                state.doanhSoThoiGianError = null;
            })
            .addCase(fetchDoanhSoThoiGian.fulfilled, (state, action) => {
                state.doanhSoThoiGianLoading = false;
                state.doanhSoThoiGianData = action.payload;
            })
            .addCase(fetchDoanhSoThoiGian.rejected, (state, action) => {
                state.doanhSoThoiGianLoading = false;
                state.doanhSoThoiGianError = action.payload;
            })

            /* ===== CASE CỦA NĂNG SUẤT ===== */
            .addCase(fetchNangSuat.pending, (state) => {
                state.nangSuatLoading = true;
                state.nangSuatError = null;
            })
            .addCase(fetchNangSuat.fulfilled, (state, action) => {
                state.nangSuatLoading = false;
                state.nangSuatData = action.payload;
            })
            .addCase(fetchNangSuat.rejected, (state, action) => {
                state.nangSuatLoading = false;
                state.nangSuatError = action.payload;
            });
    },
});

export const { clearBaoCaoData } = baoCaoSlice.actions;
export default baoCaoSlice.reducer;