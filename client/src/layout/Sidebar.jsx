import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  Stack,
  Typography,
} from "@mui/material";
import api from "../api";
import { useTranslation } from "react-i18next";

const defaultWidth = 250;

export default function Sidebar({
  menuItems = [],
  selectedId,
  onSelect,
  width = defaultWidth,
  mobileOpen = false,
  onClose,
  brand = "Travelogue",
}) {
  const { t } = useTranslation();
  const [profileAnchor, setProfileAnchor] = useState(null);
  const [hotelProfile, setHotelProfile] = useState({ name: "", address: "" });

  const profile = useMemo(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch (err) {
      return {};
    }
  }, []);

  const displayName = profile?.name || t("sidebar.defaultHotelOwner");
  const roleLabel = profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : t("sidebar.roleHotel");
  const email = profile?.email || t("sidebar.noEmailProvided");
  const phone = profile?.phone || t("sidebar.noPhoneProvided");
  const country = profile?.country || t("sidebar.notSet");
  const interests = profile?.interests || t("sidebar.notSet");
  const initial = displayName?.trim()?.[0]?.toUpperCase() || "H";
  const userId = profile?._id || profile?.userId || localStorage.getItem("userId");

  useEffect(() => {
    let isMounted = true;
    const fetchHotelProfile = async () => {
      if (!userId || profile?.role !== "hotel") return;
      try {
        const res = await api.get(`/hotel/profile/${userId}`);
        if (!isMounted) return;
        setHotelProfile({
          name: res.data?.name || "",
          address: res.data?.address || "",
        });
      } catch (err) {
        if (isMounted) setHotelProfile({ name: "", address: "" });
      }
    };
    fetchHotelProfile();
    return () => {
      isMounted = false;
    };
  }, [userId, profile?.role]);

  const handleSelect = (id) => {
    if (onSelect) onSelect(id);
    if (onClose) onClose();
  };

  const handleProfileOpen = (event) => {
    setProfileAnchor(event.currentTarget);
  };

  const handleProfileClose = () => setProfileAnchor(null);
  const handleSignOut = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      localStorage.removeItem("hotel_settings_active_tab");
    } catch (err) {
      // ignore storage errors
    }
    handleProfileClose();
    if (onClose) onClose();
    window.location.href = "/login";
  };

  const handleSectionOpen = (sectionId, settingsTab) => {
    if (sectionId && onSelect) onSelect(sectionId);
    if (settingsTab) {
      try {
        localStorage.setItem("hotel_settings_active_tab", settingsTab);
      } catch (err) {
        // ignore storage errors
      }
    }
    handleProfileClose();
    if (onClose) onClose();
  };

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        bgcolor: "var(--dash-sidebar-bg)",
        color: "var(--dash-sidebar-text)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ px: 3, py: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#fff" }}>
          {brand}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          {t("sidebar.console")}
        </Typography>
      </Box>
      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
      <List sx={{ px: 1.5, py: 2 }}>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.id}
            selected={selectedId === item.id}
            onClick={() => handleSelect(item.id)}
            sx={{
              mb: 0.5,
              borderRadius: 2,
              color: "rgba(255,255,255,0.72)",
              "& .MuiListItemIcon-root": {
                color: "rgba(255,255,255,0.6)",
              },
              "&.Mui-selected": {
                bgcolor: "rgba(59,130,246,0.24)",
                color: "#fff",
              },
              "&.Mui-selected .MuiListItemIcon-root": {
                color: "#fff",
              },
              "&:hover": {
                bgcolor: "rgba(59,130,246,0.18)",
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ mt: "auto", px: 3, pb: 3 }}>
        <Box
          onClick={handleProfileOpen}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 1.5,
            borderRadius: 2,
            bgcolor: "rgba(255,255,255,0.08)",
            cursor: "pointer",
            transition: "all 0.2s ease",
            "&:hover": {
              bgcolor: "rgba(255,255,255,0.16)",
              transform: "translateY(-1px)",
            },
          }}
        >
          <Avatar sx={{ width: 32, height: 32, bgcolor: "var(--dash-accent)" }}>
            {initial}
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 600, color: "#fff" }}>{displayName}</Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
              {roleLabel}
            </Typography>
          </Box>
        </Box>
        <Menu
          anchorEl={profileAnchor}
          open={Boolean(profileAnchor)}
          onClose={handleProfileClose}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          transformOrigin={{ vertical: "bottom", horizontal: "right" }}
          sx={{ "& .MuiPaper-root": { borderRadius: 2 } }}
        >
          <Box sx={{ px: 2.5, py: 2, maxWidth: 260 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ width: 44, height: 44, bgcolor: "var(--dash-accent)" }}>
                {initial}
              </Avatar>
              <Box>
                <Typography fontWeight={700}>{displayName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {roleLabel}
                </Typography>
              </Box>
            </Stack>
            <Stack spacing={0.5} mt={1.5}>
              <Typography variant="caption" color="text.secondary">
                {t("sidebar.field.email")}: {email}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("sidebar.field.phone")}: {phone}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("sidebar.field.hotel")}: {hotelProfile.name || t("sidebar.notSet")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("sidebar.field.address")}: {hotelProfile.address || t("sidebar.notSet")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("sidebar.field.country")}: {country}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("sidebar.field.interests")}: {interests}
              </Typography>
            </Stack>
          </Box>
          <Divider />
          <List sx={{ py: 0 }}>
            <ListItemButton onClick={() => handleSectionOpen("profile", "general")} sx={{ px: 2 }}>
              <ListItemText primary={t("sidebar.profile")} />
            </ListItemButton>
            <ListItemButton onClick={handleSignOut} sx={{ px: 2 }}>
              <ListItemText primary={t("sidebar.signOut")} />
            </ListItemButton>
          </List>
        </Menu>
      </Box>
    </Box>
  );

  return (
    <>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width,
            boxSizing: "border-box",
            borderRight: "none",
          },
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            width,
            boxSizing: "border-box",
            borderRight: "none",
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
}
