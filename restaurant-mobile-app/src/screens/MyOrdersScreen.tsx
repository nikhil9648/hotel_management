import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { BrandHeader, Card, Title } from '../components/Ui';
import { api, getApiError } from '../api/client';
import { colors } from '../utils/theme';

type OrderItem = { name?: string; quantity?: number; total?: number; price?: number };
type Order = {
  _id: string; orderNumber?: string; orderStatus?: string; paymentStatus?: string;
  orderType?: string; createdAt?: string; items?: OrderItem[]; totalAmount?: number;
};
const pretty = (value?: string) => String(value || 'pending').replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateText = (value?: string) => value ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'Recently placed';

export default function MyOrdersScreen({ navigation }: { navigation: any }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const response = await api.get('/restaurant-orders/my-orders'); setOrders(response.data?.orders || []); }
    catch (err) { setError(getApiError(err)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return <Screen>
    <BrandHeader onProfile={() => navigation.navigate('Profile')} />
    <View style={styles.hero}><View style={styles.heroIcon}><Ionicons name="bag-handle-outline" size={24} color={colors.accent} /></View><Text style={styles.kicker}>A LITTLE JOY, MADE FRESH</Text><Text style={styles.heroTitle}>Good things{ '\n' }are on the way.</Text><Text style={styles.heroText}>Follow your Maurya kitchen favourites from here.</Text></View>
    <View style={styles.headingRow}><Title eyebrow="FROM OUR KITCHEN" subtitle={`${orders.length} ${orders.length === 1 ? 'order' : 'orders'} on your account`}>My orders</Title><Pressable onPress={() => void load()} accessibilityRole="button" accessibilityLabel="Refresh orders" style={styles.refresh}><Ionicons name="refresh-outline" size={19} color={colors.primaryDark} /></Pressable></View>
    {loading ? <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.muted}>Checking in with the kitchen…</Text></View> : error ? <Card style={styles.emptyCard}><View style={styles.emptyIcon}><Ionicons name="cloud-offline-outline" size={25} color={colors.primaryDark} /></View><Text style={styles.emptyTitle}>Your orders aren’t available right now</Text><Text style={styles.muted}>{error}</Text><Action title="Try again" onPress={() => void load()} /></Card> : orders.length === 0 ? <Card style={styles.emptyCard}><View style={styles.emptyIcon}><Ionicons name="restaurant-outline" size={25} color={colors.primaryDark} /></View><Text style={styles.emptyTitle}>Your first Maurya favourite awaits</Text><Text style={styles.muted}>Explore the kitchen’s menu and discover something delicious.</Text><Action title="Explore the menu" onPress={() => navigation.navigate('Menu')} /></Card> : orders.map((order) => <Card key={order._id} style={styles.orderCard}>
      <View style={styles.orderTop}><View style={styles.orderIcon}><Ionicons name="receipt-outline" size={20} color={colors.primaryDark} /></View><View style={styles.orderTitleWrap}><Text style={styles.orderTitle}>{order.orderNumber || `Order #${order._id.slice(-7).toUpperCase()}`}</Text><Text style={styles.orderDate}>{dateText(order.createdAt)}</Text></View><View style={styles.status}><Text style={styles.statusText}>{pretty(order.orderStatus)}</Text></View></View>
      <View style={styles.typeLine}><Ionicons name={order.orderType === 'delivery' ? 'bicycle-outline' : order.orderType === 'takeaway' ? 'bag-outline' : 'restaurant-outline'} size={15} color={colors.primary} /><Text style={styles.typeText}>{pretty(order.orderType)}</Text><View style={styles.typeDivider} /><Text style={styles.typeText}>Payment {pretty(order.paymentStatus)}</Text></View>
      <View style={styles.itemList}>{(order.items || []).slice(0, 4).map((item, index) => <View key={`${item.name || 'item'}-${index}`} style={styles.itemRow}><Text style={styles.itemName} numberOfLines={1}>{item.name || 'Menu item'}</Text><Text style={styles.itemQuantity}>× {item.quantity || 1}</Text><Text style={styles.itemPrice}>₹{Number(item.total ?? Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString('en-IN')}</Text></View>)}{(order.items || []).length > 4 ? <Text style={styles.moreItems}>+ {(order.items || []).length - 4} more items</Text> : null}</View>
      <View style={styles.cardFooter}><Text style={styles.totalLabel}>ORDER TOTAL</Text><Text style={styles.total}>₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}</Text></View>
    </Card>)}
    <View style={styles.bottomLink}><Text style={styles.muted}>Ready for something good?</Text><Pressable onPress={() => navigation.navigate('Menu')}><Text style={styles.linkText}>Browse the menu  →</Text></Pressable></View>
  </Screen>;
}

function Action({ title, onPress }: { title: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.action}><Text style={styles.actionText}>{title}</Text><Ionicons name="arrow-forward" size={16} color="#fff" /></Pressable>; }

const styles = StyleSheet.create({
  hero: { position: 'relative', overflow: 'hidden', minHeight: 210, borderRadius: 22, backgroundColor: colors.primaryDark, padding: 21, marginBottom: 23 },
  heroIcon: { position: 'absolute', right: 20, top: 20, width: 48, height: 48, borderRadius: 16, backgroundColor: '#FFFFFF12', alignItems: 'center', justifyContent: 'center' },
  kicker: { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  heroTitle: { color: '#fff', fontSize: 31, lineHeight: 36, fontWeight: '900', marginTop: 12, letterSpacing: -0.7 },
  heroText: { color: '#E1E6E0', fontSize: 13, lineHeight: 19, marginTop: 7, maxWidth: 280 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  refresh: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.softGold, alignItems: 'center', justifyContent: 'center', marginTop: 7 },
  loading: { minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  emptyCard: { alignItems: 'center', paddingVertical: 26 },
  emptyIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.softGold, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  emptyTitle: { textAlign: 'center', color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 5 },
  action: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: colors.primaryDark, borderRadius: 13, paddingHorizontal: 17, marginTop: 15 },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  orderCard: { padding: 15, borderRadius: 19 },
  orderTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  orderIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.softGold, alignItems: 'center', justifyContent: 'center' },
  orderTitleWrap: { flex: 1, minWidth: 0 },
  orderTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  orderDate: { color: colors.muted, fontSize: 10, marginTop: 3 },
  status: { maxWidth: 112, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9, backgroundColor: colors.softGreen },
  statusText: { color: colors.success, fontSize: 9, fontWeight: '900' },
  typeLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 13, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  typeText: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  typeDivider: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.accent, marginHorizontal: 2 },
  itemList: { gap: 8, paddingVertical: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '700' },
  itemQuantity: { color: colors.muted, fontSize: 11 },
  itemPrice: { minWidth: 56, textAlign: 'right', color: colors.text, fontSize: 11, fontWeight: '800' },
  moreItems: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 11 },
  totalLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.9 },
  total: { color: colors.primaryDark, fontSize: 19, fontWeight: '900' },
  bottomLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  linkText: { color: colors.primaryDark, fontWeight: '900', fontSize: 13 },
});
