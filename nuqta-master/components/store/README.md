# Store Components

This directory contains components for displaying comprehensive store information including policies and contact details.

## Components

### 1. StorePolicies

Displays store policies in an expandable accordion format with sharing capabilities.

**Features:**
- Expandable/collapsible policy sections
- "Read More" for long content
- Share individual policies
- Last updated timestamps
- Icon-based visual hierarchy
- Purple theme (#7C3AED)

**Usage:**

```tsx
import StorePolicies, { MOCK_POLICIES, StorePolicy } from '@/components/store/StorePolicies';

// Basic usage with mock data
<StorePolicies
  storeId="store-123"
  policies={MOCK_POLICIES}
  storeType="product"
/>

// Custom policies
const customPolicies: StorePolicy[] = [
  {
    id: '1',
    title: 'Return Policy',
    content: 'Our return policy details...',
    icon: 'return-up-back',
    lastUpdated: 'Jan 15, 2025',
  },
  // ... more policies
];

<StorePolicies
  storeId="store-123"
  policies={customPolicies}
  storeType="service"
/>
```

**Props:**

```tsx
interface StorePoliciesProps {
  storeId: string;                    // Unique store identifier
  policies: StorePolicy[];            // Array of policy objects
  storeType?: 'product' | 'service' | 'restaurant' | 'hybrid'; // Store type
}

interface StorePolicy {
  id: string;                         // Unique policy ID
  title: string;                      // Policy title
  content: string;                    // Full policy content
  icon?: keyof typeof Ionicons.glyphMap; // Icon name
  lastUpdated?: string;               // Last update date
}
```

---

### 2. StoreContact

Displays comprehensive store contact information with interactive actions.

**Features:**
- Click-to-call phone numbers
- Click-to-email functionality
- WhatsApp integration
- Website links
- Social media buttons
- Address with copy & directions
- Working hours display
- Share contact info

**Usage:**

```tsx
import StoreContact, { MOCK_CONTACT_INFO, StoreContactInfo } from '@/components/store/StoreContact';

// Basic usage with mock data
<StoreContact
  contact={MOCK_CONTACT_INFO}
  storeName="Fashion Store"
/>

// Custom contact info
const customContact: StoreContactInfo = {
  phone: '+91 98765 43210',
  email: 'support@store.com',
  whatsapp: '+919876543210',
  website: 'www.store.com',
  socialMedia: {
    facebook: 'https://facebook.com/store',
    instagram: 'https://instagram.com/store',
    twitter: 'https://twitter.com/store',
  },
  address: {
    street: '123 Main Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    fullAddress: '123 Main Street, Mumbai, Maharashtra 400001',
    coordinates: {
      latitude: 19.0596,
      longitude: 72.8295,
    },
  },
  workingHours: {
    monday: '10:00 AM - 9:00 PM',
    tuesday: '10:00 AM - 9:00 PM',
    // ... other days
  },
};

<StoreContact
  contact={customContact}
  storeName="My Store"
/>
```

**Props:**

```tsx
interface StoreContactProps {
  contact: StoreContactInfo;          // Contact information object
  storeName: string;                  // Store name for display
}

interface StoreContactInfo {
  phone?: string;                     // Phone number
  email?: string;                     // Email address
  whatsapp?: string;                  // WhatsApp number
  website?: string;                   // Website URL
  socialMedia?: {                     // Social media links
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    linkedin?: string;
  };
  address?: {                         // Physical address
    street: string;
    city: string;
    state: string;
    pincode: string;
    fullAddress: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  workingHours?: {                    // Store timings
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
}
```

---

## Integration Examples

### 1. In AboutModal (Tabbed Layout)

```tsx
import React, { useState } from 'react';
import { Modal, View, TouchableOpacity, Text } from 'react-native';
import StorePolicies, { MOCK_POLICIES } from '@/components/store/StorePolicies';
import StoreContact, { MOCK_CONTACT_INFO } from '@/components/store/StoreContact';

const AboutModal = ({ visible, onClose, storeId, storeName }) => {
  const [activeTab, setActiveTab] = useState<'about' | 'policies' | 'contact'>('about');

  return (
    <Modal visible={visible} animationType="slide">
      <View style={{ flex: 1 }}>
        {/* Header with tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity onPress={() => setActiveTab('about')}>
            <Text>About</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('policies')}>
            <Text>Policies</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('contact')}>
            <Text>Contact</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'about' && (
          <View>{/* About content */}</View>
        )}
        {activeTab === 'policies' && (
          <StorePolicies
            storeId={storeId}
            policies={MOCK_POLICIES}
            storeType="product"
          />
        )}
        {activeTab === 'contact' && (
          <StoreContact
            contact={MOCK_CONTACT_INFO}
            storeName={storeName}
          />
        )}
      </View>
    </Modal>
  );
};
```

### 2. Dedicated Store Info Screen

```tsx
import React from 'react';
import { ScrollView, View } from 'react-native';
import StorePolicies, { MOCK_POLICIES } from '@/components/store/StorePolicies';
import StoreContact, { MOCK_CONTACT_INFO } from '@/components/store/StoreContact';

const StoreInfoScreen = ({ route }) => {
  const { storeId, storeName } = route.params;

  return (
    <ScrollView>
      {/* Store Header */}
      <View>{/* Store info, logo, etc. */}</View>

      {/* Contact Section */}
      <StoreContact
        contact={MOCK_CONTACT_INFO}
        storeName={storeName}
      />

      {/* Policies Section */}
      <StorePolicies
        storeId={storeId}
        policies={MOCK_POLICIES}
        storeType="hybrid"
      />
    </ScrollView>
  );
};
```

### 3. With API Data

```tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import StorePolicies, { StorePolicy } from '@/components/store/StorePolicies';
import StoreContact, { StoreContactInfo } from '@/components/store/StoreContact';

const StoreInfoContainer = ({ storeId }) => {
  const [policies, setPolicies] = useState<StorePolicy[]>([]);
  const [contact, setContact] = useState<StoreContactInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStoreInfo();
  }, [storeId]);

  const fetchStoreInfo = async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}/info`);
      const data = await response.json();

      setPolicies(data.policies);
      setContact(data.contact);
    } catch (error) {
      console.error('Error fetching store info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator />;
  }

  return (
    <View>
      {contact && (
        <StoreContact
          contact={contact}
          storeName="Store Name"
        />
      )}

      {policies.length > 0 && (
        <StorePolicies
          storeId={storeId}
          policies={policies}
          storeType="hybrid"
        />
      )}
    </View>
  );
};
```

---

## Features & Functionality

### StorePolicies
- ✅ Expandable accordion sections
- ✅ "Read More" functionality for long content
- ✅ Share individual policies
- ✅ Last updated timestamps
- ✅ Icon-based categorization
- ✅ Smooth animations
- ✅ Purple theme consistency
- ✅ Empty state handling

### StoreContact
- ✅ Click-to-call phone numbers
- ✅ Click-to-email functionality
- ✅ WhatsApp direct messaging
- ✅ Website link opening
- ✅ Social media integration (Facebook, Instagram, Twitter, YouTube, LinkedIn)
- ✅ Copy address to clipboard
- ✅ Get directions (opens maps)
- ✅ Working hours display
- ✅ Share contact information
- ✅ Platform-specific URL handling (iOS/Android)

---

## Styling

Both components follow a consistent design system:

- **Primary Color:** #7C3AED (Purple)
- **Background:** #fff (White)
- **Card Background:** #f9f9f9 (Light Gray)
- **Border Color:** #e0e0e0 (Gray)
- **Text Colors:**
  - Primary: #1a1a1a
  - Secondary: #444
  - Tertiary: #666
  - Disabled: #999

---

## Testing

Both components include comprehensive mock data for testing:

```tsx
import { MOCK_POLICIES } from '@/components/store/StorePolicies';
import { MOCK_CONTACT_INFO } from '@/components/store/StoreContact';

// Use in development/testing
<StorePolicies storeId="test" policies={MOCK_POLICIES} />
<StoreContact contact={MOCK_CONTACT_INFO} storeName="Test Store" />
```

---

## Accessibility

Both components include:
- Touchable feedback (activeOpacity)
- Proper color contrast
- Clear visual hierarchy
- Icon + text labels
- Screen reader support (via semantic structure)

---

## Performance

- Uses `LayoutAnimation` for smooth transitions
- Efficient state management with Sets
- Optimized re-renders
- Lazy content expansion

---

## Platform Support

- ✅ iOS
- ✅ Android
- ✅ Web (with some limitations for native features)

**Note:** Some features like phone calls, maps, and WhatsApp require native device capabilities and may not work on web platforms.
