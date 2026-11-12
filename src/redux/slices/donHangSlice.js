import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../../config/api"; // Đảm bảo đường dẫn này trỏ đúng đến file config api của bạn

/* ================= GET ALL (paginated) ================= */
export const fetchDonHang = createAsyncThunk(
    "donHang/fetchAll",
    async (params = {}, { rejectWithValue }) => {
        try {
            const res = await api.get("/donhang", { params });
            return res.data; // { success, data, total, totalPages, currentPage, stats }
        } catch (err) {
            return rejectWithValue(
                err.response?.data?.message || "Lỗi tải dữ liệu đơn hàng"
            );
        }
    }
);

/* ================= GET MORE (append, dùng cho infinite scroll) ================= */
export const fetchMoreDonHang = createAsyncThunk(
    "donHang/fetchMore",
    async (params = {}, { rejectWithValue }) => {
        try {
            const res = await api.get("/donhang", { params });
            return res.data;
        } catch (err) {
            return rejectWithValue(
                err.response?.data?.message || "Lỗi tải thêm đơn hàng"
            );
        }
    }
);

/* ================= GET ALL (không phân trang, dùng cho KeHoachGiaoHang) ================= */
export const fetchDonHangAll = createAsyncThunk(
    "donHang/fetchAll_noPage",
    async (_, { rejectWithValue }) => {
        try {
            const res = await api.get("/donhang", { params: { page: 1, limit: 9999 } });
            return res.data.data || [];
        } catch (err) {
            return rejectWithValue(
                err.response?.data?.message || "Lỗi tải dữ liệu đơn hàng"
            );
        }
    }
);

/* ================= GET BY ID ================= */
export const fetchDonHangById = createAsyncThunk(
    "donHang/fetchById",
    async (id, { rejectWithValue }) => {
        try {
            const res = await api.get(`/donhang/${id}`);
            return res.data.data;
        } catch (err) {
            return rejectWithValue(
                err.response?.data?.message || "Lỗi tải chi tiết đơn hàng"
            );
        }
    }
);

/* ================= CREATE ================= */
export const createDonHang = createAsyncThunk(
    "donHang/create",
    async (data, { rejectWithValue }) => {
        try {
            const res = await api.post("/donhang", data);
            return res.data.data;
        } catch (err) {
            return rejectWithValue(
                err.response?.data?.message || "Tạo đơn hàng thất bại"
            );
        }
    }
);

/* ================= UPDATE ================= */
export const updateDonHang = createAsyncThunk(
    "donHang/update",
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const res = await api.put(`/donhang/${id}`, data);
            return res.data.data;
        } catch (err) {
            return rejectWithValue(
                err.response?.data?.message || "Cập nhật đơn hàng thất bại"
            );
        }
    }
);

/* ================= DELETE ================= */
export const deleteDonHang = createAsyncThunk(
    "donHang/delete",
    async (id, { rejectWithValue }) => {
        try {
            await api.delete(`/donhang/${id}`);
            return id;
        } catch (err) {
            return rejectWithValue(
                err.response?.data?.message || "Xóa đơn hàng thất bại"
            );
        }
    }
);

/* ================= UPDATE CONG DOAN STATUS ================= */
export const updateCongDoanTrangThai = createAsyncThunk(
    "donHang/updateCongDoanTrangThai",
    async ({ id, spIndex, thuTu, trangThai }, { rejectWithValue }) => {
        try {
            const res = await api.patch(`/donhang/${id}/congdoan-status`, { spIndex, thuTu, trangThai });
            return res.data.data;
        } catch (err) {
            return rejectWithValue(
                err.response?.data?.message || "Cập nhật trạng thái công đoạn thất bại"
            );
        }
    }
);

/* ================= ADVANCE TRANG THAI (flow buttons) ================= */
export const advanceTrangThai = createAsyncThunk(
    "donHang/advanceTrangThai",
    async ({ id, trangThai, buocThuHienTai }, { rejectWithValue }) => {
        try {
            const res = await api.patch(`/donhang/${id}/trang-thai`, { trangThai, buocThuHienTai });
            return res.data.data;
        } catch (err) {
            return rejectWithValue(
                err.response?.data?.message || "Cập nhật trạng thái thất bại"
            );
        }
    }
);

/* ================= GET STATUS COUNTS (without trangThai filter) ================= */
export const fetchDonHangStatusCounts = createAsyncThunk(
    "donHang/fetchStatusCounts",
    async (params = {}, { rejectWithValue }) => {
        try {
            const res = await api.get("/donhang", { params: { ...params, limit: 1 } });
            return res.data.stats || {};
        } catch (err) {
            return rejectWithValue(
                err.response?.data?.message || "Lỗi tải thống kê trạng thái"
            );
        }
    }
);

/* ================= GET THONG KE ================= */
export const fetchThongKe = createAsyncThunk(
    "donHang/fetchThongKe",
    async (_, { rejectWithValue }) => {
        try {
            const res = await api.get("/donhang/thong-ke");
            return res.data.data; // { giaoHomNay, treHenGiao, guiThu }
        } catch (err) {
            return rejectWithValue(
                err.response?.data?.message || "Lỗi tải thống kê đơn hàng"
            );
        }
    }
);


//Khởi tạo filter đơn hàng page

const initialDonHangPageFilter = {
    searchTerm: "",

    appliedNgayNhan: {
        preset: null,
        customFrom: "",
        customTo: "",
    },

    appliedYcHoanThanh: {
        preset: null,
        customFrom: "",
        customTo: "",
    },

    appliedHenGiao: {
        preset: null,
        customFrom: "",
        customTo: "",
    },

    appliedNhaKhoa: null,
    appliedBenhNhan: null,
    appliedTrangThai: [],
};

// Khởi tạo filter kế hoạch giao hàng
const initialKeHoachGiaoHangPageFilter = {
    searchTerm: "",

    appliedNgayNhan: {
        preset: null,
        customFrom: "",
        customTo: "",
    },

    appliedYcHoanThanh: {
        preset: null,
        customFrom: "",
        customTo: "",
    },

    appliedHenGiao: {
        preset: null,
        customFrom: "",
        customTo: "",
    },

    appliedNhaKhoa: null,
    appliedBenhNhan: null,
    appliedTrangThai: [],
};


/* ================= SLICE ================= */

const donHangSlice = createSlice({
    name: "donHang",

    initialState: {
        data: [],
        allData: [], // dùng cho KeHoachGiaoHang (không phân trang)
        donHangPageFilter: initialDonHangPageFilter,
        keHoachGiaoHangPageFilter: initialKeHoachGiaoHangPageFilter,
        loading: false,
        loadingMore: false,
        error: null,
        pagination: { total: 0, totalPages: 1, currentPage: 1 },
        stats: {},
        statusCounts: {},
        thongKe: {
            giaoHomNay: 0,
            treHenGiao: 0,
            guiThu: 0,
        },
    },

    reducers: {
        setKeHoachGiaoHangPageFilter(state, action) {
            state.keHoachGiaoHangPageFilter = {
                ...state.keHoachGiaoHangPageFilter,
                ...action.payload,
            };
        },

        resetKeHoachGiaoHangPageFilter(state) {
            state.keHoachGiaoHangPageFilter = initialKeHoachGiaoHangPageFilter;
        },

        setDonHangPageFilter(state, action) {
            state.donHangPageFilter = {
                ...state.donHangPageFilter,
                ...action.payload,
            };
        },

        resetDonHangPageFilter(state) {
            state.donHangPageFilter = initialDonHangPageFilter;
        },
    },

    extraReducers: (builder) => {
        builder
            /* ===== FETCH (paginated) ===== */
            .addCase(fetchDonHang.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDonHang.fulfilled, (state, action) => {
                state.loading = false;
                state.data = action.payload.data || [];
                state.pagination = {
                    total: action.payload.total || 0,
                    totalPages: action.payload.totalPages || 1,
                    currentPage: action.payload.currentPage || 1,
                };
                state.stats = action.payload.stats || {};
            })
            .addCase(fetchDonHang.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            /* ===== FETCH MORE (append) ===== */
            .addCase(fetchMoreDonHang.pending, (state) => {
                state.loadingMore = true;
            })
            .addCase(fetchMoreDonHang.fulfilled, (state, action) => {
                state.loadingMore = false;
                // Bỏ kết quả "tải thêm" đến muộn (filter đã đổi / trang không liền kề)
                const reqPage = Number(action.meta.arg?.page) || 0;
                if (reqPage && reqPage !== (state.pagination?.currentPage || 0) + 1) return;
                // Chống trùng đơn khi ghép trang
                const seen = new Set(state.data.map((d) => d._id));
                const more = (action.payload.data || []).filter((d) => !seen.has(d._id));
                state.data = [...state.data, ...more];
                state.pagination = {
                    total: action.payload.total || 0,
                    totalPages: action.payload.totalPages || 1,
                    currentPage: action.payload.currentPage || 1,
                };
                state.stats = action.payload.stats || {};
            })
            .addCase(fetchMoreDonHang.rejected, (state) => {
                state.loadingMore = false;
            })

            /* ===== FETCH ALL (no pagination) ===== */
            .addCase(fetchDonHangAll.fulfilled, (state, action) => {
                state.allData = action.payload || [];
            })

            /* ===== CREATE ===== */
            .addCase(createDonHang.pending, (state) => {
                state.loading = true;
            })
            .addCase(createDonHang.fulfilled, (state, action) => {
                state.loading = false;
                // Không thêm vào data[] vì data là paginated — DonHangPage sẽ reload
            })
            .addCase(createDonHang.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            /* ===== UPDATE ===== */
            .addCase(updateDonHang.fulfilled, (state, action) => {
                const index = state.data.findIndex(
                    (item) => item._id === action.payload._id
                );
                if (index !== -1) {
                    const oldTrangThai = state.data[index].trangThai;
                    const newTrangThai = action.payload.trangThai;
                    if (oldTrangThai !== newTrangThai) {
                        if (oldTrangThai) {
                            state.stats[oldTrangThai] = Math.max((state.stats[oldTrangThai] || 1) - 1, 0);
                            state.statusCounts[oldTrangThai] = Math.max((state.statusCounts[oldTrangThai] || 1) - 1, 0);
                        }
                        if (newTrangThai) {
                            state.stats[newTrangThai] = (state.stats[newTrangThai] || 0) + 1;
                            state.statusCounts[newTrangThai] = (state.statusCounts[newTrangThai] || 0) + 1;
                        }
                    }
                    state.data[index] = action.payload;
                }
            })

            /* ===== ADVANCE TRANG THAI ===== */
            .addCase(advanceTrangThai.fulfilled, (state, action) => {
                const index = state.data.findIndex(
                    (item) => item._id === action.payload._id
                );
                if (index !== -1) {
                    const oldTrangThai = state.data[index].trangThai;
                    const newTrangThai = action.payload.trangThai;
                    if (oldTrangThai !== newTrangThai) {
                        if (oldTrangThai) {
                            state.stats[oldTrangThai] = Math.max((state.stats[oldTrangThai] || 1) - 1, 0);
                            state.statusCounts[oldTrangThai] = Math.max((state.statusCounts[oldTrangThai] || 1) - 1, 0);
                        }
                        if (newTrangThai) {
                            state.stats[newTrangThai] = (state.stats[newTrangThai] || 0) + 1;
                            state.statusCounts[newTrangThai] = (state.statusCounts[newTrangThai] || 0) + 1;
                        }
                    }
                    state.data[index] = {
                        ...state.data[index],
                        trangThai: action.payload.trangThai,
                        buocThuHienTai: action.payload.buocThuHienTai,
                        nhatKyChinhSua: action.payload.nhatKyChinhSua,
                    };
                }
            })

            /* ===== UPDATE CONG DOAN STATUS ===== */
            .addCase(updateCongDoanTrangThai.fulfilled, (state, action) => {
                const index = state.data.findIndex(
                    (item) => item._id === action.payload._id
                );
                if (index !== -1) {
                    // Only update trangThaiCongDoan per sanPham and overall trangThai,
                    // preserving populated fields (nhaKhoa, bacSi, benhNhan, sanPham, ...)
                    const updatedSanPham = action.payload.danhSachSanPham;
                    if (updatedSanPham) {
                        state.data[index].danhSachSanPham = state.data[index].danhSachSanPham.map((sp, i) => ({
                            ...sp,
                            trangThaiCongDoan: updatedSanPham[i]?.trangThaiCongDoan ?? sp.trangThaiCongDoan,
                        }));
                    }
                    if (action.payload.trangThai && action.payload.trangThai !== state.data[index].trangThai) {
                        const oldTrangThai = state.data[index].trangThai;
                        const newTrangThai = action.payload.trangThai;
                        if (oldTrangThai) {
                            state.stats[oldTrangThai] = Math.max((state.stats[oldTrangThai] || 1) - 1, 0);
                            state.statusCounts[oldTrangThai] = Math.max((state.statusCounts[oldTrangThai] || 1) - 1, 0);
                        }
                        if (newTrangThai) {
                            state.stats[newTrangThai] = (state.stats[newTrangThai] || 0) + 1;
                            state.statusCounts[newTrangThai] = (state.statusCounts[newTrangThai] || 0) + 1;
                        }
                        state.data[index].trangThai = newTrangThai;
                    }
                }
            })

            /* ===== DELETE ===== */
            .addCase(deleteDonHang.fulfilled, (state, action) => {
                state.data = state.data.filter(
                    (item) => item._id !== action.payload
                );
            })

            /* ===== THONG KE ===== */
            .addCase(fetchThongKe.pending, (state) => {
                state.loadingThongKe = true;
            })
            .addCase(fetchThongKe.fulfilled, (state, action) => {
                state.loadingThongKe = false;
                state.thongKe = action.payload;
            })
            .addCase(fetchThongKe.rejected, (state) => {
                state.loadingThongKe = false;
            })

            /* ===== STATUS COUNTS (no trangThai filter) ===== */
            .addCase(fetchDonHangStatusCounts.fulfilled, (state, action) => {
                state.statusCounts = action.payload;
            });
    },
});

export const {
    setDonHangPageFilter,
    resetDonHangPageFilter,
} = donHangSlice.actions;

export const { setKeHoachGiaoHangPageFilter, resetKeHoachGiaoHangPageFilter } = donHangSlice.actions;

export default donHangSlice.reducer;