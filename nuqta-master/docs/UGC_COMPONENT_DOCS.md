# UGCSection Component Documentation

## Overview

The `UGCSection` component is a modern, responsive carousel component designed for displaying user-generated fashion content. It features lazy loading, smooth animations, and comprehensive accessibility support.

## Props

### UGCSectionProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `"UGC"` | Section header title |
| `images` | `UGCImage[]` | `defaultImages` | Array of UGC content items |
| `onViewAllPress` | `() => void` | - | Callback when "View all" is pressed |
| `onImagePress` | `(imageId: string) => void` | - | Callback when an image card is tapped |
| `onReadMorePress` | `(imageId: string, url?: string) => void` | - | Callback for "Read more" action |
| `cardAspectRatio` | `number` | `3/4` | Width/height ratio (portrait: 3/4, square: 1, landscape: 4/3) |
| `showDescriptions` | `boolean` | `true` | Toggle description text visibility |
| `maxDescriptionLength` | `number` | `120` | Character limit before truncation |

### UGCImage Interface

```typescript
interface UGCImage {
  id: string;                    // Unique identifier
  uri: string;                   // Image URL
  viewCount: string;             // Display format (e.g., "2.5L", "1.2K")
  description: string;           // Full description text
  shortDescription?: string;     // Optional custom truncated version
  readMoreUrl?: string;         // URL for "Read more" action
  category?: string;            // Content category
  author?: string;              // Content creator name
}
```

## Usage Examples

### Basic Usage

```typescript
import UGCSection from '@/app/MainStoreSection/UGCSection';

export default function HomePage() {
  return (
    <UGCSection 
      title="Fashion Inspiration"
      onViewAllPress={() => console.log('View all pressed')}
      onImagePress={(id) => console.log(`Image ${id} pressed`)}
    />
  );
}
```

### Custom Content

```typescript
const customImages: UGCImage[] = [
  {
    id: 'custom-1',
    uri: 'https://example.com/image1.jpg',
    viewCount: '5.2K',
    description: 'Summer collection featuring vibrant colors and lightweight fabrics.',
    category: 'Summer Fashion',
    author: 'StyleGuru',
    readMoreUrl: 'https://example.com/article/summer-collection'
  }
];

<UGCSection 
  title="Latest Trends"
  images={customImages}
  cardAspectRatio={4/3}  // Landscape orientation
  maxDescriptionLength={80}  // Shorter descriptions
  onReadMorePress={(id, url) => {
    if (url) {
      Linking.openURL(url);
    }
  }}
/>
```

### Advanced Configuration

```typescript
<UGCSection 
  title="Curated Content"
  images={curatedImages}
  cardAspectRatio={3/4}  // Portrait (default)
  showDescriptions={true}
  maxDescriptionLength={150}
  onViewAllPress={() => navigation.navigate('UGCGallery')}
  onImagePress={(id) => {
    analytics.track('ugc_card_tapped', { cardId: id });
    navigation.navigate('UGCDetail', { id });
  }}
  onReadMorePress={(id, url) => {
    analytics.track('ugc_read_more', { cardId: id });
    if (url) {
      WebBrowser.openBrowserAsync(url);
    }
  }}
/>
```

## Responsive Behavior

The component automatically adapts to different screen sizes:

- **Small phones (<375px)**: 1.8 cards per view, 12px spacing
- **Standard phones (375-767px)**: 2.1 cards per view, 16px spacing  
- **Tablets (768-1023px)**: 2.8 cards per view, 20px spacing
- **Large tablets (≥1024px)**: 3.5 cards per view, 20px spacing

## Performance Features

### Lazy Loading
- Images load only when 10% visible in viewport
- Reduces memory usage for large content lists
- Automatic cleanup of off-screen images

### Skeleton Loading
- Professional shimmer effects during image loading
- Maintains layout stability
- Smooth transition to loaded content

### Scroll Optimizations
- Native FlatList optimizations enabled
- Batch rendering for improved performance
- Memory-efficient viewability tracking

## Accessibility

### Screen Reader Support
- Comprehensive accessibility labels
- Semantic role definitions
- Descriptive hints for actions

### Touch Targets
- Minimum 44px touch targets
- Proper focus management
- Keyboard navigation support

## Customization

### Styling
The component uses a modern design system with:
- 18px border radius for cards
- Portrait aspect ratio (3:4) by default
- Gradient overlays for text readability
- Professional shadow system

### Typography
Responsive typography scaling:
- Section titles: 20-28px
- Descriptions: 13-15px  
- View counts: 11-13px

## Error Handling

### Image Loading Failures
- Graceful fallback to placeholder
- Error state indicators
- Retry mechanisms

### Network Issues
- Offline state handling
- Loading timeouts
- User feedback for failures

## Best Practices

### Content Guidelines
1. **Images**: Use high-quality, 400x600px minimum resolution
2. **Descriptions**: Keep under 200 characters for optimal display
3. **View Counts**: Use readable formats (1.2K, 2.5L, etc.)
4. **Categories**: Keep consistent naming conventions

### Performance Tips
1. Pre-size images to match display dimensions
2. Use CDN with proper caching headers
3. Implement proper loading states
4. Monitor memory usage with large datasets

### Testing
1. Test across different screen sizes
2. Verify accessibility with screen readers
3. Performance test with 50+ items
4. Network condition testing (slow 3G, offline)

## Integration Notes

### Parent Components
- Works seamlessly in ScrollView containers
- Maintains scroll position on re-renders
- Compatible with React Navigation

### State Management
- Self-contained component state
- No external dependencies required
- Easy integration with Redux/Context

## Troubleshooting

### Common Issues

**Images not loading:**
- Check network connectivity
- Verify image URLs are accessible
- Ensure proper CORS headers for cross-domain images

**Performance issues:**
- Reduce `maxToRenderPerBatch` for older devices
- Implement image resizing at source
- Monitor memory usage in profiler

**Layout problems:**
- Verify aspect ratios match content
- Check container width constraints
- Test on different device orientations