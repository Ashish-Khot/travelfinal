import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import { useTranslation } from "react-i18next";
import api from "../api";
import { io } from "socket.io-client";

const STATUS_ALL = "All";
const STATUS_AVAILABLE = "Available";
const STATUS_FULL = "Full";
const STATUS_UNAVAILABLE = "Unavailable";

const cardStyle = {
  p: { xs: 2, md: 2.5 },
  borderRadius: 3,
  border: "1px solid var(--dash-border)",
  boxShadow: "0 14px 30px rgba(15, 23, 42, 0.08)",
  bgcolor: "#fff",
};

const getPerformanceColor = (occupancy) => {
  if (occupancy >= 80) return "#22c55e";
  if (occupancy >= 50) return "#f59e0b";
  return "#ef4444";
};

const getLocale = (language) => {
  if (language?.startsWith("hi")) return "hi-IN";
  if (language?.startsWith("mr")) return "mr-IN";
  return "en-IN";
};

const formatCurrency = (value, language) => {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat(getLocale(language), {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function RoomManagement({ showHeader = true }) {
  const { t, i18n } = useTranslation();
  const userId = localStorage.getItem("userId");
  const [statusFilter, setStatusFilter] = useState(STATUS_ALL);
  const [typeFilter, setTypeFilter] = useState(STATUS_ALL);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    type: "",
    price: "",
    total: "",
    available: "",
    status: STATUS_AVAILABLE,
  });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    type: "",
    price: "",
    total: "",
    available: "",
    status: STATUS_AVAILABLE,
  });

  const statuses = [STATUS_ALL, STATUS_AVAILABLE, STATUS_FULL, STATUS_UNAVAILABLE];

  const getStatusLabel = (status) => {
    switch (status) {
      case STATUS_ALL:
        return t("roomManagement.status.all");
      case STATUS_AVAILABLE:
        return t("roomManagement.status.available");
      case STATUS_FULL:
        return t("roomManagement.status.full");
      case STATUS_UNAVAILABLE:
        return t("roomManagement.status.unavailable");
      default:
        return status;
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        if (!userId) {
          setRooms([]);
          return;
        }
        const res = await api.get(`/room/hotel/${userId}`);
        if (!isMounted) return;
        setRooms(res.data || []);
      } catch {
        if (!isMounted) return;
        setRooms([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;
    const socket = io("http://localhost:3001");
    socket.emit("joinHotelRoom", { hotelId: userId });
    const handleRoomUpdate = (payload) => {
      if (!payload || payload.hotelId !== userId) return;
      if (payload.deleted && payload.roomId) {
        setRooms((prev) => prev.filter((room) => room._id !== payload.roomId));
        return;
      }
      if (payload.room) {
        setRooms((prev) => {
          const exists = prev.some((room) => room._id === payload.room._id);
          if (exists) {
            return prev.map((room) => (room._id === payload.room._id ? payload.room : room));
          }
          return [payload.room, ...prev];
        });
      }
    };
    socket.on("hotelRoomUpdate", handleRoomUpdate);
    return () => {
      socket.off("hotelRoomUpdate", handleRoomUpdate);
      socket.disconnect();
    };
  }, [userId]);

  const roomsWithStats = useMemo(() => {
    const byId = new Map();
    rooms.forEach((room) => {
      if (!room?._id) return;
      if (!byId.has(room._id)) {
        byId.set(room._id, room);
      }
    });
    return Array.from(byId.values()).map((room) => {
      const total = Number(room.total) || 0;
      const available = Number(room.available) || 0;
      const occupied = Math.max(0, total - available);
      const occupancy = total ? Math.round((occupied / total) * 100) : 0;
      return {
        ...room,
        number: room.type || room.number || room._id?.slice(-4) || "--",
        occupancy,
      };
    });
  }, [rooms]);

  const roomTypes = useMemo(
    () => [STATUS_ALL, ...new Set(roomsWithStats.map((room) => room.type).filter(Boolean))],
    [roomsWithStats]
  );

  const filteredRooms = useMemo(() => {
    return roomsWithStats.filter((room) => {
      const statusOk = statusFilter === STATUS_ALL || room.status === statusFilter;
      const typeOk = typeFilter === STATUS_ALL || room.type === typeFilter;
      return statusOk && typeOk;
    });
  }, [roomsWithStats, statusFilter, typeFilter]);

  const underperforming = useMemo(() => {
    const candidates = roomsWithStats.filter((room) => room.occupancy < 50);
    if (candidates.length === 0) return null;
    return candidates.reduce((min, room) => (room.occupancy < min.occupancy ? room : min));
  }, [roomsWithStats]);

  const baselineOccupancy = 70;
  const belowAverage = underperforming
    ? Math.max(0, Math.round(baselineOccupancy - underperforming.occupancy))
    : 0;

  const handleAddRoom = async () => {
    if (!userId || !form.type || !form.price || !form.total) return;
    setSaving(true);
    try {
      const totalValue = Number(form.total);
      const availableValue = Math.min(Number(form.available || form.total), totalValue);
      const payload = {
        type: form.type,
        price: Number(form.price),
        total: totalValue,
        available: availableValue,
        status: form.status || STATUS_AVAILABLE,
      };
      const res = await api.post(`/room/hotel/${userId}`, payload);
      setRooms((prev) => {
        const exists = prev.some((room) => room._id === res.data?._id);
        if (exists) {
          return prev.map((room) => (room._id === res.data?._id ? res.data : room));
        }
        return [res.data, ...prev];
      });
      setForm({ type: "", price: "", total: "", available: "", status: STATUS_AVAILABLE });
    } catch {
      // ignore for now
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (room) => {
    setEditingId(room._id);
    setEditForm({
      type: room.type || "",
      price: room.price ?? "",
      total: room.total ?? "",
      available: room.available ?? "",
      status: room.status || STATUS_AVAILABLE,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      type: "",
      price: "",
      total: "",
      available: "",
      status: STATUS_AVAILABLE,
    });
  };

  const saveEdit = async (roomId) => {
    if (!roomId) return;
    try {
      const totalValue = Number(editForm.total) || 0;
      const availableValue = Math.min(Number(editForm.available) || 0, totalValue);
      const payload = {
        type: editForm.type,
        price: Number(editForm.price),
        total: totalValue,
        available: availableValue,
        status: editForm.status,
      };
      const res = await api.put(`/room/${roomId}`, payload);
      setRooms((prev) => prev.map((room) => (room._id === roomId ? res.data : room)));
      cancelEdit();
    } catch {
      // ignore for now
    }
  };

  const openDeleteDialog = (room) => {
    if (!room?._id) return;
    setDeleteTarget(room);
    setDeleteOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?._id) return;
    try {
      await api.delete(`/room/${deleteTarget._id}`);
      setRooms((prev) => prev.filter((item) => item._id !== deleteTarget._id));
    } catch {
      // ignore for now
    } finally {
      closeDeleteDialog();
    }
  };

  return (
    <Box>
      {showHeader && (
        <Box mb={3}>
          <Typography variant="h4" fontWeight={700} mb={1}>
            {t("roomManagement.header.title")}
          </Typography>
          <Typography color="text.secondary">
            {t("roomManagement.header.subtitle")}
          </Typography>
        </Box>
      )}

      {underperforming && (
        <Alert severity="warning" sx={{ mb: 2.5 }}>
          {t("roomManagement.alerts.belowAverage", {
            roomNumber: underperforming.number,
            percent: belowAverage,
          })}
        </Alert>
      )}

      <Paper sx={{ ...cardStyle, mb: 2.5 }}>
        <Box
          sx={{
            px: { xs: 2, md: 3 },
            py: 2,
            borderBottom: "1px solid #e2e8f0",
            background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(15,23,42,0.02))",
            borderRadius: 3,
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            alignItems={{ md: "center" }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="overline" sx={{ letterSpacing: 1.2, color: "text.secondary" }}>
                {t("roomManagement.inventory.overline")}
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {t("roomManagement.inventory.title")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("roomManagement.inventory.subtitle")}
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddRoom}
              disabled={saving || !form.type || !form.price || !form.total}
              sx={{
                alignSelf: { xs: "flex-start", md: "center" },
                borderRadius: 2,
                px: 3,
                textTransform: "none",
                color: "#fff",
                fontWeight: 600,
                letterSpacing: 0.2,
                backgroundColor: "#0b0b0b",
                boxShadow: "0 12px 24px rgba(15,23,42,0.25)",
                "& .MuiButton-startIcon": { color: "#fff" },
                "&:hover": {
                  backgroundColor: "#000",
                  boxShadow: "0 16px 32px rgba(15,23,42,0.35)",
                },
              }}
            >
              {t("roomManagement.buttons.addRoom")}
            </Button>
          </Stack>
        </Box>
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  height: "100%",
                }}
              >
                <Typography variant="subtitle2" fontWeight={700} mb={1}>
                  {t("roomManagement.sections.roomDetails")}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label={t("roomManagement.fields.roomType")}
                      fullWidth
                      size="small"
                      value={form.type}
                      onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                      placeholder={t("roomManagement.fields.roomTypePlaceholder")}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label={t("roomManagement.fields.pricePerNight")}
                      type="number"
                      fullWidth
                      size="small"
                      value={form.price}
                      onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                      inputProps={{ min: 0 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            {t("roomManagement.currency.prefix")}
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  height: "100%",
                }}
              >
                <Typography variant="subtitle2" fontWeight={700} mb={1}>
                  {t("roomManagement.sections.inventoryStatus")}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label={t("roomManagement.fields.totalRooms")}
                      type="number"
                      fullWidth
                      size="small"
                      value={form.total}
                      onChange={(event) => setForm((prev) => ({ ...prev, total: event.target.value }))}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label={t("roomManagement.fields.availableNow")}
                      type="number"
                      fullWidth
                      size="small"
                      value={form.available}
                      onChange={(event) => setForm((prev) => ({ ...prev, available: event.target.value }))}
                      inputProps={{ min: 0 }}
                      helperText={t("roomManagement.fields.leaveEmpty")}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>{t("roomManagement.fields.status")}</InputLabel>
                      <Select
                        label={t("roomManagement.fields.status")}
                        value={form.status}
                        onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                      >
                        {statuses.filter((status) => status !== STATUS_ALL).map((status) => (
                          <MenuItem key={status} value={status}>
                            {getStatusLabel(status)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Paper sx={{ ...cardStyle, mb: 2.5 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>{t("roomManagement.filters.status")}</InputLabel>
            <Select
              value={statusFilter}
              label={t("roomManagement.filters.status")}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {statuses.map((status) => (
                <MenuItem key={status} value={status}>
                  {getStatusLabel(status)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>{t("roomManagement.filters.roomType")}</InputLabel>
            <Select
              value={typeFilter}
              label={t("roomManagement.filters.roomType")}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              {roomTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type === STATUS_ALL ? t("roomManagement.status.all") : type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <Paper sx={{ ...cardStyle, mb: 2.5 }}>
        <Typography variant="h6" fontWeight={700} mb={2}>
          {t("roomManagement.table.title")}
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                <TableCell sx={{ fontWeight: 700 }}>{t("roomManagement.table.columns.roomType")}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t("roomManagement.table.columns.price")}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t("roomManagement.table.columns.status")}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t("roomManagement.table.columns.vacantTotal")}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t("roomManagement.table.columns.booked")}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t("roomManagement.table.columns.occupancy")}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t("roomManagement.table.columns.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7}>{t("roomManagement.table.loading")}</TableCell>
                </TableRow>
              ) : filteredRooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>{t("roomManagement.table.noRooms")}</TableCell>
                </TableRow>
              ) : (
                filteredRooms.map((room) => {
                  const perfColor = getPerformanceColor(room.occupancy);
                  const isEditing = editingId === room._id;
                  const bookedCount = isEditing
                    ? Math.max(0, (Number(editForm.total) || 0) - (Number(editForm.available) || 0))
                    : Math.max(0, (Number(room.total) || 0) - (Number(room.available) || 0));
                  return (
                    <TableRow key={room._id || room.number}>
                      <TableCell>
                        {isEditing ? (
                          <TextField
                            size="small"
                            value={editForm.type}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, type: event.target.value }))}
                          />
                        ) : (
                          room.type
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <TextField
                            size="small"
                            type="number"
                            value={editForm.price}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, price: event.target.value }))}
                            inputProps={{ min: 0 }}
                          />
                        ) : (
                          formatCurrency(room.price, i18n.resolvedLanguage)
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <FormControl size="small" sx={{ minWidth: 140 }}>
                            <Select
                              value={editForm.status}
                              onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value }))}
                            >
                              {statuses.filter((status) => status !== STATUS_ALL).map((status) => (
                                <MenuItem key={status} value={status}>
                                  {getStatusLabel(status)}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (
                          getStatusLabel(room.status)
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <TextField
                              size="small"
                              type="number"
                              value={editForm.available}
                              onChange={(event) => setEditForm((prev) => ({ ...prev, available: event.target.value }))}
                              inputProps={{ min: 0 }}
                              sx={{ maxWidth: 90 }}
                            />
                            <Typography variant="body2" color="text.secondary">
                              /
                            </Typography>
                            <TextField
                              size="small"
                              type="number"
                              value={editForm.total}
                              onChange={(event) => setEditForm((prev) => ({ ...prev, total: event.target.value }))}
                              inputProps={{ min: 0 }}
                              sx={{ maxWidth: 90 }}
                            />
                          </Stack>
                        ) : (
                          `${room.available}/${room.total}`
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {bookedCount}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box
                            sx={{
                              height: 8,
                              width: 80,
                              borderRadius: 999,
                              bgcolor: "#e2e8f0",
                              overflow: "hidden",
                            }}
                          >
                            <Box
                              sx={{
                                height: "100%",
                                width: `${room.occupancy}%`,
                                bgcolor: perfColor,
                              }}
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {room.occupancy}%
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          {isEditing ? (
                            <>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => saveEdit(room._id)}
                                aria-label={t("roomManagement.buttons.save")}
                              >
                                <SaveOutlinedIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={cancelEdit}
                                aria-label={t("roomManagement.buttons.cancel")}
                              >
                                <CloseIcon />
                              </IconButton>
                            </>
                          ) : (
                            <>
                              <IconButton
                                size="small"
                                onClick={() => startEdit(room)}
                                aria-label={t("roomManagement.buttons.edit")}
                              >
                                <EditOutlinedIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => openDeleteDialog(room)}
                                aria-label={t("roomManagement.buttons.delete")}
                              >
                                <DeleteOutlineIcon />
                              </IconButton>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={deleteOpen} onClose={closeDeleteDialog}>
        <DialogTitle>{t("roomManagement.dialog.deleteTitle")}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            {deleteTarget?.type
              ? t("roomManagement.dialog.deleteWithType", { type: deleteTarget.type })
              : t("roomManagement.dialog.deleteDefault")}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={closeDeleteDialog}>
            {t("roomManagement.buttons.cancel")}
          </Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>
            {t("roomManagement.buttons.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
