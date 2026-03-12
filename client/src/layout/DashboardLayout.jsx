import React, { useState } from "react";
import { Box } from "@mui/material";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";

const drawerWidth = 250;

export default function DashboardLayout({
  children,
  menuItems,
  selected,
  onSelect,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => setMobileOpen((prev) => !prev);

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        bgcolor: "#f8fafc",
        color: "#0f172a",
        "--dash-ink": "#0f172a",
        "--dash-accent": "#3b82f6",
        "--dash-muted": "#64748b",
        "--dash-border": "#e2e8f0",
        "--dash-shadow": "0 18px 45px rgba(15, 23, 42, 0.08)",
        "--dash-sidebar-bg": "#0f172a",
        "--dash-sidebar-text": "#e2e8f0",
      }}
    >
      <Sidebar
        menuItems={menuItems}
        selectedId={selected}
        onSelect={onSelect}
        width={drawerWidth}
        mobileOpen={mobileOpen}
        onClose={handleDrawerToggle}
      />
      <Box
        sx={{
          flex: 1,
          ml: { md: `${drawerWidth}px` },
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <Box sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 } }}>
          <TopNavbar onMenuClick={handleDrawerToggle} />
        </Box>
        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            px: { xs: 2, md: 3 },
            py: { xs: 2, md: 3 },
          }}
        >
          <Box sx={{ minHeight: "100%" }}>{children}</Box>
        </Box>
      </Box>
    </Box>
  );
}
