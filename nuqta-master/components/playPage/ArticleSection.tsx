// @ts-nocheck
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { PLAY_PAGE_COLORS } from '@/types/playPage.types';
import { Article } from '@/types/article.types';
import SectionHeader from './SectionHeader';
import ArticleCard from './ArticleCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

interface ArticleSectionProps {
  articles: Article[];
  onArticlePress: (article: Article) => void;
  onViewAllPress?: () => void;
  loading?: boolean;
}

function ArticleSection({
  articles,
  onArticlePress,
  onViewAllPress,
  loading = false
}: ArticleSectionProps) {
  const renderItem = ({ item }: { item: Article }) => (
    <View style={{ width: CARD_WIDTH }}>
      <ArticleCard
        article={item}
        onPress={onArticlePress}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Article"
        showViewAll={articles.length > 4}
        onViewAllPress={onViewAllPress}
      />

      <FlashList
        data={articles.slice(0, 4)}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.id || `article-${index}`}
        numColumns={2}
        contentContainerStyle={styles.gridContainer}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={200}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: PLAY_PAGE_COLORS.background,
    paddingBottom: 24,
    marginBottom: 8,
  },
  gridContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  row: {
    justifyContent: 'space-between',
    gap: 12,
  },
});
export default React.memo(ArticleSection);
