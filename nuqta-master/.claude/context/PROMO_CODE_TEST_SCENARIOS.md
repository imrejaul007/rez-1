# Enhanced Promo Code Functionality - Test Scenarios

## ✅ Advanced Promo Code Features

### 🔄 **Promo Code Switching:**
1. **Apply FIRST10** → Shows "₹10 saved"
2. **Click "Change"** → Opens modal with FIRST10 highlighted with ✅ badge
3. **Select SAVE15** → Alert: "FIRST10 replaced with SAVE15!"
4. **Bill updates** → Shows "₹15 saved" (15% of ₹100 = ₹15)
5. **Click "Change" again** → SAVE15 now highlighted as applied

### 🎯 **Visual Feedback States:**

#### **Available Promo Code (Eligible):**
- ✅ White background with purple code text
- ✅ Clickable with touch feedback
- ✅ Shows full description

#### **Currently Applied Promo:**
- ✅ Green background with green border
- ✅ Green code text with checkmark badge
- ✅ Shows as selected in modal

#### **Ineligible Promo Code:**
- ✅ Grayed out appearance (60% opacity)
- ✅ Gray text color
- ✅ Shows "Min order: ₹XX" requirement
- ✅ Not clickable

#### **Applied Promo in Main UI:**
- ✅ Green card with tag icon
- ✅ Shows code name and savings amount
- ✅ "Change" button in purple
- ✅ Red "X" remove button

### 📱 **User Experience Flow:**

#### **Scenario 1: First Time Application**
1. Order total: ₹100
2. Click "Apply Promocode"
3. See 3 available codes (FIRST10, SAVE15, CASHBACK5)
4. FIRST10 & CASHBACK5 are eligible (green), SAVE15 is ineligible (gray)
5. Click FIRST10 → "FIRST10 applied successfully!"
6. Bill shows: ₹100 → ₹90 (₹10 discount)

#### **Scenario 2: Switching Promo Codes**
1. With FIRST10 applied (₹10 off)
2. Click "Change" button
3. Modal shows FIRST10 with checkmark
4. Order increases to ₹120 by adding item
5. SAVE15 becomes eligible (green)
6. Click SAVE15 → "FIRST10 replaced with SAVE15!"
7. Bill shows: ₹120 → ₹102 (₹18 off - 15% discount)

#### **Scenario 3: Remove and Reapply**
1. Click "X" to remove promo
2. Total returns to ₹100
3. Click "Apply Promocode" again
4. All codes reset (no checkmarks)
5. Can apply any eligible code fresh

#### **Scenario 4: Input Manual Code**
1. Type "FIRST10" in text field
2. Click "Apply Code" button
3. Same result as clicking the suggestion
4. Input field clears after application

### 🧮 **Price Calculation Verification:**

#### **Base Order: ₹100**
- Item Total: ₹100
- Platform Fee: ₹2
- Taxes: ₹5
- Get & Item Total: ₹5
- **Base Total**: ₹112

#### **With FIRST10 (₹10 fixed discount):**
- Base: ₹112
- Promo Discount: -₹10
- **Final Total**: ₹102 ✅

#### **With SAVE15 (15% discount, max ₹20):**
- Base: ₹112
- Promo Discount: -₹15 (15% of ₹100 items)
- **Final Total**: ₹97 ✅

#### **Combined with Coins:**
- Base: ₹112
- SAVE15 Promo: -₹15
- Wasil Coin (10%): -₹9 (10% of remaining ₹97)
- Promo Coin (20%): -₹17 (20% of remaining ₹88)
- **Final Total**: ₹71 ✅ (₹41 total savings!)

### 🎉 **Success Messages:**
- **New Application**: "FIRST10 applied successfully!"
- **Replacement**: "FIRST10 replaced with SAVE15!"
- **Shows actual savings**: "You saved ₹15"
- **Celebration banner**: "🎉 You saved ₹15 on this order!"

### 🚨 **Error Handling:**
- **Invalid Code**: "Invalid promo code"
- **Below Minimum**: "Minimum order value ₹80 required for SAVE15"
- **Empty Input**: "Please enter a promo code"

The enhanced promo code system now provides seamless switching between codes with proper visual feedback and intelligent eligibility checking!