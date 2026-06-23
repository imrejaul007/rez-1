# Security Incident Response Plan

**Version:** 1.0
**Last Updated:** November 17, 2025
**Owner:** Security Team
**Review Frequency:** Quarterly

---

## 1. Introduction

This document outlines the procedures for identifying, responding to, and recovering from security incidents in the merchant backend application.

### 1.1 Scope

This plan covers:
- Data breaches
- Unauthorized access
- Denial of Service (DoS) attacks
- Malware infections
- API abuse
- Authentication bypass
- Data integrity violations

### 1.2 Objectives

- Minimize impact of security incidents
- Restore normal operations quickly
- Preserve evidence for investigation
- Prevent future incidents
- Maintain stakeholder trust

---

## 2. Incident Classification

### 2.1 Severity Levels

#### CRITICAL (P0)
- **Response Time:** Immediate (0-15 minutes)
- **Examples:**
  - Active data breach
  - Database compromise
  - Authentication system failure
  - Production system down
  - Customer payment data exposed

#### HIGH (P1)
- **Response Time:** 1 hour
- **Examples:**
  - Unauthorized admin access
  - DDoS attack in progress
  - Multiple account compromises
  - Malware detected
  - Sensitive data exposure

#### MEDIUM (P2)
- **Response Time:** 4 hours
- **Examples:**
  - Single account compromise
  - Repeated failed login attempts
  - API rate limit abuse
  - Suspicious file uploads
  - Minor data leak

#### LOW (P3)
- **Response Time:** 24 hours
- **Examples:**
  - Spam or phishing attempts
  - Minor configuration issues
  - Non-sensitive log exposure
  - Informational security alerts

---

## 3. Incident Response Team

### 3.1 Roles and Responsibilities

#### Incident Commander (IC)
- **Primary:** Technical Lead / CTO
- **Backup:** Senior Backend Developer
- **Responsibilities:**
  - Overall incident coordination
  - Decision-making authority
  - Communication with stakeholders
  - Post-incident review

#### Technical Lead
- **Primary:** Backend Team Lead
- **Backup:** DevOps Engineer
- **Responsibilities:**
  - Technical investigation
  - System remediation
  - Evidence preservation
  - Technical documentation

#### Communications Lead
- **Primary:** Product Manager
- **Backup:** Customer Success Manager
- **Responsibilities:**
  - Internal communications
  - Customer notifications
  - Media relations (if needed)
  - Status updates

#### Legal/Compliance Officer
- **Primary:** Legal Counsel
- **Backup:** Compliance Manager
- **Responsibilities:**
  - Legal obligations
  - Regulatory notifications
  - Contract implications
  - Privacy compliance

### 3.2 Contact Information

```
KEEP THIS CONFIDENTIAL - INTERNAL USE ONLY

Incident Commander:
- Name: [REDACTED]
- Phone: [REDACTED]
- Email: [REDACTED]
- Backup: [REDACTED]

Technical Lead:
- Name: [REDACTED]
- Phone: [REDACTED]
- Email: [REDACTED]

24/7 On-Call Rotation:
- Check PagerDuty schedule

External Contacts:
- Security Vendor: [REDACTED]
- Legal Counsel: [REDACTED]
- Law Enforcement: Cyber Crime Cell
```

---

## 4. Detection & Identification

### 4.1 Detection Methods

#### Automated Monitoring
- **Sentry:** Error and exception tracking
- **Log Aggregation:** Centralized log analysis
- **Security Alerts:** Automated security event detection
- **Rate Limit Violations:** Tracked in IP blocker
- **Failed Authentication:** Audit log monitoring

#### Manual Detection
- User reports
- Security audits
- Code reviews
- Penetration testing
- Employee observation

### 4.2 Indicators of Compromise (IoC)

#### Authentication Anomalies
- Multiple failed login attempts from single IP
- Successful logins from unusual locations
- Account lockouts spike
- Unusual session patterns
- Token manipulation attempts

#### System Anomalies
- Unexpected CPU/memory spikes
- Unusual network traffic
- Database query anomalies
- File system changes
- Unauthorized API calls

#### Data Anomalies
- Unexpected data exports
- Mass data deletions
- Unusual data access patterns
- Encryption key access
- Database backup attempts

---

## 5. Response Procedures

### 5.1 Immediate Actions (0-15 minutes)

#### Step 1: Confirm Incident
- [ ] Verify alert is not false positive
- [ ] Determine incident severity
- [ ] Document initial findings
- [ ] Take screenshots/logs

#### Step 2: Contain the Incident
- [ ] Isolate affected systems (if necessary)
- [ ] Block malicious IPs
- [ ] Revoke compromised credentials
- [ ] Enable additional logging
- [ ] Preserve evidence

#### Step 3: Activate Response Team
- [ ] Notify Incident Commander
- [ ] Assemble response team
- [ ] Establish communication channel
- [ ] Create incident ticket
- [ ] Start incident log

### 5.2 Investigation Phase (15 minutes - 4 hours)

#### Gather Information
- [ ] Collect system logs
- [ ] Review audit logs
- [ ] Analyze network traffic
- [ ] Interview users (if applicable)
- [ ] Document timeline

#### Analyze Impact
- [ ] Identify affected systems
- [ ] Determine data accessed
- [ ] Assess data integrity
- [ ] Identify attack vector
- [ ] Estimate user impact

#### Preserve Evidence
- [ ] Create system snapshots
- [ ] Export relevant logs
- [ ] Document all actions
- [ ] Secure evidence chain
- [ ] Notify legal if needed

### 5.3 Containment Strategies

#### Network Level
```bash
# Block malicious IP
npm run security:block-ip <IP_ADDRESS>

# Enable strict rate limiting
export RATE_LIMIT_MAX=10
pm2 restart all

# Enable IP whitelist mode (emergency)
export CORS_ORIGIN="https://trusted-frontend.com"
pm2 restart all
```

#### Application Level
```bash
# Disable compromised user accounts
mongo rez-app --eval 'db.users.updateOne({_id: ObjectId("...")}, {$set: {isActive: false}})'

# Revoke all refresh tokens
mongo rez-app --eval 'db.users.updateMany({}, {$set: {"auth.refreshToken": null}})'

# Force password reset for affected users
npm run security:force-password-reset --users=<user-ids>
```

#### Database Level
```bash
# Create database backup immediately
mongodump --uri="mongodb://..." --out=/backups/incident-$(date +%Y%m%d-%H%M%S)

# Enable query profiling
mongo rez-app --eval 'db.setProfilingLevel(2)'

# Review recent queries
mongo rez-app --eval 'db.system.profile.find().limit(100).pretty()'
```

### 5.4 Eradication

#### Remove Threat
- [ ] Delete malicious files
- [ ] Remove backdoors
- [ ] Patch vulnerabilities
- [ ] Update compromised secrets
- [ ] Clean affected systems

#### Verify Cleanup
- [ ] Scan for residual threats
- [ ] Verify patches applied
- [ ] Test system integrity
- [ ] Confirm threat removed
- [ ] Document changes

### 5.5 Recovery

#### Restore Services
- [ ] Restore from clean backups (if needed)
- [ ] Restart affected services
- [ ] Verify functionality
- [ ] Monitor for issues
- [ ] Gradual traffic restoration

#### Strengthen Defenses
- [ ] Apply additional security measures
- [ ] Update firewall rules
- [ ] Enhance monitoring
- [ ] Add detection rules
- [ ] Review access controls

---

## 6. Communication Protocol

### 6.1 Internal Communication

#### During Incident
- **Channel:** Dedicated Slack channel (#incident-response)
- **Frequency:** Every 30 minutes (critical), hourly (high)
- **Attendees:** Response team, stakeholders
- **Format:** Status update template

#### Status Update Template
```
INCIDENT STATUS UPDATE

Time: [Timestamp]
Severity: [P0/P1/P2/P3]
Status: [Investigating/Contained/Resolved]

Current Situation:
- [Brief description]
- [Impact assessment]

Actions Taken:
- [List of actions]

Next Steps:
- [Planned actions]

ETA for Resolution: [Time estimate]

Posted by: [Name]
```

### 6.2 External Communication

#### Customer Notification
**When to Notify:**
- Data breach involving customer data
- Extended service outage (>4 hours)
- Payment system compromise
- Legal/regulatory requirement

**Timeline:**
- Critical incidents: Within 72 hours
- High incidents: Within 7 days
- As required by GDPR/local laws

**Notification Template:**
```
Subject: Important Security Notice - [Incident Type]

Dear [Customer Name],

We are writing to inform you of a security incident that may affect your account.

What Happened:
[Brief description of incident]

What Information Was Involved:
[List of data types]

What We're Doing:
[Actions taken]

What You Should Do:
[Recommended user actions]

For More Information:
[Contact details]

We sincerely apologize for any inconvenience.

[Company Name] Security Team
```

#### Regulatory Notification
- **GDPR:** Within 72 hours of discovery
- **PCI DSS:** Immediate notification
- **Local Laws:** As required

### 6.3 Media Relations
- All media inquiries go through Communications Lead
- No individual statements without approval
- Prepared statement template available
- Legal review required

---

## 7. Incident-Specific Procedures

### 7.1 Data Breach Response

#### Immediate Actions
1. **Identify scope**
   - What data was accessed?
   - How many records affected?
   - Sensitivity of data?

2. **Contain breach**
   - Block unauthorized access
   - Revoke compromised credentials
   - Isolate affected systems

3. **Notify stakeholders**
   - Legal team
   - Affected users (as required)
   - Regulators (as required)

4. **Evidence preservation**
   - Capture system state
   - Export relevant logs
   - Document timeline

#### Investigation Checklist
- [ ] Determine attack vector
- [ ] Identify vulnerabilities exploited
- [ ] Review access logs
- [ ] Analyze data exfiltration
- [ ] Assess encryption status
- [ ] Document findings

#### Recovery Actions
- [ ] Patch vulnerabilities
- [ ] Reset affected credentials
- [ ] Enhance monitoring
- [ ] Offer credit monitoring (if applicable)
- [ ] Implement additional controls

### 7.2 DDoS Attack Response

#### Detection
- Sudden traffic spike
- Server resource exhaustion
- Slow response times
- Failed health checks

#### Mitigation
```bash
# Enable aggressive rate limiting
export RATE_LIMIT_MAX=5
export RATE_LIMIT_WINDOW=60000
pm2 restart all

# Block attacking IPs (automate if possible)
npm run security:block-ips-from-file attack-ips.txt

# Enable Cloudflare DDoS protection (if configured)
# Contact Cloudflare support

# Scale infrastructure (if possible)
kubectl scale deployment backend --replicas=10
```

#### Communication
- Notify hosting provider
- Consider DDoS mitigation service
- Update status page
- Internal stakeholder updates

### 7.3 Account Compromise Response

#### Single Account
```bash
# Disable account
mongo rez-app --eval 'db.users.updateOne({_id: ObjectId("...")}, {$set: {isActive: false}})'

# Revoke all sessions
mongo rez-app --eval 'db.users.updateOne({_id: ObjectId("...")}, {$set: {"auth.refreshToken": null}})'

# Send password reset email
npm run auth:send-password-reset --userId=<user-id>

# Review account activity
mongo rez-app --eval 'db.auditLogs.find({userId: ObjectId("...")}).sort({createdAt: -1}).limit(100)'
```

#### Multiple Accounts
- Check for common patterns (IP, location, timing)
- Implement automated response
- Notify all affected users
- Consider system-wide password reset

### 7.4 Malware Infection Response

#### Immediate Containment
1. Isolate infected system
2. Disconnect from network
3. Preserve evidence
4. Scan all systems

#### Remediation
- Run antivirus/anti-malware scan
- Remove malicious files
- Restore from clean backup
- Patch vulnerabilities
- Update security signatures

---

## 8. Post-Incident Activities

### 8.1 Post-Incident Review (PIR)

**Timing:** Within 48 hours of incident resolution

**Attendees:**
- Incident Commander
- Response team members
- Stakeholders
- Leadership (for critical incidents)

**Agenda:**
1. Incident timeline review
2. Response effectiveness
3. What went well
4. What could be improved
5. Action items
6. Documentation review

### 8.2 PIR Template

```markdown
# Post-Incident Review: [Incident Name]

**Date:** [Date]
**Duration:** [Start time - End time]
**Severity:** [P0/P1/P2/P3]
**Incident Commander:** [Name]

## Executive Summary
[Brief description of incident and resolution]

## Timeline
| Time | Event |
|------|-------|
| [Time] | [Event description] |

## Impact
- Users affected: [Number]
- Services affected: [List]
- Duration: [Time]
- Data affected: [Description]
- Financial impact: [Estimate]

## Root Cause
[Detailed explanation]

## Response Evaluation

### What Went Well
- [Item 1]
- [Item 2]

### What Could Be Improved
- [Item 1]
- [Item 2]

## Action Items
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| [Action] | [Name] | [Date] | [Status] |

## Lessons Learned
[Key takeaways]

## Recommendations
[Future improvements]
```

### 8.3 Follow-up Actions

#### Immediate (0-7 days)
- [ ] Complete action items from PIR
- [ ] Update incident response plan
- [ ] Implement additional controls
- [ ] Update monitoring/alerting
- [ ] Document lessons learned

#### Short-term (7-30 days)
- [ ] Conduct additional training
- [ ] Review and update procedures
- [ ] Implement process improvements
- [ ] Schedule tabletop exercise
- [ ] Update documentation

#### Long-term (30-90 days)
- [ ] Architectural improvements
- [ ] Tool upgrades
- [ ] Policy updates
- [ ] Compliance review
- [ ] Independent security audit

---

## 9. Tools and Resources

### 9.1 Monitoring Tools
- **Sentry:** https://sentry.io (error tracking)
- **MongoDB Atlas:** Database monitoring
- **PM2:** Process monitoring
- **Custom:** Audit log viewer

### 9.2 Analysis Tools
```bash
# Log analysis
npm run logs:analyze --from="2025-11-17T00:00:00" --to="2025-11-17T23:59:59"

# IP reputation check
npm run security:check-ip <IP_ADDRESS>

# Audit log query
npm run audit:query --userId=<user-id> --action=<action>

# Security statistics
npm run security:stats
```

### 9.3 Communication Tools
- Slack: #incident-response
- Email: security@company.com
- Phone: On-call rotation
- Status Page: status.company.com

### 9.4 External Resources
- **NIST Cybersecurity Framework:** https://www.nist.gov/cyberframework
- **SANS Incident Handler's Handbook:** https://www.sans.org
- **OWASP Incident Response Guide:** https://owasp.org

---

## 10. Testing and Training

### 10.1 Tabletop Exercises

**Frequency:** Quarterly

**Scenarios:**
1. Database breach scenario
2. DDoS attack scenario
3. Insider threat scenario
4. Ransomware scenario
5. API key compromise scenario

**Format:**
- 2-hour session
- Facilitator-led
- Response team participation
- Documentation of decisions
- Post-exercise review

### 10.2 Training

**New Team Members:**
- Incident response plan walkthrough
- Tools and access setup
- Contact list review
- Role assignment

**Annual Training:**
- Plan review and updates
- New threat landscape
- Lessons from incidents
- Tool updates

---

## 11. Compliance and Legal

### 11.1 Regulatory Requirements

#### GDPR (General Data Protection Regulation)
- Notification within 72 hours
- Data breach register
- DPO notification
- Affected individual notification

#### PCI DSS (Payment Card Industry)
- Immediate notification to acquiring bank
- Forensic investigation
- Compliance assessment
- Remediation timeline

### 11.2 Documentation Requirements
- Incident log (all activities)
- Evidence chain of custody
- Notification records
- Remediation documentation
- PIR reports

---

## 12. Plan Maintenance

### 12.1 Review Schedule
- **Quarterly:** Plan review and updates
- **Post-incident:** Immediate updates as needed
- **Annual:** Comprehensive review
- **Ad-hoc:** After major changes

### 12.2 Update Process
1. Propose changes
2. Review with security team
3. Approve changes
4. Update documentation
5. Communicate updates
6. Train on changes

### 12.3 Version Control
- All changes tracked in Git
- Version number updated
- Change log maintained
- Team notified of updates

---

## Appendix A: Quick Reference Card

**Print and post near workstations**

### Security Incident? Follow These Steps:

1. **CONFIRM** - Is this a real incident?
2. **CONTAIN** - Stop the bleeding
3. **COMMUNICATE** - Alert the team
4. **COLLECT** - Gather evidence
5. **CLEAN** - Remove the threat
6. **CLOSE** - Document and learn

### Emergency Contacts:
- Incident Commander: [PHONE]
- Technical Lead: [PHONE]
- On-Call: [PAGERDUTY]

### Quick Actions:
- Block IP: `npm run security:block-ip <IP>`
- Disable user: `npm run security:disable-user <ID>`
- View logs: `npm run logs:tail`

**Never:**
- Panic
- Act without logging
- Communicate publicly without approval
- Delete evidence

---

**Document Version:** 1.0
**Last Review:** November 17, 2025
**Next Review:** February 17, 2026
**Owner:** Security Team
