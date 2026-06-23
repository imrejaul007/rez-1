# UGC VIDEO SYSTEM - MONITORING GUIDE
## What to Monitor Post-Launch

**Last Updated:** November 8, 2025
**Version:** 1.0.0
**Review Frequency:** Daily (Week 1), Weekly (Month 1), Monthly (Ongoing)

---

## EXECUTIVE SUMMARY

This guide defines what metrics to track, how to monitor them, and what actions to take based on monitoring data for the UGC Video System.

**Key Monitoring Areas:**
1. System Health (Uptime, Performance)
2. Feature Usage (Uploads, Views, Engagement)
3. Business Metrics (Conversions, Revenue)
4. Error Tracking (Failures, Reports)
5. User Experience (Satisfaction, Feedback)

---

## 1. SYSTEM HEALTH MONITORING

### 1.1 Backend Performance

#### Key Metrics

**API Response Time**
- **What:** Time taken to process UGC API requests
- **Target:**
  - p50 < 200ms
  - p95 < 500ms
  - p99 < 1s
- **Monitor:** Every 5 minutes
- **Alert:** If p95 > 1s for 10 minutes
- **Tool:** Sentry, New Relic, DataDog, or custom logging

**Sample Query (if using monitoring tool):**
```
# Average response time by endpoint
SELECT avg(duration)
FROM transactions
WHERE transaction.name LIKE '/api/ugc%'
GROUP BY transaction.name
```

**Endpoints to Track:**
| Endpoint | Target Response Time | Current | Status |
|----------|---------------------|---------|--------|
| `GET /api/ugc` (feed) | < 300ms | _____ms | 🟢 |
| `GET /api/ugc/:id` | < 200ms | _____ms | 🟢 |
| `POST /api/ugc` (upload) | < 2s | _____ms | 🟢 |
| `POST /api/ugc/:id/report` | < 300ms | _____ms | 🟢 |

**Actions:**
- 🟢 < 500ms: All good
- 🟡 500ms - 1s: Investigate, optimize queries
- 🔴 > 1s: Urgent - check database indexes, add caching

---

**Server Uptime**
- **What:** Backend service availability
- **Target:** 99.9% uptime (< 45 min downtime/month)
- **Monitor:** Continuous (external monitoring)
- **Alert:** Immediately on downtime
- **Tool:** UptimeRobot, Pingdom, StatusCake

**Health Check Endpoint:**
```bash
GET https://api.rezapp.com/health
Expected: {"status":"ok","timestamp":"..."}
```

**Dashboard Widget:**
```
[Uptime]
Current: 99.95%
This Week: 99.98%
This Month: 99.92%

Last Incident: 2 days ago (5 min)
```

---

**CPU & Memory Usage**
- **What:** Server resource utilization
- **Target:**
  - CPU: < 70% average, < 90% peak
  - Memory: < 80% average, < 90% peak
- **Monitor:** Every 1 minute
- **Alert:**
  - Warning: CPU > 80% for 5 minutes
  - Critical: CPU > 90% for 2 minutes
- **Tool:** PM2 Dashboard, Cloud provider metrics

**Commands:**
```bash
# Check via PM2
pm2 list
pm2 monit

# Check via system tools
top
htop
free -h
```

**Actions:**
- 🟢 < 70%: Normal
- 🟡 70-85%: Monitor closely, plan scaling
- 🔴 > 85%: Scale up immediately, investigate memory leaks

---

**Database Performance**
- **What:** MongoDB query performance
- **Target:**
  - Query time: < 100ms average
  - Connection count: < 80% of max
  - Slow queries: < 10 per hour
- **Monitor:** Every 5 minutes
- **Alert:** Slow query > 1s
- **Tool:** MongoDB Atlas Dashboard

**Key Metrics:**
```
[MongoDB Atlas - UGC Collection]
- Documents: _____
- Storage: _____GB
- Index size: _____MB
- Slow queries (>100ms): _____
- Connection count: _____ / 500
```

**Important Indexes to Monitor:**
```javascript
// Ensure these are being used
db.ugc.getIndexes()

// Check index usage
db.ugc.aggregate([
  { $indexStats: {} }
])

// Slow query log
db.system.profile.find().sort({millis:-1}).limit(10)
```

---

### 1.2 Cloudinary Performance

**Storage Usage**
- **What:** Total storage consumed by UGC videos
- **Target:** Stay within plan limits
- **Monitor:** Daily
- **Alert:** 80% of quota used
- **Tool:** Cloudinary Dashboard

**Dashboard Metrics:**
```
[Cloudinary Usage - Current Month]
Storage: _____GB / 25GB (Free plan)
Bandwidth: _____GB / 25GB
Transformations: _____ / 25,000
Credits remaining: $_____
```

**Actions:**
- 🟢 < 60%: Normal
- 🟡 60-80%: Monitor growth rate, plan upgrade
- 🔴 > 80%: Upgrade plan immediately OR implement cleanup

---

**Upload Success Rate**
- **What:** % of uploads that succeed
- **Target:** > 95%
- **Monitor:** Every hour
- **Alert:** < 90%
- **Calculation:** (Successful uploads / Total upload attempts) × 100

**Sample Tracking:**
```javascript
// Track in analytics
{
  event: 'video_upload_completed',
  success: true/false,
  error_code: '...',
  file_size: 12345678,
  duration_ms: 15000
}
```

**Weekly Report:**
| Week | Attempts | Successful | Failed | Success Rate |
|------|----------|------------|--------|--------------|
| 1 | 450 | 438 | 12 | 97.3% 🟢 |
| 2 | 892 | 860 | 32 | 96.4% 🟢 |

**Failure Reasons:**
```
[Upload Failures - Last 7 Days]
1. File too large: 45% (18 uploads)
2. Network timeout: 30% (12 uploads)
3. Unsupported format: 15% (6 uploads)
4. Cloudinary error: 10% (4 uploads)
```

**Actions:**
- 🟢 > 95%: Normal
- 🟡 90-95%: Review failure reasons, improve error messages
- 🔴 < 90%: Critical - fix upload process, check Cloudinary status

---

**CDN Performance**
- **What:** Video delivery speed
- **Target:** Time to first byte < 500ms
- **Monitor:** Weekly (via real user monitoring)
- **Tool:** Google Analytics, Cloudinary insights

**Metrics:**
```
[Video Delivery Performance]
Average load time: _____ms
p50: _____ms
p95: _____ms
p99: _____ms

By region:
- US: _____ms
- Europe: _____ms
- Asia: _____ms
```

---

### 1.3 Error Tracking

**Error Rate**
- **What:** % of requests that result in errors
- **Target:** < 1%
- **Monitor:** Continuous
- **Alert:** > 2% for 5 minutes
- **Tool:** Sentry, Bugsnag

**Error Categories:**
```
[Errors - Last 24 Hours]
Total: 127 errors

By Type:
- 4xx (Client errors): 89 (70%)
  - 404 Not Found: 45
  - 401 Unauthorized: 30
  - 400 Bad Request: 14

- 5xx (Server errors): 38 (30%) 🔴
  - 500 Internal Server: 25
  - 503 Service Unavailable: 8
  - 502 Bad Gateway: 5
```

**Top Errors (prioritize fixing):**
| Error | Count | % of Total | Status |
|-------|-------|-----------|--------|
| "Cannot read property 'url' of undefined" | 15 | 11.8% | 🔴 Fix ASAP |
| "Video upload timeout" | 12 | 9.4% | 🟡 Investigate |
| "Product not found" | 8 | 6.3% | 🟢 Expected |

**Actions:**
- Set up Sentry error tracking
- Group errors by type
- Fix errors with > 5% occurrence first
- Monitor error trends

---

## 2. FEATURE USAGE MONITORING

### 2.1 Video Upload Metrics

**Upload Volume**
- **What:** Number of videos uploaded
- **Target:** Increasing trend
- **Monitor:** Daily
- **Report:** Weekly summary

**Tracking:**
```
[Video Uploads]
Today: _____ videos
Yesterday: _____ videos
This Week: _____ videos
This Month: _____ videos

Trend: ↗️ +15% WoW | 📈 +45% MoM
```

**Hourly Distribution:**
```
[Upload Volume by Hour - Last 7 Days]
00:00 - 03:00: ██░░░░░░░░ 15 uploads
03:00 - 06:00: █░░░░░░░░░ 5 uploads
06:00 - 09:00: ████░░░░░░ 35 uploads
09:00 - 12:00: ██████░░░░ 68 uploads
12:00 - 15:00: ████████░░ 92 uploads (peak)
15:00 - 18:00: ███████░░░ 78 uploads
18:00 - 21:00: ██████████ 105 uploads (peak)
21:00 - 24:00: █████░░░░░ 52 uploads
```

**Peak hours:** 12-3 PM, 6-9 PM (plan server capacity accordingly)

---

**Upload Source Distribution**
- **What:** Where videos come from (camera, gallery, URL)
- **Monitor:** Weekly

```
[Upload Sources - This Month]
Camera: 45% (203 uploads) 📷
Gallery: 50% (225 uploads) 🖼️
URL: 5% (22 uploads) 🔗

User Preference: Gallery > Camera > URL
```

**Insights:**
- Most users upload existing videos (gallery)
- Consider optimizing gallery picker UI
- URL option rarely used (consider removing in future?)

---

**File Size Distribution**
- **What:** Size of uploaded videos
- **Monitor:** Weekly

```
[File Sizes - This Month]
< 10MB: 35% ████████████░░░░░░░░░░░░░░
10-20MB: 30% ██████████░░░░░░░░░░░░░░░░
20-30MB: 20% ███████░░░░░░░░░░░░░░░░░░░
30-40MB: 10% ████░░░░░░░░░░░░░░░░░░░░░░
40-50MB: 5%  ██░░░░░░░░░░░░░░░░░░░░░░░░

Average: 18.5 MB
Median: 16.2 MB
95th percentile: 42.3 MB
```

**Actions:**
- If most uploads < 20MB, consider lowering limit to save bandwidth
- If many hit 50MB limit, consider raising limit

---

### 2.2 Product Tagging Metrics

**Products Tagged per Video**
- **What:** How many products users tag
- **Target:** 5-10 products (enforced by app)
- **Monitor:** Weekly

```
[Products per Video - Last 30 Days]
5 products: 40% ████████████████░░░░░░░░
6 products: 25% ███████████░░░░░░░░░░░░░
7 products: 15% ██████░░░░░░░░░░░░░░░░░░
8 products: 10% ████░░░░░░░░░░░░░░░░░░░░
9 products: 7%  ███░░░░░░░░░░░░░░░░░░░░░
10 products: 3% █░░░░░░░░░░░░░░░░░░░░░░░

Average: 6.2 products per video
Median: 6 products
```

**Insights:**
- Users prefer minimum (5-6 products)
- Consider reducing minimum to 3 products?
- Or educate users on benefits of more tags

---

**Top Tagged Products**
- **What:** Most frequently tagged products
- **Monitor:** Weekly
- **Use:** Identify trending products, plan inventory

```
[Top 10 Tagged Products - This Week]
1. Wireless Headphones (#P12345) - 45 tags
2. Running Shoes (#P67890) - 38 tags
3. Yoga Mat (#P11223) - 32 tags
4. Protein Powder (#P44556) - 28 tags
5. Smart Watch (#P77889) - 25 tags
...
```

**Actions:**
- Feature top-tagged products on homepage
- Ensure adequate stock for trending items
- Create curated collection: "Trending in Videos"

---

### 2.3 Video Engagement Metrics

**Video Views**
- **What:** Total video views
- **Target:** Increasing trend
- **Monitor:** Daily

```
[Video Views]
Today: _____ views
This Week: _____ views
This Month: _____ views

Avg views per video: _____
Median views: _____
Top video views: _____
```

**View Duration:**
```
[Average Watch Time]
0-25%: 15% (users skipped early)
25-50%: 20% (moderate engagement)
50-75%: 30% (good engagement)
75-100%: 35% (excellent engagement) ⭐

Avg watch time: 65% of video
```

**Actions:**
- 🟢 > 60% watch time: Content is engaging
- 🟡 40-60%: Review video quality, thumbnails
- 🔴 < 40%: Investigate why users skip

---

**Likes & Engagement**
- **What:** User interactions with videos
- **Monitor:** Weekly

```
[Engagement Rates - Last 30 Days]
Videos with likes: 78%
Avg likes per video: 12.3
Like rate: 8.5% (likes / views)

Videos with comments: 45%
Avg comments per video: 3.8
Comment rate: 2.1%

Videos shared: 32%
Avg shares per video: 1.6
Share rate: 1.2%
```

**Benchmark:**
- Like rate 8-12%: Excellent
- Comment rate 2-5%: Good
- Share rate 1-3%: Normal

---

### 2.4 Reporting & Moderation

**Reports Submitted**
- **What:** Number of video reports
- **Target:** < 5% of videos reported
- **Monitor:** Daily
- **Alert:** Spike in reports (> 10 in 1 hour)

```
[Reports - Last 7 Days]
Total reports: 23
Unique videos reported: 18
Videos auto-flagged: 2 (≥5 reports)

Report reasons:
1. Inappropriate content: 45% (10 reports)
2. Spam: 25% (6 reports)
3. Misleading info: 15% (3 reports)
4. Copyright: 10% (2 reports)
5. Other: 5% (1 report)
```

**Auto-Flagged Videos:**
| Video ID | Reports | Reason | Action Taken | Date |
|----------|---------|--------|--------------|------|
| v123abc | 5 | Inappropriate | Hidden from feed | Nov 7 |
| v456def | 6 | Spam | Hidden, user warned | Nov 6 |

**Actions:**
- Review auto-flagged videos within 24 hours
- If valid: Remove permanently, warn user
- If false positive: Unhide, warn reporters
- Track false positive rate

---

**Moderation Queue**
- **What:** Videos pending review
- **Target:** Review within 24 hours
- **Monitor:** Daily

```
[Moderation Queue]
Pending review: _____ videos
Reviewed today: _____
Avg review time: _____ hours

Oldest pending: _____ hours (🔴 if >24 hours)
```

---

## 3. BUSINESS METRICS

### 3.1 Shopping Conversions

**Add-to-Cart from Videos**
- **What:** Products added to cart from UGC videos
- **Target:** > 5% of viewers add to cart
- **Monitor:** Daily

```
[Add-to-Cart Performance]
Videos with tagged products: 450
Products shown: 2,700 (avg 6 per video)
Product views: 12,500
Products added to cart: 625

Conversion rate: 5.0% ✅ (cart adds / product views)
```

**Top Converting Videos:**
| Video ID | Views | Cart Adds | Conversion | Revenue |
|----------|-------|-----------|------------|---------|
| v789xyz | 850 | 78 | 9.2% | $2,340 |
| v101abc | 620 | 52 | 8.4% | $1,560 |
| v202def | 580 | 45 | 7.8% | $1,350 |

**Insights:**
- Identify common traits of high-converting videos
- Promote top-converting videos
- Guide creators on best practices

---

**Revenue from UGC Videos**
- **What:** Revenue attributed to UGC video conversions
- **Target:** Increasing trend
- **Monitor:** Weekly

```
[Revenue Attribution - This Month]
Orders from UGC: 145 orders
Total revenue: $12,450
Avg order value: $85.86

YoY Growth: +____%
MoM Growth: +____%
```

**Attribution Model:**
- First-touch: User viewed video, then purchased tagged product within 7 days
- Last-touch: User clicked product from video immediately before purchase

---

### 3.2 User Acquisition & Retention

**UGC Creators**
- **What:** Users who upload videos
- **Target:** 10% of active users become creators
- **Monitor:** Monthly

```
[Creator Metrics - This Month]
Total active users: 5,000
Users who uploaded: 450
Creator rate: 9.0% (450/5000)

New creators: 180
Returning creators: 270 (60%)

Power users (>5 uploads): 25 (5.5% of creators)
```

**Creator Retention:**
```
[Creator Cohort Analysis]
Month 1: 180 creators → 100% baseline
Month 2: 108 still active → 60% retention
Month 3: 72 still active → 40% retention
Month 4: 54 still active → 30% retention
```

**Actions:**
- 🟢 > 50% retention Month 2: Good
- 🟡 30-50%: Improve creator incentives, gamification
- 🔴 < 30%: Major UX issues, investigate urgently

---

**Video Viewers**
- **What:** Users who watch UGC videos
- **Target:** 80% of active users view videos
- **Monitor:** Monthly

```
[Viewer Metrics]
Active users: 5,000
Users who viewed videos: 4,200
Viewer rate: 84% ✅

Sessions with video views: 12,500
Avg videos per session: 3.5
```

---

### 3.3 User Satisfaction

**In-App Ratings**
- **What:** User ratings of UGC feature
- **Target:** ≥ 4 stars
- **Monitor:** Weekly

```
[User Ratings - UGC Feature]
5 stars: 55% ⭐⭐⭐⭐⭐
4 stars: 30% ⭐⭐⭐⭐
3 stars: 10% ⭐⭐⭐
2 stars: 3%  ⭐⭐
1 star: 2%   ⭐

Average: 4.3 / 5.0 ✅
Total ratings: 450
```

**Negative Feedback Themes:**
- "Upload is slow": 40% (18 reviews)
- "Can't edit after upload": 30% (14 reviews)
- "Video quality low": 20% (9 reviews)
- Other: 10% (5 reviews)

**Actions:**
- Address top complaint (upload speed) first
- Plan feature: Edit video after upload
- Optimize video compression

---

**Support Tickets**
- **What:** User-reported issues
- **Target:** < 5 tickets per day
- **Monitor:** Daily

```
[Support Tickets - UGC Related]
Open: _____ tickets
Resolved today: _____
Avg resolution time: _____ hours

Top issues:
1. Can't upload video: 35%
2. Video not showing: 25%
3. Product tagging error: 20%
4. Other: 20%
```

---

## 4. ALERTING & NOTIFICATIONS

### 4.1 Alert Configuration

**Critical Alerts (Immediate Action)**
- 🔴 Backend down (< 1 min downtime)
- 🔴 Error rate > 5%
- 🔴 Database connection failed
- 🔴 Cloudinary quota exceeded
- 🔴 Upload success rate < 80%

**High Priority (Action within 1 hour)**
- 🟡 API response time > 1s (p95)
- 🟡 Server CPU > 85%
- 🟡 Server Memory > 85%
- 🟡 10+ reports in 1 hour
- 🟡 Upload success rate < 90%

**Medium Priority (Action within 4 hours)**
- 🟢 Slow queries > 20 per hour
- 🟢 Cloudinary storage > 80%
- 🟢 Error rate 2-5%

### 4.2 Alert Channels

**Routing:**
- Critical → Phone call + SMS + Slack
- High → Slack + Email
- Medium → Email only

**On-Call Rotation:**
| Week | Primary | Secondary |
|------|---------|-----------|
| 1 | _______ | _______ |
| 2 | _______ | _______ |
| 3 | _______ | _______ |
| 4 | _______ | _______ |

---

## 5. DASHBOARDS

### 5.1 Real-Time Dashboard

**Layout:** Single screen, refresh every 30 seconds

```
┌─────────────────────────────────────────────────┐
│          UGC VIDEO SYSTEM - LIVE STATUS         │
│                                                  │
│ Uptime: 99.98%  │  Active Users: 1,234          │
│ Response Time: 250ms  │  Videos Uploaded Today: 45│
└─────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────────┐
│ Backend      │ Database     │ Cloudinary       │
│ Status: 🟢   │ Status: 🟢   │ Status: 🟢      │
│ CPU: 45%     │ Conn: 45/500 │ Storage: 12/25GB│
│ Mem: 62%     │ Slow: 0      │ Uploads: 3 now  │
└──────────────┴──────────────┴──────────────────┘

┌──────────────────────────────────────────────────┐
│ Recent Uploads (Last 10)                         │
│ 1. [2 min ago] Camera | 15MB | 5 products | ✅  │
│ 2. [5 min ago] Gallery | 22MB | 7 products | ✅ │
│ 3. [8 min ago] Camera | 8MB | 6 products | ✅   │
│ ...                                              │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Errors (Last Hour): 3                            │
│ 1. [15 min] 500 - POST /api/ugc (timeout)       │
│ 2. [32 min] 404 - GET /api/ugc/invalid          │
│ 3. [48 min] 401 - POST /api/ugc/:id/report      │
└──────────────────────────────────────────────────┘
```

**Tools to Build Dashboard:**
- Grafana (free, self-hosted)
- DataDog (paid)
- New Relic (paid)
- Custom React dashboard

---

### 5.2 Daily Report Email

**Sent:** 9 AM daily to team
**Recipients:** Engineering, Product, Support

```
📊 UGC VIDEO SYSTEM - DAILY REPORT
Date: November 8, 2025

=== HEALTH ===
✅ Uptime: 100% (24/24 hours)
✅ Avg Response Time: 285ms
✅ Error Rate: 0.8%

=== USAGE ===
📹 Videos Uploaded: 52 (+8% vs yesterday)
👀 Video Views: 3,420 (+12% vs yesterday)
🛒 Cart Adds from Videos: 78 (2.3% conversion)

=== TOP VIDEOS ===
1. "My Morning Routine Products" - 245 views, 18 cart adds
2. "Tech Setup Tour" - 198 views, 12 cart adds
3. "Fitness Gear Essentials" - 176 views, 9 cart adds

=== ISSUES ===
🟢 No critical issues
🟡 3 moderate upload failures (network timeouts)
📧 2 support tickets opened, 2 resolved

=== ACTION ITEMS ===
- Investigate network timeout issue
- Review moderation queue (3 pending)

Dashboard: [Link]
Detailed report: [Link]
```

---

### 5.3 Weekly Executive Summary

**Sent:** Monday 9 AM to executives
**Recipients:** CEO, CTO, Product Lead

```
📈 UGC VIDEO SYSTEM - WEEK 1 SUMMARY
Week of November 1-7, 2025

=== KEY WINS ===
✅ Successful launch - Zero downtime
✅ 450 videos uploaded (exceeded target of 400)
✅ 96.5% upload success rate
✅ 4.3/5 star user rating

=== BUSINESS IMPACT ===
💰 Revenue from UGC: $12,450 (2.5% of total revenue)
📦 Orders influenced: 145 orders
👥 Creator adoption: 9% of users (target: 10%)

=== GROWTH ===
📹 Videos: +450 (Week 1 baseline)
👤 Creators: +180 new creators
📊 Engagement: 84% of users viewed videos

=== CHALLENGES ===
⚠️ Upload speed complaints (40% of negative feedback)
⚠️ Creator retention needs improvement (60% Week 2)

=== NEXT WEEK FOCUS ===
1. Optimize upload speed (compress before upload)
2. Add creator incentives (rewards, leaderboard)
3. Improve moderation process (hire moderator?)

Full report: [Link]
```

---

## 6. OPTIMIZATION PLAYBOOK

### When Upload Success Rate < 95%

**Investigation Steps:**
1. Check Cloudinary status page
2. Review error logs for patterns
3. Test upload manually
4. Check network connectivity

**Common Fixes:**
- Increase upload timeout (currently 60s)
- Add retry logic (currently 0 retries)
- Compress video before upload
- Switch to chunked upload for large files

---

### When Error Rate > 2%

**Investigation Steps:**
1. Check Sentry for error details
2. Identify most common error
3. Check if errors clustered by time/user/device
4. Review recent code changes

**Common Fixes:**
- Fix null pointer exceptions
- Add error boundaries
- Improve input validation
- Add fallbacks for API failures

---

### When Response Time > 500ms

**Investigation Steps:**
1. Check database slow queries
2. Review N+1 query issues
3. Check if indexes are used
4. Profile API endpoint

**Common Fixes:**
- Add database indexes
- Implement caching (Redis)
- Paginate large result sets
- Optimize database queries

---

### When Cloudinary Storage > 80%

**Actions:**
1. Review storage usage by folder
2. Identify old/unused videos
3. Implement video cleanup policy
4. Upgrade Cloudinary plan

**Cleanup Policy Example:**
- Auto-delete flagged videos after 30 days
- Auto-delete videos with 0 views after 90 days
- Compress old videos (lower quality)

---

## 7. INCIDENT RESPONSE

### Severity Levels

**P0 - Critical (Response: Immediate)**
- System completely down
- Data loss/corruption
- Security breach
- Payment processing broken

**P1 - High (Response: 1 hour)**
- Feature completely broken
- Error rate > 10%
- Performance severely degraded

**P2 - Medium (Response: 4 hours)**
- Feature partially broken
- Error rate 5-10%
- Performance degraded

**P3 - Low (Response: Next business day)**
- Minor bug
- UX issue
- Feature request

### Incident Process

1. **Detect** - Alert fires or user reports
2. **Acknowledge** - On-call engineer acknowledges
3. **Assess** - Determine severity (P0-P3)
4. **Communicate** - Notify team & users if needed
5. **Mitigate** - Temporary fix or rollback
6. **Resolve** - Permanent fix
7. **Document** - Incident report
8. **Review** - Post-mortem meeting

---

## 8. TOOLS & SETUP

### Recommended Tools

**Error Tracking:**
- **Sentry** (Recommended) - Free tier available
- Bugsnag
- Rollbar

**Performance Monitoring:**
- **New Relic** (Comprehensive)
- DataDog
- AppDynamics

**Uptime Monitoring:**
- **UptimeRobot** (Free for 50 monitors)
- Pingdom
- StatusCake

**Analytics:**
- **Google Analytics** (Free)
- Mixpanel (Better for product analytics)
- Amplitude

**Log Management:**
- **Papertrail** (Free tier: 100MB/month)
- Loggly
- AWS CloudWatch

### Setup Checklist

- [ ] Sentry project created for frontend & backend
- [ ] Sentry DSN in environment variables
- [ ] UptimeRobot monitors set up (health endpoint)
- [ ] Google Analytics events configured
- [ ] MongoDB Atlas alerts configured
- [ ] Cloudinary usage alerts enabled
- [ ] PM2 Plus dashboard set up (optional)
- [ ] Slack webhook for alerts configured
- [ ] On-call rotation schedule created
- [ ] Team trained on monitoring dashboards

---

## APPENDIX: SAMPLE QUERIES

### Sentry Query Examples
```javascript
// Find upload errors
errors.where("transaction", "=", "POST /api/ugc")

// Top errors by count
errors.groupBy("error.type").orderBy("count", "desc")

// Errors by user
errors.where("user.id", "=", "user123")
```

### Google Analytics Events
```javascript
// Track video upload
gtag('event', 'video_upload_completed', {
  source: 'camera',
  file_size: 15000000,
  duration_ms: 12000,
  products_tagged: 6
});

// Track cart add from video
gtag('event', 'add_to_cart', {
  source: 'ugc_video',
  video_id: 'v123abc',
  product_id: 'p456def'
});
```

---

**Document Version:** 1.0.0
**Last Updated:** November 8, 2025
**Next Review:** After Week 1 of launch, then monthly
