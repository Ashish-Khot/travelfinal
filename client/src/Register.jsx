import React, { useState } from "react";
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
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";

import PersonIcon from "@mui/icons-material/Person";
import RoomIcon from "@mui/icons-material/Room";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import HotelIcon from "@mui/icons-material/Hotel";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";

import styles from "./Auth.module.scss";

const languageOptions = [
  "English", "Hindi", "Spanish", "French", "German", "Chinese", "Other"
];

const roles = [
  {
    value: "tourist",
    label: "Tourist",
    icon: <PersonIcon fontSize="small" />,
  },
  {
    value: "guide",
    label: "Guide",
    icon: <RoomIcon fontSize="small" />,
  },
  {
    value: "hotel",
    label: "Hotel",
    icon: <HotelIcon fontSize="small" />,
  },
  {
    value: "hospital",
    label: "Hospital",
    icon: <LocalHospitalIcon fontSize="small" />,
  },
  {
    value: "admin",
    label: "Admin",
    icon: <AdminPanelSettingsIcon fontSize="small" />,
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
    <Box className={`${styles.authShell} ${styles.registerShell}`}>
      <Box className={styles.authFrame}>
        <Box className={`${styles.brandPanel} ${styles.registerBrandPanel}`}>
          <Box className={styles.brandBadge}>
            <TravelExploreIcon fontSize="small" />
            Travelogue
          </Box>
          <Typography component="h1" className={styles.brandTitle}>
            Create your Travelogue account
          </Typography>
          <Typography className={styles.brandSub}>
            Join and start in minutes.
          </Typography>
          <Box className={styles.registerPills}>
            <Typography className={styles.registerPill}>Fast signup</Typography>
            <Typography className={styles.registerPill}>Secure access</Typography>
            <Typography className={styles.registerPill}>All roles</Typography>
          </Box>
        </Box>

        <Box className={`${styles.formPanel} ${styles.registerFormPanel}`}>
          <Link to="/" className={styles.backLink}>
            <ArrowBackRoundedIcon fontSize="small" />
            Back to Home
          </Link>

          <Box className={`${styles.formCard} ${styles.registerCard}`}>
            <Box className={styles.formHeader}>
              <Box className={styles.iconHalo}>
                <PersonIcon />
              </Box>
              <Typography component="h2" className={styles.formTitle}>
                Create Account
              </Typography>
              <Typography className={styles.formSubtitle}>
                Set up your account details.
              </Typography>
            </Box>
            <Typography className={styles.sectionLabel}>Choose role</Typography>
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
                  className={styles.roleBtn}
                >
                  <Box className={styles.roleInner}>
                    {role.icon}
                    <Typography className={styles.roleLabel}>{role.label}</Typography>
                  </Box>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <form onSubmit={handleSubmit} className={`${styles.form} ${styles.registerForm}`}>
              <Box className={`${styles.formGrid} ${styles.registerGrid}`}>
                <TextField
                  size="small"
                  fullWidth
                  required
                  label="Full name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className={styles.formField}
                />
                <TextField
                  size="small"
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
                  size="small"
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
                  size="small"
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
                  size="small"
                  fullWidth
                  required
                  label="Country"
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                  className={styles.formField}
                />
                <TextField
                  size="small"
                  fullWidth
                  label="Interests"
                  name="interests"
                  value={form.interests}
                  onChange={handleChange}
                  placeholder="Optional"
                  className={styles.formField}
                />
              </Box>

              {selectedRole === "guide" && (
                <>
                  <Typography className={styles.sectionTitle}>Guide profile</Typography>
                  <Box className={`${styles.formGrid} ${styles.registerGuideGrid}`}>
                    <TextField
                      size="small"
                      fullWidth
                      required
                      label="Bio"
                      name="bio"
                      value={form.bio}
                      onChange={handleChange}
                      multiline
                      rows={2}
                      className={`${styles.formField} ${styles.guideBio}`}
                    />
                    <TextField
                      size="small"
                      fullWidth
                      required
                      label="Experience (years)"
                      name="experienceYears"
                      value={form.experienceYears}
                      onChange={handleChange}
                      type="number"
                      inputProps={{ min: 0 }}
                      className={`${styles.formField} ${styles.guideExperience}`}
                    />
                    <TextField
                      size="small"
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
                      className={`${styles.formField} ${styles.guideLanguages}`}
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
                {loading ? <CircularProgress size={22} color="inherit" /> : "Create Account"}
              </Button>
            </form>

            <Box className={styles.footerText}>
              <Typography variant="body2">
                Already have an account?{" "}
                <Link to="/login" className={styles.registerLink}>
                  Sign In
                </Link>
              </Typography>
            </Box>
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
