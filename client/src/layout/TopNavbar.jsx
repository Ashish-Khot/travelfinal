import React, { useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import MenuIcon from "@mui/icons-material/Menu";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/LanguageSwitcher";

export default function TopNavbar({
  onMenuClick,
}) {
  const { t } = useTranslation();
  const [profileAnchor, setProfileAnchor] = useState(null);

  const profile = useMemo(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch (err) {
      return {};
    }
  }, []);

  const displayName = profile?.name || t("topNavbar.defaultHotelOwner");
  const roleLabel = profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : t("topNavbar.roleHotel");
  const email = profile?.email || t("topNavbar.noEmailProvided");
  const phone = profile?.phone || t("topNavbar.noPhoneProvided");
  const country = profile?.country || t("topNavbar.notSet");
  const interests = profile?.interests || t("topNavbar.notSet");
  const initial = displayName?.trim()?.[0]?.toUpperCase() || "H";

  const handleProfileOpen = (event) => {
    setProfileAnchor(event.currentTarget);
  };

  const handleProfileClose = () => setProfileAnchor(null);
  const handleSignOut = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("userId");
    } catch (err) {
      // ignore storage errors
    }
    handleProfileClose();
    window.location.href = "/login";
  };

  return (
    <Box
      sx={{
        bgcolor: "#fff",
        borderRadius: { xs: 2.5, md: 3 },
        px: { xs: 2, md: 3 },
        py: { xs: 1.5, md: 2 },
        boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
        border: "1px solid rgba(148, 163, 184, 0.35)",
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 4,
          background: "linear-gradient(90deg, #0ea5e9 0%, #6366f1 50%, #22c55e 100%)",
        },
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        spacing={2}
      >
        <Stack direction="row" alignItems="flex-start" spacing={1.5}>
          <IconButton
            onClick={onMenuClick}
            sx={{ display: { xs: "inline-flex", md: "none" }, mt: 0.5 }}
            size="small"
          >
            <MenuIcon />
          </IconButton>
          <Box>
            <Typography
              variant="overline"
              sx={{ color: "#64748b", letterSpacing: 1.8, fontWeight: 700 }}
            >
              {t("topNavbar.commandCenter")}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
              {t("topNavbar.welcomeBack", { name: displayName })}
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748b" }}>
              {t("topNavbar.subtitle")}
            </Typography>
          </Box>
        </Stack>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          flexWrap="wrap"
          justifyContent={{ xs: "flex-start", md: "flex-end" }}
        >
          <LanguageSwitcher compact />
          <IconButton
            sx={{
              bgcolor: "rgba(148, 163, 184, 0.16)",
              borderRadius: 2,
              "&:hover": { bgcolor: "rgba(148, 163, 184, 0.3)" },
            }}
          >
            <Badge variant="dot" color="error">
              <NotificationsNoneIcon />
            </Badge>
          </IconButton>
          <Button
            onClick={handleProfileOpen}
            endIcon={<KeyboardArrowDownIcon />}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              color: "#0f172a",
              bgcolor: "rgba(255, 255, 255, 0.9)",
              borderRadius: 2,
              px: 1.5,
              border: "1px solid rgba(148, 163, 184, 0.35)",
              boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)",
            }}
          >
            <Avatar sx={{ width: 28, height: 28, mr: 1, bgcolor: "var(--dash-accent)" }}>
              {initial}
            </Avatar>
            {displayName}
          </Button>
          <Menu anchorEl={profileAnchor} open={Boolean(profileAnchor)} onClose={handleProfileClose}>
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
                  {t("topNavbar.field.email")}: {email}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("topNavbar.field.phone")}: {phone}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("topNavbar.field.country")}: {country}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("topNavbar.field.interests")}: {interests}
                </Typography>
              </Stack>
            </Box>
            <Divider />
            <MenuItem onClick={handleProfileClose}>{t("topNavbar.profile")}</MenuItem>
            <MenuItem onClick={handleProfileClose}>{t("topNavbar.settings")}</MenuItem>
            <MenuItem onClick={handleSignOut}>{t("topNavbar.signOut")}</MenuItem>
          </Menu>
        </Stack>
      </Stack>
    </Box>
  );
}
