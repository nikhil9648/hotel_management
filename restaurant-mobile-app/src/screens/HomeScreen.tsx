
import React, { useEffect, useState } from 'react';
import {
  Animated,
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Screen from '../components/Screen';
import { Card, Title } from '../components/Ui';
import { api, assetUrl, getApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../utils/theme';
import type { FoodItem } from '../types';

type Props = { navigation: any };

export default function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const heroEntrance = React.useRef(new Animated.Value(0)).current;

  const [featured, setFeatured] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const entrance = Animated.timing(heroEntrance, {
      toValue: 1,
      duration: 480,
      useNativeDriver: true,
    });
    entrance.start();
    return () => entrance.stop();
  }, [heroEntrance]);

  useEffect(() => {
  let active = true;

  const loadFoods = async () => {
    setLoading(true);
    setError('');

    try {
      const featuredRes = await api.get('/menu/foods', {
        params: { isFeatured: true },
      });

      let items: FoodItem[] = featuredRes.data?.foodItems || [];

      // If no featured foods exist, show menu items instead.
      if (items.length === 0) {
        const allFoodsRes = await api.get('/menu/foods');
        items = allFoodsRes.data?.foodItems || [];
      }

      if (active) {
        setFeatured(items.slice(0, 4));
      }
    } catch (err) {
      if (active) {
        setError(getApiError(err));
      }
    } finally {
      if (active) {
        setLoading(false);
      }
    }
  };

  void loadFoods();

  return () => {
    active = false;
  };
}, []);

  return (
    <Screen>
      <View style={styles.top}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <Ionicons name="restaurant" size={25} color={colors.primary} />
          </View>

          <View>
            <Text style={styles.brandName}>MAURYA</Text>
            <Text style={styles.brandSub}>HOTEL & RESTAURANT</Text>
          </View>
        </View>

        <Pressable
          accessibilityLabel="Open profile"
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person-outline" size={22} color={colors.primaryDark} />
        </Pressable>
      </View>

      <View style={styles.welcome}>
        <Text style={styles.welcomeLabel}>GOOD FOOD, GOOD MOOD</Text>
        <Text style={styles.greeting}>
          Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
        </Text>
        <Text style={styles.subtitle}>
          Your next craving starts here.
        </Text>
      </View>

      <Animated.View
        style={{
          opacity: heroEntrance,
          transform: [{ translateY: heroEntrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        }}
      >
        <ImageBackground
          source={require('../../assets/hotel-maurya.jpg')}
          style={styles.hero}
          imageStyle={styles.heroImage}
          resizeMode="cover"
        >
          <View style={styles.heroOverlay}>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles-outline" size={13} color="#F9DCA4" />
            <Text style={styles.heroBadgeText}>MADE WITH LOVE</Text>
          </View>

          <Text style={styles.heroTitle}>
  Your next craving starts here.
</Text>

<Text style={styles.heroDescription}>
  Fresh picks from the Maurya kitchen, ready when you are.
</Text>

          <Pressable
            style={styles.heroButton}
            onPress={() => navigation.navigate('Menu')}
          >
            <Text style={styles.heroButtonText}>Explore menu</Text>
            <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
          </Pressable>
          </View>
        </ImageBackground>
      </Animated.View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Explore Maurya</Text>
          <Text style={styles.sectionSubtitle}>
            Something special for every occasion
          </Text>
        </View>
      </View>

      <View style={styles.quickGrid}>
        <Pressable
          style={styles.quickCard}
          onPress={() => navigation.navigate('Menu')}
        >
          <View style={styles.quickIcon}>
            <Ionicons name="restaurant-outline" size={23} color={colors.primary} />
          </View>
          <Text style={styles.quickTitle}>Order food</Text>
          <Text style={styles.quickCopy}>Fresh from our kitchen</Text>
          <View style={styles.quickArrow}>
            <Ionicons name="arrow-forward" size={17} color={colors.primary} />
          </View>
        </Pressable>

        <Pressable
          style={styles.quickCard}
          onPress={() => navigation.navigate('Rooms')}
        >
          <View style={styles.quickIcon}>
            <Ionicons name="bed-outline" size={23} color={colors.primary} />
          </View>
          <Text style={styles.quickTitle}>Book a room</Text>
          <Text style={styles.quickCopy}>Find your perfect stay</Text>
          <View style={styles.quickArrow}>
            <Ionicons name="arrow-forward" size={17} color={colors.primary} />
          </View>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Chef's picks</Text>
          <Text style={styles.sectionSubtitle}>
            Selected from our menu
          </Text>
        </View>

        <Pressable onPress={() => navigation.navigate('Menu')}>
          <Text style={styles.viewAll}>View all  →</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.loader}
        />
      ) : error ? (
        <Card>
          <Text style={styles.muted}>{error}</Text>
          <Pressable onPress={() => navigation.navigate('Menu')}>
            <Text style={styles.viewAll}>Explore menu →</Text>
          </Pressable>
        </Card>
      ) : featured.length === 0 ? (
        <Card>
          <Text style={styles.muted}>
            Our kitchen's favourites will appear here soon.
          </Text>
          <Pressable onPress={() => navigation.navigate('Menu')}>
            <Text style={styles.viewAll}>Browse menu →</Text>
          </Pressable>
        </Card>
      ) : (
        featured.map((food) => {
          const price = Number(
            food.discountPrice &&
              food.discountPrice > 0 &&
              food.discountPrice < food.price
              ? food.discountPrice
              : food.price || 0,
          );

          const image = assetUrl(food.image);

          return (
            <Card key={food._id} style={styles.foodCard}>
              <View style={styles.foodRow}>
                {image ? (
                  <Image
                    source={{ uri: image }}
                    style={styles.foodImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.foodPlaceholder}>
                    <Ionicons
                      name="fast-food-outline"
                      size={29}
                      color={colors.primary}
                    />
                  </View>
                )}

                <View style={styles.foodInfo}>
                  <Text style={styles.foodName} numberOfLines={2}>
                    {food.name}
                  </Text>

                  <Text style={styles.foodDescription} numberOfLines={2}>
                    {food.description || 'Freshly prepared in our kitchen.'}
                  </Text>

                  <View style={styles.priceRow}>
                    <Text style={styles.price}>
                      ₹{price.toLocaleString('en-IN')}
                    </Text>
                    {food.discountPrice &&
                    food.discountPrice > 0 &&
                    food.discountPrice < food.price ? (
                      <Text style={styles.oldPrice}>
                        ₹{Number(food.price).toLocaleString('en-IN')}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            </Card>
          );
        })
      )}

      <Pressable
        style={styles.roomsBanner}
        onPress={() => navigation.navigate('Rooms')}
      >
        <View style={styles.roomsBannerIcon}>
          <Ionicons name="bed-outline" size={25} color="#F4D9A4" />
        </View>
        <View style={styles.roomsBannerText}>
          <Text style={styles.roomsBannerTitle}>Planning a stay?</Text>
          <Text style={styles.roomsBannerSubtitle}>
            Discover rooms made for your comfort.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={21} color="#FFFFFF" />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 25,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  brandIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: '#F5E6D1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    color: colors.primaryDark,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: 2.2,
  },
  brandSub: {
    color: colors.muted,
    fontSize: 9,
    letterSpacing: 1.8,
    marginTop: 2,
  },
  profileButton: {
    width: 43,
    height: 43,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcome: {
    marginBottom: 19,
  },
  welcomeLabel: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  greeting: {
    color: colors.text,
    fontSize: 31,
    fontWeight: '900',
    marginTop: 8,
    letterSpacing: -0.6,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    marginTop: 5,
  },
  hero: {
    minHeight: 300,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.primaryDark,
    marginBottom: 28,
  },
  heroImage: {
    borderRadius: 22,
  },
  heroOverlay: {
    flex: 1,
    minHeight: 300,
    justifyContent: 'flex-end',
    padding: 21,
    backgroundColor: 'rgba(17, 37, 31, 0.65)',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.13)',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginBottom: 13,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 31,
    fontWeight: '900',
    lineHeight: 37,
    letterSpacing: -0.4,
  },
  heroDescription: {
    color: '#F3EDE2',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
    maxWidth: 300,
  },
  heroButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: colors.primary,
    paddingHorizontal: 17,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 17,
  },
  heroButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  quickCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 155,
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  quickIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#F8EBDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 15,
    marginTop: 12,
  },
  quickCopy: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  quickArrow: {
    position: 'absolute',
    right: 12,
    top: 13,
  },
  viewAll: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 8,
  },
  loader: {
    marginVertical: 25,
  },
  foodCard: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  foodImage: {
    width: 100,
    height: 105,
    borderRadius: 12,
    backgroundColor: '#F5E6D1',
  },
  foodPlaceholder: {
    width: 100,
    height: 105,
    borderRadius: 12,
    backgroundColor: '#F5E6D1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodInfo: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 3,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },
  foodDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  price: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 16,
  },
  oldPrice: {
    color: colors.muted,
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  roomsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 17,
    backgroundColor: colors.primaryDark,
    marginTop: 8,
    marginBottom: 20,
  },
  roomsBannerIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomsBannerText: {
    flex: 1,
  },
  roomsBannerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  roomsBannerSubtitle: {
    color: '#E6E4D9',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
});
