import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  InputBase,
  Box,
  Paper,
  CircularProgress,
  Button,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import LoginModal from "../Login/LoginModal";
import HeaderUser from "./HeaderUser";
import QuickAddMenu from "./QuickAddMenu";
import { useSelector } from "react-redux";
import { getAuthSelector } from "../../redux/selector";
import { useNavigate } from "react-router-dom";
import { api, API_URL } from "../../config/api";
import debounce from "lodash/debounce";
import NoteAddIcon from "@mui/icons-material/NoteAdd";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import { hasRouteAccess } from "../../config/permissions";
import { toast } from "sonner";
import GhiChuAddModal from "../GhiChu/GhiChuAddModal";

const Header = ({ onToggleSidebar }) => {
  const { isAuthenticated, user } = useSelector(getAuthSelector);
  const navigate = useNavigate();

  // States
  const [company, setCompany] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const getAvatarUrl = (avatar) => {
    if (!avatar) return "";
    if (avatar.startsWith("data:") || avatar.startsWith("http")) return avatar;
    let baseUrl = API_URL ? API_URL.replace(/\/$/, "") : "";
    const path = avatar.startsWith("/") ? avatar : `/${avatar}`;
    if (path.startsWith("/api") && baseUrl.endsWith("/api")) {
      baseUrl = baseUrl.slice(0, -4);
    }
    return `${baseUrl}${path}`;
  };

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await api.get('/cong-ty');
        if (res.data && res.data.data) {
          setCompany(res.data.data);
        }
      } catch (e) {
        console.error("Lỗi lấy thông tin công ty:", e);
      }
    };
    fetchCompany();
  }, []);

  // Khởi tạo state chỉ chứa donHang
  const [results, setResults] = useState({
    donHang: [],
  });
  const [isSearching, setIsSearching] = useState(false);

  const [openTodoPopover, setOpenTodoPopover] = useState(false);
  const [todoList, setTodoList] = useState([]);
  const [openGhiChuAddModal, setOpenGhiChuAddModal] = useState(false);

  const searchContainerRef = useRef(null);

  // Đóng dropdown khi click ra ngoài vùng tìm kiếm
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
        if (window.innerWidth < 600) {
          setSearchOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSearchResults = useCallback(
    debounce(async (query) => {
      if (!query.trim()) {
        setResults({ donHang: [] });
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      try {
        // 🔥 CHIẾN THUẬT: Không ép cứng types. 
        // Thả cho Backend quét mọi ngóc ngách (quét cả tên Khách Hàng, Bệnh nhân) như cũ
        const res = await api.get(`/search?q=${query}`);

        // Nhưng UI thì chỉ hứng đúng mảng donHang để hiển thị
        setResults({
          donHang: res.data?.data?.donHang || []
        });
      } catch (error) {
        console.error("Lỗi tìm kiếm:", error);
      } finally {
        setIsSearching(false);
      }
    }, 500),
    []
  );

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsDropdownOpen(true);
    fetchSearchResults(value);
  };

  const fetchTodos = async () => {
    try {
      const res = await api.get("/ghi-chu");
      if (res.data?.success) {
        const sorted = [...res.data.data].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setTodoList(sorted);
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách ghi chú:", error);
    }
  };


  const runTodoToastFlow = async () => {
    try {
      const res = await api.get("/ghi-chu");
      if (res.data?.success && res.data.data?.length > 0) {
        const todos = res.data.data;

        // Dọn dẹp hàng đợi cũ nếu đang chạy dở
        if (toastIntervalRef.current) {
          clearInterval(toastIntervalRef.current);
          toastIntervalRef.current = null;
        }

        let currentIndex = 0;

        const showNextTodo = () => {
          if (currentIndex >= todos.length) {
            if (toastIntervalRef.current) {
              clearInterval(toastIntervalRef.current);
              toastIntervalRef.current = null;
            }
            return;
          }

          const note = todos[currentIndex];
          const labelText = note.maDonHang
            ? `[Mã ĐH: ${note.maDonHang}] Ghi chú cần xử lý:`
            : "Ghi chú công việc chung:";

          // Đẩy toast hiển thị với duration: Infinity để tự kiểm soát đóng
          const toastId = toast.info(labelText, {
            description: note.noiDung,
            duration: Infinity,
            action: {
              label: "Xem",
              onClick: () => {
                if (note.donHang) {
                  navigate(`/donhang/${note.donHang._id}/edit`);
                } else {
                  navigate("/ghi-chu");
                }
                toast.dismiss(toastId);
              }
            }
          });

          // Tự động tắt sau đúng 15 giây
          setTimeout(() => {
            toast.dismiss(toastId);
          }, 15000);

          currentIndex++;
        };

        // Hiện ghi chú đầu tiên ngay lập tức
        showNextTodo();

        // Cứ mỗi 5 giây thì hiện ghi chú tiếp theo (staggered display)
        // Với thời gian sống 15s của mỗi toast, trên màn hình sẽ hiển thị tối đa 3 toast cùng lúc
        toastIntervalRef.current = setInterval(() => {
          showNextTodo();
        }, 5000);
      }
    } catch (error) {
      console.error("Lỗi khi chạy luồng toast ghi chú:", error);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      sessionStorage.removeItem("has_shown_initial_toast");
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && hasRouteAccess(user, "/ghi-chu")) {
      fetchTodos();
    }
  }, [isAuthenticated, user]);

  // ===== NHA KHOA LÂU CHƯA GỬI ĐƠN =====
  const coQuyenGhiChu = isAuthenticated && hasRouteAccess(user, "/ghi-chu");
  const coQuyenNhaKhoa = isAuthenticated && hasRouteAccess(user, "/nha-khoa");
  const [nhaKhoaChuaGuiDon, setNhaKhoaChuaGuiDon] = useState([]);
  const [nguongNgayChuaGuiDon, setNguongNgayChuaGuiDon] = useState(10);
  const [openNhaKhoaPopover, setOpenNhaKhoaPopover] = useState(false);

  const fetchNhaKhoaChuaGuiDon = async () => {
    try {
      const res = await api.get("/nhakhoa/lau-chua-gui-don");
      if (res.data?.success) {
        setNhaKhoaChuaGuiDon(res.data.data || []);
        if (res.data.nguong) setNguongNgayChuaGuiDon(res.data.nguong);
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách nha khoa lâu chưa gửi đơn:", error);
    }
  };

  useEffect(() => {
    if (coQuyenNhaKhoa) {
      fetchNhaKhoaChuaGuiDon();
    }
  }, [coQuyenNhaKhoa]);

  const activeTodoList = React.useMemo(() => {
    return todoList.filter((todo) => todo.trangThai === "Chưa hoàn thành");
  }, [todoList]);

  useEffect(() => {
    const handleRefresh = () => {
      if (isAuthenticated && hasRouteAccess(user, "/ghi-chu")) {
        fetchTodos();
      }
    };
    window.addEventListener("refresh-ghi-chu", handleRefresh);
    return () => {
      window.removeEventListener("refresh-ghi-chu", handleRefresh);
    };
  }, [isAuthenticated, user]);

  const handleToggleTodoPopover = () => {
    if (!openTodoPopover) {
      fetchTodos();
    }
    setOpenTodoPopover(!openTodoPopover);
  };

  const handleToggleNhaKhoaPopover = () => {
    if (!openNhaKhoaPopover) {
      fetchNhaKhoaChuaGuiDon();
    }
    setOpenNhaKhoaPopover(!openNhaKhoaPopover);
  };

  const handleToggleCheckTodo = async (id) => {
    try {
      const res = await api.patch(`/ghi-chu/${id}/trang-thai`, { trangThai: "Đã hoàn thành" });
      if (res.data?.success) {
        toast.success("Đã hoàn thành ghi chú!");
        fetchTodos();
        window.dispatchEvent(new CustomEvent("refresh-ghi-chu"));
      }
    } catch (error) {
      toast.error("Lỗi khi hoàn thành ghi chú: " + error.message);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "---";
    return new Date(value).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <AppBar position="fixed" sx={{ zIndex: 1201, background: "#1DA1F2" }}>
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            gap: 2,
            minHeight: { xs: 64, sm: 70 },
            px: { xs: 1, sm: 2 },
            position: "relative",
          }}
        >
          {/* LEFT BRANDING */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              minWidth: 0,
              flexShrink: 0,
            }}
          >
            <IconButton color="inherit" onClick={onToggleSidebar}>
              <MenuIcon />
            </IconButton>

            <Box
              onClick={() => navigate("/")}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                cursor: "pointer",
                userSelect: "none",
                "&:hover": { opacity: 0.85 }
              }}
            >
              <div className="w-10 h-10 p-1 rounded-full shadow-md bg-white flex items-center justify-center overflow-hidden">
                {company?.Avatar ? (
                  <img className="w-full h-full object-cover" src={getAvatarUrl(company.Avatar)} alt={company?.Ten || "Logo"} />
                ) : (
                  <img className="w-full h-full object-cover" src="/icon.png" alt="Logo" />
                )}
              </div>

              <p className="hidden sm:block font-medium text-xl tracking-wide">{company?.Ten || ""}</p>
            </Box>
          </Box>

          {/* 👉 THANH TÌM KIẾM CHO CẢ PC & MOBILE */}
          <Box
            ref={searchContainerRef}
            sx={{
              position: {
                xs: searchOpen ? "absolute" : "relative",
                sm: "relative",
              },
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: { xs: searchOpen ? "flex" : "none", sm: "flex" },
              width: { xs: "100%", sm: "40%", md: "45%" },
              maxWidth: { xs: "100%", sm: 600 },
              height: { xs: searchOpen ? "100%" : "auto", sm: "auto" },
              backgroundColor: {
                xs: searchOpen ? "#1DA1F2" : "transparent",
                sm: "transparent",
              },
              px: { xs: searchOpen ? 2 : 0, sm: 0 },
              alignItems: "center",
              zIndex: { xs: 1202, sm: "auto" },
            }}
          >
            {searchOpen && (
              <IconButton
                color="inherit"
                onClick={() => {
                  setSearchOpen(false);
                  setIsDropdownOpen(false);
                }}
                sx={{ display: { xs: "inline-flex", sm: "none" }, mr: 1 }}
              >
                <CloseIcon />
              </IconButton>
            )}

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "white",
                borderRadius: "999px",
                px: 2,
                py: 0.5,
                width: "100%",
              }}
            >
              <SearchIcon sx={{ color: "#666" }} />
              <InputBase
                placeholder="Tìm kiếm đơn hàng nhanh..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setIsDropdownOpen(true)}
                autoFocus={searchOpen}
                sx={{ ml: 1, width: "100%", fontSize: "16px" }}
              />
              {isSearching && (
                <CircularProgress size={20} sx={{ color: "#1DA1F2" }} />
              )}
            </Box>

            {/* DROPDOWN KẾT QUẢ TÌM KIẾM */}
            {isDropdownOpen && (
              <Paper
                sx={{
                  position: "absolute",
                  top: { xs: "100%", sm: "45px" },
                  left: 0,
                  right: 0,
                  backgroundColor: "white",
                  borderRadius: { xs: 0, sm: 2 },
                  boxShadow: 3,
                  overflow: "hidden",
                  zIndex: 999,
                  maxHeight: { xs: "calc(100vh - 70px)", sm: 400 },
                  overflowY: "auto",
                }}
              >
                {/* THANH CÔNG CỤ */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    p: 1,
                    bgcolor: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: "13px", fontWeight: "bold", color: "#64748b", pl: 1 }}>
                    KẾT QUẢ ĐƠN HÀNG
                  </Typography>
                </Box>

                {/* DANH SÁCH HIỂN THỊ */}
                <Box sx={{ p: 1 }}>
                  {!searchQuery ? (
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      sx={{ p: 2, textAlign: "center" }}
                    >
                      Gõ để bắt đầu tìm kiếm...
                    </Typography>
                  ) : (
                    <>
                      {results?.donHang?.length > 0 && (
                        <Box mb={1}>
                          <List dense disablePadding>
                            {results.donHang.map((dh) => (
                              <ListItem
                                button
                                key={dh._id}
                                sx={{ borderRadius: 1, mb: 0.5, "&:hover": { bgcolor: "#f1f5f9" } }}
                                onClick={() => {
                                  setIsDropdownOpen(false);
                                  setSearchOpen(false);
                                  navigate(`/donhang/${dh._id}/edit`);
                                }}
                              >
                                <ListItemText
                                  primary={
                                    <Typography variant="body2" sx={{ fontWeight: "bold", color: "#0f172a" }}>
                                      Mã ĐH: {dh.maDonHang}
                                    </Typography>
                                  }
                                  secondary={
                                    <Box
                                      sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        width: "100%",
                                        mt: 0.5,
                                      }}
                                    >
                                      <Typography
                                        variant="caption"
                                        color="textSecondary"
                                      >
                                        Nha khoa:{" "}
                                        {dh.nhaKhoa?.hoVaTen ||
                                          dh.nhaKhoa?.tenGiaoDich ||
                                          "Trống"}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        color="textSecondary"
                                      >
                                        Bệnh nhân:{" "}
                                        {dh.benhNhan?.hoVaTen || "Trống"}
                                      </Typography>
                                    </Box>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}

                      {!isSearching &&
                        (!results.donHang || results.donHang.length === 0) && (
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            sx={{ p: 2, textAlign: "center" }}
                          >
                            Không tìm thấy kết quả nào.
                          </Typography>
                        )}
                    </>
                  )}
                </Box>
              </Paper>
            )}
          </Box>

          {/* RIGHT CONTROL PANEL */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 0.5, sm: 1.5 },
              flexShrink: 0,
            }}
          >
            <IconButton
              color="inherit"
              onClick={() => setSearchOpen(true)}
              sx={{ display: { xs: "inline-flex", sm: "none" } }}
            >
              <SearchIcon />
            </IconButton>

            {isAuthenticated ? (
              <>
                {coQuyenGhiChu && (
                  <div className="relative">
                    <button
                      onClick={handleToggleTodoPopover}
                      title="Lưu ý cần xử lý"
                      className="flex items-center justify-center w-10 h-10 bg-white text-blue-600 rounded-lg border border-gray-200 hover:bg-gray-50 transition shadow-sm relative shrink-0"
                    >
                      <NoteAddIcon className="!w-6 !h-6" />
                      {activeTodoList.length > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center font-bold animate-pulse shadow-sm">
                          {activeTodoList.length}
                        </span>
                      )}
                    </button>

                    {/* Popover overlay click to close */}
                    {openTodoPopover && (
                      <div
                        className="fixed inset-0 z-[1190]"
                        onClick={() => setOpenTodoPopover(false)}
                      />
                    )}

                    {/* Todo Popover */}
                    {openTodoPopover && (
                      <Paper
                        className="fixed sm:absolute top-[60px] sm:top-[45px] left-4 sm:left-auto right-4 sm:right-0 w-[calc(100vw-32px)] sm:w-[580px] max-w-md sm:max-w-none bg-white rounded-2xl shadow-2xl border border-gray-100 z-[1200] flex flex-col overflow-hidden text-gray-800"
                        style={{
                          maxHeight: "650px",
                        }}
                      >
                        {/* Header */}
                        <div className="bg-blue-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
                          <span className="font-bold text-blue-900 text-base">
                            Ghi chú cần xử lý ({activeTodoList.length})
                          </span>
                        </div>

                        {/* List */}
                        <div
                          className="flex-grow overflow-y-auto divide-y divide-gray-100 p-2"
                          style={{ maxHeight: "450px" }}
                        >
                          {activeTodoList.length > 0 ? (
                            activeTodoList.map((todo, idx) => (
                              <div
                                key={todo._id}
                                className="p-2 flex items-center justify-between gap-2.5 hover:bg-gray-50 transition rounded-lg"
                              >
                                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                  <div className="flex-1 min-w-0 text-left">
                                    <p className="text-gray-800 font-semibold text-base whitespace-pre-wrap leading-relaxed">
                                      {todo.noiDung}
                                    </p>
                                    <div className="flex items-start justify-between mt-1 text-base text-gray-400 w-full">
                                      {todo.donHang ? (
                                        <span
                                          onClick={() => {
                                            setOpenTodoPopover(false);
                                            navigate(`/donhang/${todo.donHang._id}/edit`);
                                          }}
                                          className="font-bold text-blue-600 hover:underline cursor-pointer whitespace-normal break-words mr-2"
                                          title={`BN: ${todo.donHang.benhNhan?.hoVaTen || "Trống"} - NK: ${todo.donHang.nhaKhoa?.tenGiaoDich || todo.donHang.nhaKhoa?.hoVaTen || "Trống"}`}
                                        >
                                          {`BN: ${todo.donHang.benhNhan?.hoVaTen || "Trống"} - NK: ${todo.donHang.nhaKhoa?.tenGiaoDich || todo.donHang.nhaKhoa?.hoVaTen || "Trống"}`}
                                        </span>
                                      ) : (
                                        todo.maDonHang ? (
                                          <span className="font-bold text-gray-500 whitespace-normal break-words mr-2">
                                            {todo.maDonHang}
                                          </span>
                                        ) : <span />
                                      )}
                                      <span className="text-[10.5px] text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded select-none shrink-0">
                                        {formatDateTime(todo.createdAt)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                {/* Checkbox đặt ở bên phải hàng */}
                                <input
                                  type="checkbox"
                                  checked={false}
                                  onChange={() => handleToggleCheckTodo(todo._id)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer shrink-0"
                                />
                              </div>
                            ))
                          ) : (
                            <div className="py-10 text-center text-gray-400 italic text-base">
                              Không có ghi chú nào cần xử lý
                            </div>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="p-2.5 bg-gray-50 border-t border-gray-100 flex gap-2 justify-end shrink-0">
                          <Button
                            size="small"
                            onClick={() => {
                              setOpenTodoPopover(false);
                              navigate("/ghi-chu");
                            }}
                            variant="outlined"
                            className="text-gray-600 border-gray-300 hover:bg-gray-100 font-bold text-[11px] px-3 py-1 rounded-lg lowercase first-letter:uppercase"
                            style={{ textTransform: "none" }}
                          >
                            Mở rộng
                          </Button>
                          <Button
                            size="small"
                            onClick={() => {
                              setOpenTodoPopover(false);
                              setOpenGhiChuAddModal(true);
                            }}
                            variant="contained"
                            color="primary"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] px-3 py-1 rounded-lg"
                            style={{ textTransform: "none" }}
                          >
                            Thêm
                          </Button>
                        </div>
                      </Paper>
                    )}
                  </div>
                )}
                {coQuyenNhaKhoa && (
                  <div className="relative">
                    <button
                      onClick={handleToggleNhaKhoaPopover}
                      title={`Nha khoa ≥ ${nguongNgayChuaGuiDon} ngày chưa gửi đơn`}
                      className="flex items-center justify-center w-10 h-10 bg-white text-red-500 rounded-lg border border-gray-200 hover:bg-gray-50 transition shadow-sm relative shrink-0"
                    >
                      <LocalHospitalIcon className="!w-6 !h-6" />
                      {nhaKhoaChuaGuiDon.length > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full min-w-[20px] h-5 px-1 text-[10px] flex items-center justify-center font-bold shadow-sm">
                          {nhaKhoaChuaGuiDon.length}
                        </span>
                      )}
                    </button>

                    {openNhaKhoaPopover && (
                      <div
                        className="fixed inset-0 z-[1190]"
                        onClick={() => setOpenNhaKhoaPopover(false)}
                      />
                    )}

                    {openNhaKhoaPopover && (
                      <Paper
                        className="fixed sm:absolute top-[60px] sm:top-[45px] left-4 sm:left-auto right-4 sm:right-0 w-[calc(100vw-32px)] sm:w-[440px] max-w-md sm:max-w-none bg-white rounded-2xl shadow-2xl border border-gray-100 z-[1200] flex flex-col overflow-hidden text-gray-800"
                        style={{ maxHeight: "650px" }}
                      >
                        <div className="bg-red-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
                          <span className="font-bold text-red-800 text-base">
                            Nha khoa ≥ {nguongNgayChuaGuiDon} ngày chưa gửi đơn ({nhaKhoaChuaGuiDon.length})
                          </span>
                        </div>
                        <div
                          className="flex-grow overflow-y-auto divide-y divide-gray-100 p-2"
                          style={{ maxHeight: "450px" }}
                        >
                          {nhaKhoaChuaGuiDon.length > 0 ? (
                            nhaKhoaChuaGuiDon.map((nk) => (
                              <div
                                key={nk._id}
                                onClick={() => {
                                  setOpenNhaKhoaPopover(false);
                                  navigate("/nha-khoa");
                                }}
                                className="p-2 flex items-center justify-between gap-2.5 hover:bg-gray-50 transition rounded-lg cursor-pointer"
                              >
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="text-gray-800 font-semibold text-base truncate">
                                    {nk.hoVaTen || nk.tenGiaoDich || "—"}
                                  </p>
                                  <p className="text-sm text-gray-400">
                                    Đơn cuối: {new Date(nk.ngayDonCuoi).toLocaleDateString("vi-VN")}
                                  </p>
                                </div>
                                <span className="shrink-0 min-w-[32px] h-8 px-1 rounded-full border-2 border-red-500 bg-red-50 text-red-500 text-xs font-bold flex items-center justify-center">
                                  {nk.soNgay}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="py-6 text-center text-gray-400 italic text-base">
                              Không có nha khoa nào từ {nguongNgayChuaGuiDon} ngày trở lên chưa gửi đơn
                            </div>
                          )}
                        </div>

                        <div className="p-2.5 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
                          <Button
                            size="small"
                            onClick={() => {
                              setOpenNhaKhoaPopover(false);
                              navigate("/nha-khoa");
                            }}
                            variant="outlined"
                            className="text-gray-600 border-gray-300 hover:bg-gray-100 font-bold text-[11px] px-3 py-1 rounded-lg"
                            style={{ textTransform: "none" }}
                          >
                            Mở trang Nha khoa
                          </Button>
                        </div>
                      </Paper>
                    )}
                  </div>
                )}
                <QuickAddMenu />
                <HeaderUser />
              </>
            ) : (
              <LoginModal />
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <GhiChuAddModal
        open={openGhiChuAddModal}
        onClose={() => setOpenGhiChuAddModal(false)}
      />
    </>
  );
};

export default Header;
