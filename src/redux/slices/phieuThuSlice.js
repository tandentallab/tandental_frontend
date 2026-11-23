import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../../config/api";

/* ================= ASYNC THUNKS ================= */

// Lấy tất cả phiếu thu
export const fetchAllPhieuThu = createAsyncThunk(
    "phieuThu/fetchAll",
    async ({ page = 1, limit = 20, search = "", nhaKhoaId = "", dateFrom = "", dateTo = "" } = {}) => {
        const res = await api.get("/phieu-thu", { params: { page, limit, search, nhaKhoaId, dateFrom, dateTo } });
        return res.data;
    }
);

// Tạo phiếu thu mới
export const createPhieuThu = createAsyncThunk(
    "phieuThu/create",
    async (data, { rejectWithValue }) => {
        try {
            const res = await api.post("/phieu-thu", data);
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Tạo thất bại");
        }
    }
);

// Lấy hóa đơn chưa thanh toán theo nha khoa
export const fetchHoaDonChuaThanhToan = createAsyncThunk(
    "phieuThu/fetchHoaDonChuaThanhToan",
    async (nhaKhoaId, { rejectWithValue }) => {
        try {
            const res = await api.get(`/hoa-don/chua-thanh-toan/${nhaKhoaId}`);
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Lấy dữ liệu thất bại");
        }
    }
);

// Cập nhật phiếu thu
export const updatePhieuThu = createAsyncThunk(
    "phieuThu/update",
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const res = await api.patch(`/phieu-thu/${id}`, data);
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Cập nhật thất bại");
        }
    }
);

// Lấy phiếu thu theo hóa đơn
export const fetchPhieuThuByHoaDon = createAsyncThunk(
    "phieuThu/fetchByHoaDon",
    async (hoaDonId, { rejectWithValue }) => {
        try {
            const res = await api.get(
                `/phieu-thu/hoa-don/${hoaDonId}`
            );

            return res.data;
        } catch (err) {
            return rejectWithValue(
                err.response?.data?.message ||
                "Lấy phiếu thu thất bại"
            );
        }
    }
);

/* ================= SLICE ================= */

const phieuThuSlice = createSlice({
    name: "phieuThu",
    initialState: {
        danhSach: [],
        pagination: { total: 0, totalPages: 1, currentPage: 1 },
        hoaDonChuaThanhToan: [],
        loading: false,
        loadingMore: false,
        latestListRequestId: null,
        loadingHoaDon: false,
        error: null,
        phieuThuTheoHoaDon: [],
        loadingPhieuThuHoaDon: false,
    },

    reducers: {},

    extraReducers: (builder) => {
        builder
            // fetchAll
            .addCase(fetchAllPhieuThu.pending, (state, action) => {
                // page > 1 = cuộn tải thêm: giữ nguyên danh sách hiện tại
                const isMore = (action.meta.arg?.page || 1) > 1;
                state.latestListRequestId = action.meta.requestId;
                if (isMore) state.loadingMore = true;
                else state.loading = true;
                state.error = null;
            })
            .addCase(fetchAllPhieuThu.fulfilled, (state, action) => {
                // Bỏ qua response cũ nếu bộ lọc đã đổi trong lúc chờ
                if (action.meta.requestId !== state.latestListRequestId) return;
                state.loading = false;
                state.loadingMore = false;
                const rows = action.payload.data || [];
                const isMore = (action.meta.arg?.page || 1) > 1;
                if (isMore) {
                    const seen = new Set(state.danhSach.map((pt) => pt._id));
                    state.danhSach.push(...rows.filter((pt) => !seen.has(pt._id)));
                } else {
                    state.danhSach = rows;
                }
                state.pagination = {
                    total: action.payload.total || 0,
                    totalPages: action.payload.totalPages || 1,
                    currentPage: action.payload.currentPage || 1,
                };
            })
            .addCase(fetchAllPhieuThu.rejected, (state, action) => {
                if (action.meta.requestId !== state.latestListRequestId) return;
                state.loading = false;
                state.loadingMore = false;
                state.error = action.error.message;
            })

            // create
            .addCase(createPhieuThu.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createPhieuThu.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(createPhieuThu.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // fetchHoaDonChuaThanhToan
            .addCase(fetchHoaDonChuaThanhToan.pending, (state) => {
                state.loadingHoaDon = true;
                state.hoaDonChuaThanhToan = [];
            })
            .addCase(fetchHoaDonChuaThanhToan.fulfilled, (state, action) => {
                state.loadingHoaDon = false;
                state.hoaDonChuaThanhToan = action.payload.data || [];
            })
            .addCase(fetchHoaDonChuaThanhToan.rejected, (state) => {
                state.loadingHoaDon = false;
                state.hoaDonChuaThanhToan = [];
            })

            // update
            .addCase(updatePhieuThu.pending, (state) => { state.loading = true; })
            .addCase(updatePhieuThu.fulfilled, (state, action) => {
                state.loading = false;
                const updated = action.payload.data;
                if (updated) {
                    const idx = state.danhSach.findIndex((pt) => pt._id === updated._id);
                    if (idx !== -1) {
                        state.danhSach[idx] = { ...state.danhSach[idx], ...updated };
                    }
                }
            })
            .addCase(updatePhieuThu.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            //Get phiếu thu theo hóa đơn id
            // fetchPhieuThuByHoaDon
            .addCase(
                fetchPhieuThuByHoaDon.pending,
                (state) => {
                    state.loadingPhieuThuHoaDon = true;

                    state.phieuThuTheoHoaDon = [];
                }
            )

            .addCase(
                fetchPhieuThuByHoaDon.fulfilled,
                (state, action) => {
                    state.loadingPhieuThuHoaDon = false;
                    state.phieuThuTheoHoaDon =
                        action.payload.data || [];
                }
            )

            .addCase(
                fetchPhieuThuByHoaDon.rejected,
                (state, action) => {
                    state.loadingPhieuThuHoaDon = false;

                    state.error = action.payload;

                    state.phieuThuTheoHoaDon = [];
                }
            )
    },
});

export default phieuThuSlice.reducer;
