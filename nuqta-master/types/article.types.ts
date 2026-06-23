export interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    role: 'user' | 'merchant';
  };
  productId?: string;
  productName?: string;
  category: 'fashion' | 'beauty' | 'lifestyle' | 'tech' | 'general';
  tags: string[];
  viewCount: string;
  readTime: string; // e.g., "5 min read"
  createdAt: string;
  updatedAt: string;
  isPublished: boolean;
}

export interface CreateArticleInput {
  title: string;
  content: string;
  coverImage: string;
  productId?: string;
  category: string;
  tags: string[];
}

export const ARTICLE_DUMMY_DATA: Article[] = [
  {
    id: 'article-1',
    title: 'Fashion is a way to show your personal style and make a statement',
    excerpt: 'Discover how fashion can be a powerful tool for self-expression and confidence building in everyday life.',
    content: `Fashion is more than just clothing—it's a form of self-expression that allows you to showcase your personality and creativity. Whether you're dressing for work, a casual outing, or a special event, your style choices communicate who you are to the world.

## The Power of Personal Style

When you dress in a way that reflects your true self, it boosts your confidence and makes you feel empowered. Fashion gives you the freedom to experiment, take risks, and discover what makes you feel your best.

## Building Your Wardrobe

Start with versatile basics that can be mixed and matched, then add statement pieces that reflect your unique taste. Don't be afraid to step out of your comfort zone and try new trends that resonate with you.

## Fashion Tips for Everyday

1. **Invest in quality basics** - A well-fitted white shirt, classic jeans, and comfortable shoes are timeless
2. **Accessorize thoughtfully** - Small details like jewelry, bags, and scarves can transform an outfit
3. **Know your body type** - Dress for your shape to feel comfortable and confident
4. **Express yourself** - Fashion should be fun, so wear what makes you happy

Remember, the best outfit is one that makes you feel confident and true to yourself. Fashion is your canvas—paint it however you like!`,
    coverImage: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800',
    author: {
      id: 'merchant-1',
      name: 'Sarah Johnson',
      avatar: 'https://i.pravatar.cc/150?img=1',
      role: 'merchant'
    },
    productId: 'prod-101',
    productName: 'Summer Collection Dress',
    category: 'fashion',
    tags: ['#FashionStyle', '#PersonalStyle', '#Confidence'],
    viewCount: '2.5L',
    readTime: '5 min read',
    createdAt: '2025-11-01T10:00:00Z',
    updatedAt: '2025-11-01T10:00:00Z',
    isPublished: true
  },
  {
    id: 'article-2',
    title: 'Minimalist Fashion: Less is More',
    excerpt: 'Learn how embracing minimalism in your wardrobe can simplify your life and enhance your style.',
    content: `The minimalist fashion movement is all about quality over quantity. By curating a capsule wardrobe of versatile, timeless pieces, you can create endless outfit combinations while reducing clutter and decision fatigue.

## Why Choose Minimalist Fashion?

Minimalism isn't about deprivation—it's about intentional choices. When you focus on pieces you truly love and that work well together, getting dressed becomes effortless and enjoyable.

## Building a Capsule Wardrobe

Start with a neutral color palette (black, white, gray, navy, beige) and add 20-30 carefully selected pieces that can be mixed and matched. Include:

- Classic blazers
- Well-fitted jeans
- Simple white and black tees
- Versatile dresses
- Quality shoes and accessories

## The Benefits

A minimalist wardrobe saves time, money, and mental energy. You'll find yourself making better purchasing decisions and appreciating the clothes you own more deeply.`,
    coverImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800',
    author: {
      id: 'user-1',
      name: 'Emma Williams',
      avatar: 'https://i.pravatar.cc/150?img=5',
      role: 'user'
    },
    category: 'fashion',
    tags: ['#MinimalistFashion', '#CapsuleWardrobe', '#LessIsMore'],
    viewCount: '2.5L',
    readTime: '4 min read',
    createdAt: '2025-11-02T14:30:00Z',
    updatedAt: '2025-11-02T14:30:00Z',
    isPublished: true
  },
  {
    id: 'article-3',
    title: 'Sustainable Fashion: Style with a Conscience',
    excerpt: 'Explore how to build a stylish wardrobe while being environmentally conscious and supporting ethical brands.',
    content: `Sustainable fashion is no longer a niche trend—it's becoming a necessity. As consumers become more aware of the environmental impact of fast fashion, many are turning to eco-friendly alternatives.

## What is Sustainable Fashion?

Sustainable fashion prioritizes:
- Ethical manufacturing practices
- Eco-friendly materials (organic cotton, recycled fabrics)
- Fair wages for workers
- Reduced carbon footprint
- Longevity and quality over trends

## How to Shop Sustainably

1. **Buy Less, Choose Well** - Invest in quality pieces that last
2. **Support Ethical Brands** - Research brands' sustainability practices
3. **Shop Secondhand** - Thrift stores and vintage shops are treasure troves
4. **Care for Your Clothes** - Proper maintenance extends garment life
5. **Recycle and Donate** - Give old clothes a second life

## The Impact of Your Choices

Every purchase is a vote for the kind of world you want to live in. By choosing sustainable fashion, you're supporting better labor practices, reducing pollution, and encouraging innovation in eco-friendly materials.`,
    coverImage: 'https://images.unsplash.com/photo-1558769132-cb1aea3c40a5?w=800',
    author: {
      id: 'merchant-2',
      name: 'Michael Chen',
      avatar: 'https://i.pravatar.cc/150?img=12',
      role: 'merchant'
    },
    productId: 'prod-102',
    productName: 'Organic Cotton Collection',
    category: 'fashion',
    tags: ['#SustainableFashion', '#EcoFriendly', '#EthicalStyle'],
    viewCount: '3.1L',
    readTime: '6 min read',
    createdAt: '2025-11-03T09:15:00Z',
    updatedAt: '2025-11-03T09:15:00Z',
    isPublished: true
  },
  {
    id: 'article-4',
    title: 'The Art of Layering: Master Winter Fashion',
    excerpt: 'Stay warm and stylish with expert layering techniques that work for any winter occasion.',
    content: `Layering is both an art and a science. Done right, it keeps you warm, adds visual interest, and allows you to adapt to changing temperatures throughout the day.

## The Three-Layer System

1. **Base Layer** - Moisture-wicking fabrics close to skin
2. **Mid Layer** - Insulating pieces like sweaters or fleece
3. **Outer Layer** - Weather-resistant jacket or coat

## Styling Tips

- Mix textures (knits, denim, leather) for depth
- Play with proportions (fitted top, oversized coat)
- Use accessories (scarves, hats) as the finishing touch
- Don't be afraid of patterns—just keep them balanced

## Common Mistakes to Avoid

- Too many bulky layers
- Neglecting the base layer
- Choosing style over function in extreme weather
- Forgetting to layer accessories

Master these techniques and you'll look effortlessly chic all winter long!`,
    coverImage: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800',
    author: {
      id: 'user-2',
      name: 'Jessica Martinez',
      avatar: 'https://i.pravatar.cc/150?img=9',
      role: 'user'
    },
    category: 'fashion',
    tags: ['#WinterFashion', '#Layering', '#StyleTips'],
    viewCount: '2.8L',
    readTime: '5 min read',
    createdAt: '2025-11-04T16:45:00Z',
    updatedAt: '2025-11-04T16:45:00Z',
    isPublished: true
  },
  {
    id: 'article-5',
    title: 'Accessorizing 101: Elevate Any Outfit',
    excerpt: 'Learn how the right accessories can transform a simple outfit into a stunning ensemble.',
    content: `Accessories are the secret weapon of style. They can take a basic outfit from ordinary to extraordinary in seconds, and they're the easiest way to update your look without buying new clothes.

## Essential Accessories

Every wardrobe should include:
- Statement necklace and delicate chains
- Classic watch
- Quality leather bag
- Sunglasses that suit your face shape
- Scarves in various colors and patterns
- Belt collection

## The Art of Accessorizing

**The Rule of Three**: Choose three accent pieces maximum to avoid overwhelming your outfit.

**Mix Metals**: Don't be afraid to combine gold and silver—it's modern and chic.

**Scale Matters**: Pair delicate jewelry with simple outfits, and keep accessories minimal with busy patterns.

## Building Your Collection

Start with versatile pieces in neutral tones, then add statement items that reflect your personality. Invest in quality for items you'll wear frequently, and have fun with trendy pieces that won't break the bank.`,
    coverImage: 'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=800',
    author: {
      id: 'merchant-3',
      name: 'David Thompson',
      avatar: 'https://i.pravatar.cc/150?img=14',
      role: 'merchant'
    },
    productId: 'prod-103',
    productName: 'Gold Accent Collection',
    category: 'fashion',
    tags: ['#Accessories', '#JewelryStyle', '#FashionTips'],
    viewCount: '2.2L',
    readTime: '4 min read',
    createdAt: '2025-11-05T11:20:00Z',
    updatedAt: '2025-11-05T11:20:00Z',
    isPublished: true
  },
  {
    id: 'article-6',
    title: 'Color Theory in Fashion: Dress to Impress',
    excerpt: 'Understanding color theory can revolutionize how you put together outfits and express yourself.',
    content: `Color is one of the most powerful tools in fashion. Understanding color theory helps you create harmonious outfits, complement your skin tone, and make intentional style statements.

## The Color Wheel Basics

- **Complementary Colors**: Opposite on the wheel (blue & orange)
- **Analogous Colors**: Next to each other (blue, blue-green, green)
- **Monochromatic**: Different shades of one color

## Finding Your Perfect Palette

Determine your undertone (warm, cool, or neutral) to find colors that make you glow:

**Warm Undertones**: Earth tones, oranges, yellows, warm reds
**Cool Undertones**: Jewel tones, blues, purples, cool pinks
**Neutral**: Most colors work—lucky you!

## Color Psychology

- **Red**: Confidence, passion, power
- **Blue**: Calm, trustworthy, professional
- **Black**: Sophisticated, elegant, mysterious
- **White**: Clean, fresh, minimalist
- **Yellow**: Happy, optimistic, energetic

## Pro Tips

Start with neutrals as your base and add pops of color through accessories. Don't be afraid to experiment—fashion should be fun!`,
    coverImage: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800',
    author: {
      id: 'user-3',
      name: 'Sophia Lee',
      avatar: 'https://i.pravatar.cc/150?img=10',
      role: 'user'
    },
    category: 'fashion',
    tags: ['#ColorTheory', '#FashionScience', '#StyleGuide'],
    viewCount: '3.4L',
    readTime: '7 min read',
    createdAt: '2025-11-06T13:00:00Z',
    updatedAt: '2025-11-06T13:00:00Z',
    isPublished: true
  }
];
