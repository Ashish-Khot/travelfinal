# Tourist Booking Section - Visual Guide & UI/UX Overview

## 🎨 Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                         Header Section                          │
│  "My Bookings" + "Track, manage, and review all bookings..."   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Statistics Dashboard (6 Cards)               │
├──────────────┬──────────────┬──────────────┬──────────────┬─────┤
│ Total: 5     │ Pending: 1   │ Confirmed: 2 │ Completed: 1 │ ... │
│             │ (Orange)     │ (Green)      │ (Blue)       │     │
└──────────────┴──────────────┴──────────────┴──────────────┴─────┘

┌─────────────────────────────────────────────────────────────────┐
│                       Filter Bar (Expandable)                   │
│  🔍 Search | Status Filter | Price Slider | Date Range | Sort  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      View Toggle (Grid/List)                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────┬──────────────────────────────┐
│     Premium Booking Card 1       │     Premium Booking Card 2   │
├──────────────────────────────────┼──────────────────────────────┤
│ ✓ Confirmed | 14 days away      │ ⏳ Pending  | 7 days away     │
│                                  │                              │
│ Paris City Tour                  │ Amsterdam Cycling Tour       │
│ 👤 Guide: John Smith            │ 👤 Guide: Sarah Johnson      │
│                                  │                              │
│ Start: Mar 20, 10:00 AM          │ Start: Mar 15, 09:00 AM     │
│ End: Mar 21, 6:00 PM            │ End: Mar 15, 5:00 PM        │
│ Duration: 1 Day                 │ Duration: 1 Day              │
│                                  │                              │
│ $299                            │ $199                         │
│ [Chat] [Edit] [Delete]          │ [Chat] [Edit] [Delete]      │
└──────────────────────────────────┴──────────────────────────────┘

(Additional cards in similar format...)
```

---

## 🎯 Filter Bar Expanded View

```
┌────────────────────────────────────────────────────────┐
│ 🔽 Filters & Search                    3 active Filters│
├────────────────────────────────────────────────────────┤
│                                                         │
│ 🔍 Search by destination, guide name, booking ID...   │
│ |___________________________________|[X]               │
│                                                         │
│ Booking Status                                          │
│ [Pending] [Confirmed] [✓ Completed] [Cancelled]       │
│                                                         │
│ Price Range: $150 - $5000                             │
│ ◀─────●───────────────────●──────────▶               │
│ $0                                    $10,000          │
│                                                         │
│ From Date                 To Date                      │
│ [_______________]        [_______________]            │
│                                                         │
│ Sort By: [Newest First ▼]                            │
│   • Newest First (selected)                            │
│   • Oldest First                                       │
│   • Price: High to Low                                 │
│   • Price: Low to High                                 │
│   • By Status                                          │
│                                                         │
│ [Clear All Filters]  [Apply Filters]                 │
└────────────────────────────────────────────────────────┘
```

---

## 🃏 Premium Booking Card - Collapsed State

```
┌─────────────────────────────────────────────────────────┐
│ ✓ Confirmed | 14 days away                         $299│
│ Paris City Tour                                         │
│ 👤 Guide: John Smith                              Total │
│                                                    Price│
│                          [Expand ▼ Chat] [Edit] [Delete]
└─────────────────────────────────────────────────────────┘
```

---

## 🃏 Premium Booking Card - Expanded State

```
┌──────────────────────────────────────────────┐
│ Status Bar with Badge & Days Until           │
│ ✓ Confirmed | 14 days away                   │
├──────────────────────────────────────────────┤
│                                               │
│ Paris City Tour           Price Display      │
│ 👤 Guide: John Smith      $299              │
│                           Total Price        │
│                                               │
├──────────────────────────────────────────────┤
│ Expandable Details (When Clicked)             │
│                                               │
│ START DATE & TIME          END DATE & TIME   │
│ 📅 Mar 20, 2026 at 10:00   📅 Mar 21 at 6:00│
│                                               │
│ BOOKING ID                 DURATION          │
│ A4F2B8C2E6                 1 Days            │
│                                               │
├──────────────────────────────────────────────┤
│ [Collapse ▲] [Chat] [Edit] [Delete]         │
└──────────────────────────────────────────────┘
```

---

## 📊 Statistics Cards Breakdown

### Card 1: Total Bookings
```
┌─────────────────┐
│  TOTAL          │
│    5            │
│ (All bookings)  │
└─────────────────┘
Background: Light Blue (#E3F2FD)
Border: Blue (#2196F3) with 0.2 opacity
```

### Card 2: Pending
```
┌─────────────────┐
│  PENDING        │
│    1            │
│ (Awaiting)      │
└─────────────────┘
Background: Light Orange (#FFF3E0)
Border: Orange (#FF9800) with 0.2 opacity
Text: Orange (#FF9800)
```

### Card 3: Confirmed
```
┌─────────────────┐
│  CONFIRMED      │
│    2            │
│ (Ready to go)   │
└─────────────────┘
Background: Light Green (#E8F5E9)
Border: Green (#4CAF50) with 0.2 opacity
Text: Green (#4CAF50)
```

### Card 4: Completed
```
┌─────────────────┐
│  COMPLETED      │
│    1            │
│ (Finished)      │
└─────────────────┘
Background: Light Blue (#E3F2FD)
Border: Blue (#2196F3) with 0.2 opacity
Text: Blue (#2196F3)
```

### Card 5: Cancelled
```
┌─────────────────┐
│  CANCELLED      │
│    0            │
│ (Cancelled)     │
└─────────────────┘
Background: Light Red (#FFEBEE)
Border: Red (#F44336) with 0.2 opacity
Text: Red (#F44336)
```

### Card 6: Total Spent
```
┌─────────────────┐
│  TOTAL SPENT    │
│    $1,247       │
│ (All bookings)  │
└─────────────────┘
Background: Light Purple (#F3E5F5)
Border: Purple (#9C27B0) with 0.2 opacity
Text: Purple (#9C27B0)
```

---

## 🎨 Color Palette

### Primary Brand Colors
```
Primary Teal:      #4F8A8B
Primary Light:     #6BA8AC
Gradient:          linear-gradient(135deg, #4F8A8B 0%, #6BA8AC 100%)
```

### Status Colors (with backgrounds)
```
Pending:    #FFA500  |  Background: #FFF3E0
Confirmed: #4CAF50  |  Background: #E8F5E9
Completed: #2196F3  |  Background: #E3F2FD
Cancelled: #F44336  |  Background: #FFEBEE
```

### Action Colors
```
Primary/Save:     #4F8A8B (Teal)
Success/Chat:     #4CAF50 (Green)
Warning/Edit:     #FF9800 (Orange)
Danger/Delete:    #F44336 (Red)
Info:            #2196F3 (Blue)
```

### Neutral Colors
```
Text:              #1a1a1a
Text Secondary:    #666666
Borders:           rgba(79, 138, 139, 0.1)
Backgrounds:       #ffffff, #f5f5f5, #fafafa
```

---

## 🎬 Animation Effects

### Card Hover Effect
```
On Hover:
- Elevation increases (shadows deepen)
- Slight upward movement (-4px)
- Border color brightens
- Smooth 0.3s transition
```

### Button Effects
```
On Hover:
- Scale becomes 1.05 (5% larger)
- Shadow appears/increases
- Color slightly brightens

On Click:
- Scale becomes 0.95 (5% smaller)
- Haptic feedback (visual)
```

### Modal/Panel Animations
```
Entrance:
- Starts at scale 0.9 and opacity 0
- Animates to scale 1 and opacity 1
- Duration: 0.3s ease

Exit:
- Reverses the entrance animation
```

---

## 📱 Responsive Behavior

### Desktop (1920px+)
```
Statistics: 6 cards in one row
Cards: 2 columns
Filters: Full width, all options visible
Modals: 450px width, centered
```

### Tablet (768px)
```
Statistics: 2 rows of 3 cards
Cards: 1 column (full width)
Filters: Full width, compact style
Modals: 90% width, responsive
```

### Mobile (375px)
```
Statistics: Scrollable horizontal
Cards: 1 column (full width)
Filters: Collapsible, saves space
Modals: 90% width, full height if needed
Buttons: Stacked vertically
```

---

## 🔘 Button States

### Normal State
```
Background: Solid color
Text: White/Contrasting color
Border-radius: 8-12px
Padding: 8px 16px
Font-weight: 600
```

### Hover State
```
Background: Brighten/Darken
Shadow: Appears/Increases
Transform: Scale 1.05
Cursor: Pointer
Transition: 0.3s ease
```

### Active State
```
Background: Solid, matching current status
Text: White
Shadow: Prominent
Border: Visible highlight
```

### Disabled State
```
Background: Gray (#888888)
Text: Light gray
Cursor: Not-allowed
Opacity: 0.6
```

---

## 📋 Element Sizing

### Typography
```
Heading (h4):      24px | fontWeight: 700
Subtitle (h6):     20px | fontWeight: 700
Body Text:         16px | fontWeight: 500
Caption/Label:     12px | fontWeight: 700
Timestamp:         14px | fontWeight: 500
```

### Spacing (using 4px units)
```
Extra Small (xs):  4px
Small (sm):        8px
Medium (md):       16px
Large (lg):        24px
Extra Large (xl):  32px
```

### Border Radius
```
Cards/Containers:  16px
Buttons/Inputs:    12px
Modals:           16px
Chips:            16px (pill-shaped)
Subtle elements:   8px
```

---

## 🎯 Interactive Elements Guide

### Search Bar
- Icon: Search icon (#4F8A8B)
- Clear button: Appears when text is entered
- Underline: Highlights on focus
- Placeholder: Light gray text

### Status Chips
- Unfilled: Border only (colored)
- Filled: Solid background (colored)
- Hover: Lifts up, shadow appears
- Click: Toggles between filled/unfilled

### Slider (Price Range)
- Track: Light gray (#e0e0e0)
- Active Track: Teal (#4F8A8B)
- Thumbs: White with Teal border
- Labels: Displayed on hover
- Handle smoothly when dragged

### Dropdown (Sort By)
- Default value shown: "Newest First"
- Opens on click
- Options highlighted on hover
- Selected option has checkmark
- Closes on selection

---

## ✨ Special Effects

### Gradient Text
```
Background: Gradient
-webkit-background-clip: text
-webkit-text-fill-color: transparent
Background-clip: text
Result: Colorful text outline
```

### Glass-morphism (Filter Bar)
```
Background: Semi-transparent white
Backdrop-filter: blur(10px)
Border: Subtle colored border
Opacity: Allows background to show through
```

### Skeleton Loading
```
Background: Light gray
Animation: Shimmer effect
Height: Matches expected content
Width: Full container
Border-radius: Matches target element
```

---

## 🎪 Empty State Design

### No Bookings Case
```
┌────────────────────────────────┐
│     📭 No bookings yet         │
│                                │
│ Start exploring guides and    │
│ create your first booking to  │
│ begin your adventure!         │
│                                │
│ [Explore Guides Button]       │
└────────────────────────────────┘
```

### No Results Case (Filters Applied)
```
┌────────────────────────────────┐
│   🔍 No bookings match        │
│                                │
│  Try adjusting your filter    │
│  criteria to see more bookings│
│                                │
│  [Clear Filters Button]       │
└────────────────────────────────┘
```

---

## 📲 Modal Designs

### Edit Booking Modal
```
┌─────────────────────────────────────┐
│  Edit Booking                       │
├─────────────────────────────────────┤
│                                     │
│ Destination: [________________]     │
│                                     │
│ Date:       [________________]      │
│                                     │
│ Price:      [________________]      │
│                                     │
│ [Save Changes]  [Cancel]           │
└─────────────────────────────────────┘
```

### Delete Confirmation Modal
```
┌─────────────────────────────────────┐
│  Delete Booking                     │
├─────────────────────────────────────┤
│                                     │
│ Are you sure you want to delete   │
│ this booking? This action cannot  │
│ be undone.                        │
│                                     │
│ [Delete] [Cancel]                 │
└─────────────────────────────────────┘
```

### Chat Modal
```
┌─────────────────────────────────────┐
│  Chat with Guide      [X Close]    │
├─────────────────────────────────────┤
│                                     │
│  [Chat messages and interface]     │
│                                     │
│ [Send message..........] [Send]   │
└─────────────────────────────────────┘
```

---

## 🎯 Notification Styles

### Success Notification
```
Background: Light green
Icon: Checkmark
Color: Green (#4CAF50)
Text: "Booking updated successfully!"
Position: Top center
Duration: 4 seconds
```

### Error Notification
```
Background: Light red
Icon: X or alert
Color: Red (#F44336)
Text: "Failed to update booking."
Position: Top center
Duration: 4 seconds
```

### Info Notification
```
Background: Light blue
Icon: Info circle
Color: Blue (#2196F3)
Text: "You declined to leave a review."
Position: Top center
Duration: 4 seconds
```

---

## 🖱️ User Interaction Flow

### Filter Interaction
1. User clicks filter icon or panel expands
2. User selects/enters filter criteria
3. Results update in real-time
4. Active filter count displays
5. User can clear all filters
6. Cards re-render with filtered data

### Booking Card Interaction
1. User hovers over card → lifts up, shadow increases
2. User clicks expand arrow → details section opens
3. User clicks chat → chat modal opens
4. User clicks edit → edit modal opens
5. User clicks delete → confirmation modal opens
6. User confirms action → API call, snackbar notification

### Modal Interaction
1. Modal opens with scale animation
2. User fills in form or confirms action
3. User clicks action button → validates and submits
4. Loading state shows (if async)
5. Success/error notification appears
6. Modal closes
7. Data refreshes

---

## 🎨 Design System Summary

| Element | Size | Color | Spacing | Radius |
|---------|------|-------|---------|---------|
| Heading | 24px | #1a1a1a | 16px below | - |
| Card | - | #fff | 16px gap | 16px |
| Button | 14px | Brand | 8-16px | 12px |
| Input | 16px | #1a1a1a | 16px | 12px |
| Chip | 14px | Status | 4-8px | 16px |
| Modal | - | #fff | 32px | 16px |

---

**Document Version**: 1.0  
**Last Updated**: February 25, 2026  
**Design Quality**: Premium Grade ⭐⭐⭐⭐⭐
