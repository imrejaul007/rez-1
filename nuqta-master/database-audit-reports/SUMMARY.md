# DATABASE AUDIT SUMMARY

Generated: 2025-11-15T08:02:53.576Z
Database: test

## Collections

- **Total Collections:** 81
- **Collections with Data:** 50
- **Empty Collections:** 31

## Data Quality

- **Total Quality Issues:** 79

## Relationships

- **Total Relationships Checked:** 15
- **Relationships with Issues:** 1

## Required Migrations

- **Total Migrations Needed:** 12
- **HIGH Priority:** 1
- **MEDIUM Priority:** 5
- **LOW Priority:** 6

## Critical Issues

⚠️  products.category → categories._id: 7 broken references

## Recommendations

1. **Immediate Actions:**
   - Review and fix broken relationships
   - Execute HIGH priority migrations

2. **Short-term Actions:**
   - Execute MEDIUM priority migrations
   - Implement data validation on write operations

3. **Long-term Actions:**
   - Execute LOW priority migrations
   - Set up data quality monitoring
   - Implement schema validation

## Next Steps

1. Review all generated reports in detail
2. Prioritize migrations based on business impact
3. Create backup of database before migrations
4. Execute migrations in test environment first
5. Monitor data quality after migrations

## Generated Reports

- `DATABASE_ANALYSIS_REPORT.md` - Detailed schema analysis
- `RELATIONSHIP_ANALYSIS_REPORT.md` - Relationship integrity analysis
- `DATA_QUALITY_REPORT.md` - Data quality issues
- `MIGRATION_PLAN.md` - Required migrations
- `SUMMARY.md` - This summary report

