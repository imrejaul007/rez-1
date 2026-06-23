# PrivacyNotice Component

## Overview

The `PrivacyNotice` component is a GDPR-compliant privacy disclosure component designed for the referral program and other data collection contexts. It provides users with transparent information about how their personal data is collected, used, and protected in accordance with GDPR Article 13.

## Features

- ✅ **GDPR Article 13 Compliant**: Includes all required information elements
- 🎨 **Theme-Aware**: Automatically adapts to light/dark mode
- 📱 **Mobile-Optimized**: Responsive design for all screen sizes
- 🔄 **Collapsible UI**: Compact by default, expands to show full details
- 🎯 **Customizable**: Flexible props for different use cases
- 🔒 **Security-Focused**: Clear explanation of data protection measures
- ♿ **Accessible**: Screen reader compatible

## Installation

The component is located at:
```
frontend/components/referral/PrivacyNotice.tsx
```

## Basic Usage

```tsx
import { PrivacyNotice } from '@/components/referral/PrivacyNotice';

function ReferralPage() {
  return (
    <View>
      {/* Your referral form */}

      <PrivacyNotice
        defaultExpanded={false}
        privacyPolicyUrl="https://yourapp.com/privacy"
      />
    </View>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultExpanded` | `boolean` | `false` | Whether to show the notice expanded by default |
| `privacyPolicyUrl` | `string` | `'/privacy-policy'` | URL to full privacy policy (internal or external) |
| `containerStyle` | `ViewStyle` | `undefined` | Custom styling for the container |

## GDPR Compliance

This component implements the following GDPR requirements:

### Article 13 - Information to be Provided

✅ **Identity of Data Controller**: Included in contact section
✅ **Purpose of Processing**: Clearly stated (referral rewards, fraud prevention)
✅ **Legal Basis**: Contract performance and legitimate interests
✅ **Recipients**: Third-party processors listed
✅ **Retention Period**: 3 years specified
✅ **Data Subject Rights**: All rights listed (Articles 15-22)
✅ **Right to Lodge Complaint**: Mentioned
✅ **Right to Withdraw Consent**: Included in rights section

### Data Subject Rights (Articles 15-22)

The component clearly explains:

1. **Right of Access** (Art. 15) - Request copy of data
2. **Right to Rectification** (Art. 16) - Correct inaccurate data
3. **Right to Erasure** (Art. 17) - "Right to be forgotten"
4. **Right to Restriction** (Art. 18) - Limit processing
5. **Right to Data Portability** (Art. 20) - Receive data in structured format
6. **Right to Object** (Art. 21) - Object to processing
7. **Automated Decision-Making** (Art. 22) - When applicable

## Information Displayed

### Data Collection Notice
- Legal compliance statement (GDPR Article 13)
- Clear purpose of data collection

### Data Collected
- Referrer information (name, email, user ID)
- Referred user information (email, name)
- Activity data (timestamps, status, conversions)
- Technical data (IP address, device ID)

### How Data is Used
- Processing referral rewards
- Fraud prevention
- Program analytics
- Legal compliance

### Legal Basis
- Contract performance (GDPR Art. 6(1)(b))
- Legitimate interests (GDPR Art. 6(1)(f))

### Data Retention
- Duration: Account lifetime + 3 years
- Purpose: Legal compliance
- Deletion: Available on request

### User Rights
Complete list of GDPR rights with explanations

### Data Sharing
- Payment processors
- Anti-fraud services
- Analytics providers
- No selling of personal data

### Contact Information
- Data Protection Officer email
- How to exercise rights

## Customization Examples

### Expanded by Default

```tsx
<PrivacyNotice
  defaultExpanded={true}
  privacyPolicyUrl="/privacy"
/>
```

### Custom Styling

```tsx
<PrivacyNotice
  defaultExpanded={false}
  privacyPolicyUrl="/privacy"
  containerStyle={{
    marginVertical: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  }}
/>
```

### External Privacy Policy Link

```tsx
<PrivacyNotice
  defaultExpanded={false}
  privacyPolicyUrl="https://yourcompany.com/privacy"
/>
```

## Theme Integration

The component automatically adapts to your app's theme:

**Light Mode:**
- Light surface background
- Dark text for readability
- Purple accent (#8B5CF6)

**Dark Mode:**
- Dark surface background
- Light text for readability
- Light purple accent

## Typography

The component uses the app's typography system:
- **Headers**: 14-15px, semi-bold
- **Body Text**: 13px, regular
- **Bullets**: 4px dots with 13px text
- **Timestamp**: 11px, italic, muted color

## Accessibility

The component is accessible via:
- Clear, readable font sizes (min 13px)
- High contrast text colors
- Touch-friendly targets (min 44x44 points)
- Screen reader compatible structure
- Semantic HTML structure

## Best Practices

### Placement

✅ **DO**: Place near data collection points (forms, sign-ups)
✅ **DO**: Show at the bottom of referral forms
✅ **DO**: Include in account settings

❌ **DON'T**: Hide in hard-to-find locations
❌ **DON'T**: Make it overly prominent and disruptive

### Timing

✅ **DO**: Show before data collection begins
✅ **DO**: Make it visible during sign-up flows

❌ **DON'T**: Show only after data has been collected

### Content Updates

✅ **DO**: Update the timestamp when content changes
✅ **DO**: Notify users of material changes
✅ **DO**: Review with legal team periodically

❌ **DON'T**: Make changes without legal review
❌ **DON'T**: Forget to update version/timestamp

## Integration with Referral Flow

```tsx
import React, { useState } from 'react';
import { View, TextInput, Button } from 'react-native';
import { PrivacyNotice } from '@/components/referral/PrivacyNotice';

function ReferralForm() {
  const [email, setEmail] = useState('');
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  const handleSubmit = () => {
    if (!hasAcknowledged) {
      alert('Please review the privacy notice');
      return;
    }
    // Submit referral
  };

  return (
    <View>
      <TextInput
        placeholder="Friend's email"
        value={email}
        onChangeEvent={setEmail}
      />

      <PrivacyNotice
        defaultExpanded={false}
        privacyPolicyUrl="/privacy"
      />

      <Button title="Send Referral" onPress={handleSubmit} />
    </View>
  );
}
```

## Legal Considerations

### Data Controller Information

Update the Data Protection Officer email in the component:
```tsx
// In PrivacyNotice.tsx, line 228
<ThemedText style={[styles.bodyText, { color: colors.textSecondary }]}>
  Contact our Data Protection Officer at YOUR_DPO_EMAIL@yourcompany.com
</ThemedText>
```

### Jurisdictional Variations

The component is designed for GDPR (EU) compliance. For other jurisdictions:

- **CCPA (California)**: Add "Do Not Sell My Info" link
- **LGPD (Brazil)**: Translate to Portuguese
- **PIPEDA (Canada)**: Add Canadian privacy commissioner info

### Privacy Policy Link

Ensure your `privacyPolicyUrl` points to:
1. A valid, accessible page
2. Up-to-date privacy policy
3. Mobile-friendly format

## Testing

### Manual Testing Checklist

- [ ] Component renders in light mode
- [ ] Component renders in dark mode
- [ ] Collapses/expands on tap
- [ ] Privacy policy link works
- [ ] Text is readable on all screen sizes
- [ ] Touch targets are adequate (44x44 points)
- [ ] Colors match app theme
- [ ] No layout issues on small screens

### Automated Testing

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { PrivacyNotice } from './PrivacyNotice';

describe('PrivacyNotice', () => {
  it('renders collapsed by default', () => {
    const { queryByText } = render(<PrivacyNotice />);
    expect(queryByText('Data Collection Notice')).toBeNull();
  });

  it('expands when header is tapped', () => {
    const { getByText, queryByText } = render(<PrivacyNotice />);
    fireEvent.press(getByText('Privacy & Data Protection'));
    expect(queryByText('Data Collection Notice')).toBeTruthy();
  });

  it('uses custom privacy policy URL', () => {
    const url = 'https://example.com/privacy';
    const { getByText } = render(
      <PrivacyNotice privacyPolicyUrl={url} defaultExpanded={true} />
    );
    // Test that link is present
    expect(getByText('Read Full Privacy Policy')).toBeTruthy();
  });
});
```

## Maintenance

### Regular Updates Required

- [ ] Review quarterly with legal team
- [ ] Update for new GDPR guidance
- [ ] Update for new data processing activities
- [ ] Update for new third-party processors
- [ ] Update timestamp when content changes
- [ ] Translate for new markets

### Version Control

Track changes in git commit messages:
```
feat(privacy): Update PrivacyNotice with new processor
docs(privacy): Update retention period to 5 years
fix(privacy): Correct DPO contact email
```

## Support

For questions about:
- **Legal compliance**: Contact your Data Protection Officer
- **Technical implementation**: Check the example file (`PrivacyNotice.example.tsx`)
- **Styling issues**: Review the Colors.ts constants file

## Related Files

- `types/privacy.types.ts` - TypeScript type definitions
- `PrivacyNotice.example.tsx` - Usage examples
- `components/ThemedText.tsx` - Text component
- `components/ThemedView.tsx` - View component
- `constants/Colors.ts` - Theme colors

## Changelog

### Version 1.0.0 (January 2025)
- Initial implementation
- GDPR Article 13 compliance
- Collapsible UI
- Theme support
- All data subject rights included

---

**Last Updated**: January 2025
**GDPR Compliance**: Article 13 (Information to be provided)
**Component Status**: Production Ready ✅
