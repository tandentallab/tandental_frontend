import React from 'react';
import { Dialog, DialogTitle, DialogContent, Typography, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { THEAD_SX, tableCardSx } from '../../utils/chiPhiStyles';
import { formatVND } from '../../utils/chiPhiUtils';

const SalaryDetailModal = ({ selectedLuong, filter, onClose }) => {
    if (!selectedLuong) return null;

    return (
        <Dialog open={!!selectedLuong} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f0f9ff', color: '#0c4a6e' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Chi tiết bảng lương tháng {filter?.thang}/{filter?.nam}</Typography>
                <IconButton onClick={onClose}><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ bgcolor: '#ffffff', p: 0 }}>
                <TableContainer sx={{ ...tableCardSx, p: { xs: 2, md: 0 } }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#e0f2fe' }}>
                                <TableCell sx={THEAD_SX}>STT</TableCell>
                                <TableCell sx={THEAD_SX}>Tên nhân viên</TableCell>
                                <TableCell sx={THEAD_SX}>Lương cơ bản</TableCell>
                                <TableCell sx={THEAD_SX}>Ứng trước</TableCell>
                                <TableCell sx={THEAD_SX}>Trừ khác</TableCell>
                                <TableCell sx={THEAD_SX}>Thực nhận</TableCell>
                                <TableCell sx={THEAD_SX}>Chi phí lương</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {selectedLuong?.chiTiet?.length > 0 ? (
                                selectedLuong.chiTiet.map((item, index) => (
                                    <TableRow key={item._id || index} sx={{ '&:hover': { bgcolor: '#f0f9ff' }, '& td': { borderBottom: '1px solid #e0f2fe', py: 0.75 } }}>
                                        <TableCell data-label="STT" sx={{ color: '#0284c7', fontWeight: 600, textAlign: { xs: 'right', md: 'center' } }}>{index + 1}</TableCell>
                                        <TableCell data-label="Tên nhân viên" sx={{ fontWeight: 600, color: '#0c4a6e' }}>{item.nhanVien?.hoVaTen || 'Không xác định'}</TableCell>
                                        <TableCell data-label="Lương cơ bản" sx={{ color: '#0369a1' }}>{formatVND(Math.round((item.luongCanBan || 0) / 1000) * 1000)}</TableCell>
                                        <TableCell data-label="Ứng trước" sx={{ color: '#0369a1' }}>{formatVND(Math.round((item.ungTruoc || 0) / 1000) * 1000)}</TableCell>
                                        <TableCell data-label="Trừ khác" sx={{ color: '#0369a1' }}>{formatVND(Math.round((item.truKhac || 0) / 1000) * 1000)}</TableCell>
                                        <TableCell data-label="Thực nhận" sx={{ fontWeight: 700, color: '#0369a1' }}>{formatVND(Math.round((item.thucNhan || 0) / 1000) * 1000)}</TableCell>
                                        <TableCell data-label="Chi phí lương" sx={{ fontWeight: 700, color: '#0369a1' }}>{formatVND(Math.round((item.chiPhiLuong ?? ((item.thucNhan || 0) + (item.ungTruoc || 0))) / 1000) * 1000)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow className="empty-row">
                                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#7dd3fc' }}>Chưa có dữ liệu bảng lương chi tiết</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>
        </Dialog>
    );
};
export default SalaryDetailModal;