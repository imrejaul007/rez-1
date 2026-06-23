// @ts-nocheck
import React from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { ThemedText } from '@/components/ThemedText';
import CategoryCard from './CategoryCard';
import { CategoryItem, CategoryLayoutConfig } from '@/types/category.types';
import { colors } from '@/constants/theme';

interface CategoryGridProps {
  items: CategoryItem[];
  layoutConfig: CategoryLayoutConfig;
  onItemPress: (item: CategoryItem) => void;
  onAddToCart: (item: CategoryItem) => void;
  onToggleFavorite: (item: CategoryItem) => void;
  loading?: boolean;
  horizontal?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}

function CategoryGrid({
  items,
  layoutConfig,
  onItemPress,
  onAddToCart,
  onToggleFavorite,
  loading = false,
  horizontal = false,
  onLoadMore,
  hasMore = false,
  refreshing = false,
  onRefresh,
}: CategoryGridProps) {
  const { width } = Dimensions.get('window');
  
  // Calculate item width based on layout configuration
  const getItemWidth = () => {
    const padding = 16; // Container padding
    const spacing = layoutConfig.spacing || 16; // Increased default spacing
    const itemsPerRow = layoutConfig.itemsPerRow || 2;
    
    if (horizontal) {
      return width * 0.7; // 70% of screen width for horizontal items
    }
    
    if (layoutConfig.type === 'list') {
      return width - (padding * 2);
    }
    
    return (width - (padding * 2) - (spacing * (itemsPerRow - 1))) / itemsPerRow;
  };

  const itemWidth = getItemWidth();

  // Determine card layout type based on configuration
  const getCardLayoutType = (): 'compact' | 'detailed' | 'featured' => {
    switch (layoutConfig.type) {
      case 'featured':
        return 'featured';
      case 'list':
        return 'detailed';
      case 'cards':
      case 'grid':
      default:
        return 'compact';
    }
  };

  const cardLayoutType = getCardLayoutType();

  // Render individual item
  const renderItem = ({ item, index }: { item: CategoryItem; index: number }) => {
    const isLastRow = horizontal ? false : index >= items.length - (layoutConfig.itemsPerRow || 2);
    
    return (
      <View style={[
        styles.itemContainer,
        {
          width: itemWidth,
          marginRight: horizontal ? (layoutConfig.spacing || 16) : 0,
          marginBottom: isLastRow ? 0 : (layoutConfig.spacing || 16),
          marginHorizontal: horizontal ? 0 : 2,
        }
      ]}>
        <CategoryCard
          item={item}
          layoutType={cardLayoutType}
          onPress={onItemPress}
          onAddToCart={onAddToCart}
          onToggleFavorite={onToggleFavorite}
          showQuickActions={layoutConfig.showQuickActions}
          cardStyle={layoutConfig.cardStyle}
        />
      </View>
    );
  };

  // Render loading footer for pagination
  const renderFooter = () => {
    if (!loading || !hasMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={colors.lightMustard} />
        <ThemedText style={styles.loadingText}>Loading more...</ThemedText>
      </View>
    );
  };

  // Handle end reached for pagination
  const handleEndReached = () => {
    if (hasMore && !loading && onLoadMore) {
      onLoadMore();
    }
  };

  // Get key extractor
  const keyExtractor = (item: CategoryItem) => item.id;

  // Get number of columns for grid layout
  const getNumColumns = () => {
    if (horizontal || layoutConfig.type === 'list') return 1;
    return layoutConfig.itemsPerRow || 2;
  };

  // Container style based on layout type
  const getContainerStyle = () => {
    if (horizontal) {
      return [styles.container, styles.horizontalContainer];
    }
    
    if (layoutConfig.type === 'list') {
      return [styles.container, styles.listContainer];
    }
    
    return [styles.container, styles.gridContainer];
  };

  return (
    <View style={getContainerStyle()}>
      <FlashList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={getNumColumns()}
        horizontal={horizontal}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.contentContainer,
          horizontal && styles.horizontalContent,
          items.length === 0 && styles.emptyContent,
        ]}
        ItemSeparatorComponent={
          layoutConfig.type === 'list' && !horizontal ?
            () => <View style={styles.listSeparator} /> :
            undefined
        }
        ListFooterComponent={renderFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.lightMustard}
              colors={[colors.lightMustard]}
            />
          ) : undefined
        }
        estimatedItemSize={220}
      />
      
      {/* Loading overlay for initial load */}
      {loading && items.length === 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.lightMustard} />
          <ThemedText style={styles.loadingOverlayText}>Loading items...</ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gridContainer: {
    paddingHorizontal: 12,
    backgroundColor: 'rgba(240, 253, 244, 0.5)',
    marginHorizontal: 4,
    borderRadius: 16,
    paddingTop: 8,
  },
  listContainer: {
    paddingHorizontal: 12,
    backgroundColor: 'rgba(240, 253, 244, 0.3)',
    marginHorizontal: 4,
    borderRadius: 16,
    paddingTop: 8,
  },
  horizontalContainer: {
    paddingLeft: 12,
  },
  contentContainer: {
    paddingBottom: 24,
    paddingTop: 8,
  },
  horizontalContent: {
    paddingRight: 16,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  itemContainer: {
    // Dynamic styles applied inline
  },
  listSeparator: {
    height: 16,
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    gap: 10,
    backgroundColor: 'rgba(255, 205, 87, 0.05)',
    marginHorizontal: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  loadingText: {
    fontSize: 14,
    color: colors.nileBlue,
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    borderRadius: 16,
  },
  loadingOverlayText: {
    fontSize: 16,
    color: colors.lightMustard,
    fontWeight: '600',
  },
});

export default React.memo(CategoryGrid);
