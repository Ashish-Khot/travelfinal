import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Chip,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PeopleIcon from "@mui/icons-material/People";
import { useTranslation } from "react-i18next";
import api from "../api";

const STATUS_ALL = "All";
const STATUS_PENDING = "pending";
const STATUS_CONFIRMED = "confirmed";
const STATUS_CHECKED_IN = "checked_in";
const STATUS_COMPLETED = "completed";
const STATUS_CANCELLED = "cancelled";

const statusColors = {
  [STATUS_PENDING]: "warning",
  [STATUS_CONFIRMED]: "success",
  [STATUS_CANCELLED]: "error",
  [STATUS_CHECKED_IN]: "info",
  [STATUS_COMPLETED]: "default",
};

export default function HotelBookings({ showHeader = true }) {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState(STATUS_ALL);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const statusOptions = [
    STATUS_ALL,
    STATUS_PENDING,
    STATUS_CONFIRMED,
    STATUS_CHECKED_IN,
    STATUS_COMPLETED,
    STATUS_CANCELLED,
  ];

  const getStatusLabel = (status) => {
    switch (status) {
      case STATUS_ALL:
        return t("hotelBookings.status.all");
      case STATUS_PENDING:
        return t("hotelBookings.status.pending");
      case STATUS_CONFIRMED:
        return t("hotelBookings.status.confirmed");
      case STATUS_CHECKED_IN:
        return t("hotelBookings.status.checkedIn");
      case STATUS_COMPLETED:
        return t("hotelBookings.status.completed");
      case STATUS_CANCELLED:
        return t("hotelBookings.status.cancelled");
      default:
        return status;
    }
  };

  useEffect(() => {
    async function fetchBookings() {
      setLoading(true);
      try {
        const res = await api.get("/hotelBooking/hotel");
        setBookings(res.data.bookings || []);
      } catch {
        setBookings([]);
      } finally {
        setLoading(false);
      }
    }
    fetchBookings();
  }, []);

  const handleStatusChange = async (bookingId, nextStatus) => {
    setUpdatingId(bookingId);
    try {
      const res = await api.patch(`/hotelBooking/${bookingId}/status`, { status: nextStatus });
      const updated = res.data.booking;
      setBookings((prev) => prev.map((booking) => (booking._id === bookingId ? updated : booking)));
      setSnackbar({
        open: true,
        message: t("hotelBookings.messages.statusUpdated"),
        severity: "success",
      });
    } catch (error) {
      const message =
        error?.response?.data?.message || t("hotelBookings.messages.statusUpdateFailed");
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return bookings.filter((booking) => {
      const statusMatch = statusFilter === STATUS_ALL || booking.status === statusFilter;
      const touristName = booking.touristId?.name || "";
      const hotelName = booking.hotelId?.name || "";
      const matchesSearch =
        !query ||
        touristName.toLowerCase().includes(query) ||
        hotelName.toLowerCase().includes(query) ||
        booking.roomType?.toLowerCase().includes(query) ||
        String(booking.roomCount || 1).includes(query);
      return statusMatch && matchesSearch;
    });
  }, [bookings, statusFilter, search]);

  const stats = useMemo(() => {
    const total = bookings.length;
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = bookings.filter((booking) => (booking.checkIn || "").slice(0, 10) >= today)
      .length;
    const completed = bookings.filter((booking) => booking.status === STATUS_COMPLETED).length;
    return { total, upcoming, completed };
  }, [bookings]);

  return (
    <Box>
      {showHeader && (
        <Box mb={3}>
          <Typography variant="h5" fontWeight={700} mb={1}>
            {t("hotelBookings.header.title")}
          </Typography>
          <Typography color="text.secondary">{t("hotelBookings.header.subtitle")}</Typography>
        </Box>
      )}

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} mb={3}>
        <Paper sx={{ p: 2.5, flex: 1, borderRadius: 3 }}>
          <Typography variant="body2" color="text.secondary">
            {t("hotelBookings.stats.total")}
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            {stats.total}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2.5, flex: 1, borderRadius: 3 }}>
          <Typography variant="body2" color="text.secondary">
            {t("hotelBookings.stats.upcoming")}
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            {stats.upcoming}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2.5, flex: 1, borderRadius: 3 }}>
          <Typography variant="body2" color="text.secondary">
            {t("hotelBookings.stats.completed")}
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            {stats.completed}
          </Typography>
        </Paper>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} mb={2}>
        <TextField
          label={t("hotelBookings.filters.searchLabel")}
          placeholder={t("hotelBookings.filters.searchPlaceholder")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          size="small"
          sx={{ minWidth: 260, bgcolor: "#fff", borderRadius: 2 }}
        />
        <TextField
          select
          label={t("hotelBookings.filters.statusLabel")}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          size="small"
          sx={{ minWidth: 200, bgcolor: "#fff", borderRadius: 2 }}
        >
          {statusOptions.map((status) => (
            <MenuItem key={status} value={status}>
              {getStatusLabel(status)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t("hotelBookings.table.tourist")}</TableCell>
              <TableCell>{t("hotelBookings.table.contact")}</TableCell>
              <TableCell>{t("hotelBookings.table.stay")}</TableCell>
              <TableCell>{t("hotelBookings.table.guests")}</TableCell>
              <TableCell>{t("hotelBookings.table.roomDetails")}</TableCell>
              <TableCell>{t("hotelBookings.table.status")}</TableCell>
              <TableCell>{t("hotelBookings.table.created")}</TableCell>
              <TableCell>{t("hotelBookings.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8}>{t("hotelBookings.table.loading")}</TableCell>
              </TableRow>
            ) : filteredBookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>{t("hotelBookings.table.noData")}</TableCell>
              </TableRow>
            ) : (
              filteredBookings.map((booking) => (
                <TableRow key={booking._id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar
                        src={booking.touristId?.avatar || ""}
                        alt={booking.touristId?.name || t("hotelBookings.fallback.tourist")}
                      />
                      <Box>
                        <Typography fontWeight={600}>
                          {booking.touristId?.name || t("hotelBookings.fallback.tourist")}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {booking.touristId?.email || ""}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {booking.touristId?.phone || t("hotelBookings.fallback.na")}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CalendarMonthIcon fontSize="small" />
                      <Typography variant="body2">
                        {(booking.checkIn || "").slice(0, 10)} {t("hotelBookings.table.to")}{" "}
                        {(booking.checkOut || "").slice(0, 10)}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PeopleIcon fontSize="small" />
                      <Typography variant="body2">{booking.guests}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {`${booking.roomType || t("hotelBookings.fallback.standard")} x ${Math.max(
                      1,
                      Number(booking.roomCount) || 1
                    )}`}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(booking.status)}
                      color={statusColors[booking.status] || "default"}
                    />
                  </TableCell>
                  <TableCell>{(booking.createdAt || "").slice(0, 10)}</TableCell>
                  <TableCell>
                    <Select
                      size="small"
                      value={booking.status}
                      onChange={(event) => handleStatusChange(booking._id, event.target.value)}
                      disabled={updatingId === booking._id || booking.status === STATUS_COMPLETED}
                      sx={{ minWidth: 150, bgcolor: "#fff" }}
                    >
                      {statusOptions
                        .filter((status) => status !== STATUS_ALL)
                        .map((status) => (
                          <MenuItem key={status} value={status}>
                            {getStatusLabel(status)}
                          </MenuItem>
                        ))}
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
