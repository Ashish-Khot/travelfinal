import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "./api";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import MenuItem from "@mui/material/MenuItem";

import PersonIcon from "@mui/icons-material/Person";
import RoomIcon from "@mui/icons-material/Room";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import HotelIcon from "@mui/icons-material/Hotel";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";

import styles from "./Register.module.css";

const languageOptions = [
  "English", "Hindi", "Spanish", "French", "German", "Chinese", "Other"
];

const roles = [
  { label: "Tourist", icon: <PersonIcon color="success" /> },
  { label: "Guide", icon: <RoomIcon color="primary" /> },
  { label: "Admin", icon: <AdminPanelSettingsIcon color="info" /> },
  { label: "Hotel", icon: <HotelIcon color="error" /> },
  { label: "Hospital", icon: <LocalHospitalIcon color="secondary" /> }
];

export default function Register() {
  const [selectedRole, setSelectedRole] = useState("Tourist");

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
    setForm({ ...form, languages: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        country: form.country,
        interests: form.interests,
        role: selectedRole.toLowerCase(),
      };
      if (selectedRole === "Guide") {
        payload = {
          ...payload,
          bio: form.bio,
          experienceYears: form.experienceYears,
          languages: form.languages,
        };
      }
      await api.post("/register", payload);
      alert("Account created successfully!");
      window.location.href = "/login";
    } catch (err) {
      let msg = "Registration failed";
      if (err.response) {
        msg = err.response.data?.message || err.response.data || "Server error";
      } else {
        msg = err.message;
      }
      alert(msg);
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
            Build your traveler profile and unlock premium experiences.
          </Typography>
          <Typography className={styles.brandSub}>
            Create your account to access curated stays, expert guides, and a private travel vault.
          </Typography>
          <Box className={styles.brandStats}>
            <Box className={styles.statCard}>
              <Typography className={styles.statValue}>950K+</Typography>
              <Typography className={styles.statLabel}>Trips planned</Typography>
            </Box>
            <Box className={styles.statCard}>
              <Typography className={styles.statValue}>4.8</Typography>
              <Typography className={styles.statLabel}>Average reviews</Typography>
            </Box>
            <Box className={styles.statCard}>
              <Typography className={styles.statValue}>Top 1%</Typography>
              <Typography className={styles.statLabel}>Guides curated</Typography>
            </Box>
          </Box>
          <Box className={styles.brandTags}>
            <Box className={styles.tag}>Local experts</Box>
            <Box className={styles.tag}>Flexible itineraries</Box>
            <Box className={styles.tag}>Verified stays</Box>
          </Box>
        </Box>

        <Box className={styles.formPanel}>
          <Box className={styles.formHeader}>
            <Box className={styles.iconHalo}>
              <PersonIcon />
            </Box>
            <Typography component="h2" className={styles.formTitle}>
              Create account
            </Typography>
            <Typography className={styles.formSubtitle}>
              Join Travelogue in under a minute.
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
                key={role.label}
                value={role.label}
                className={styles.roleBtnSquare}
              >
                <Box className={styles.roleInner}>
                  {role.icon}
                  <Typography className={styles.roleLabel}>{role.label}</Typography>
                </Box>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

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
                value={form.email}
                onChange={handleChange}
                className={styles.formField}
              />
              <TextField
                fullWidth
                required
                label="Password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className={styles.formField}
              />
              <TextField
                fullWidth
                required
                label="Phone"
                name="phone"
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
                className={`${styles.formField} ${styles.fullWidth}`}
              />
            </Box>

            {selectedRole === "Guide" && (
              <>
                <Typography className={styles.sectionTitle}>Guide profile</Typography>
                <Box className={styles.formGrid}>
                  <TextField
                    fullWidth
                    required
                    label="Bio"
                    name="bio"
                    value={form.bio}
                    onChange={handleChange}
                    multiline
                    rows={2}
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
                    SelectProps={{ multiple: true }}
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
            >
              Create account
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
    </Box>
  );
}
