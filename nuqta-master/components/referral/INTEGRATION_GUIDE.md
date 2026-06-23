# PrivacyNotice Component - Integration Guide

## Quick Start (2 minutes)

### Step 1: Import the Component

```tsx
import { PrivacyNotice } from '@/components/referral/PrivacyNotice';
// OR
import { PrivacyNotice } from '@/components/referral';
```

### Step 2: Add to Your Referral Page

```tsx
function ReferralPage() {
  return (
    <ScrollView>
      {/* Your referral form content */}

      <PrivacyNotice
        defaultExpanded={false}
        privacyPolicyUrl="/privacy-policy"
      />
    </ScrollView>
  );
}
```

### Step 3: Test

1. Open your referral page
2. Tap "Privacy & Data Protection"
3. Verify the content expands
4. Tap "Read Full Privacy Policy" to test the link

✅ Done! Your component is GDPR-compliant.

---

## Visual Reference

### Collapsed State (Default)

```
┌─────────────────────────────────────────┐
│ 🛡️  Privacy & Data Protection      ˅   │
└─────────────────────────────────────────┘
```

**Characteristics:**
- Compact, single-line display
- Shield icon for security indication
- Chevron down icon indicates expandability
- Purple accent color (#8B5CF6)
- Non-intrusive design

### Expanded State

```
┌─────────────────────────────────────────┐
│ 🛡️  Privacy & Data Protection      ˄   │
├─────────────────────────────────────────┤
│                                         │
│ Data Collection Notice                  │
│ In accordance with GDPR Article 13...   │
│                                         │
│ Data We Collect:                        │
│ • Referrer information                  │
│ • Referred user information             │
│ • Referral activity data                │
│ • Device and technical information      │
│                                         │
│ How We Use Your Data:                   │
│ • Processing referral rewards           │
│ • Fraud prevention                      │
│ • Program analytics                     │
│ • Legal compliance                      │
│                                         │
│ Legal Basis:                            │
│ Contract performance (GDPR Art. 6...)   │
│                                         │
│ Data Retention:                         │
│ Account duration + 3 years...           │
│                                         │
│ Your Rights (GDPR Articles 15-22):      │
│ • Access: Request a copy                │
│ • Rectification: Correct inaccuracies   │
│ • Deletion: Right to be forgotten       │
│ • Portability: Receive structured data  │
│ • Objection: Object to processing       │
│ • Lodge Complaint: Contact authority    │
│                                         │
│ Data Sharing:                           │
│ Payment processors, anti-fraud...       │
│                                         │
│ Exercise Your Rights:                   │
│ Contact privacy@rezapp.com...           │
│                                         │
│ ┌─────────────────────────────────────┐│
│ │ Read Full Privacy Policy         → ││
│ └─────────────────────────────────────┘│
│                                         │
│ Last updated: January 2025              │
└─────────────────────────────────────────┘
```

---

## Integration Scenarios

### Scenario 1: Standard Referral Page

**Location:** Bottom of referral form
**Configuration:** Collapsed by default
**Reason:** Non-intrusive, available when needed

```tsx
<View style={styles.referralContainer}>
  <Text style={styles.title}>Refer a Friend</Text>

  <TextInput
    placeholder="Friend's email"
    value={email}
    onChangeEvent={setEmail}
  />

  <Button title="Send Invite" onPress={handleInvite} />

  {/* Place at bottom */}
  <PrivacyNotice
    defaultExpanded={false}
    privacyPolicyUrl="/privacy"
  />
</View>
```

### Scenario 2: First-Time Referral (Compliance Emphasis)

**Location:** Above referral form
**Configuration:** Expanded by default
**Reason:** Ensure users see privacy info on first use

```tsx
function FirstTimeReferral() {
  const [hasSeenPrivacy, setHasSeenPrivacy] = useState(false);

  return (
    <ScrollView>
      <Text style={styles.title}>Before You Refer</Text>

      <PrivacyNotice
        defaultExpanded={!hasSeenPrivacy}
        privacyPolicyUrl="/privacy"
      />

      {/* Referral form */}
    </ScrollView>
  );
}
```

### Scenario 3: Modal/Popup Context

**Location:** Within modal
**Configuration:** Expanded, scrollable
**Reason:** Focused privacy disclosure

```tsx
<Modal visible={showPrivacyModal}>
  <View style={styles.modalContent}>
    <Text style={styles.modalTitle}>Privacy Notice</Text>

    <ScrollView style={styles.scrollContent}>
      <PrivacyNotice
        defaultExpanded={true}
        privacyPolicyUrl="/privacy"
        containerStyle={styles.modalPrivacyNotice}
      />
    </ScrollView>

    <Button title="I Understand" onPress={closeModal} />
  </View>
</Modal>
```

### Scenario 4: Account Settings

**Location:** Privacy Settings section
**Configuration:** Collapsed by default
**Reason:** Reference material for existing users

```tsx
function PrivacySettings() {
  return (
    <ScrollView>
      <Text style={styles.sectionTitle}>Referral Privacy</Text>

      <PrivacyNotice
        defaultExpanded={false}
        privacyPolicyUrl="/privacy/referral"
        containerStyle={{ marginVertical: 16 }}
      />

      {/* Other settings */}
    </ScrollView>
  );
}
```

---

## Customization Examples

### Custom Colors

```tsx
import { Colors } from '@/constants/Colors';

<PrivacyNotice
  containerStyle={{
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.secondary,
    borderWidth: 2,
  }}
/>
```

### Custom Spacing

```tsx
<PrivacyNotice
  containerStyle={{
    marginTop: 24,
    marginBottom: 24,
    marginHorizontal: 16,
  }}
/>
```

### Shadow/Elevation

```tsx
<PrivacyNotice
  containerStyle={{
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5, // Android
  }}
/>
```

---

## Common Integration Patterns

### Pattern 1: With Form Validation

```tsx
function ReferralForm() {
  const [email, setEmail] = useState('');
  const [privacyExpanded, setPrivacyExpanded] = useState(false);

  const canSubmit = email && privacyExpanded;

  return (
    <View>
      <TextInput value={email} onChangeEvent={setEmail} />

      <PrivacyNotice defaultExpanded={false} />

      <Button
        title="Send Referral"
        disabled={!canSubmit}
        onPress={handleSubmit}
      />
    </View>
  );
}
```

### Pattern 2: With Analytics Tracking

```tsx
function ReferralPage() {
  const handlePrivacyExpand = () => {
    analytics.track('privacy_notice_expanded', {
      context: 'referral',
      timestamp: Date.now(),
    });
  };

  return (
    <PrivacyNotice
      defaultExpanded={false}
      privacyPolicyUrl="/privacy"
    />
  );
}
```

### Pattern 3: With Conditional Display

```tsx
function ReferralPage() {
  const { user } = useAuth();
  const shouldShowPrivacy = !user.hasSeenReferralPrivacy;

  return (
    <View>
      {/* Referral content */}

      {shouldShowPrivacy && (
        <PrivacyNotice
          defaultExpanded={true}
          privacyPolicyUrl="/privacy"
        />
      )}
    </View>
  );
}
```

### Pattern 4: With Persistent State

```tsx
function ReferralPage() {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Save expansion state
    AsyncStorage.setItem('privacyExpanded', JSON.stringify(isExpanded));
  }, [isExpanded]);

  return (
    <PrivacyNotice
      defaultExpanded={isExpanded}
      privacyPolicyUrl="/privacy"
    />
  );
}
```

---

## Platform-Specific Considerations

### iOS

```tsx
<PrivacyNotice
  containerStyle={{
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  }}
/>
```

### Android

```tsx
<PrivacyNotice
  containerStyle={{
    elevation: 4,
  }}
/>
```

### Web

```tsx
<PrivacyNotice
  containerStyle={{
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  }}
  privacyPolicyUrl="https://yoursite.com/privacy"
/>
```

---

## Troubleshooting

### Issue: Component not rendering

**Solution:**
```tsx
// Ensure imports are correct
import { PrivacyNotice } from '@/components/referral/PrivacyNotice';

// Not this:
import PrivacyNotice from '@/components/referral/PrivacyNotice';
```

### Issue: Theme colors not applying

**Solution:**
```tsx
// Ensure useColorScheme hook is available
import { useColorScheme } from '@/hooks/useColorScheme';
```

### Issue: Privacy policy link not working

**Solution:**
```tsx
// For external URLs, use full URL with https://
<PrivacyNotice privacyPolicyUrl="https://yoursite.com/privacy" />

// For internal navigation, integrate with your router
// Example with Expo Router:
import { useRouter } from 'expo-router';

function CustomPrivacyNotice() {
  const router = useRouter();

  const handlePrivacyPress = () => {
    router.push('/privacy-policy');
  };

  // You may need to modify the component to accept a custom handler
}
```

### Issue: Text overlapping on small screens

**Solution:**
```tsx
<PrivacyNotice
  containerStyle={{
    paddingHorizontal: 12, // Reduce padding
    marginHorizontal: 8,   // Reduce margin
  }}
/>
```

---

## Testing Checklist

Before deploying:

- [ ] Component renders on all target platforms (iOS, Android, Web)
- [ ] Expands/collapses correctly
- [ ] Privacy policy link works
- [ ] Text is readable in light mode
- [ ] Text is readable in dark mode
- [ ] Looks good on small screens (≤375px width)
- [ ] Looks good on large screens (≥768px width)
- [ ] Touch targets are adequate (≥44x44 points)
- [ ] Scrolling works within expanded content
- [ ] No performance issues when expanding
- [ ] Accessible with screen readers
- [ ] All text content is correct and up-to-date

---

## Maintenance

### Updating Content

When privacy practices change:

1. Update text in `PrivacyNotice.tsx`
2. Update timestamp to current date
3. Update version in commit message
4. Notify legal team
5. Consider notifying active users

### Adding New Data Categories

```tsx
// In PrivacyNotice.tsx, add to "Data We Collect" section:
<View style={styles.bulletItem}>
  <View style={[styles.bullet, { backgroundColor: colors.secondary }]} />
  <ThemedText style={[styles.bulletText, { color: colors.textSecondary }]}>
    NEW CATEGORY: Description of new data
  </ThemedText>
</View>
```

### Translating for New Markets

1. Extract text strings to i18n files
2. Translate with certified legal translator
3. Update component to use translated strings
4. Test in target language
5. Legal review in target jurisdiction

---

## Legal Compliance Notes

### GDPR (EU)
✅ Article 13 compliant
✅ All required information included
✅ User rights clearly stated

### CCPA (California)
⚠️ Add "Do Not Sell My Info" link if applicable
⚠️ Add California-specific disclosures

### PIPEDA (Canada)
⚠️ Add Canadian privacy commissioner contact
⚠️ Update for Canadian legal requirements

### LGPD (Brazil)
⚠️ Translate to Portuguese
⚠️ Add ANPD (Brazilian DPA) reference

---

## Support

For issues or questions:

- **Technical:** Check examples in `PrivacyNotice.example.tsx`
- **Legal:** Consult with Data Protection Officer
- **Design:** Review theme in `constants/Colors.ts`
- **Testing:** Run `PrivacyNotice.test.tsx`

---

**Document Version:** 1.0.0
**Last Updated:** January 2025
**Component Status:** ✅ Production Ready
