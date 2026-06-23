"use strict";
/**
 * Campaign entity types — unified surface across three services:
 *
 *   - rez-marketing-service/src/models/MarketingCampaign.ts
 *   - rez-merchant-service/src/models/AdCampaign.ts
 *   - rez-ads-service/src/models/AdCampaign.ts
 *
 * Each service extends `IBaseCampaign` with domain-specific fields. The
 * disc union `ICampaign` lets callers narrow by the `type` literal.
 *
 * v2 hardening: `any` and `Record<string, any>` replaced with typed
 * shapes (`IAudienceTargeting`, `ICampaignCondition`, `ICampaignAction`,
 * `ICampaignTrigger`). Anything still truly opaque uses the
 * `ICampaignMetadata` scalar-only catchall.
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=campaign.js.map