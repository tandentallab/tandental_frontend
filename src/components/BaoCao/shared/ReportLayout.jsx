import React, { useState } from 'react';
import {
    Box, Drawer, IconButton, Typography, Tooltip,
    List, ListItem, ListItemButton,
    useMediaQuery, useTheme
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import BarChartIcon from '@mui/icons-material/BarChart';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import StorefrontIcon from '@mui/icons-material/Storefront';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import TimelineIcon from '@mui/icons-material/Timeline';
import SpeedIcon from '@mui/icons-material/Speed';
import { useNavigate, useLocation } from 'react-router-dom';

const SIDEBAR_EXPANDED = 265;
const SIDEBAR_COLLAPSED = 56;

const REPORT_MENU = [
    { path: '/bao-cao', label: 'Sản lượng theo thời gian', icon: <BarChartIcon fontSize="small" /> },
    { path: '/bao-cao/khach-hang', label: 'Sản lượng theo khách hàng', icon: <PeopleAltIcon fontSize="small" /> },
    { path: '/bao-cao/doanh-so', label: 'Doanh số theo khách hàng', icon: <StorefrontIcon fontSize="small" /> },
    { path: '/bao-cao/doanh-so-san-pham', label: 'Doanh số theo sản phẩm', icon: <Inventory2Icon fontSize="small" /> },
    { path: '/bao-cao/doanh-so-thoi-gian', label: 'Doanh số theo thời gian', icon: <TimelineIcon fontSize="small" /> },
    { path: '/bao-cao/nang-suat', label: 'Năng suất', icon: <SpeedIcon fontSize="small" /> },
];

const SidebarContent = ({ collapsed, onCollapse, onNavigate }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const TRANSITION = 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)';

    const ITEM_COLORS = [
        { bg: '#ede9fe', border: '#a78bfa', icon: '#7c3aed' },
        { bg: '#dbeafe', border: '#60a5fa', icon: '#1d4ed8' },
        { bg: '#dcfce7', border: '#4ade80', icon: '#15803d' },
        { bg: '#fef9c3', border: '#facc15', icon: '#a16207' },
        { bg: '#ffedd5', border: '#fdba74', icon: '#ea580c' },
        { bg: '#fce7f3', border: '#f9a8d4', icon: '#be185d' },
    ];

    const getItemSx = (active) => ({
        justifyContent: 'flex-start',
        width: 'calc(100% - 12px)',
        margin: '3px 6px',
        pl: 1,
        pr: 1,
        py: 0.8,
        borderRadius: 2,
        backgroundColor: active ? '#bfdbfe' : 'transparent',
        '&:hover': {
            backgroundColor: active ? '#93c5fd' : 'rgba(0,0,0,0.04)',
        },
        overflow: 'hidden',
        transition: TRANSITION,
    });

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box sx={{
                px: 1.5,
                bgcolor: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: 48,
                overflow: 'hidden',
            }}>
                {!onNavigate && (
                    <Tooltip title={collapsed ? 'Mở rộng' : 'Thu gọn'} placement="right" arrow>
                        <IconButton
                            onClick={onCollapse}
                            size="small"
                            sx={{
                                color: 'white',
                                flexShrink: 0,
                                bgcolor: '#0EA5A4',
                                transition: TRANSITION,
                                '&:hover': { bgcolor: '#0D9488', color: 'white' },
                            }}
                        >
                            {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                )}
            </Box>

            <List sx={{ pt: 1, flex: 1 }}>
                {REPORT_MENU.map((item, idx) => {
                    const isActive =
                        location.pathname === item.path ||
                        (item.path === '/bao-cao' && location.pathname === '/bao-cao/san-luong');

                    const colors = ITEM_COLORS[idx % ITEM_COLORS.length];

                    const button = (
                        <ListItemButton
                            onClick={() => { navigate(item.path); onNavigate?.(); }}
                            sx={getItemSx(isActive)}
                        >
                            <Box sx={{
                                width: 34,
                                height: 34,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                backgroundColor: colors.bg,
                                border: `1.5px solid ${colors.border}`,
                                color: colors.icon,
                                transition: TRANSITION,
                                '&:hover': { filter: 'brightness(0.93)' },
                            }}>
                                {item.icon}
                            </Box>
                            <Box sx={{
                                ml: 1.5,
                                overflow: 'hidden',
                                maxWidth: collapsed ? 0 : 200,
                                opacity: collapsed ? 0 : 1,
                                transition: TRANSITION,
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                            }}>
                                <Box sx={{
                                    lineHeight: 1.4,
                                    fontSize: '0.95rem',
                                    fontWeight: isActive ? 700 : 500,
                                    color: isActive ? '#1d4ed8' : '#1e293b',
                                    pr: 1,
                                }}>
                                    {item.label}
                                </Box>
                            </Box>
                        </ListItemButton>
                    );

                    return (
                        <ListItem key={item.path} disablePadding>
                            {collapsed ? (
                                <Tooltip title={item.label} placement="right" arrow>
                                    {button}
                                </Tooltip>
                            ) : button}
                        </ListItem>
                    );
                })}
            </List>
        </Box>
    );
};

const ReportLayout = ({ children, title }) => {
    const location = useLocation();
    const [drawerOpen, setDrawerOpen] = useState(() => {
        return location.state?.isFromMainSidebar === true;
    });

    // Đã thay đổi khởi tạo state thành false để sidebar luôn mở sẵn khi vào trang
    const [collapsed, setCollapsed] = useState(false);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const toggleCollapsed = () => setCollapsed(v => {
        const next = !v;
        try { localStorage.setItem('sidebar-collapsed', String(next)); } catch { }
        return next;
    });

    const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

    return (
        <Box sx={{ display: 'flex', height: '100%', width: '100%', bgcolor: '#f9fafb' }}>

            {!isMobile && (
                <Drawer
                    className="no-print"
                    variant="permanent"
                    open
                    sx={{
                        width: sidebarWidth,
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        transition: theme.transitions.create('width', {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                        '& .MuiDrawer-paper': {
                            position: 'relative',
                            width: sidebarWidth,
                            boxSizing: 'border-box',
                            overflowX: 'hidden',
                            overflowY: 'hidden',
                            borderRight: '1px solid #e5e7eb',
                            boxShadow: '2px 0 6px rgba(0,0,0,0.04)',
                            transition: theme.transitions.create('width', {
                                easing: theme.transitions.easing.sharp,
                                duration: theme.transitions.duration.enteringScreen,
                            }),
                        },
                    }}
                >
                    <SidebarContent
                        collapsed={collapsed}
                        onCollapse={toggleCollapsed}
                    />
                </Drawer>
            )}

            {isMobile && (
                <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
                    <Box sx={{ width: '100vw', pt: '24px' }} role="presentation">
                        <SidebarContent
                            collapsed={false}
                            onCollapse={() => { }}
                            onNavigate={() => setDrawerOpen(false)}
                        />
                    </Box>
                </Drawer>
            )}

            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                <Box
                    className="no-print"
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        px: { xs: 2, md: 3 },
                        pt: { xs: 1, md: 2 },
                        pb: 2,
                    }}
                >
                    {isMobile && (
                        <IconButton
                            onClick={() => setDrawerOpen(true)}
                            size="small"
                            sx={{ bgcolor: '#f3f4f6', '&:hover': { bgcolor: '#e5e7eb' }, mr: 1 }}
                        >
                            <ChevronRightIcon sx={{ color: '#1e3a8a' }} />
                        </IconButton>
                    )}
                </Box>

                <Box sx={{ flex: 1, overflow: 'auto', px: { xs: 2, md: 3 }, pb: { xs: 2, md: 3 }, pt: 0 }}>
                    {children}
                </Box>
            </Box>

            <style>{`
                    .print-only { display: none; }
                    @media print {
                        .no-print { display: none !important; }
                        header, nav, aside, .MuiDrawer-root { display: none !important; }
                        .print-only { display: block !important; }
                        @page { size: A4 portrait; margin: 0 !important; }
                        body { background: white !important; margin: 0 !important; padding: 15mm 20mm !important; }
                    }
                `}</style>
        </Box>
    );
};

export default ReportLayout;