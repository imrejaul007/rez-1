import React from 'react';
import { View, Text, Pressable, StyleSheet, ImageBackground, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Brand {
  id: string;
  name: string;
  rating: number;
  address: string;
  cashback: number;
  image: string;
  category: string;
}

const brands: Brand[] = [
  {
    id: '1',
    name: 'Zara',
    rating: 4.9,
    address: 'Zara Store, Phoenix Marketcity, Whitefield, Bangalore, Karnataka 560066, Indi',
    cashback: 12,
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=200&fit=crop',
    category: 'Fashion'
  },
  {
    id: '2',
    name: 'Lenovo India',
    rating: 4.8,
    address: '45 Connaught Place, New Delhi, Delhi 110001',
    cashback: 20,
    image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=200&fit=crop',
    category: 'Electronics'
  },
  {
    id: '3',
    name: 'H&M',
    rating: 4.7,
    address: 'Forum Mall, Koramangala, Bangalore, Karnataka 560095',
    cashback: 15,
    image: 'https://images.unsplash.com/photo-1555529902-ce73091d4e3f?w=400&h=200&fit=crop',
    category: 'Fashion'
  }
];

const BrandList = () => {
  const handleBrandPress = (brand: Brand) => {
    console.log('Brand pressed:', brand.name);
  };

  const handleViewAllPress = () => {
    console.log('View all brands pressed');
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={14} color="#FFD700" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={14} color="#FFD700" />
      );
    }

    return stars;
  };

  const renderBrand = (brand: Brand) => (
    <Pressable
      key={brand.id}
      style={styles.brandCard}
      onPress={() => handleBrandPress(brand)}
     
    >
      <ImageBackground
        source={{ uri: brand.image }}
        style={styles.brandImage}
        imageStyle={styles.imageStyle}
      >
        <View style={styles.overlay} />
      </ImageBackground>
      
      <View style={styles.brandInfo}>
        <View style={styles.brandHeader}>
          <Text style={styles.brandName}>{brand.name}</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>{brand.rating}</Text>
            <View style={styles.starsContainer}>
              {renderStars(brand.rating)}
            </View>
          </View>
        </View>
        
        <Text style={styles.brandAddress} numberOfLines={2}>
          {brand.address}
        </Text>
        
        <View style={styles.cashbackContainer}>
          <Text style={styles.cashbackText}>Upto {brand.cashback}% cash back</Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Explore all brands</Text>
        <Pressable onPress={handleViewAllPress}>
          <Text style={styles.viewAllText}>View all</Text>
        </Pressable>
      </View>

      {/* Brand Cards */}
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {brands.map(renderBrand)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  scrollContainer: {
    maxHeight: 400,
  },
  brandCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F8F9FA',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  brandImage: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  imageStyle: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  brandInfo: {
    padding: 16,
  },
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandAddress: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  cashbackContainer: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  cashbackText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
});

export default BrandList;