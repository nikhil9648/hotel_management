import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { Card, FoodPhoto, Title } from '../components/Ui';
import { api, assetUrl, getApiError } from '../api/client';
import type { FoodCategory, FoodItem } from '../types';
import { colors } from '../utils/theme';

export default function MenuScreen() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [foodRes, catRes] = await Promise.all([api.get('/menu/foods'), api.get('/menu/categories')]);
      setFoods(foodRes.data?.foodItems || []);
      setCategories(catRes.data?.categories || []);
    } catch (err) { setError(getApiError(err)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => foods.filter((food) => {
    const matchesSearch = `${food.name} ${food.description || ''}`.toLowerCase().includes(search.toLowerCase());
    const categoryId = typeof food.category === 'object' && food.category ? food.category._id : food.category;
    return matchesSearch && (category === 'all' || categoryId === category);
  }), [foods, search, category]);
  return <Screen>
    <Title subtitle="Explore the dishes prepared by our kitchen.">Our menu</Title>
    <View style={styles.search}><Ionicons name="search-outline" size={19} color={colors.muted}/><TextInput value={search} onChangeText={setSearch} placeholder="Search dishes..." placeholderTextColor={colors.muted} style={styles.searchInput}/></View>
    <View style={styles.chips}><Pressable onPress={() => setCategory('all')} style={[styles.chip, category === 'all' && styles.activeChip]}><Text style={[styles.chipText, category === 'all' && styles.activeChipText]}>All</Text></Pressable>{categories.map((item) => <Pressable key={item._id} onPress={() => setCategory(item._id)} style={[styles.chip, category === item._id && styles.activeChip]}><Text style={[styles.chipText, category === item._id && styles.activeChipText]}>{item.name}</Text></Pressable>)}</View>
    {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} size="large"/> : error ? <Card><Text style={styles.error}>{error}</Text><Pressable onPress={() => void load()}><Text style={styles.retry}>Tap to retry</Text></Pressable></Card> : visible.length === 0 ? <Card><Text style={styles.empty}>No dishes found. Try another search or category.</Text></Card> : visible.map((food) => {
      const price = Number(food.discountPrice && food.discountPrice > 0 && food.discountPrice < food.price ? food.discountPrice : food.price || 0);
      return <Card key={food._id} style={styles.foodCard}><FoodPhoto uri={assetUrl(food.image)} name={food.name}/><View style={styles.foodInfo}><Text style={styles.foodName}>{food.name}</Text><Text style={styles.description} numberOfLines={3}>{food.description || 'Freshly prepared in our kitchen.'}</Text><View style={styles.bottom}><Text style={styles.price}>₹{price.toLocaleString('en-IN')}</Text><Text style={styles.foodType}>{food.foodType || 'Fresh'}</Text></View></View></Card>;
    })}
    <Text style={styles.footnote}>Menu and prices are loaded from your existing website backend. Ordering/cart flow will be added in the next module.</Text>
  </Screen>;
}
const styles = StyleSheet.create({ search: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#fff', borderColor: colors.border, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, marginBottom: 14 }, searchInput: { flex: 1, height: 48, color: colors.text }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 }, chip: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' }, activeChip: { backgroundColor: colors.primary, borderColor: colors.primary }, chipText: { fontSize: 12, color: colors.text, fontWeight: '600' }, activeChipText: { color: '#fff' }, foodCard: { padding: 10 }, foodInfo: { paddingHorizontal: 3, paddingTop: 10 }, foodName: { fontSize: 17, color: colors.text, fontWeight: '800' }, description: { fontSize: 13, color: colors.muted, lineHeight: 19, marginTop: 4 }, bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }, price: { color: colors.primary, fontWeight: '900', fontSize: 16 }, foodType: { fontSize: 11, color: colors.success, backgroundColor: '#DCFCE7', overflow: 'hidden', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 8 }, error: { color: colors.danger }, retry: { color: colors.primary, fontWeight: '700', marginTop: 10 }, empty: { color: colors.muted, textAlign: 'center', paddingVertical: 10 }, footnote: { fontSize: 11, lineHeight: 17, color: colors.muted, marginTop: 3, marginBottom: 12 } });
