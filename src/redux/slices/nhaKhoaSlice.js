import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../../config/api";

/* ================= API ================= */

// Gọi API lấy danh sách có truyền tham số page và limit
export const fetchNhaKhoa = createAsyncThunk(
  "nhaKhoa/fetch",
  async ({ page = 1, limit = 10 } = {}, { rejectWithValue }) => {
    try {
      const res = await api.get(`/nhakhoa?page=${page}&limit=${limit}`);
      return res.data; // Trả về dạng { data: [...], pagination: {...} } từ backend
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Không thể tải danh sách"
      );
    }
  }
);

/* ================= UPDATE ================= */
export const updateNhaKhoa = createAsyncThunk(
  "nhaKhoa/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/nhakhoa/${id}`, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Cập nhật thất bại"
      );
    }
  }
);

/* ================= DELETE ================= */
export const deleteNhaKhoa = createAsyncThunk(
  "nhaKhoa/delete",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.delete(`/nhakhoa/${id}`);
      return { id, ...res.data };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Xóa thất bại"
      );
    }
  }
);

/* ================= SLICE ================= */

const nhaKhoaSlice = createSlice({
  name: "nhaKhoa",
  initialState: {
    data: [],
    pagination: {
      totalItems: 0,
      currentPage: 1,
      totalPages: 1,
      limit: 10,
    },
    loading: false,
    error: null,
  },

  reducers: {
    addLocal: (state, action) => {
      state.data.unshift(action.payload);
      state.pagination.totalItems += 1; // Tăng tổng số lượng cục bộ nếu cần
    },
  },

  extraReducers: (builder) => {
    builder
      // LAY DANH SACH NHA KHOA
      .addCase(fetchNhaKhoa.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNhaKhoa.fulfilled, (state, action) => {
        state.loading = false;
        state.data = Array.isArray(action.payload) ? action.payload : (action.payload.data || []);
        state.pagination = action.payload.pagination || state.pagination;
      })
      .addCase(fetchNhaKhoa.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // TAO NHA KHOA
      /* ===== UPDATE ===== */
      .addCase(updateNhaKhoa.fulfilled, (state, action) => {
        const index = state.data.findIndex(
          (item) => item._id === action.payload._id
        );
        if (index !== -1) {
          state.data[index] = action.payload;
        }
      })

      /* ===== DELETE ===== */
      .addCase(deleteNhaKhoa.pending, (state) => {
        state.error = null;
      })
      .addCase(deleteNhaKhoa.fulfilled, (state, action) => {
        state.data = state.data.filter((item) => item._id !== action.payload.id);
        state.pagination.totalItems = Math.max(0, (state.pagination.totalItems || 0) - 1);
      })
      .addCase(deleteNhaKhoa.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      });
  },
});

export const { addLocal } = nhaKhoaSlice.actions;
export default nhaKhoaSlice.reducer;