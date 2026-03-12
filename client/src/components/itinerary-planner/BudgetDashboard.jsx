/**
 * Budget Dashboard Component
 * Visual budget tracking and breakdown
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  LinearProgress,
  Paper,
} from '@mui/material';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const BudgetDashboard = ({ itinerary }) => {
  const budget = itinerary?.budget || {};
  const totalBudget = budget.totalBudget || 0;
  const totalSpent =
    (budget.accommodation || 0) +
    (budget.transportation || 0) +
    (budget.activities || 0) +
    (budget.food || 0) +
    (budget.misc || 0);

  const remaining = totalBudget - totalSpent;
  const spentPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const budgetBreakdown = [
    { name: 'Accommodation', value: budget.accommodation || 0 },
    { name: 'Transportation', value: budget.transportation || 0 },
    { name: 'Activities', value: budget.activities || 0 },
    { name: 'Food', value: budget.food || 0 },
    { name: 'Misc', value: budget.misc || 0 },
  ].filter(b => b.value > 0);

  const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Budget
              </Typography>
              <Typography variant="h5">${totalBudget.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Spent
              </Typography>
              <Typography variant="h5" sx={{ color: '#ff6b6b' }}>
                ${totalSpent.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Remaining
              </Typography>
              <Typography variant="h5" sx={{ color: remaining > 0 ? '#4caf50' : '#ff6b6b' }}>
                ${remaining.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Spent %
              </Typography>
              <Typography variant="h5">{spentPercentage.toFixed(1)}%</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Progress Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Budget Usage
        </Typography>
        <LinearProgress
          variant="determinate"
          value={Math.min(spentPercentage, 100)}
          sx={{ height: 10, borderRadius: 5 }}
        />
        <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
          {totalSpent.toFixed(2)} / {totalBudget.toFixed(2)} spent
        </Typography>
      </Paper>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Pie Chart */}
        {budgetBreakdown.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Budget Breakdown
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={budgetBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: $${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {budgetBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Bar Chart */}
        {budgetBreakdown.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Budget by Category
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={budgetBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value}`} />
                    <Bar dataKey="value" fill="#8884d8">
                      {budgetBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Daily Budget */}
      {itinerary?.numberOfDays && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Daily Budget Breakdown
            </Typography>
            <Grid container spacing={1}>
              {Array.from({ length: itinerary.numberOfDays }).map((_, day) => (
                <Grid item xs={12} sm={6} md={4} key={day}>
                  <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="body2">
                      <strong>Day {day + 1}</strong>
                    </Typography>
                    <Typography variant="body1">
                      ${(totalBudget / itinerary.numberOfDays).toFixed(2)}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default BudgetDashboard;
