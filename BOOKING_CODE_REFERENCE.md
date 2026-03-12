# Booking Section - Code Examples & Visual Reference

## Component Architecture

```
MyBookings (Main Component)
├── Status Statistics Cards (6 cards)
├── BookingFiltersBar
│   ├── Search Field
│   ├── Status Filter Chips
│   ├── Price Range Slider
│   ├── Date Range Pickers
│   ├── Sort Dropdown
│   └── Action Buttons
├── View Mode Toggle (Grid/List)
└── Booking Cards Grid/List
    ├── PremiumBookingCard
    │   ├── Status Badge
    │   ├── Destination & Guide Info
    │   ├── Price Display
    │   ├── Expandable Details
    │   └── Action Buttons
    ├── Chat Modal
    ├── Edit Modal
    └── Delete Confirmation
```

---

## Filter Configuration

### Status Options
```javascript
const statusOptions = [
  { value: 'pending', label: 'Pending', color: '#FFA500' },
  { value: 'confirmed', label: 'Confirmed', color: '#4CAF50' },
  { value: 'completed', label: 'Completed', color: '#2196F3' },
  { value: 'cancelled', label: 'Cancelled', color: '#F44336' },
];
```

### Sort Options
```javascript
const sortOptions = [
  { value: 'date-desc', label: 'Newest First' },
  { value: 'date-asc', label: 'Oldest First' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'status', label: 'By Status' },
];
```

---

## Filtering Logic Example

```javascript
// Search Filter
if (filters.searchQuery) {
  const query = filters.searchQuery.toLowerCase();
  filtered = filtered.filter(b =>
    b.destination?.toLowerCase().includes(query) ||
    b.guideId?.name?.toLowerCase().includes(query) ||
    b._id?.toLowerCase().includes(query)
  );
}

// Status Filter (Multiple Selection)
if (filters.statuses.length > 0) {
  filtered = filtered.filter(b => filters.statuses.includes(b.status));
}

// Price Range Filter
filtered = filtered.filter(b =>
  b.price >= filters.priceRange[0] && b.price <= filters.priceRange[1]
);

// Date Range Filter
if (filters.startDate) {
  filtered = filtered.filter(b =>
    new Date(b.startDateTime) >= new Date(filters.startDate)
  );
}
if (filters.endDate) {
  filtered = filtered.filter(b =>
    new Date(b.startDateTime) <= new Date(filters.endDate)
  );
}
```

---

## Color Palette

### Primary Colors
```javascript
const colors = {
  primary: '#4F8A8B',
  primaryLight: '#6BA8AC',
  gradient: 'linear-gradient(135deg, #4F8A8B 0%, #6BA8AC 100%)',
};
```

### Status Colors
```javascript
const statusColors = {
  pending: { main: '#FFA500', bg: '#FFF3E0' },
  confirmed: { main: '#4CAF50', bg: '#E8F5E9' },
  completed: { main: '#2196F3', bg: '#E3F2FD' },
  cancelled: { main: '#F44336', bg: '#FFEBEE' },
};
```

### Additional Colors
```javascript
const additionalColors = {
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  text: '#1a1a1a',
  textSecondary: '#666666',
  border: 'rgba(79, 138, 139, 0.1)',
};
```

---

## Statistics Calculation

```javascript
const stats = useMemo(() => {
  return {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    totalSpent: bookings.reduce((sum, b) => sum + (b.price || 0), 0)
  };
}, [bookings]);
```

---

## Responsive Grid Layout

### Desktop (md breakpoint)
```javascript
gridTemplateColumns: { xs: '1fr', sm: '1fr', md: '1fr 1fr' }  // 2 columns
```

### Tablet (sm breakpoint)
```javascript
gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }  // 3 columns for stats
```

### Mobile (xs breakpoint)
```javascript
gridTemplateColumns: { xs: '1fr' }  // 1 column
```

---

## Button Examples

### Chat Button
```javascript
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  onClick={() => onChat?.(booking._id)}
  style={{
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.875rem',
  }}
>
  <MessageIcon sx={{ fontSize: 16 }} /> Chat
</motion.button>
```

### Save Button
```javascript
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  onClick={handleSubmitEdit}
  style={{
    background: 'linear-gradient(135deg, #4F8A8B 0%, #6BA8AC 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 24px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.95rem',
    transition: 'all 0.3s ease',
  }}
>
  Save Changes
</motion.button>
```

---

## Card Styling

### Card Base
```javascript
sx={{
  background: '#ffffff',
  borderRadius: '16px',
  border: '1.5px solid rgba(79, 138, 139, 0.1)',
  overflow: 'hidden',
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: '0 12px 32px rgba(79, 138, 139, 0.15)',
    borderColor: 'rgba(79, 138, 139, 0.25)'
  }
}}
```

### Card Header
```javascript
sx={{
  background: `linear-gradient(135deg, ${config.bgColor} 0%, rgba(79, 138, 139, 0.03) 100%)`,
  p: 3,
  borderBottom: '1px solid rgba(79, 138, 139, 0.1)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start'
}}
```

---

## View Mode Toggle Implementation

```javascript
<Paper elevation={0} sx={{ 
  background: 'rgba(79, 138, 139, 0.05)', 
  borderRadius: '12px', 
  p: 1, 
  display: 'flex', 
  gap: 0.5 
}}>
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={() => setViewMode('grid')}
    style={{
      backgroundColor: viewMode === 'grid' ? '#4F8A8B' : 'transparent',
      // ... button styles
    }}
  >
    <GridViewIcon sx={{ fontSize: 16 }} /> Grid
  </motion.button>
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={() => setViewMode('list')}
    style={{
      backgroundColor: viewMode === 'list' ? '#4F8A8B' : 'transparent',
      // ... button styles
    }}
  >
    <ListViewIcon sx={{ fontSize: 16 }} /> List
  </motion.button>
</Paper>
```

---

## Loading State

```javascript
{loading && (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
    {[...Array(4)].map((_, i) => (
      <Skeleton 
        key={i} 
        variant="rounded" 
        height={300} 
        sx={{ borderRadius: '16px' }} 
      />
    ))}
  </Box>
)}
```

---

## Empty State Example

```javascript
{!loading && filteredAndSortedBookings.length === 0 && (
  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
    <Paper elevation={0} sx={{
      background: 'linear-gradient(135deg, #F5F5F5 0%, #FAFAFA 100%)',
      borderRadius: '16px',
      border: '2px dashed rgba(79, 138, 139, 0.2)',
      p: 6,
      textAlign: 'center'
    }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        📭 No bookings found
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Try adjusting your filter criteria
      </Typography>
    </Paper>
  </motion.div>
)}
```

---

## Snackbar Notification

```javascript
<Snackbar
  open={snackbar.open}
  autoHideDuration={4000}
  onClose={() => setSnackbar(s => ({ ...s, open: false }))}
  anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
>
  <Alert
    onClose={() => setSnackbar(s => ({ ...s, open: false }))}
    severity={snackbar.severity}
    sx={{
      width: '100%',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      fontWeight: 500
    }}
  >
    {snackbar.message}
  </Alert>
</Snackbar>
```

---

## Animation Examples

### Card Entrance
```javascript
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
  whileHover={{ y: -4 }}
>
  {/* Card Content */}
</motion.div>
```

### Modal Animation
```javascript
<motion.div
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.9 }}
>
  {/* Modal Content */}
</motion.div>
```

### Button Interaction
```javascript
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  // ... button styles and click handlers
>
  Click Me
</motion.button>
```

---

## Date/Time Formatting

```javascript
const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }),
    time: date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  };
};

// Usage
const startFormatted = booking.startDateTime 
  ? formatDateTime(booking.startDateTime) 
  : null;
```

---

## Days Until Tour Calculation

```javascript
const daysUntil = booking.startDateTime
  ? Math.ceil((new Date(booking.startDateTime) - new Date()) / (1000 * 60 * 60 * 24))
  : null;

const isDaysUntilPositive = daysUntil !== null && daysUntil > 0;

// Display
{isDaysUntilPositive && (
  <Chip
    label={`${daysUntil} days away`}
    size="small"
    sx={{
      backgroundColor: '#E8F5E9',
      color: '#2E7D32',
      fontWeight: 600
    }}
  />
)}
```

---

## Best Practices Used

1. **Performance**: useMemo for expensive calculations
2. **Animations**: Framer Motion for smooth transitions
3. **Accessibility**: Proper semantic HTML and ARIA labels
4. **Responsiveness**: Mobile-first design approach
5. **Error Handling**: Try/catch blocks on all API calls
6. **State Management**: Proper lifting of state
7. **Component Reusability**: Modular component design
8. **Code Organization**: Clear separation of concerns

---

## Testing Checklist

- [ ] Test filters on desktop (1920px)
- [ ] Test filters on tablet (768px)
- [ ] Test filters on mobile (375px)
- [ ] Test all status filters
- [ ] Test price range filter
- [ ] Test date range filter
- [ ] Test search functionality
- [ ] Test sort options
- [ ] Test grid/list view toggle
- [ ] Test chat modal opening
- [ ] Test edit modal functionality
- [ ] Test delete confirmation
- [ ] Test snackbar notifications
- [ ] Test with 0 bookings
- [ ] Test with 100+ bookings
- [ ] Test animations smoothness
- [ ] Test button hover states
- [ ] Test keyboard navigation

---

**Document Version**: 1.0
**Last Updated**: February 25, 2026
