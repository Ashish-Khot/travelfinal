# 🚀 Review Moderation System - Quick Start Guide

## Welcome to the Review Moderation System!

This guide will help you quickly understand and use the new review moderation features in your admin dashboard.

---

## 📌 Table of Contents
1. [Quick Start (2 minutes)](#quick-start)
2. [Main Features at a Glance](#features-overview)
3. [Step-by-Step Walkthrough](#step-by-step)
4. [Common Tasks](#common-tasks)
5. [Key Buttons & What They Do](#button-reference)

---

## ⚡ Quick Start

### First Time Using the System? Follow These 3 Steps:

#### Step 1️⃣: Navigate to Reviews Tab
```
Admin Dashboard → Click "Reviews" Tab
```

#### Step 2️⃣: Scan All Reviews
```
Click "🤖 AI Scan All" Button
Wait for scan to complete (shows: "✅ Scanned X reviews, 🚩 Flagged: Y reviews")
```

#### Step 3️⃣: Review Flagged Content
```
Filter by "Flagged Only" → Review each flagged item → Take action
```

---

## 🎯 Features Overview

### Dashboard Statistics Cards
```
┌─────────────────────────────────────────────────────┐
│ 📊 Review Statistics (Updated in Real-time)        │
├─────────────────────────────────────────────────────┤
│  📋 Total Reviews: 1,250        All reviews ever   │
│  👁️ Visible: 1,175              Shown to public    │
│  🚫 Hidden: 50                  Admin-hidden only  │
│  🚩 Flagged: 120                Marked suspicious  │
└─────────────────────────────────────────────────────┘
```

### Action Buttons
```
🤖 AI Scan All  → Analyze all reviews instantly
🔄 Refresh      → Update statistics
```

### Filter Options
```
📍 Place/Comment Search  → Find specific reviews
📌 Status Filter        → Pending, Approved, Rejected
👁️ Visibility Filter    → Hidden, Visible
🚩 Flag Filter          → Flagged, Not Flagged
```

---

## 📝 Step-by-Step Walkthrough

### Scenario 1: You Just Logged In

**Goal**: Get a quick overview of what needs moderation

```
1. Look at Statistics Cards
   - If "Flagged" count > 0 → Reviews need attention
   - If "Hidden" count is high → Check why

2. Click "🤖 AI Scan All"
   - System auto-detects inappropriate content
   - Creates list of flagged reviews

3. Filter by "Flagged Only"
   - See only reviews with potential issues
   - Review shows confidence level (80%+ = high risk)
```

### Scenario 2: Review Needs to be Hidden

**Goal**: Hide a review that breaks guidelines but doesn't warrant deletion

```
1. Find the Review
   - Search if you know the place name
   - Or scroll through list
   - Click to open details

2. Click "🚫 Hide" Button
   - Popup asks for reason
   - Enter: "Contains inappropriate language"
   - Review is now hidden from public

3. Verify
   - Review still appears in admin view
   - Not visible to regular users
   - Avatar shows as "🚫 Hidden"
```

### Scenario 3: Review Must be Deleted

**Goal**: Permanently remove a review for violation

```
1. Open Review Details
   - Click on the review in the list

2. Check AI Analysis
   - Read the flagged words
   - Confirm it warrants deletion
   - Confidence should be 75%+ to proceed

3. Click "🗑️ Delete" Button
   - Popup asks for reason
   - Enter detailed reason
   - Click confirm

4. Later if Needed
   - Filter by deleted reviews
   - Find the review
   - Click "♻️ Restore" to undo
```

### Scenario 4: Batch Manage Multiple Reviews

**Goal**: Handle multiple problematic reviews quickly

```
1. Filter Reviews
   - Status: "Flagged" = Show only flagged
   - From left to right, review each one

2. Quick Actions on Each
   - Click review → Take action → Close modal
   - System stays on same page

3. Update Stats
   - Click "🔄 Refresh" to see statistics update
   - Monitor progress

4. Complete Task
   - All flagged reviews processed
   - System now shows updated counts
```

---

## ✅ Common Tasks

### Task 1: Find Reviews About Unreliable Guides

```javascript
// Steps:
1. Filter by "Status" → "Pending" 
   // These haven't been approved yet
2. Search for guide name
3. Look for patterns
4. Batch approve or reject
```

### Task 2: Find Reviews with Links (Spam)

```javascript
// These are usually auto-flagged by AI
1. Filter by "Flagged" → "Flagged Only"
2. Check AI Analysis → Look for reason "spam"
3. Confidence > 75% = Definitely spam
4. Click "🗑️ Delete" with reason "Contains external links"
```

### Task 3: Find Reviews with Profanity

```javascript
// AI detects these automatically
1. Filter by "Flagged" → "Flagged Only"
2. Look at "Flagged Words" section
3. If legitimate (e.g., "bad trip"), click "⭕ Unflag"
4. If violation, click "🚫 Hide" or "🗑️ Delete"
```

### Task 4: Fix a Wrong Moderation Decision

```javascript
// Reviews can be recovered with Restore
1. Filter by "Hidden" or "Deleted"
2. Find the review that shouldn't have been moderated
3. Click to open details
4. Click "👁️ Unhide" or "♻️ Restore"
5. System updates immediately
```

### Task 5: Monitor Guide Reputation

```javascript
// See which guides have issues
1. Use the search to find a guide's reviews
2. Check which ones are hidden/flagged
3. Review AI analysis
4. Watch for patterns (user abusing power, etc.)
```

---

## 🔘 Button Reference Guide

### Main Action Buttons

| Button | Icon | Purpose | When to Use |
|--------|------|---------|------------|
| AI Scan All | 🤖 | Auto-analyze all reviews | Start of day, Weekly |
| Refresh | 🔄 | Update statistics | After batch actions |
| Scan Now | 🤖 | Re-analyze one review | Verify or update |
| Hide | 🚫 | Hide from public | First offense, minor issues |
| Unhide | 👁️ | Make visible again | Fixed mistake |
| Delete | 🗑️ | Remove (soft-delete) | Serious violation |
| Restore | ♻️ | Recover deletion | Wrong decision |
| Flag | 🚩 | Mark for review | Unsure cases |
| Unflag | ⭕ | Remove flag | False positive |

### Filter Buttons

| Filter | Options | Purpose |
|--------|---------|---------|
| Status | All, Pending, Approved, Rejected | Filter by review status |
| Visibility | All, Hidden, Visible | Show only hidden or visible |
| Flag Status | All, Flagged, Not Flagged | AI flagged items |
| Search | Text | Find by place or words |

---

## 🎨 Color Guide

### Review Status Colors
```
🟩 Green (bg-green-100)  = Approved ✅
🟨 Yellow (bg-yellow-100) = Pending ⏳  
🟥 Red (bg-red-100)       = Rejected ❌
```

### Moderation Status Icons
```
🚫 = Review is hidden (not visible to public)
🗑️ = Review is deleted (soft-delete)
⭕ = Recovered from deletion
```

### Risk Level Indicators
```
🟢 Green Label  = Safe (< 30% risk)
🟡 Yellow Label = Low Risk (30-49%)
🟠 Orange Label = Medium Risk (50-79%)
🔴 Red Label    = High Risk (80%+)
```

---

## 📊 Understanding the Statistics

### What Each Number Means

```
Total Reviews: 1,250
└─ This is: ALL reviews ever posted

Visible: 1,175  
└─ This is: Reviews shown to users
└─ Formula: Total - Hidden - Deleted

Hidden: 50
└─ This is: Reviews hidden by admins
└─ They can still be unhidden later

Flagged: 120
└─ This is: Reviews AI marked as problematic
└─ May be hidden, deleted, or still visible
```

### Example Calculation
```
Total Reviews:       1,250  (100%)
├─ Visible:         1,175   (94%)
├─ Hidden:             50    (4%)
└─ Deleted:            25    (2%)

Flagged (of Total):   120    (9.6%)
Safe (of Total):    1,130   (90.4%)
```

---

## 🎓 Best Practices

### ✅ DO:
- ✅ Start each day with "AI Scan All"
- ✅ Check high-confidence (80%+) flags first
- ✅ Hide before Delete (reversible)
- ✅ Document your reason for every action
- ✅ Review statistics weekly

### ❌ DON'T:
- ❌ Delete reviews based on negative stars alone
- ❌ Hide reviews just because you disagree
- ❌ Ignore low-confidence (< 50%) flags
- ❌ Forget to refresh stats after big changes
- ❌ Delete without checking AI analysis first

---

## ⏱️ Typical Daily Workflow (5 minutes)

```
1. Click Reviews tab (10 seconds)
   ✓ Takes you to moderation

2. Check Statistics (30 seconds)
   ✓ Scan the metric cards
   ✓ Note how many flagged

3. AI Scan All (2 minutes)
   ✓ Click "🤖 AI Scan All"
   ✓ Wait for results

4. Review Flagged (2 minutes)
   ✓ Filter "Flagged Only"
   ✓ Review top 5 flagged items
   ✓ Take quick action on each

5. Total Time: 5 minutes
```

---

## 🆘 Quick Troubleshooting

### "Scan didn't work"
```
→ Refresh page
→ Click "🔄 Refresh" button
→ Try again
```

### "Can't find a review"
```
→ Clear all filters first
→ Try searching by place name
→ Check Hidden/Deleted filters
```

### "Wrong action taken"
```
→ Open the review again
→ Click opposite button (Unhide, Restore)
→ System updates immediately
```

### "Statistics not updating"
```
→ Click "🔄 Refresh Stats" button
→ Numbers should update
```

---

## 📞 Key Metrics to Remember

### High Priority (Act Within 24hrs)
- Flagged reviews with 80%+ confidence
- Multiple flagged reviews from same user
- Spam content with external links

### Medium Priority (Act Within 1 week)
- Flagged reviews with 50-79% confidence
- Reviews with contact sharing
- Repeated offenders

### Low Priority (Monitor)
- Flagged reviews with <50% confidence
- Negative reviews (even if harsh)
- Reviews mentioning competitor guides

---

## 🎯 Success Metrics

Track these to measure your performance:

| Metric | Good | Target |
|--------|------|--------|
| Flagged % | <10% | <8% |
| False Positives | <20% of flagged | <15% |
| Response Time | <24hrs | <12hrs |
| Guide Satisfaction | Improving | +5% monthly |

---

## 📚 Need More Details?

- **Full System Guide**: See `REVIEW_MODERATION_SYSTEM.md`
- **Technical Details**: See `REVIEW_MODERATION_IMPLEMENTATION.md`
- **API Documentation**: See admin route documentation

---

## 💡 Pro Tips

1. **Keyboard Shortcuts**
   - 🖱️ Click review → Open details
   - ESC → Close details modal
   - F5 → Refresh page

2. **Filter Combinations**
   - Flagged + High Confidence = Start here
   - Hidden + Week Old = Review hides
   - Deleted + Month Old = Archive
   - Status:Pending = Fresh reviews

3. **Batch Workflow**
   - Filter once
   - Review 10 items
   - Act on each
   - Refresh stats
   - Repeat

4. **Data-Driven**
   - Check stats weekly
   - What's the flagged rate?
   - Are guides complaining? Why?
   - Is AI accurate? (Check false positives)

---

## 🎓 Training Checklist

- [ ] Understand the 4 review statuses
- [ ] Know when to Hide vs Delete
- [ ] Can use AI Scan All
- [ ] Can interpret risk scores
- [ ] Know how to handle false positives
- [ ] Can restore accidentally deleted reviews
- [ ] Understand audit trail concept
- [ ] Know when to flag vs delete

---

**You're ready to start!** 🎉

### Next Steps:
1. ✅ Go to Admin Dashboard
2. ✅ Click "Reviews" tab
3. ✅ Click "🤖 AI Scan All"
4. ✅ Review the flagged items
5. ✅ Take your first moderation action!

---

**Happy Moderating!** 👮‍♂️

*For questions, refer to the full documentation or contact your development team.*

---

**Last Updated**: March 1, 2026
**Version**: 1.0.0
**Status**: Ready to Use
