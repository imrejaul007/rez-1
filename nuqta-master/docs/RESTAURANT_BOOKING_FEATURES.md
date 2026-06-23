# 🍽️ Restaurant-Specific Booking Features

## 📋 Overview

Restaurants require different booking flows compared to salons/spas. This document covers restaurant-specific features to add to the service booking system.

---

## 🆚 Restaurant vs Salon Booking Differences

| Feature | Salon | Restaurant |
|---------|-------|------------|
| **Booking Type** | Service appointment | Table reservation |
| **Duration** | Fixed (30-60 min) | Flexible (1-2 hours typical) |
| **Selection** | Choose service | Choose party size + table type |
| **Pre-order** | Not applicable | Optional food pre-order |
| **Timing** | Specific time slot | Arrival time + dining duration |
| **Staff** | Choose stylist | Choose seating area |
| **Add-ons** | Extra services | Menu items, special requests |

---

## 🍴 Restaurant Booking Flow

### Step 1: Party Details
```typescript
interface PartyDetails {
  partySize: number;        // 1-20+ people
  bookingType: 'dine-in' | 'takeaway' | 'delivery';
  occasion?: 'birthday' | 'anniversary' | 'business' | 'casual';
  specialRequests?: string;
}
```

**UI Components**:
- **Party Size Selector**: Number picker or buttons (1, 2, 3, 4, 5+)
- **Booking Type Toggle**: Dine-in / Takeaway / Delivery
- **Occasion Dropdown**: Special occasions (optional)
- **Special Requests**: Text area for notes

---

### Step 2: Date & Time Selection

**Restaurant-specific considerations**:
- **Meal Times**:
  - Breakfast: 7:00 AM - 11:00 AM
  - Lunch: 12:00 PM - 3:00 PM
  - Dinner: 6:00 PM - 11:00 PM
- **Peak Hours**: Higher demand on weekends/evenings
- **Table Availability**: Based on party size and restaurant capacity

```typescript
interface RestaurantTimeSlot {
  time: string;              // "7:00 PM"
  available: boolean;
  tablesAvailable: number;   // How many tables of this size
  mealPeriod: 'breakfast' | 'lunch' | 'dinner';
  peakHours: boolean;        // Higher pricing or minimum spend
  estimatedDuration: number; // 90-120 minutes typical
}
```

**UI Features**:
- Show meal period badges (Breakfast, Lunch, Dinner)
- Indicate peak hours with special badge
- Show "Almost Full" if < 3 tables available
- Gray out unavailable times
- Show estimated dining duration

---

### Step 3: Table/Seating Preferences

```typescript
interface SeatingPreference {
  area: 'indoor' | 'outdoor' | 'rooftop' | 'private_room' | 'bar' | 'no_preference';
  tableType: 'booth' | 'regular' | 'high_top' | 'window' | 'no_preference';
  accessibility: boolean;    // Wheelchair accessible
  quietArea: boolean;        // Away from kitchen/entrance
  view?: 'window' | 'garden' | 'street';
}
```

**UI Components**:
```typescript
<View style={styles.seatingPreferences}>
  <Text style={styles.sectionTitle}>Seating Preferences</Text>

  {/* Area Selection */}
  <View style={styles.chipGroup}>
    <Chip label="Indoor" icon="home" selected={area === 'indoor'} />
    <Chip label="Outdoor" icon="sunny" selected={area === 'outdoor'} />
    <Chip label="Rooftop" icon="wine" selected={area === 'rooftop'} />
    <Chip label="Private Room" icon="lock-closed" />
  </View>

  {/* Table Type */}
  <View style={styles.chipGroup}>
    <Chip label="Booth" icon="restaurant" />
    <Chip label="Window Seat" icon="aperture" />
    <Chip label="High Top" icon="layers" />
  </View>

  {/* Special Needs */}
  <Checkbox label="Wheelchair accessible" />
  <Checkbox label="Quiet area" />
  <Checkbox label="Near restroom" />
</View>
```

---

### Step 4: Menu Pre-Order (Optional)

**Allow customers to pre-order food** with their reservation:

```typescript
interface PreOrder {
  enabled: boolean;
  items: {
    menuItemId: string;
    name: string;
    quantity: number;
    price: number;
    customizations?: string[];
    specialInstructions?: string;
  }[];
  totalAmount: number;
  paymentRequired: boolean;  // Advance payment or pay at restaurant
}
```

**UI Flow**:
1. **Browse Menu**: Show restaurant's full menu
2. **Add Items**: Select dishes with quantity
3. **Customizations**: Spice level, extra cheese, etc.
4. **Special Instructions**: "No onions", "Less salt", etc.
5. **Review Order**: Cart with all items
6. **Payment Option**: Pay now or at restaurant

**Benefits**:
- Reduces wait time at restaurant
- Ensures food is ready when customer arrives
- Better kitchen preparation planning
- Higher customer satisfaction

---

### Step 5: Dietary Restrictions & Allergies

```typescript
interface DietaryInfo {
  restrictions: ('vegetarian' | 'vegan' | 'gluten_free' | 'lactose_free' | 'halal' | 'kosher' | 'none')[];
  allergies: string[];        // Free text: "peanuts", "shellfish", etc.
  spicePreference: 'mild' | 'medium' | 'hot' | 'no_preference';
  otherRequests?: string;
}
```

**UI Components**:
```typescript
<View style={styles.dietarySection}>
  <Text style={styles.sectionTitle}>Dietary Preferences</Text>

  {/* Quick Select Chips */}
  <View style={styles.chipGroup}>
    <Chip label="🥗 Vegetarian" />
    <Chip label="🌱 Vegan" />
    <Chip label="🌾 Gluten Free" />
    <Chip label="🥛 Lactose Free" />
    <Chip label="☪️ Halal" />
    <Chip label="✡️ Kosher" />
  </View>

  {/* Allergies Input */}
  <TextInput
    placeholder="List any allergies (e.g., peanuts, shellfish)"
    multiline
  />

  {/* Spice Level */}
  <View style={styles.spiceLevel}>
    <Text>Spice Level:</Text>
    <SpiceLevelPicker /> {/* Mild / Medium / Hot */}
  </View>
</View>
```

---

### Step 6: Booking Confirmation

**Restaurant-specific confirmation details**:
```typescript
interface RestaurantBooking {
  // Standard booking info
  bookingNumber: string;
  restaurantName: string;
  date: Date;
  time: string;

  // Restaurant-specific
  partySize: number;
  tableType?: string;
  seatingArea?: string;
  estimatedDuration: number;  // 90 minutes

  // Pre-order
  preOrder?: {
    items: MenuItem[];
    total: number;
    paid: boolean;
  };

  // Special info
  dietaryRestrictions?: string[];
  specialRequests?: string;

  // Policies
  cancellationPolicy: string;
  noShowFee?: number;
  minimumSpend?: number;      // For peak hours

  // Contact
  customerName: string;
  customerPhone: string;
  customerEmail: string;
}
```

**Confirmation Screen**:
```typescript
<ScrollView>
  {/* Booking Confirmed Banner */}
  <View style={styles.confirmationBanner}>
    <Ionicons name="checkmark-circle" size={64} color="#10B981" />
    <Text style={styles.confirmTitle}>Reservation Confirmed!</Text>
    <Text style={styles.bookingNumber}>#{bookingNumber}</Text>
  </View>

  {/* Booking Details Card */}
  <Card>
    <InfoRow icon="restaurant" label="Restaurant" value={restaurantName} />
    <InfoRow icon="calendar" label="Date" value={formatDate(date)} />
    <InfoRow icon="time" label="Time" value={time} />
    <InfoRow icon="people" label="Party Size" value={`${partySize} guests`} />
    {seatingArea && <InfoRow icon="location" label="Seating" value={seatingArea} />}
    <InfoRow icon="timer" label="Duration" value={`${estimatedDuration} minutes`} />
  </Card>

  {/* Pre-Order Summary (if applicable) */}
  {preOrder && (
    <Card>
      <Text style={styles.cardTitle}>Pre-Ordered Items</Text>
      {preOrder.items.map(item => (
        <OrderItem key={item.id} item={item} />
      ))}
      <Text style={styles.total}>Total: ₹{preOrder.total}</Text>
      <Text style={styles.paymentStatus}>
        {preOrder.paid ? '✓ Paid' : 'Pay at restaurant'}
      </Text>
    </Card>
  )}

  {/* Special Requests */}
  {specialRequests && (
    <Card>
      <Text style={styles.cardTitle}>Special Requests</Text>
      <Text>{specialRequests}</Text>
    </Card>
  )}

  {/* Policies */}
  <Card>
    <Text style={styles.cardTitle}>Policies</Text>
    <Text>• {cancellationPolicy}</Text>
    {minimumSpend && <Text>• Minimum spend: ₹{minimumSpend}</Text>}
    {noShowFee && <Text>• No-show fee: ₹{noShowFee}</Text>}
  </Card>

  {/* Action Buttons */}
  <Button
    title="Add to Calendar"
    onPress={handleAddToCalendar}
  />
  <Button
    title="Get Directions"
    onPress={handleGetDirections}
  />
  <Button
    title="Contact Restaurant"
    onPress={handleContactRestaurant}
  />
  <Button
    title="View My Bookings"
    onPress={() => router.push('/my-bookings')}
  />
</ScrollView>
```

---

## 🎨 Restaurant Store Page UI Adaptations

### 1. Hero Section with Food Focus
```typescript
<View style={styles.restaurantHero}>
  {/* Food Images Carousel */}
  <ImageCarousel images={restaurant.foodImages} />

  {/* Quick Info Bar */}
  <View style={styles.quickInfo}>
    <Chip icon="time" label={restaurant.openStatus} />
    <Chip icon="star" label={`${restaurant.rating} ⭐`} />
    <Chip icon="cash" label={restaurant.priceRange} /> {/* ₹₹₹ */}
    <Chip icon="restaurant" label={restaurant.cuisine.join(', ')} />
  </View>

  {/* Main CTAs */}
  <View style={styles.mainActions}>
    <Button
      title="Book a Table"
      icon="calendar"
      primary
      onPress={handleBookTable}
    />
    <Button
      title="Order Online"
      icon="cart"
      secondary
      onPress={handleOrderOnline}
    />
  </View>
</View>
```

---

### 2. Menu Display Section

```typescript
<View style={styles.menuSection}>
  <Text style={styles.sectionTitle}>Menu</Text>

  {/* Category Tabs */}
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    <Chip label="All" selected />
    <Chip label="🍕 Starters" />
    <Chip label="🍛 Main Course" />
    <Chip label="🍰 Desserts" />
    <Chip label="🍹 Beverages" />
  </ScrollView>

  {/* Menu Items Grid */}
  <FlatList
    data={menuItems}
    renderItem={({ item }) => (
      <MenuItemCard
        item={item}
        onAdd={handleAddToCart}
        onViewDetails={handleViewMenuItem}
      />
    )}
  />
</View>
```

**MenuItemCard Component**:
```typescript
<View style={styles.menuCard}>
  <Image source={{ uri: item.image }} style={styles.menuImage} />

  {/* Dietary Badges */}
  <View style={styles.badges}>
    {item.isVeg && <Badge icon="🥗" label="Veg" />}
    {item.isVegan && <Badge icon="🌱" label="Vegan" />}
    {item.isGlutenFree && <Badge icon="🌾" label="Gluten Free" />}
    {item.spiceLevel && <SpiceBadge level={item.spiceLevel} />}
  </View>

  <Text style={styles.itemName}>{item.name}</Text>
  <Text style={styles.itemDescription} numberOfLines={2}>
    {item.description}
  </Text>

  <View style={styles.priceRow}>
    <Text style={styles.price}>₹{item.price}</Text>
    {item.rating && (
      <Text style={styles.rating}>⭐ {item.rating}</Text>
    )}
  </View>

  <Button
    title="Add"
    icon="add"
    onPress={() => onAdd(item)}
  />
</View>
```

---

### 3. Restaurant Info Section

```typescript
<View style={styles.restaurantInfo}>
  {/* Cuisine Tags */}
  <View style={styles.cuisineTags}>
    {restaurant.cuisines.map(cuisine => (
      <Chip key={cuisine} label={cuisine} />
    ))}
  </View>

  {/* Operating Hours */}
  <InfoCard title="Operating Hours">
    <Text>Breakfast: 7:00 AM - 11:00 AM</Text>
    <Text>Lunch: 12:00 PM - 3:00 PM</Text>
    <Text>Dinner: 6:00 PM - 11:00 PM</Text>
    <Text style={styles.note}>Kitchen closes 30 mins before closing</Text>
  </InfoCard>

  {/* Facilities */}
  <InfoCard title="Facilities">
    <Chip icon="wifi" label="Free Wi-Fi" />
    <Chip icon="car" label="Parking Available" />
    <Chip icon="accessibility" label="Wheelchair Accessible" />
    <Chip icon="beer" label="Bar Available" />
    <Chip icon="card" label="Cards Accepted" />
  </InfoCard>

  {/* Seating Capacity */}
  <InfoCard title="Seating">
    <Text>Indoor: 50 seats</Text>
    <Text>Outdoor: 20 seats</Text>
    <Text>Private Rooms: 2 (10-15 people each)</Text>
  </InfoCard>
</View>
```

---

### 4. Reviews with Food Focus

```typescript
<View style={styles.reviewsSection}>
  <Text style={styles.sectionTitle}>Reviews</Text>

  {/* Filter by Aspect */}
  <ScrollView horizontal>
    <Chip label="All" selected />
    <Chip label="Food Quality" />
    <Chip label="Service" />
    <Chip label="Ambiance" />
    <Chip label="Value for Money" />
  </ScrollView>

  {/* Reviews List */}
  <FlatList
    data={reviews}
    renderItem={({ item }) => (
      <ReviewCard review={item} showFoodImages />
    )}
  />
</View>
```

---

## 🔧 Backend Requirements for Restaurants

### Additional Database Models

#### 1. Restaurant Model (extends Store)
```javascript
const restaurantSchema = new Schema({
  // ... base store fields

  restaurantInfo: {
    cuisines: [String],          // ['Italian', 'Continental']
    mealTypes: [String],          // ['breakfast', 'lunch', 'dinner']
    priceRange: String,           // '₹₹' (1-4 scale)
    seatingCapacity: {
      indoor: Number,
      outdoor: Number,
      privateRooms: Number
    },
    facilities: {
      wifi: Boolean,
      parking: Boolean,
      wheelchairAccessible: Boolean,
      bar: Boolean,
      liveMusic: Boolean,
      outdoorSeating: Boolean,
      privateRooms: Boolean
    },
    dietaryOptions: {
      vegetarian: Boolean,
      vegan: Boolean,
      glutenFree: Boolean,
      halal: Boolean,
      kosher: Boolean
    },
    ambiance: [String],           // ['casual', 'fine-dining', 'romantic']
    dressCode: String,
    reservationPolicy: {
      advanceBookingRequired: Boolean,
      minAdvanceHours: Number,
      maxAdvanceDays: Number,
      depositRequired: Boolean,
      depositAmount: Number,
      cancellationPolicy: String,
      noShowFee: Number
    }
  }
});
```

#### 2. Menu Item Model
```javascript
const menuItemSchema = new Schema({
  restaurantId: { type: ObjectId, ref: 'Store' },
  name: String,
  description: String,
  category: String,              // 'starter', 'main', 'dessert', etc.
  price: Number,
  images: [String],

  // Dietary Info
  isVegetarian: Boolean,
  isVegan: Boolean,
  isGlutenFree: Boolean,
  isHalal: Boolean,
  isKosher: Boolean,
  spiceLevel: Number,            // 0-3
  allergens: [String],

  // Details
  servingSize: String,
  calories: Number,
  preparationTime: Number,       // minutes

  // Availability
  availableMeals: [String],      // ['lunch', 'dinner']
  availableDays: [Number],       // [0-6, Sunday=0]
  seasonal: Boolean,
  inStock: Boolean,

  // Ratings
  rating: Number,
  reviewCount: Number,
  popularity: Number,            // Order count

  isActive: Boolean
});
```

#### 3. Table Booking Model (different from regular booking)
```javascript
const tableBookingSchema = new Schema({
  bookingNumber: String,
  restaurantId: { type: ObjectId, ref: 'Store' },
  userId: { type: ObjectId, ref: 'User' },

  // Party Details
  partySize: Number,
  date: Date,
  arrivalTime: String,
  estimatedDuration: Number,     // minutes

  // Seating
  seatingPreference: {
    area: String,                // 'indoor', 'outdoor', etc.
    tableType: String,
    accessibility: Boolean,
    view: String
  },
  tableAssigned: {
    tableNumber: String,
    area: String
  },

  // Special Requests
  occasion: String,
  specialRequests: String,
  dietaryRestrictions: [String],
  allergies: [String],

  // Pre-Order
  preOrder: {
    items: [{
      menuItemId: ObjectId,
      name: String,
      quantity: Number,
      price: Number,
      customizations: [String]
    }],
    total: Number,
    paid: Boolean,
    paymentMethod: String
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'],
    default: 'pending'
  },

  // Policies
  depositPaid: Number,
  minimumSpend: Number,

  // Contact
  customerName: String,
  customerPhone: String,
  customerEmail: String,

  // Confirmation
  confirmationSent: Boolean,
  reminderSent: Boolean,

  createdAt: Date,
  updatedAt: Date
});
```

---

## 🌟 Key Features Summary

### Must-Have for Restaurants
- [x] Party size selection (1-20+ people)
- [x] Date & time picker
- [x] Meal period selection (breakfast/lunch/dinner)
- [x] Seating preferences (indoor/outdoor, booth/window)
- [x] Dietary restrictions & allergies
- [x] Special occasion tags
- [x] Special requests text area
- [x] Booking confirmation with details
- [x] Menu display (separate from booking)
- [x] Online ordering option

### Nice-to-Have
- [ ] Menu item pre-ordering with booking
- [ ] Table map with visual selection
- [ ] Chef's recommendations
- [ ] Pairing suggestions (wine with food)
- [ ] Split bill calculator
- [ ] Group ordering (multiple people add items)
- [ ] Waitlist functionality
- [ ] Live table availability status

---

## 📱 Restaurant Booking Components

```
components/restaurant/
├── RestaurantHero.tsx           # Food images, ratings, cuisines
├── MenuSection.tsx              # Full menu display
├── MenuItemCard.tsx             # Individual menu item
├── MenuCategoryTabs.tsx         # Category navigation
├── TableBookingModal.tsx        # Main booking flow
├── PartySizeSelector.tsx        # Party size picker
├── SeatingPreferences.tsx       # Table preferences
├── DietaryRestrictions.tsx      # Dietary info form
├── MenuPreOrder.tsx             # Pre-order food with booking
├── TableBookingConfirmation.tsx # Booking success
├── RestaurantPolicies.tsx       # Cancellation, deposit, etc.
└── OperatingHours.tsx           # Meal timings display
```

---

## ✅ Acceptance Criteria - Restaurants

### Booking Flow ✅
- [x] Party size selection (1-20+)
- [x] Date picker shows available dates
- [x] Time slots grouped by meal period
- [x] Seating preference options
- [x] Dietary restrictions form
- [x] Special requests text area
- [x] Booking confirmation with all details

### Menu Display ✅
- [x] Menu items load from backend
- [x] Category filtering works
- [x] Dietary badges visible
- [x] Spice level indicators
- [x] Add to cart (for online order)
- [x] Item details modal

### Pre-Order (Optional) ✅
- [x] Browse menu during booking
- [x] Add items to pre-order
- [x] Customizations supported
- [x] Special instructions per item
- [x] Payment integration

---

## 🎯 Implementation Priority

**Week 2-3 (Restaurant Features)**:
- Day 6: Basic table booking (party size, date/time, preferences)
- Day 7: Menu display, dietary restrictions, confirmation

**Week 5 (Advanced Features)**:
- Menu pre-ordering
- Advanced seating preferences
- Payment integration

---

**Document Version**: 1.0
**Last Updated**: 2025-01-12
**Integration**: Part of SERVICE_BOOKING_STORE_PLAN.md
