import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL;

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Thêm response interceptor để tự động logout khi token hết hạn (chỉ nhận lỗi 401)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            const status = error.response.status;
            // CHỈ logout khi 401 (Chưa xác thực / Token hết hạn)
            // TUYỆT ĐỐI KHÔNG logout khi 403 (Chỉ là không có quyền truy cập 1 API cụ thể)
            if (status === 401) {
                // Xóa token và user info khỏi localStorage
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                
                // Chỉ chuyển hướng nếu không phải đang ở trang login
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);
