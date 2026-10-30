import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { BrandHeader, Card, Title } from '../components/Ui';
import { api, getApiError } from '../api/client';
import { colors } from '../utils/theme';

type Booking = {
  _id: string; bookingNumber?: string; bookingStatus?: string; paymentStatus?: string;
  checkInDate?: string; checkOutDate?: string; numberOfNights?: number;
  totalAmount?: number; room?: { roomNumber?: string | number; floor?: string | number };
};
const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date pending';
const label = (value?: string) => String(value || 'pending').replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function MyBookingsScreen({ navigation }: { navigation: any }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const response = await api.get('/bookings/my-bookings'); setBookings(response.data?.bookings || []); }
    catch (err) { setError(getApiError(err)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return <Screen>
    <BrandHeader onProfile={() => navigation.navigate('Profile')} />
    <View style={styles.hero}><View style={styles.heroIcon}><Ionicons name="bed-outline" size={25} color={colors.accent} /></View><Text style={styles.kicker}>YOUR NEXT MAURYA MOMENT</Text><Text style={styles.heroTitle}>Stay a little.{ '\n' }Feel a lot.</Text><Text style={styles.heroText}>Your reservations and upcoming stays, all together.</Text></View>
    <View style={styles.headingRow}><Title eyebrow="YOUR STAYS" subtitle={`${bookings.length} ${bookings.length === 1 ? 'reservation' : 'reservations'} on your account`}>My bookings</Title><Pressable onPress={() => void load()} accessibilityRole="button" accessibilityLabel="Refresh bookings" style={styles.refresh}><Ionicons name="refresh-outline" size={19} color={colors.primaryDark} /></Pressable></View>
    {loading ? <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.muted}>Gathering your reservations…</Text></View> : error ? <Card style={styles.emptyCard}><View style={styles.emptyIcon}><Ionicons name="cloud-offline-outline" size={25} color={colors.primaryDark} /></View><Text style={styles.emptyTitle}>We couldn’t load your bookings</Text><Text style={styles.muted}>{error}</Text><Action title="Try again" onPress={() => void load()} /></Card> : bookings.length === 0 ? <Card style={styles.emptyCard}><View style={styles.emptyIcon}><Ionicons name="calendar-outline" size={25} color={colors.primaryDark} /></View><Text style={styles.emptyTitle}>Your Maurya stay starts here</Text><Text style={styles.muted}>Find a room and make space for a little time away.</Text><Action title="Explore rooms" onPress={() => navigation.navigate('Rooms')} /></Card> : bookings.map((booking) => <Card key={booking._id} style={styles.bookingCard}>
      <View style={styles.bookingTop}><View style={styles.roomIcon}><Ionicons name="bed-outline" size={21} color={colors.primaryDark} /></View><View style={styles.bookingTitleWrap}><Text style={styles.bookingTitle}>Room {booking.room?.roomNumber || 'reservation'}</Text><Text style={styles.bookingRef}>{booking.bookingNumber || `#${booking._id.slice(-7).toUpperCase()}`}</Text></View><View style={styles.status}><Text style={styles.statusText}>{label(booking.bookingStatus)}</Text></View></View>
      <View style={styles.dateRow}><DateBlock labelText="CHECK-IN" value={dateLabel(booking.checkInDate)} /><Ionicons name="arrow-forward" size={16} color={colors.primary} /><DateBlock labelText="CHECK-OUT" value={dateLabel(booking.checkOutDate)} /></View>
      <View style={styles.cardFooter}><View><Text style={styles.meta}>PAYMENT · {label(booking.paymentStatus)}</Text><Text style={styles.total}>₹{Number(booking.totalAmount || 0).toLocaleString('en-IN')}</Text></View><Text style={styles.nights}>{booking.numberOfNights || 1} night{Number(booking.numberOfNights || 1) === 1 ? '' : 's'}</Text></View>
    </Card>)}
    <View style={styles.bottomLink}><Text style={styles.muted}>Planning another visit?</Text><Pressable onPress={() => navigation.navigate('Rooms')}><Text style={styles.linkText}>Find a room  →</Text></Pressable></View>
  </Screen>;
}

function DateBlock({ labelText, value }: { labelText: string; value: string }) { return <View style={styles.dateBlock}><Text style={styles.meta}>{labelText}</Text><Text style={styles.dateValue}>{value}</Text></View>; }
function Action({ title, onPress }: { title: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.action}><Text style={styles.actionText}>{title}</Text><Ionicons name="arrow-forward" size={16} color="#fff" /></Pressable>; }

const styles = StyleSheet.create({
  hero: { position: 'relative', overflow: 'hidden', minHeight: 213, borderRadius: 22, backgroundColor: colors.primaryDark, padding: 21, marginBottom: 23 },
  heroIcon: { position: 'absolute', right: 20, top: 20, width: 48, height: 48, borderRadius: 16, backgroundColor: '#FFFFFF12', alignItems: 'center', justifyContent: 'center' },
  kicker: { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  heroTitle: { color: '#fff', fontSize: 31, lineHeight: 36, fontWeight: '900', marginTop: 12, letterSpacing: -0.7 },
  heroText: { color: '#E1E6E0', fontSize: 13, lineHeight: 19, marginTop: 7, maxWidth: 270 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  refresh: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.softGold, alignItems: 'center', justifyContent: 'center', marginTop: 7 },
  loading: { minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  emptyCard: { alignItems: 'center', paddingVertical: 26 },
  emptyIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.softGold, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  emptyTitle: { textAlign: 'center', color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 5 },
  action: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: colors.primaryDark, borderRadius: 13, paddingHorizontal: 17, marginTop: 15 },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  bookingCard: { padding: 15, borderRadius: 19 },
  bookingTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  roomIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.softGold, alignItems: 'center', justifyContent: 'center' },
  bookingTitleWrap: { flex: 1 },
  bookingTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  bookingRef: { color: colors.muted, fontSize: 11, marginTop: 3 },
  status: { maxWidth: 104, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: colors.softGreen },
  statusText: { color: colors.success, fontSize: 9, fontWeight: '900' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 11, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, marginTop: 14, paddingVertical: 13 },
  dateBlock: { flex: 1 },
  meta: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  dateValue: { color: colors.text, fontSize: 13, fontWeight: '800', marginTop: 5 },
  cardFooter: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 12 },
  total: { color: colors.primaryDark, fontSize: 19, fontWeight: '900', marginTop: 3 },
  nights: { color: colors.muted, fontSize: 11, fontWeight: '700', marginBottom: 3 },
  bottomLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  linkText: { color: colors.primaryDark, fontWeight: '900', fontSize: 13 },
});
