import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "./api";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";

import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PersonIcon from "@mui/icons-material/Person";
import RoomIcon from "@mui/icons-material/Room";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import HotelIcon from "@mui/icons-material/Hotel";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import ExploreOutlinedIcon from "@mui/icons-material/ExploreOutlined";
import HotelOutlinedIcon from "@mui/icons-material/HotelOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import styles from "./Login.module.css";

const roles = [
  {
    value: "tourist",
    label: "Tourist",
    icon: <PersonIcon fontSize="small" />,
    description: "Manage trips, discover destinations, and keep all travel stories in one place.",
  },
  {
    value: "guide",
    label: "Guide",
    icon: <RoomIcon fontSize="small" />,
    description: "Handle requests, client chats, and availability from your guide workspace.",
  },
  {
    value: "hotel",
    label: "Hotel",
    icon: <HotelIcon fontSize="small" />,
    description: "Track bookings, rooms, and guest conversations from one dashboard.",
  },
  {
    value: "hospital",
    label: "Hospital",
    icon: <LocalHospitalIcon fontSize="small" />,
    description: "Access Travelogue emergency partnership tools and support visibility.",
  },
  {
    value: "admin",
    label: "Admin",
    icon: <AdminPanelSettingsIcon fontSize="small" />,
    description: "Review platform activity, moderation queues, and operational updates.",
  },
];

const highlights = [
  {
    title: "Discover and plan",
    description: "Save destinations, compare options, and shape your itinerary with context.",
    icon: <ExploreOutlinedIcon fontSize="small" />,
  },
  {
    title: "Book with confidence",
    description: "Manage guide and hotel bookings with clear timelines and status tracking.",
    icon: <HotelOutlinedIcon fontSize="small" />,
  },
  {
    title: "Publish your journey",
    description: "Keep memories in your private vault or share travelogues with the community.",
    icon: <MenuBookOutlinedIcon fontSize="small" />,
  },
];

export default function Login() {
  const [selectedRole, setSelectedRole] = useState(roles[0].value);
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "info",
    message: "",
  });

  const activeRole = useMemo(
    () => roles.find((role) => role.value === selectedRole) || roles[0],
    [selectedRole]
  );

  const handleRole = (event, newRole) => {
    if (newRole !== null) setSelectedRole(newRole);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const showToast = (severity, message) => {
    setSnackbar({ open: true, severity, message });
  };

  const clearAuthStorage = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const res = await api.post("/login", {
        ...form,
        role: selectedRole,
      });

      const userRole = res?.data?.user?.role;
      if (!userRole) {
        throw new Error("Could not verify account role. Please try again.");
      }

      if (userRole !== selectedRole) {
        showToast(
          "warning",
          `This account belongs to ${userRole}. Select ${userRole} to continue.`
        );
        return;
      }

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("userId", res.data.user._id);

      if (userRole === "guide") {
        const guideRes = await api.get(`/guide/profile/${res.data.user._id}`);
        if (guideRes.data.guide) {
          if (guideRes.data.guide.rejected) {
            clearAuthStorage();
            showToast("error", "Your guide account was rejected and cannot sign in.");
            return;
          }
          if (!guideRes.data.guide.approved) {
            clearAuthStorage();
            showToast(
              "info",
              "Your guide profile is pending admin approval. Please try again later."
            );
            return;
          }
        }
      }

      const redirectByRole = {
        guide: "/guide-dashboard",
        admin: "/admin-dashboard",
        tourist: "/tourist-dashboard",
        hotel: "/hotel-dashboard",
        hospital: "/",
      };

      window.location.href = redirectByRole[userRole] || "/";
    } catch (err) {
      clearAuthStorage();
      showToast(
        "error",
        err.response?.data?.message || err.message || "Unable to sign in right now."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className={styles.authShell}>
      <Box className={styles.authFrame}>
        <Box className={styles.brandPanel}>
          <Box className={styles.brandBadge}>
            <TravelExploreIcon fontSize="small" />
            Travelogue
          </Box>
          <Typography component="h1" className={styles.brandTitle}>
            Every trip detail, booking, and story in one travel workspace.
          </Typography>
          <Typography className={styles.brandSub}>
            Sign in to continue where you left off and move from planning to
            publishing without jumping between tools.
          </Typography>

          <Box className={styles.featureList}>
            {highlights.map((item) => (
              <Box key={item.title} className={styles.featureCard}>
                <Box className={styles.featureIcon}>{item.icon}</Box>
                <Box>
                  <Typography className={styles.featureTitle}>{item.title}</Typography>
                  <Typography className={styles.featureText}>{item.description}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        <Box className={styles.formPanel}>
          <Box className={styles.formHeader}>
            <Box className={styles.iconHalo}>
              <LockOutlinedIcon />
            </Box>
            <Typography component="h2" className={styles.formTitle}>
              Welcome back
            </Typography>
            <Typography className={styles.formSubtitle}>
              Choose your account role and continue to your dashboard.
            </Typography>
          </Box>

          <Typography className={styles.sectionLabel}>Sign in as</Typography>
          <ToggleButtonGroup
            value={selectedRole}
            exclusive
            onChange={handleRole}
            className={styles.roleGroup}
          >
            {roles.map((role) => (
              <ToggleButton key={role.value} value={role.value} className={styles.roleBtn}>
                <Box className={styles.roleInner}>
                  {role.icon}
                  <Typography className={styles.roleLabel}>{role.label}</Typography>
                </Box>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Typography className={styles.roleHint}>{activeRole.description}</Typography>

          <form onSubmit={handleSubmit} className={styles.form}>
            <TextField
              required
              fullWidth
              id="email"
              label="Email address"
              name="email"
              type="email"
              autoComplete="email"
              autoFocus
              value={form.email}
              onChange={handleChange}
              className={styles.formField}
            />
            <TextField
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              className={styles.formField}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <VisibilityOffOutlinedIcon />
                      ) : (
                        <VisibilityOutlinedIcon />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              className={styles.loginBtn}
              disabled={loading}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : "Sign in"}
            </Button>
          </form>

          <Box className={styles.footerText}>
            <Typography variant="body2">
              New to Travelogue?{" "}
              <Link to="/register" className={styles.registerLink}>
                Create an account
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4500}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
