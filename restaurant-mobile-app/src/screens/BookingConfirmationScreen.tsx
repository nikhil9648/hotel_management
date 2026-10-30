import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  NativeModules,
  ScrollView,
  StyleSheet,
  Text,
  TurboModuleRegistry,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Screen from '../components/Screen';
import { Button, Card, Message } from '../components/Ui';
import { api, getApiError } from '../api/client';
import { colors } from '../utils/theme';

export default function BookingConfirmationScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) {
  const { booking, room, checkIn, checkOut, nights } = route.params || {};

  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const bookingId = booking?._id || booking?.id;
  const roomType = room?.roomType?.name || 'Hotel room';
  const roomNumber = room?.roomNumber ?? '—';
  const total = Number(booking?.totalAmount ?? 0);

  const money = (value: number) =>
    `₹${value.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    })}`;

  
const payNow = async () => {
  if (!bookingId) {
    setError('Booking ID is missing. Please create the booking again.');
    return;
  }

  setError('');
  setPaying(true);

  try {
    if (
      !NativeModules.RNRazorpayCheckout &&
      !TurboModuleRegistry.get('RNRazorpayCheckout')
    ) {
      setError(
        'Razorpay payments need the installed development app. Expo Go does not include the Razorpay native module.',
      );
      return;
    }

    const { default: RazorpayCheckout } = await import('react-native-razorpay');
    console.log('Creating Razorpay order for booking:', bookingId);

    const orderResponse = await api.post('/payments/create-order', {
      bookingId,
    });

    console.log('Create order response:', orderResponse.data);

    const order = orderResponse.data?.order;
    const key = orderResponse.data?.key;

    if (!order?.id || !key || !order?.amount) {
      throw new Error(
        orderResponse.data?.message ||
          'Payment order ID, key, or amount is missing.',
      );
    }

    const paymentResult = await RazorpayCheckout.open({
      key,
      amount: String(order.amount),
      currency: order.currency || 'INR',
      name: 'Maurya Kitchen & Stays',
      description: `Booking ${booking.bookingNumber || ''}`,
      order_id: order.id,
      prefill: {
        name: booking.guestDetails?.name || '',
        email: booking.guestDetails?.email || '',
        contact: booking.guestDetails?.phone || '',
      },
      theme: {
        color: colors.primaryDark,
      },
    });

    console.log('Razorpay payment result:', paymentResult);

    const verifyResponse = await api.post('/payments/verify', {
      bookingId,
      razorpay_order_id: paymentResult.razorpay_order_id,
      razorpay_payment_id: paymentResult.razorpay_payment_id,
      razorpay_signature: paymentResult.razorpay_signature,
    });

    console.log('Payment verification response:', verifyResponse.data);

    if (
      verifyResponse.data?.success &&
      verifyResponse.data?.payment?.status === 'paid'
    ) {
      Alert.alert(
        'Payment successful',
        `Booking: ${
          verifyResponse.data?.booking?.bookingNumber ||
          booking.bookingNumber ||
          ''
        }\nPayment status: Paid`,
        [
          {
            text: 'View profile',
            onPress: () =>
              navigation.navigate('Main', {
                screen: 'Profile',
              }),
          },
        ],
      );
    } else {
      setError(
        'Payment verification was not confirmed. Check your booking status before retrying.',
      );
    }
  } catch (err: any) {
    console.log('PAYMENT ERROR:', {
      message: err?.message,
      code: err?.code,
      description: err?.description,
      status: err?.response?.status,
      response: err?.response?.data,
    });

    const backendMessage = err?.response?.data?.message;
    const cancelled =
      err?.code === 0 ||
      /cancel/i.test(err?.description || '');

    setError(
      cancelled
        ? 'Payment was cancelled. Your booking remains unpaid.'
        : backendMessage ||
            err?.description ||
            err?.message ||
            'Unable to start payment. Check the terminal logs.',
    );
  } finally {
    setPaying(false);
  }
};


  if (!bookingId) {
    return (
      <Screen>
        <Card>
          <Text style={styles.heading}>Booking details unavailable</Text>
          <Text style={styles.muted}>
            Return to Rooms and create your booking again.
          </Text>
          <Button title="Back to rooms" onPress={() => navigation.navigate('Main', { screen: 'Rooms' })} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={30} color="#F2D4A0" />
          </View>

          <Text style={styles.eyebrow}>YOUR STAY IS RESERVED</Text>
          <Text style={styles.heroTitle}>One lovely stay</Text>
          <Text style={styles.heroAccent}>to look forward to.</Text>
          <Text style={styles.heroDescription}>
            Your room reservation has been created. Keep your booking number handy.
          </Text>
        </View>

        <Card style={styles.bookingCard}>
          <Text style={styles.label}>BOOKING NUMBER</Text>
          <Text style={styles.bookingNumber}>
            {booking.bookingNumber || 'Booking created'}
          </Text>

          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              {booking.bookingStatus || 'Pending'}
            </Text>
          </View>

          <View style={styles.divider} />

          <InfoRow
            icon="bed-outline"
            label="ROOM"
            value={`${roomType} · Room ${roomNumber}`}
          />
          <InfoRow icon="calendar-outline" label="CHECK-IN" value={checkIn} />
          <InfoRow icon="calendar-outline" label="CHECK-OUT" value={checkOut} />
          <InfoRow
            icon="people-outline"
            label="GUESTS"
            value={`${booking.adults ?? 1} adult(s)`}
          />
          <InfoRow
            icon="time-outline"
            label="STAY LENGTH"
            value={`${nights || 1} night(s)`}
          />

          <View style={styles.divider} />

          <Text style={styles.label}>TOTAL AMOUNT</Text>
          <Text style={styles.total}>{money(total)}</Text>
          <Text style={styles.muted}>Final amount calculated by the server.</Text>
        </Card>

        <Card style={styles.paymentCard}>
          <Text style={styles.label}>PAYMENT & NEXT STEPS</Text>
          <Text style={styles.paymentHeading}>Almost all set.</Text>

          <View style={styles.paymentStatusRow}>
            <Text style={styles.muted}>PAYMENT STATUS</Text>
            <Text style={styles.pending}>● Pending</Text>
          </View>

          <Text style={styles.muted}>
            Complete your payment of {money(total)} to finish your reservation.
          </Text>

          {error ? <Message error>{error}</Message> : null}

          <Button
            title={paying ? 'Opening payment…' : 'Pay Now'}
            onPress={payNow}
            loading={paying}
          />

          {paying ? (
            <ActivityIndicator
              color={colors.primary}
              style={{ marginTop: 12 }}
            />
          ) : null}

          <View style={styles.secureRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={17}
              color={colors.muted}
            />
            <Text style={styles.secureText}>
              Your payment is verified by the server.
            </Text>
          </View>
        </Card>

        <Button
          title="Back to rooms"
          onPress={() => navigation.navigate('Main', { screen: 'Rooms' })}
        />
      </ScrollView>
    </Screen>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={19} color={colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingBottom: 28,
  },
  hero: {
    backgroundColor: colors.primaryDark,
    borderRadius: 22,
    padding: 23,
    alignItems: 'center',
    marginBottom: 18,
  },
  checkCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: '#F2D4A0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  eyebrow: {
    color: '#F2D4A0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 15,
    textAlign: 'center',
  },
  heroAccent: {
    color: '#F0D9C7',
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
  },
  heroDescription: {
    color: '#F4EEE6',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 12,
  },
  bookingCard: {
    marginBottom: 16,
  },
  label: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  bookingNumber: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
    marginTop: 7,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#EAF5EC',
    marginTop: 10,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  statusText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginVertical: 8,
  },
  infoIcon: {
    width: 37,
    height: 37,
    borderRadius: 11,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  total: {
    color: colors.text,
    fontSize: 27,
    fontWeight: '900',
    marginTop: 7,
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },
  paymentCard: {
    marginBottom: 18,
  },
  paymentHeading: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 12,
    marginBottom: 18,
    textTransform: 'capitalize',
  },
  paymentStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pending: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 14,
  },
  secureText: {
    color: colors.muted,
    fontSize: 11,
  },
  heading: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
});