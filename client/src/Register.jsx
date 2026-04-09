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
import MenuItem from "@mui/material/MenuItem";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";

import PersonIcon from "@mui/icons-material/Person";
import RoomIcon from "@mui/icons-material/Room";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import HotelIcon from "@mui/icons-material/Hotel";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import ExploreOutlinedIcon from "@mui/icons-material/ExploreOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CollectionsBookmarkOutlinedIcon from "@mui/icons-material/CollectionsBookmarkOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";

import styles from "./Register.module.css";

const languageOptions = [
  "English", "Hindi", "Spanish", "French", "German", "Chinese", "Other"
];

const roles = [
  {
    value: "tourist",
    label: "Tourist",
    icon: <PersonIcon fontSize="small" />,
    description: "Create trips, compare options, and publish travelogues from your account.",
  },
  {
    value: "guide",
    label: "Guide",
    icon: <RoomIcon fontSize="small" />,
    description: "Set up your guide profile, experience, and language coverage for approvals.",
  },
  {
    value: "hotel",
    label: "Hotel",
    icon: <HotelIcon fontSize="small" />,
    description: "Manage room inventory, bookings, and guest interactions in one workspace.",
  },
  {
    value: "hospital",
    label: "Hospital",
    icon: <LocalHospitalIcon fontSize="small" />,
    description: "Register as a medical partner for Travelogue emergency support visibility.",
  },
  {
    value: "admin",
    label: "Admin",
    icon: <AdminPanelSettingsIcon fontSize="small" />,
    description: "Create an admin account for moderation and platform operations.",
  },
];

const onboardingHighlights = [
  {
    title: "Personal travel profile",
    description: "Store your identity, interests, and travel preferences in one place.",
    icon: <ExploreOutlinedIcon fontSize="small" />,
  },
  {
    title: "Booking-ready access",
    description: "Get immediate access to guide and hotel flows after creating your account.",
    icon: <CalendarMonthOutlinedIcon fontSize="small" />,
  },
  {
    title: "Story-first workspace",
    description: "Capture memories, drafts, and published travelogues in your account.",
    icon: <CollectionsBookmarkOutlinedIcon fontSize="small" />,
  },
];

export default function Register() {
  const [selectedRole, setSelectedRole] = useState(roles[0].value);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "info",
    message: "",
  });

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    country: "",
    interests: "",
    bio: "",
    experienceYears: "",
    languages: [],
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

  const handleLanguagesChange = (e) => {
    const value = e.target.value;
    setForm({
      ...form,
      languages: typeof value === "string" ? value.split(",") : value,
    });
  };

  const showToast = (severity, message) => {
    setSnackbar({ open: true, severity, message });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      let payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        country: form.country,
        interests: form.interests,
        role: selectedRole,
      };
      if (selectedRole === "guide") {
        payload = {
          ...payload,
          bio: form.bio,
          experienceYears: form.experienceYears,
          languages: form.languages,
        };
      }
      await api.post("/register", payload);
      showToast("success", "Account created successfully. Redirecting to sign in...");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1200);
    } catch (err) {
      showToast(
        "error",
        err.response?.data?.message || err.message || "Registration failed."
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
            Build a travel-ready account that fits how you explore, host, or guide.
          </Typography>
          <Typography className={styles.brandSub}>
            Register once and start working with bookings, itineraries, and
            travel stories across the full Travelogue ecosystem.
          </Typography>

          <Box className={styles.featureList}>
            {onboardingHighlights.map((item) => (
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
              <PersonIcon />
            </Box>
            <Typography component="h2" className={styles.formTitle}>
              Create your account
            </Typography>
            <Typography className={styles.formSubtitle}>
              Fill in your details and choose the role that matches your workspace.
            </Typography>
          </Box>

          <Typography className={styles.sectionLabel}>Register as</Typography>
          <ToggleButtonGroup
            value={selectedRole}
            exclusive
            onChange={handleRole}
            className={styles.roleGroup}
          >
            {roles.map((role) => (
              <ToggleButton
                key={role.value}
                value={role.value}
                className={styles.roleBtnSquare}
              >
                <Box className={styles.roleInner}>
                  {role.icon}
                  <Typography className={styles.roleLabel}>{role.label}</Typography>
                </Box>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Typography className={styles.roleHint}>{activeRole.description}</Typography>

          <form onSubmit={handleSubmit} className={styles.form}>
            <Box className={styles.formGrid}>
              <TextField
                fullWidth
                required
                label="Full name"
                name="name"
                value={form.name}
                onChange={handleChange}
                className={styles.formField}
              />
              <TextField
                fullWidth
                required
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                className={styles.formField}
              />
              <TextField
                fullWidth
                required
                label="Password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="new-password"
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
              <TextField
                fullWidth
                required
                label="Phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={handleChange}
                className={styles.formField}
              />
              <TextField
                fullWidth
                required
                label="Country"
                name="country"
                value={form.country}
                onChange={handleChange}
                className={styles.formField}
              />
              <TextField
                fullWidth
                label="Interests"
                name="interests"
                value={form.interests}
                onChange={handleChange}
                helperText="Optional: beaches, trekking, food tours, culture, photography..."
                className={`${styles.formField} ${styles.fullWidth}`}
              />
            </Box>

            {selectedRole === "guide" && (
              <>
                <Typography className={styles.sectionTitle}>Guide profile</Typography>
                <Typography className={styles.sectionHint}>
                  Guide accounts are reviewed by admin before dashboard access is enabled.
                </Typography>
                <Box className={styles.formGrid}>
                  <TextField
                    fullWidth
                    required
                    label="Bio"
                    name="bio"
                    value={form.bio}
                    onChange={handleChange}
                    multiline
                    rows={3}
                    className={`${styles.formField} ${styles.fullWidth}`}
                  />
                  <TextField
                    fullWidth
                    required
                    label="Experience (years)"
                    name="experienceYears"
                    value={form.experienceYears}
                    onChange={handleChange}
                    type="number"
                    inputProps={{ min: 0 }}
                    className={styles.formField}
                  />
                  <TextField
                    select
                    fullWidth
                    required
                    label="Languages"
                    name="languages"
                    value={form.languages}
                    onChange={handleLanguagesChange}
                    SelectProps={{
                      multiple: true,
                      renderValue: (selected) => selected.join(", "),
                    }}
                    className={`${styles.formField} ${styles.fullWidth}`}
                  >
                    {languageOptions.map((lang) => (
                      <MenuItem key={lang} value={lang}>
                        {lang}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              </>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : "Create account"}
            </Button>
          </form>

          <Box className={styles.footerText}>
            <Typography variant="body2">
              Already have an account?{" "}
              <Link to="/login" className={styles.registerLink}>
                Sign in
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
