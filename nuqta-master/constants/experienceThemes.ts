
import { BRAND } from '@/constants/brand';

/**
 * Experience Themes & Configuration - Nuqta Design
 * Centralized source of truth for experience styles and metadata
 *
 * Nuqta Colors:
 * - Nile Blue: #1a3a52
 * - Light Mustard: #ffcd57
 * - Linen: #faf1e0
 * - Light Peach: #ffd7b5
 * - Lavender Mist: #dfebf7
 */

export interface ExperienceTheme {
    gradientColors: string[];
    icon: string;
    iconColor: string;
    bg: string;
    description: string;
    benefits?: string[];
    sectionTitle?: string;
}

export const EXPERIENCE_THEMES: Record<string, ExperienceTheme> = {
    'default': {
        gradientColors: ['#1a3a52', '#ffcd57'],
        icon: '🛍️',
        iconColor: '#1a3a52',
        bg: '#dfebf7',
        description: 'Explore curated stores and products.',
        sectionTitle: 'Think Outside the Box',
        benefits: [
            'Exclusive deals and offers',
            `Earn ${BRAND.COIN_NAME} on every purchase`,
            'Cashback on all transactions',
            'Verified stores only',
        ]
    },
    'sample-trial': {
        gradientColors: ['#1a3a52', '#dfebf7'],
        icon: '🧪',
        iconColor: '#1a3a52',
        bg: '#dfebf7',
        description: 'Experience products before making a purchase. Get free samples and trial offers from top brands.',
        sectionTitle: 'Try Before You Buy',
        benefits: [
            'Free product samples',
            'Trial period for electronics',
            'Test cosmetics before buying',
            'Money-back guarantee on trials'
        ]
    },
    '60-min-delivery': {
        gradientColors: ['#ffcd57', '#ffd7b5'],
        icon: '⚡',
        iconColor: '#ffcd57',
        bg: '#FFF9E6',
        description: 'Get your orders delivered in 60 minutes or less. Perfect for urgent needs and last-minute shopping.',
        sectionTitle: 'Speedy Essentials',
        benefits: [
            'Guaranteed 60-min delivery',
            'Real-time order tracking',
            'Free delivery on orders ₹500+',
            'Late delivery = coins back'
        ]
    },
    'fast-delivery': {
        gradientColors: ['#ffcd57', '#ffd7b5'],
        icon: '⚡',
        iconColor: '#ffcd57',
        bg: '#FFF9E6',
        description: 'Get your orders delivered in 60 minutes or less. Perfect for urgent needs and last-minute shopping.',
        sectionTitle: 'Speedy Essentials',
        benefits: [
            'Guaranteed 60-min delivery',
            'Real-time order tracking',
            'Free delivery on orders ₹500+',
            'Late delivery = coins back'
        ]
    },
    'luxury': {
        gradientColors: ['#1a3a52', '#ffd7b5'],
        icon: '💎',
        iconColor: '#1a3a52',
        bg: '#dfebf7',
        description: 'Indulge in premium shopping experiences with exclusive luxury brands and VIP treatment.',
        sectionTitle: 'Exclusive Collection',
        benefits: [
            'Personal shopping assistance',
            'Exclusive brand collections',
            'Premium gift wrapping',
            'VIP lounge access'
        ]
    },
    'organic': {
        gradientColors: ['#1a3a52', '#faf1e0'],
        icon: '🌿',
        iconColor: '#1a3a52',
        bg: '#faf1e0',
        description: 'Shop 100% certified organic products. Healthy choices for you and sustainable for the planet.',
        sectionTitle: 'Green Picks',
        benefits: [
            'Certified organic products',
            'Farm-to-table freshness',
            'Eco-friendly packaging',
            'Sustainability rewards'
        ]
    },
    'men': {
        gradientColors: ['#1a3a52', '#2A5577'],
        icon: '👔',
        iconColor: '#1a3a52',
        bg: '#dfebf7',
        description: "Curated collection of fashion, grooming, and lifestyle products exclusively for men.",
        sectionTitle: "Gentleman's Choice",
        benefits: [
            'Style consultation',
            'Grooming guides',
            "Exclusive men's brands",
            'Loyalty rewards'
        ]
    },
    'women': {
        gradientColors: ['#ffd7b5', '#ffcd57'],
        icon: '👗',
        iconColor: '#ffd7b5',
        bg: '#FFF9E6',
        description: "Discover the latest in women's fashion, beauty, wellness, and lifestyle essentials.",
        sectionTitle: 'Trending Now',
        benefits: [
            'Personal stylist service',
            'Beauty consultations',
            "Exclusive women's brands",
            'Special occasion styling'
        ]
    },
    'children': {
        gradientColors: ['#ffcd57', '#ffd7b5'],
        icon: '🧸',
        iconColor: '#ffcd57',
        bg: '#FFF9E6',
        description: 'Everything your little ones need - from toys and clothes to educational products.',
        sectionTitle: 'Little Wonders',
        benefits: [
            'Age-appropriate selections',
            'Safety certified products',
            'Educational toys',
            'Parent discounts'
        ]
    },
    'rental': {
        gradientColors: ['#1a3a52', '#dfebf7'],
        icon: '🔄',
        iconColor: '#1a3a52',
        bg: '#dfebf7',
        description: 'Rent high-quality products instead of buying. Perfect for special occasions and temporary needs.',
        sectionTitle: 'Rent & Relax',
        benefits: [
            'Flexible rental periods',
            'No maintenance hassle',
            'Try before you buy option',
            'Eco-friendly choice'
        ]
    },
    'gifting': {
        gradientColors: ['#ffd7b5', '#ffcd57'],
        icon: '🎁',
        iconColor: '#ffd7b5',
        bg: '#FFF9E6',
        description: 'Find the perfect gift for every occasion. From personalized items to luxury hampers.',
        sectionTitle: 'Perfect Gifts',
        benefits: [
            'Gift wrapping included',
            'Personalization options',
            'Same-day delivery',
            'Gift cards available'
        ]
    },
    'dining': {
        gradientColors: ['#ffcd57', '#1a3a52'],
        icon: '🍽️',
        iconColor: '#ffcd57',
        bg: '#FFF9E6',
        description: 'Fine dining, quick bites, and gourmet experiences.',
        sectionTitle: "Chef's Specials",
    },
    'night-life': {
        gradientColors: ['#1a3a52', '#ffd7b5'],
        icon: '🍸',
        iconColor: '#1a3a52',
        bg: '#dfebf7',
        description: 'Explore the best nightlife, clubs, and evening entertainment.',
        sectionTitle: 'Party Essentials',
    }
};

/**
 * Get theme for a given slug with fuzzy matching fallback
 */
export const getTheme = (slug: string): ExperienceTheme => {
    if (!slug) return EXPERIENCE_THEMES['default'];

    // 1. Direct match
    if (EXPERIENCE_THEMES[slug]) return EXPERIENCE_THEMES[slug];

    // 2. Partial/Keyword match
    const lowerSlug = slug.toLowerCase();
    const keys = Object.keys(EXPERIENCE_THEMES);

    const match = keys.find(k => k !== 'default' && lowerSlug.includes(k));
    if (match) return EXPERIENCE_THEMES[match];

    return EXPERIENCE_THEMES['default'];
};
