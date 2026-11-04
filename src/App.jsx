import Dashboard from "./components/Pages/Dashboard";
import LoginPage from "./components/Pages/LoginPage";
import CheckPhieuBaoHanhCuPage from "./components/CheckPhieuBaoHanh";
import CheckPhieuBaoHanhPage from "./components/CheckPhieuBaoHanh/CheckPhieuBaoHanhPage";
import { useSelector, useDispatch } from "react-redux";
import { useEffect } from "react";
import { restoreAuth } from "./redux/slices/authSlice";
import { CircularProgress, Box } from "@mui/material";
import { Routes, Route } from "react-router-dom";

function App() {
  const { isAuthenticated, loading } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // Restore auth state khi app mount
  useEffect(() => {
    dispatch(restoreAuth());
  }, [dispatch]);

  // Loading state
  if (loading) {
    return (
      <Box className="min-h-screen flex items-center justify-center bg-gray-100">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Routes>
      {/* Public routes - không cần xác thực */}
      <Route path="/warranty" element={<CheckPhieuBaoHanhCuPage />} />
      <Route path="/tra-cuu-bao-hanh" element={<CheckPhieuBaoHanhPage />} />

      {/* Protected routes - cần xác thực */}
      <Route path="*" element={isAuthenticated ? <Dashboard /> : <LoginPage />} />
    </Routes>
  );
}

export default App;