import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { BrandHeader, Card, Title } from '../components/Ui';
import { api, assetUrl, getApiError } from '../api/client';
import type { FoodCategory, FoodItem } from '../types';
import { colors } from '../utils/theme';

export default function MenuScreen({ navigation }: { navigation: any }) {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [foodRes, catRes] = await Promise.all([
        api.get('/menu/foods'),
        api.get('/menu/categories'),
      ]);
      setFoods((foodRes.data?.foodItems || []).filter((food: FoodItem) => food.isAvailable !== false));
      setCategories((catRes.data?.categories || []).filter((item: FoodCategory) => item));
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => foods.filter((food) => {
    const haystack = `${food.name} ${food.description || ''} ${typeof food.category === 'object' ? food.category?.name || '' : ''}`.toLowerCase();
    const categoryId = typeof food.category === 'object' && food.category ? food.category._id : food.category;
    return haystack.includes(search.trim().toLowerCase()) && (category === 'all' || categoryId === category);
  }), [foods, search, category]);

  return (
    <Screen>
      <BrandHeader onProfile={() => navigation.navigate('Profile')} />

      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>FROM THE MAURYA KITCHEN</Text>
          <Text style={styles.heroTitle}>Made to be{ '\n' }savoured<Text style={styles.heroDot}>.</Text></Text>
          <Text style={styles.heroSubtitle}>Fresh favourites, thoughtfully prepared.</Text>
        </View>
        <View style={styles.heroIcon}><Ionicons name="restaurant-outline" size={26} color={colors.accent} /></View>
        <View style={styles.heroRule} />
        <View style={styles.heroFooter}>
          <Ionicons name="sparkles-outline" size={15} color={colors.accent} />
          <Text style={styles.heroFooterText}>GOOD FOOD, GOOD MOOD</Text>
          <Text style={styles.heroFooterRight}>EST. WITH CARE</Text>
        </View>
      </View>

      <Title eyebrow="A LITTLE SOMETHING FOR EVERYONE" subtitle="Explore dishes from our kitchen, made fresh for you.">
        The menu
      </Title>

      <View style={styles.search}>
        <Ionicons name="search-outline" size={19} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search dishes or ingredients"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          returnKeyType="search"
          accessibilityLabel="Search menu"
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} accessibilityLabel="Clear search" hitSlop={8} style={styles.clearSearch}>
            <Ionicons name="close-circle" size={19} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <CategoryChip title="All dishes" selected={category === 'all'} onPress={() => setCategory('all')} />
        {categories.map((item) => (
          <CategoryChip key={item._id} title={item.name} selected={category === item._id} onPress={() => setCategory(item._id)} />
        ))}
      </ScrollView>

      <View style={styles.listHeading}>
        <View>
          <Text style={styles.listTitle}>{search || category !== 'all' ? 'Your picks' : 'Kitchen favourites'}</Text>
          <Text style={styles.listSubtitle}>{loading ? 'Preparing the menu…' : `${visible.length} ${visible.length === 1 ? 'dish' : 'dishes'} to discover`}</Text>
        </View>
        <Pressable onPress={() => void load()} disabled={loading} accessibilityRole="button" accessibilityLabel="Refresh menu" style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}>
          <Ionicons name="refresh-outline" size={18} color={colors.primaryDark} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingBox}><ActivityIndicator color={colors.primary} size="large" /><Text style={styles.loadingText}>Bringing the menu to you</Text></View>
      ) : error ? (
        <Card style={styles.stateCard}>
          <View style={styles.stateIcon}><Ionicons name="cloud-offline-outline" size={25} color={colors.primaryDark} /></View>
          <Text style={styles.stateTitle}>The menu is taking a moment</Text>
          <Text style={styles.stateText}>{error}</Text>
          <Pressable onPress={() => void load()} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text><Ionicons name="arrow-forward" size={16} color="#fff" /></Pressable>
        </Card>
      ) : visible.length === 0 ? (
        <Card style={styles.stateCard}>
          <View style={styles.stateIcon}><Ionicons name="search-outline" size={25} color={colors.primaryDark} /></View>
          <Text style={styles.stateTitle}>Nothing on the menu matches yet</Text>
          <Text style={styles.stateText}>Try another dish name or choose a different category.</Text>
          <Pressable onPress={() => { setSearch(''); setCategory('all'); }} style={styles.textAction}><Text style={styles.textActionLabel}>Clear filters</Text></Pressable>
        </Card>
      ) : (
        <View style={styles.foodGrid}>
          {visible.map((food, index) => <FoodCard key={food._id} food={food} index={index} />)}
        </View>
      )}

      <View style={styles.bottomNote}>
        <View style={styles.noteIcon}><Ionicons name="leaf-outline" size={17} color={colors.success} /></View>
        <Text style={styles.noteText}>Freshly prepared with care, here at Maurya.</Text>
      </View>
    </Screen>
  );
}

function CategoryChip({ title, selected, onPress }: { title: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.chip, selected && styles.activeChip, pressed && styles.pressed]}>
      {selected ? <Ionicons name="checkmark-circle" size={15} color="#fff" /> : null}
      <Text style={[styles.chipText, selected && styles.activeChipText]}>{title}</Text>
    </Pressable>
  );
}

function FoodCard({ food, index }: { food: FoodItem; index: number }) {
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(entrance, { toValue: 1, duration: 360, delay: Math.min(index * 45, 240), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [entrance, index]);

  const price = Number(food.discountPrice && food.discountPrice > 0 && food.discountPrice < food.price ? food.discountPrice : food.price || 0);
  const categoryName = typeof food.category === 'object' && food.category ? food.category.name : 'FROM OUR KITCHEN';
  const image = assetUrl(food.image);

  return (
    <Animated.View style={{ opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [11, 0] }) }] }}>
      <Card style={styles.foodCard}>
        <View style={styles.foodImageWrap}>
          {image ? <Image source={{ uri: image }} accessibilityLabel={food.name} style={styles.foodImage} resizeMode="cover" /> : <View style={[styles.foodImage, styles.imageFallback]}><Ionicons name="restaurant-outline" size={31} color={colors.primary} /></View>}
          <View style={styles.dietBadge}><View style={[styles.dietDot, String(food.foodType || '').toLowerCase().includes('non') && styles.nonVegDot]} /><Text style={styles.dietText}>{food.foodType || 'MAURYA SPECIAL'}</Text></View>
          {food.isFeatured ? <View style={styles.featuredBadge}><Ionicons name="sparkles" size={11} color={colors.primaryDark} /><Text style={styles.featuredText}>CHEF’S PICK</Text></View> : null}
        </View>
        <View style={styles.foodInfo}>
          <Text style={styles.foodCategory}>{categoryName?.toUpperCase()}</Text>
          <Text style={styles.foodName}>{food.name}</Text>
          <Text style={styles.description} numberOfLines={2}>{food.description || 'Freshly prepared with care in our kitchen.'}</Text>
          <View style={styles.foodDivider} />
          <View style={styles.foodBottom}>
            <View style={styles.priceWrap}>
              <Text style={styles.price}>₹{price.toLocaleString('en-IN')}</Text>
              {food.discountPrice && food.discountPrice > 0 && food.discountPrice < food.price ? <Text style={styles.oldPrice}>₹{Number(food.price).toLocaleString('en-IN')}</Text> : null}
            </View>
            <View style={styles.freshMark}><Ionicons name="checkmark-circle" size={14} color={colors.success} /><Text style={styles.freshText}>Fresh today</Text></View>
          </View>
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 183, backgroundColor: colors.primaryDark, borderRadius: 22, padding: 21, marginBottom: 25, overflow: 'hidden' },
  heroCopy: { maxWidth: '82%' },
  heroEyebrow: { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1.7 },
  heroTitle: { color: '#FFFEFB', fontSize: 31, lineHeight: 36, fontWeight: '900', letterSpacing: -0.7, marginTop: 9 },
  heroDot: { color: colors.accent },
  heroSubtitle: { color: '#E3E6E0', fontSize: 12, lineHeight: 18, marginTop: 7 },
  heroIcon: { position: 'absolute', right: 22, top: 27, width: 49, height: 49, borderRadius: 16, backgroundColor: '#FFFFFF12', alignItems: 'center', justifyContent: 'center' },
  heroRule: { height: 1, backgroundColor: '#FFFFFF24', marginTop: 17 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingTop: 12 },
  heroFooterText: { flex: 1, color: '#F7F3EB', fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  heroFooterRight: { color: '#BFCAC1', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  search: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, marginBottom: 14 },
  searchInput: { flex: 1, minWidth: 0, height: 50, color: colors.text, fontSize: 14 },
  clearSearch: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  chips: { gap: 9, paddingBottom: 4, paddingRight: 10 },
  chip: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 15, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  activeChip: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  chipText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  activeChipText: { color: '#fff' },
  listHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 21, marginBottom: 12 },
  listTitle: { color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  listSubtitle: { color: colors.muted, fontSize: 12, marginTop: 4 },
  refresh: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.softGold, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  loadingBox: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  foodGrid: { gap: 2 },
  foodCard: { padding: 9, borderRadius: 20, marginBottom: 14 },
  foodImageWrap: { position: 'relative' },
  foodImage: { width: '100%', height: 188, borderRadius: 14, backgroundColor: colors.softGold },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  dietBadge: { position: 'absolute', left: 10, bottom: 10, minHeight: 29, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, borderRadius: 9, backgroundColor: '#FFFEF7' },
  dietDot: { width: 9, height: 9, borderRadius: 5, borderWidth: 1, borderColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  nonVegDot: { borderColor: '#AF3E37', backgroundColor: '#AF3E37' },
  dietText: { color: colors.text, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  featuredBadge: { position: 'absolute', right: 10, top: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFFEF7', paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9 },
  featuredText: { color: colors.primaryDark, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  foodInfo: { paddingHorizontal: 5, paddingTop: 13, paddingBottom: 4 },
  foodCategory: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.25 },
  foodName: { color: colors.text, fontSize: 19, fontWeight: '900', letterSpacing: -0.25, marginTop: 5 },
  description: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5 },
  foodDivider: { height: 1, backgroundColor: colors.border, marginTop: 13 },
  foodBottom: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 9 },
  priceWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  price: { color: colors.primaryDark, fontSize: 18, fontWeight: '900' },
  oldPrice: { color: colors.muted, fontSize: 12, textDecorationLine: 'line-through' },
  freshMark: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  freshText: { color: colors.success, fontSize: 10, fontWeight: '700' },
  stateCard: { alignItems: 'center', paddingVertical: 25, marginTop: 8 },
  stateIcon: { width: 51, height: 51, borderRadius: 17, backgroundColor: colors.softGold, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  stateTitle: { textAlign: 'center', color: colors.text, fontSize: 17, fontWeight: '900' },
  stateText: { textAlign: 'center', color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 6 },
  retryButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primaryDark, borderRadius: 12, paddingHorizontal: 16, marginTop: 15 },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  textAction: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, marginTop: 8 },
  textActionLabel: { color: colors.primaryDark, fontSize: 13, fontWeight: '800' },
  bottomNote: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 5, paddingTop: 12, marginBottom: 8 },
  noteIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center' },
  noteText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
});
