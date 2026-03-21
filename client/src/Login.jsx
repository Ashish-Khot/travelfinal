import React, { useState } from "react";
import Snackbar from "@mui/material/Snackbar";
import { Link } from "react-router-dom";
import api from "./api";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PersonIcon from "@mui/icons-material/Person";
import RoomIcon from "@mui/icons-material/Room";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import HotelIcon from "@mui/icons-material/Hotel";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import styles from "./Login.module.css";

const roles = [
  { label: "Tourist", icon: <PersonIcon color="success" /> },
  { label: "Guide", icon: <RoomIcon color="primary" /> },
  { label: "Admin", icon: <AdminPanelSettingsIcon color="info" /> },
  { label: "Hotel", icon: <HotelIcon color="error" /> },
  { label: "Hospital", icon: <LocalHospitalIcon color="secondary" /> },
];

export default function Login() {
  const [selectedRole, setSelectedRole] = useState("Tourist");
  const [form, setForm] = useState({ email: "", password: "" });
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  const handleRole = (event, newRole) => {
    if (newRole !== null) setSelectedRole(newRole);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/login', {
        ...form,
        role: selectedRole.toLowerCase() // send role to backend
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      localStorage.setItem('userId', res.data.user._id);
      // If guide, check for rejection before redirect
      if (res.data.user.role === 'guide') {
        // Fetch guide profile by userId
        const guideRes = await api.get(`/guide/profile/${res.data.user._id}`);
        if (guideRes.data.guide) {
          if (guideRes.data.guide.rejected) {
            setSnackbar({ open: true, message: 'You are rejected and cannot log in as a guide.' });
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            return;
          }
          if (!guideRes.data.guide.approved) {
            setSnackbar({ open: true, message: 'Your guide application is not approved yet. Please wait for admin approval.' });
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            return;
          }
        }
        window.location.href = '/guide-dashboard';
      } else if (res.data.user.role === 'admin') {
        window.location.href = '/admin-dashboard';
      } else if (res.data.user.role === 'tourist') {
        window.location.href = '/tourist-dashboard';
      } else if (res.data.user.role === 'hotel') {
        window.location.href = '/hotel-dashboard';
      } else {
        window.location.href = '/';
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <>
      <Box className={styles.authShell}>
        <Box className={styles.authFrame}>
          <Box className={styles.brandPanel}>
            <Box className={styles.brandBadge}>
              <TravelExploreIcon fontSize="small" />
              Travelogue
            </Box>
            <Typography component="h1" className={styles.brandTitle}>
              Your premium travel studio for stays, guides, and stories.
            </Typography>
            <Typography className={styles.brandSub}>
              Sign in to keep your bookings, itineraries, and travelogues perfectly in sync.
            </Typography>
            <Box className={styles.brandStats}>
              <Box className={styles.statCard}>
                <Typography className={styles.statValue}>4.9</Typography>
                <Typography className={styles.statLabel}>Guest rating</Typography>
              </Box>
              <Box className={styles.statCard}>
                <Typography className={styles.statValue}>120+</Typography>
                <Typography className={styles.statLabel}>Countries covered</Typography>
              </Box>
              <Box className={styles.statCard}>
                <Typography className={styles.statValue}>24/7</Typography>
                <Typography className={styles.statLabel}>Trip support</Typography>
              </Box>
            </Box>
            <Box className={styles.brandTags}>
              <Box className={styles.tag}>Verified guides</Box>
              <Box className={styles.tag}>Secure payments</Box>
              <Box className={styles.tag}>Instant confirmations</Box>
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
                Access your Travelogue account in seconds.
              </Typography>
            </Box>

            <Typography className={styles.sectionLabel}>Login as</Typography>
            <ToggleButtonGroup
              value={selectedRole}
              exclusive
              onChange={handleRole}
              className={styles.roleGroup}
            >
              {roles.map((role) => (
                <ToggleButton key={role.label} value={role.label} className={styles.roleBtn}>
                  <Box className={styles.roleInner}>
                    {role.icon}
                    <Typography className={styles.roleLabel}>{role.label}</Typography>
                  </Box>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <form onSubmit={handleSubmit} className={styles.form}>
              <TextField
                required
                fullWidth
                id="email"
                label="Email"
                name="email"
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
                type="password"
                id="password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                className={styles.formField}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                className={styles.loginBtn}
              >
                Sign in
              </Button>
            </form>

            <Box className={styles.footerText}>
              <Typography variant="body2">
                Do not have an account?{" "}
                <Link to="/register" className={styles.registerLink}>
                  Register
                </Link>
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ open: false, message: '' })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />
    </>
  );
}
