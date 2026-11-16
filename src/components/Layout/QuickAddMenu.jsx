import React, { useCallback, useState } from "react";
import {
  Group,
  Assignment,
  Description,
  Download,
  Upload,
  Business,
  Add,
  NoteAdd,
} from "@mui/icons-material";
import NguoiLienHeModal from "../NguoiLienHe/NguoiLienHeModal";
import BenhNhanModal from "../BenhNhan/BenhNhanModal";
import { useNavigate } from "react-router-dom";
import PhieuThuModal from "../PhieuThu/PhieuThuModal";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllPhieuThu } from "../../redux/slices/phieuThuSlice";
import StaffModal from "../Staff/StaffModal";
import { hasRouteAccess } from "../../config/permissions";
import GhiChuAddModal from "../GhiChu/GhiChuAddModal";

const QuickAddMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navigate = useNavigate();

  const ROWS_PER_PAGE = 20;

  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [isGhiChuModalOpen, setIsGhiChuModalOpen] = useState(false);

  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const currentUser = auth?.user;

  const loadData = useCallback(() => {
    dispatch(
      fetchAllPhieuThu({ page, limit: ROWS_PER_PAGE, search: debouncedSearch })
    );
  }, [dispatch, page, debouncedSearch]);

  return (
    <div className="relative inline-block text-left">
      {/* Nút + */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 bg-white text-green-600 rounded-lg border border-gray-200 hover:bg-gray-50 transition shadow-sm"
      >
        <Add className="!w-6 !h-6" />
      </button>

      {isOpen && (
        <>
          {/* overlay */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* menu */}
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-xl border z-20 overflow-hidden">
            {hasRouteAccess(currentUser, "/don-hang") && (
              <button
                className="w-full flex items-center px-4 py-3 text-base text-gray-700 hover:bg-gray-100 border-b last:border-0"
                onClick={() => {
                  navigate("/donhang/create");
                  setIsOpen(false);
                }}
              >
                <span className="mr-3 text-gray-500">
                  <Assignment fontSize="small" />
                </span>
                <span className="font-medium">Thêm Đơn Hàng</span>
              </button>
            )}
            {hasRouteAccess(currentUser, "/cho-xuat-hoa-don") && (
              <button
                className="w-full flex items-center px-4 py-3 text-base text-gray-700 hover:bg-gray-100 border-b last:border-0"
                onClick={() => {
                  navigate("/cho-xuat-hoa-don");
                  setIsOpen(false);
                }}
              >
                <span className="mr-3 text-gray-500">
                  <Description fontSize="small" />{" "}
                </span>
                <span className="font-medium">Thêm Hóa Đơn</span>
              </button>
            )}
            {hasRouteAccess(currentUser, "/phieu-thu") && (
              <button
                className="w-full flex items-center px-4 py-3 text-base text-gray-700 hover:bg-gray-100 border-b last:border-0"
                onClick={() => setOpenModal(true)}
              >
                <span className="mr-3 text-gray-500">
                  <Download fontSize="small" />,
                </span>
                <span className="font-medium">Thêm Phiếu Thu</span>
              </button>
            )}
            {hasRouteAccess(currentUser, "/nguoi-lien-he") && <NguoiLienHeModal isQuickMenu={true}></NguoiLienHeModal>}
            {hasRouteAccess(currentUser, "/benh-nhan") && <BenhNhanModal isQuickMenu={true}></BenhNhanModal>}
            {hasRouteAccess(currentUser, "/nhan-vien") && <StaffModal isQuickMenu={true}></StaffModal>}
            {hasRouteAccess(currentUser, "/ghi-chu") && (
              <button
                className="w-full flex items-center px-4 py-3 text-base text-gray-700 hover:bg-gray-100 border-b last:border-0"
                onClick={() => {
                  setIsGhiChuModalOpen(true);
                  setIsOpen(false);
                }}
              >
                <span className="mr-3 text-gray-500">
                  <NoteAdd fontSize="small" />
                </span>
                <span className="font-medium">Thêm Ghi Chú</span>
              </button>
            )}
          </div>
        </>
      )}

      <PhieuThuModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSuccess={loadData}
      />

      <GhiChuAddModal
        open={isGhiChuModalOpen}
        onClose={() => setIsGhiChuModalOpen(false)}
      />
    </div>
  );
};

export default QuickAddMenu;
