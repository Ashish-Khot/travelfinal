# 📋 Guide Review Moderation System - Complete Documentation

## Overview

The Review Moderation System is a comprehensive solution that enables administrators to manage, moderate, and verify guide reviews. It includes AI-powered content detection to automatically identify inappropriate content, enabling faster and more efficient review management.

---

## Features

### 1. **Admin Review Dashboard**
- View all reviews across the platform
- Filter reviews by status, visibility, and flag status
- Search reviews by place or comment content
- Paginated review list for better performance

### 2. **AI Content Detection**
- Automatic detection of:
  - Profanity and abusive language
  - Spam content (links, repeated characters, excessive punctuation)
  - External contact information (phone numbers, emails, chat app mentions)
  - Irrelevant or empty reviews
- Confidence scoring (0-100%) for each detection
- Automatic flagging of suspicious reviews

### 3. **Review Management**
- **Hide Reviews**: Make reviews invisible to the public while keeping them in the system
- **Delete Reviews**: Soft-delete reviews with audit trail
- **Restore Reviews**: Recover previously deleted reviews
- **Flag/Unflag**: Manually flag reviews for further inspection
- **Scan Individual**: Run AI analysis on specific reviews

### 4. **Batch Operations**
- Scan all reviews at once
- Filter and batch manage multiple reviews
- Download statistics and reports

### 5. **Audit Trail**
- Track who moderated what and when
- Record moderation reasons and notes
- Maintain complete history of all actions

---

## Database Schema Updates

### Review Model Enhancements

The Review model now includes new fields for moderation:

```javascript
{
  // ... existing fields ...

  // Moderation flags
  isHidden: Boolean,           // Review invisible to public
  hiddenReason: String,         // Why it was hidden
  isDeleted: Boolean,           // Soft delete flag
  deletedReason: String,        // Why it was deleted

  // AI Content Moderation
  aiModeration: {
    isFlagged: Boolean,         // Is content flagged?
    reason: String,             // profanity|abusive|spam|irrelevant|other
    flaggedWords: [String],     // Array of detected inappropriate words
    confidence: Number,         // 0-100 confidence score
    checkedAt: Date            // When AI scan was performed
  },

  // Admin actions
  adminNotes: String,           // Admin notes about moderation
  moderatedBy: ObjectId,        // User who moderated
  moderatedAt: Date            // When moderation occurred
}
```

---

## API Endpoints

### Admin Review Routes (`/api/adminReview`)

#### 1. **Get All Reviews**
```
GET /api/adminReview/all-reviews
Query Parameters:
  - status: 'pending' | 'approved' | 'rejected'
  - hidden: 'true' | 'false'
  - flagged: 'true' | 'false'
  - search: search term
  - page: page number (default: 1)
  - limit: items per page (default: 20)

Response:
{
  reviews: [...],
  pagination: { current, total, limit, count }
}
```

#### 2. **Scan Single Review (AI)**
```
POST /api/adminReview/scan-review/:id

Response:
{
  message: 'Review scanned successfully',
  review: {...},
  analysis: {
    isFlagged: boolean,
    reason: string,
    flaggedWords: [],
    confidence: number
  }
}
```

#### 3. **Scan All Reviews (AI)**
```
POST /api/adminReview/scan-all
Query Parameters:
  - guideId: guide ID (optional)
  - status: review status (optional)

Response:
{
  message: 'Scanned X reviews',
  scanned: number,
  flagged: number,
  results: [...]
}
```

#### 4. **Hide Review**
```
PUT /api/adminReview/hide/:id
Body:
{
  reason: 'Reason for hiding',
  notes: 'Admin notes'
}
```

#### 5. **Unhide Review**
```
PUT /api/adminReview/unhide/:id
```

#### 6. **Delete Review (Soft)**
```
DELETE /api/adminReview/delete/:id
Body:
{
  reason: 'Reason for deletion',
  notes: 'Admin notes'
}
```

#### 7. **Restore Review**
```
PUT /api/adminReview/restore/:id
```

#### 8. **Flag Review**
```
PUT /api/adminReview/flag/:id
Body:
{
  reason: 'Why it was flagged',
  notes: 'Admin notes'
}
```

#### 9. **Unflag Review**
```
PUT /api/adminReview/unflag/:id
```

#### 10. **Get Statistics**
```
GET /api/adminReview/stats

Response:
{
  totalReviews: number,
  hiddenReviews: number,
  deletedReviews: number,
  flaggedReviews: number,
  pendingReviews: number,
  approvedReviews: number,
  rejectedReviews: number,
  visibleReviews: number
}
```

#### 11. **Get Guide Reviews (Admin View)**
```
GET /api/adminReview/guide/:guideId/reviews
Query Parameters:
  - includeHidden: 'true' | 'false'
  - includeFlagged: 'true' | 'false'

Response:
{
  reviews: [...],
  stats: {
    total: number,
    flagged: number,
    hidden: number,
    deleted: number,
    avgRating: number
  }
}
```

---

## How to Use the Review Moderation System

### Step 1: Access the Admin Dashboard
1. Go to Admin Dashboard
2. Click on the **"Reviews"** tab

### Step 2: View Review Statistics
The dashboard shows:
- **Total Reviews**: All reviews on the platform
- **Visible Reviews**: Reviews shown to the public
- **Hidden Reviews**: Moderated but visible only to admins
- **Flagged Reviews**: Marked by AI as potentially problematic

### Step 3: Filter and Search Reviews
Use the filters to find specific reviews:
- Search by place name or comment content
- Filter by status (Pending, Approved, Rejected)
- Filter by visibility (Hidden/Visible)
- Filter by AI flag status

### Step 4: Perform AI Scan (Recommended)
Before managing reviews:
1. Click **"🤖 AI Scan All"** button
2. Wait for the scan to complete
3. The system will automatically flag inappropriate reviews

### Step 5: Review Individual Reviews
1. Click on any review in the list to view details
2. See full comment, rating, user info, and AI analysis
3. Review the AI detection results with confidence score

### Step 6: Take Moderation Action

#### **Hide a Review** (Recommended for first offense)
- Use for reviews with minor issues
- Review remains in system but is not visible to public
- Action is reversible
- Good for borderline cases

#### **Delete a Review** (For serious violations)
- Soft-deletes the review (not permanently removed)
- Can be restored if needed
- Should be used for clear violations
- Always provide deletion reason

#### **Flag a Review** (For further investigation)
- Marks review for admin review
- Useful for borderline cases
- Can be unflagged when issue is resolved

#### **Scan Specific Review**
- Use manual AI scan for suspicious reviews
- Gets latest AI analysis
- Updates AI moderation metadata

---

## AI Content Detection Details

The system uses multiple detection methods:

### 1. **Profanity Detection**
- Detects explicit language using profanity database
- Flags direct profanity and variations
- Confidence: 85% when detected

### 2. **Abusive Language**
- Identifies threatening or harassing language
- Detects discriminatory content
- Confidence: 75-85%

### 3. **Spam Detection**
- **Links**: Detects external URLs (confidence: 75%)
- **Repeated Characters**: AAAAA, BBBBB patterns (confidence: 70%)
- **Contact Info**: Phone numbers, emails, chat app mentions (confidence: 80%)
- **Excessive Punctuation**: !!! or ??? patterns (confidence: 65%)
- **Excessive Caps**: MORE THAN 50% CAPS (confidence: 60%)

### 4. **Irrelevant Content**
- Empty or very short reviews
- Confidence: 90%

### 5. **Risk Scoring**
- **High Risk (80%+)**: Red badge - likely requires action
- **Medium Risk (50-79%)**: Orange badge - review recommended
- **Low Risk (30-49%)**: Yellow badge - monitor
- **Safe (0-29%)**: Green badge - no concerns

---

## Best Practices

### 1. **Regular Monitoring**
- Perform AI scans weekly
- Review flagged items in batches
- Keep statistics updated

### 2. **Consistent Moderation Policy**
- Use same criteria for all reviews
- Document reasons for actions
- Maintain audit trail

### 3. **User Communication**
- Consider sending notifications when reviews are hidden
- Explain moderation policy to guides
- Allow appeals for controversial decisions

### 4. **Database Maintenance**
- Archive deleted reviews monthly
- Monitor system for spam patterns
- Update customized word lists quarterly

### 5. **Action Guidelines**

| Issue | Action | Severity |
|-------|--------|----------|
| Profanity | Hide or Delete | High |
| Spam Links | Delete | High |
| Harassment | Delete + Ban | Critical |
| Contact Info Sharing | Hide | Medium |
| Minor Grammar | No Action | Low |
| Helpful Feedback | Approve | N/A |

---

## Statistics & Reporting

### Key Metrics
- **Total Flagged Rate**: (Flagged / Total) × 100
- **Hidden Rate**: (Hidden / Total) × 100
- **Approval Rate**: (Approved / Total) × 100
- **Guide Health**: Average rating of visible reviews

### Example Dashboard Stats
```
Total Reviews:     1,250
Visible:          1,175 (94%)
Hidden:              50 (4%)
Deleted:             25 (2%)
Flagged by AI:      120 (9.6%)
```

---

## Troubleshooting

### Problem: AI False Positives
**Solution**: 
- Review the AI analysis confidence score
- Manually unflag if score is low
- Add review to whitelist if needed

### Problem: Hidden Reviews Need to be Restored
**Solution**:
1. Filter by "Hidden" reviews
2. Click the review
3. Click "👁️ Unhide" button

### Problem: Too Many Spam Reviews
**Solution**:
1. Perform "AI Scan All"
2. Filter by "Flagged Only"
3. Batch delete spam reviews with reason "Spam"

### Problem: Guide Complaining About Moderation
**Solution**:
1. View the review details
2. Check admin notes and reasons
3. If decision was wrong, restore the review
4. Document the correction

---

## Security & Permissions

- **Admin Only**: All moderation features require 'admin' role
- **Audit Trail**: All actions are logged with admin ID
- **Soft Deletes**: Deleted reviews are never permanently removed
- **Data Integrity**: Original review data preserved

---

## Performance Optimization

### For Large Review Sets
1. Use pagination (limit: 20-50 reviews per page)
2. Filter before viewing (reduce data loaded)
3. Batch scan during off-peak hours
4. Archive old reviews to separate collection

### Recommended Scanning Schedule
- **Weekly**: Full system scan
- **Daily**: Reviews from last 7 days
- **On Demand**: Specific guides or time periods

---

## Future Enhancements

Potential additions to consider:
- [ ] Machine learning model for custom spam detection
- [ ] Email notifications for flagged reviews
- [ ] Bulk moderation actions
- [ ] Review appeal system
- [ ] Guide reputation scoring
- [ ] Automated guide suspension for repeat violations
- [ ] Monthly moderation reports
- [ ] Integration with review analytics

---

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API endpoint documentation
3. Check server logs for errors
4. Contact development team

---

**Last Updated**: March 1, 2026
**Version**: 1.0.0
**Status**: Production Ready
