import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Avatar,
  Alert,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  Divider,
  alpha,
  useTheme,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import HotelIcon from '@mui/icons-material/Hotel';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DescriptionIcon from '@mui/icons-material/Description';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { motion } from 'framer-motion';
import api from '../../src/api';
import StatsCard from '../components/StatsCard';
import { notificationManager } from '../services/notificationService';

const generateChartData = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return months.map((month, idx) => ({
    month,
    users: Math.floor(Math.random() * 100) + 20,
    tours: Math.floor(Math.random() * 80) + 10,
  }));
};

export default function DashboardOverview() {
  const theme = useTheme();
  const [stats, setStats] = useState({
    touristCount: 0,
    guideCount: 0,
    hotelCount: 0,
    hospitalCount: 0,
    travelogueCount: 0,
    chatCount: 0,
    pendingGuides: 0,
  });
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('');
  const [chartData, setChartData] = useState(generateChartData());

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const res = await api.get('/adminDashboard/dashboard-stats');
        setStats(res.data);
        notificationManager.success('Dashboard stats updated successfully');
      } catch (err) {
        console.error('Error:', err);
        notificationManager.error('Failed to load dashboard stats');
      }
      setLoading(false);
    }
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setAdminName(user?.name || 'Admin');
    fetchStats();

    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    {
      label: 'Total Tourists',
      value: stats.touristCount,
      icon: GroupIcon,
      color: '#3b82f6',
      trend: 'up',
      trendValue: 12,
      subtitle: 'Active users',
    },
    {
      label: 'Total Guides',
      value: stats.guideCount,
      icon: PersonAddAltIcon,
      color: '#22c55e',
      trend: 'up',
      trendValue: 8,
      subtitle: 'Verified guides',
    },
    {
      label: 'Total Hotels',
      value: stats.hotelCount,
      icon: HotelIcon,
      color: '#a78bfa',
      trend: 'up',
      trendValue: 5,
      subtitle: 'Partner hotels',
    },
    {
      label: 'Total Hospitals',
      value: stats.hospitalCount,
      icon: LocalHospitalIcon,
      color: '#ef4444',
      trend: 'down',
      trendValue: 2,
      subtitle: 'Emergency contacts',
    },
    {
      label: 'Active Chats',
      value: stats.chatCount,
      icon: ChatBubbleOutlineIcon,
      color: '#06b6d4',
      subtitle: 'Ongoing conversations',
    },
    {
      label: 'Pending Approvals',
      value: stats.pendingGuides,
      icon: WarningAmberIcon,
      color: '#fbbf24',
      percentage: (stats.pendingGuides / Math.max(stats.guideCount, 1) * 100).toFixed(0),
      subtitle: 'Awaiting review',
    },
    {
      label: 'Total Travelogues',
      value: stats.travelogueCount,
      icon: DescriptionIcon,
      color: '#6366f1',
      trend: 'up',
      trendValue: 15,
      subtitle: 'User stories',
    },
    {
      label: 'Emergency Requests',
      value: 0,
      icon: ReportProblemIcon,
      color: '#ef4444',
      subtitle: 'Critical alerts',
    },
  ];

  const pieData = [
    { name: 'Tourists', value: stats.touristCount, color: '#3b82f6' },
    { name: 'Guides', value: stats.guideCount, color: '#22c55e' },
    { name: 'Hotels', value: stats.hotelCount, color: '#a78bfa' },
    { name: 'Hospitals', value: stats.hospitalCount, color: '#ef4444' },
  ];

  const alerts = [
    { id: 1, severity: 'high', message: `${stats.pendingGuides} guides pending approval`, action: 'Review' },
    { id: 2, severity: 'info', message: 'System running smoothly', action: 'Details' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  return (
    <Box sx={{ p: { xs: 1, md: 4 }, bgcolor: theme.palette.mode === 'light' ? 'background.default' : 'transparent' }}>
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, #6366f1)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Welcome back, <span style={{ color: 'inherit' }}>{adminName}! 👋</span>
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Here's what's happening with your platform today
          </Typography>
        </Box>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {statCards.map((stat, index) => (
            <motion.div key={stat.label} variants={itemVariants} style={{ width: '100%' }}>
              <Grid item xs={12} sm={6} md={3} sx={{ width: '100%' }}>
                <StatsCard
                  {...stat}
                  loading={loading}
                />
              </Grid>
            </motion.div>
          ))}
        </Grid>
      </motion.div>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Paper
              elevation={2}
              sx={{
                borderRadius: 3,
                p: 3,
                background: theme.palette.mode === 'light'
                  ? '#ffffff'
                  : alpha('#ffffff', 0.05),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Monthly Registration Trend
                </Typography>
                <Chip label="Last 6 Months" size="small" variant="outlined" />
              </Box>
              <Box sx={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
                    <XAxis dataKey="month" stroke={theme.palette.text.secondary} />
                    <YAxis stroke={theme.palette.text.secondary} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        backgroundColor: theme.palette.background.paper,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="users"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Users"
                    />
                    <Line
                      type="monotone"
                      dataKey="tours"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ fill: '#22c55e', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Tours"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Paper
              elevation={2}
              sx={{
                borderRadius: 3,
                p: 3,
                background: theme.palette.mode === 'light'
                  ? '#ffffff'
                  : alpha('#ffffff', 0.05),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  User Distribution
                </Typography>
              </Box>
              <Box sx={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData.filter(d => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </motion.div>
        </Grid>
      </Grid>

      {/* Alerts Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <Paper
          elevation={2}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            background: theme.palette.mode === 'light'
              ? '#ffffff'
              : alpha('#ffffff', 0.05),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <Box sx={{ p: 3, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.3)}` }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              System Alerts & Notifications
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <Stack spacing={2}>
              {alerts.map((alert) => (
                <Alert
                  key={alert.id}
                  severity={alert.severity === 'high' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info'}
                  action={
                    <Button color="inherit" size="small">
                      {alert.action}
                    </Button>
                  }
                  sx={{
                    borderRadius: 2,
                    border: 'none',
                    '& .MuiAlert-icon': {
                      marginRight: 1.5,
                    },
                  }}
                >
                  {alert.message}
                </Alert>
              ))}
            </Stack>
          </Box>
        </Paper>
      </motion.div>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              background: `linear-gradient(135deg, ${alpha('#3b82f6', 0.1)}, ${alpha('#3b82f6', 0.05)})`,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box>
                  <Typography color="text.secondary" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    Conversion Rate
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>
                    24.5%
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ color: '#22c55e', fontSize: '2rem' }} />
              </Box>
              <LinearProgress
                variant="determinate"
                value={24.5}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: alpha('#3b82f6', 0.1),
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: '#3b82f6',
                  },
                }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 2,
              border: `1px solid ${alpha('#22c55e', 0.2)}`,
              background: `linear-gradient(135deg, ${alpha('#22c55e', 0.1)}, ${alpha('#22c55e', 0.05)})`,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box>
                  <Typography color="text.secondary" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    Engagement
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>
                    68.2%
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ color: '#22c55e', fontSize: '2rem' }} />
              </Box>
              <LinearProgress
                variant="determinate"
                value={68.2}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: alpha('#22c55e', 0.1),
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: '#22c55e',
                  },
                }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 2,
              border: `1px solid ${alpha('#a78bfa', 0.2)}`,
              background: `linear-gradient(135deg, ${alpha('#a78bfa', 0.1)}, ${alpha('#a78bfa', 0.05)})`,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box>
                  <Typography color="text.secondary" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    Revenue
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>
                    ₹ 45.2K
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ color: '#22c55e', fontSize: '2rem' }} />
              </Box>
              <LinearProgress
                variant="determinate"
                value={82}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: alpha('#a78bfa', 0.1),
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: '#a78bfa',
                  },
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
