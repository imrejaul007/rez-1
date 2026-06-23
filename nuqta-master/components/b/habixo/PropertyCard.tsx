/**
 * PropertyCard — single Habixo property card.
 *
 * Renders one `HabixoProperty`:
 *   - Hero image (with a tinted placeholder fallback when none is set)
 *   - Type badge (top-left) and availability pill (top-right)
 *   - Title + city / area
 *   - Rent in ₹ (the hero number)
 *   - Optional deposit + key facts (bedrooms, bathrooms, area)
 *   - Up to 3 amenity chips, with a "+N more" overflow chip
 *   - Owner name
 *   - "View details" CTA button (or full-card press when `onPress` is
 *     provided as the full-card handler)
 *
 * Behaviour
 * ---------
 *   - Pure / stateless: parent owns the data and the navigation flow.
 *     The card just renders + invokes `onPress` when the user taps the
 *     card body or the CTA button.
 *
 * Accessibility
 * -------------
 *   - Outer wrapper exposes an `accessibilityLabel` summarising type,
 *     title, location, rent, bedrooms / bathrooms, amenities, owner,
 *     and availability state.
 *   - The "View details" button is also focusable and labelled
 *     separately.
 */
import React, { useMemo } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { formatPrice } from '@/utils/priceFormatter';
import type { HabixoProperty, HabixoPropertyType } from '@/types/habixo.types';

export interface PropertyCardProps {
  property: HabixoProperty;
  /** Optional full-card tap handler. When supplied, the card is a button. */
  onPress?: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_META: Record<
  HabixoPropertyType,
  { emoji: string; label: string; tint: string }
> = {
  apartment: { emoji: '🏢', label: 'Apartment', tint: '#1a3a52' },
  house: { emoji: '🏠', label: 'House', tint: '#B0791C' },
  office: { emoji: '🏢', label: 'Office', tint: '#334E68' },
  meeting_room: { emoji: '🗓️', label: 'Meeting Room', tint: '#7E57C2' },
  pg: { emoji: '🛏️', label: 'PG', tint: '#26A69A' },
  studio: { emoji: '🎙️', label: 'Studio', tint: '#D81B60' },
};

/** How many amenity chips we render before falling back to "+N more". */
const MAX_VISIBLE_AMENITIES = 3;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a human-readable rent string. Falls back to "—" when the
 * formatter can't return a value.
 */
function formatRent(paise: number): string {
  if (!Number.isFinite(paise) || paise < 0) return '—';
  const formatted = formatPrice(paise / 100, 'INR', false);
  return formatted ?? '—';
}

/** Build a stable, tappable type accent colour (mirrors the try module). */
function propertyTint(type: HabixoPropertyType): string {
  return TYPE_META[type].tint;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface AmenityChipProps {
  label: string;
  tint: string;
}

function AmenityChip({ label, tint }: AmenityChipProps): React.ReactElement {
  return (
    <View
      style={[styles.chip, { borderColor: tint, backgroundColor: `${tint}14` }]}
      accessibilityLabel={`Amenity: ${label}`}
    >
      <Text style={[styles.chipText, { color: tint }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

interface OverflowChipProps {
  count: number;
  tint: string;
}

function OverflowChip({ count, tint }: OverflowChipProps): React.ReactElement {
  return (
    <View
      style={[styles.chip, styles.chipOverflow, { borderColor: tint }]}
      accessibilityLabel={`${count} more amenities`}
    >
      <Text style={[styles.chipText, { color: tint }]}>+{count} more</Text>
    </View>
  );
}

interface TypeBadgeProps {
  type: HabixoPropertyType;
}

function TypeBadge({ type }: TypeBadgeProps): React.ReactElement {
  const meta = TYPE_META[type];
  return (
    <View
      style={[styles.typeBadge, { backgroundColor: `${meta.tint}E6` }]}
      accessibilityLabel={`Type: ${meta.label}`}
    >
      <Text style={styles.typeBadgeEmoji}>{meta.emoji}</Text>
      <Text style={styles.typeBadgeLabel} numberOfLines={1}>
        {meta.label}
      </Text>
    </View>
  );
}

interface AvailabilityPillProps {
  available: boolean;
}

function AvailabilityPill({
  available,
}: AvailabilityPillProps): React.ReactElement {
  const bg = available ? '#2ECC71' : colors.text.tertiary;
  const label = available ? 'Available' : 'Booked';
  return (
    <View
      style={[styles.availPill, { backgroundColor: bg }]}
      accessibilityLabel={available ? 'Available now' : 'Currently booked'}
    >
      <Text style={styles.availPillText}>{label}</Text>
    </View>
  );
}

interface FactRowProps {
  bedrooms: number | undefined;
  bathrooms: number | undefined;
  areaSqft: number | undefined;
}

function FactRow({
  bedrooms,
  bathrooms,
  areaSqft,
}: FactRowProps): React.ReactElement | null {
  const parts: string[] = [];
  if (bedrooms !== null && bedrooms !== undefined) {
    parts.push(`${bedrooms} BHK`);
  }
  if (bathrooms !== null && bathrooms !== undefined) {
    parts.push(`${bathrooms} Bath`);
  }
  if (areaSqft !== null && areaSqft !== undefined) {
    parts.push(`${areaSqft.toLocaleString()} sqft`);
  }
  if (parts.length === 0) return null;
  return (
    <Text style={styles.factRow} accessibilityLabel={parts.join(', ')}>
      {parts.join(' · ')}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function PropertyCardBase({
  property,
  onPress,
}: PropertyCardProps): React.ReactElement {
  const tint = propertyTint(property.type);
  const hero = property.imageUrls[0];

  const rent = useMemo(() => formatRent(property.rentPaise), [property.rentPaise]);
  const deposit = useMemo(
    () => (property.depositPaise === undefined ? null : formatRent(property.depositPaise)),
    [property.depositPaise],
  );

  const visibleAmenities = property.amenities.slice(0, MAX_VISIBLE_AMENITIES);
  const overflowCount = Math.max(0, property.amenities.length - visibleAmenities.length);

  const accessibilityLabel = useMemo(() => {
    const typeLabel = TYPE_META[property.type].label;
    const availLabel = property.available ? 'available' : 'unavailable';
    const facts: string[] = [];
    if (property.bedrooms !== undefined) {
      facts.push(`${property.bedrooms} bedroom${property.bedrooms === 1 ? '' : 's'}`);
    }
    if (property.bathrooms !== undefined) {
      facts.push(`${property.bathrooms} bathroom${property.bathrooms === 1 ? '' : 's'}`);
    }
    if (property.areaSqft !== undefined) {
      facts.push(`${property.areaSqft} square feet`);
    }
    return [
      `${typeLabel}: ${property.title}`,
      `${property.area}, ${property.city}`,
      `Rent ${rent} per month`,
      deposit !== null ? `Deposit ${deposit}` : null,
      facts.length > 0 ? facts.join(', ') : null,
      property.amenities.length > 0
        ? `Amenities: ${property.amenities.join(', ')}`
        : null,
      `Owner ${property.ownerName}`,
      availLabel,
    ]
      .filter((line): line is string => line !== null)
      .join('. ');
  }, [property, rent, deposit]);

  const inner = (
    <View style={[styles.card, { borderColor: `${tint}33` }]}>
      <View style={styles.imageWrap}>
        {hero !== undefined && hero.length > 0 ? (
          <Image
            source={{ uri: hero }}
            style={styles.image}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        ) : (
          <View
            style={[styles.image, styles.imagePlaceholder, { backgroundColor: `${tint}22` }]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            <Text style={[styles.imagePlaceholderText, { color: tint }]}>
              {TYPE_META[property.type].emoji}
            </Text>
          </View>
        )}
        <View style={styles.badgeRow}>
          <TypeBadge type={property.type} />
          <AvailabilityPill available={property.available} />
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {property.title}
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          {property.area}, {property.city}
        </Text>

        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: tint }]}>{`₹${rent}`}</Text>
          <Text style={styles.priceUnit}>/ month</Text>
        </View>

        {deposit !== null ? (
          <Text style={styles.deposit} accessibilityLabel={`Deposit ${deposit}`}>
            {`Deposit: ₹${deposit}`}
          </Text>
        ) : null}

        <FactRow
          bedrooms={property.bedrooms}
          bathrooms={property.bathrooms}
          areaSqft={property.areaSqft}
        />

        {visibleAmenities.length > 0 ? (
          <View
            style={styles.chipRow}
            accessibilityLabel={`Amenities: ${property.amenities.join(', ')}`}
          >
            {visibleAmenities.map((label) => (
              <AmenityChip key={label} label={label} tint={tint} />
            ))}
            {overflowCount > 0 ? <OverflowChip count={overflowCount} tint={tint} /> : null}
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.owner} numberOfLines={1}>
            {`Owner: ${property.ownerName}`}
          </Text>
          {onPress !== undefined ? (
            <View
              accessibilityRole="button"
              accessibilityLabel={`View details for ${property.title}`}
              style={[styles.ctaBtn, { backgroundColor: tint }]}
            >
              <Text style={styles.ctaBtnText}>View details</Text>
            </View>
          ) : (
            <View
              accessibilityRole="button"
              accessibilityLabel={`View details for ${property.title}`}
              style={[styles.ctaBtn, { backgroundColor: tint }]}
            >
              <Text style={styles.ctaBtnText}>View details</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  if (onPress === undefined) {
    return (
      <View accessibilityLabel={accessibilityLabel} style={styles.wrap}>
        {inner}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    marginBottom: spacing.base,
  },
  pressed: {
    opacity: 0.95,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    backgroundColor: colors.background.primary,
    overflow: 'hidden',
  },
  imageWrap: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: colors.background.secondary,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 48,
  },
  badgeRow: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  typeBadgeEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  typeBadgeLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  availPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  availPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  body: {
    padding: spacing.base,
  },
  title: {
    ...typography.h4,
    color: colors.nileBlue,
    fontWeight: '700',
  },
  location: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.sm,
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  priceUnit: {
    ...typography.body,
    color: colors.text.tertiary,
    marginLeft: spacing.xs,
  },
  deposit: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  factRow: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  chipOverflow: {
    backgroundColor: 'transparent',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  owner: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
    marginRight: spacing.sm,
  },
  ctaBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});

const PropertyCard = React.memo(PropertyCardBase);
export default PropertyCard;
