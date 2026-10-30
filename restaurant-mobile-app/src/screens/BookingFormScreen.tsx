import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Screen from '../components/Screen';
import { Button, Card, Field, Message } from '../components/Ui';
import { api, getApiError } from '../api/client';
import { colors } from '../utils/theme';

export default function BookingFormScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) {
  const {
  room,
  checkInDate,
  checkOutDate,
  nights: passedNights,
} = route.params || {};

const checkIn = checkInDate;
const checkOut = checkOutDate;

const nights =
  Number(passedNights) ||
  (checkIn && checkOut
    ? Math.round(
        (new Date(`${checkOut}T00:00:00`).getTime() -
          new Date(`${checkIn}T00:00:00`).getTime()) /
          86400000,
      )
    : 1);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [idProofType, setIdProofType] = useState('Aadhar');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [adults, setAdults] = useState('1');
  const [children, setChildren] = useState('0');
  const [specialRequests, setSpecialRequests] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!room?._id || !checkIn || !checkOut) {
    return (
      <Screen>
        <Card>
          <Text style={styles.heading}>Room details unavailable</Text>
          <Text style={styles.muted}>
            Please return to Rooms and select an available room again.
          </Text>
          <Button
            title="Back to rooms"
            onPress={() => navigation.goBack()}
          />
        </Card>
      </Screen>
    );
  }

  const price = Number(room.price ?? room.roomType?.basePrice ?? 0);
  const roomCharges = price * Number(nights || 1);
  const estimatedTotal = roomCharges * 1.18;

  const submitBooking = async () => {
    setError('');

    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('Please enter your full name, email and mobile number.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!/^\d{10}$/.test(phone.trim())) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    const adultCount = Number(adults);
    const childCount = Number(children);

    if (
      !Number.isInteger(adultCount) ||
      adultCount < 1 ||
      !Number.isInteger(childCount) ||
      childCount < 0
    ) {
      setError('Enter a valid number of adults and children.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post('/bookings', {
        room: room._id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        adults: adultCount,
        children: childCount,
        guestDetails: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          address: address.trim(),
          idProofType,
          idProofNumber: idProofNumber.trim(),
        },
        specialRequests: specialRequests.trim(),
        paymentMethod: 'razorpay',
      });

      const booking = response.data?.booking;

      if (!booking?._id && !booking?.id) {
  setError('Booking details were not returned by the server.');
  return;
}

navigation.replace('BookingConfirmation', {
  booking,
  room,
  checkIn,
  checkOut,
  nights,
});
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>JUST A FEW LITTLE DETAILS</Text>
        <Text style={styles.heading}>Stay yours.</Text>
        <Text style={styles.subtitle}>
          Tell us who’s joining you. We’ll take care of the rest.
        </Text>

        <Card style={styles.roomCard}>
          <View style={styles.roomIcon}>
            <Ionicons name="bed-outline" size={30} color={colors.primary} />
          </View>

          <Text style={styles.eyebrow}>YOUR SELECTED ROOM</Text>
          <Text style={styles.roomTitle}>
            {room.roomType?.name || 'Hotel room'}
          </Text>
          <Text style={styles.muted}>
            Room {room.roomNumber ?? '—'} · Floor {room.floor ?? '—'}
          </Text>

          <View style={styles.dateRow}>
            <View style={styles.dateColumn}>
              <Text style={styles.smallLabel}>CHECK-IN</Text>
              <Text style={styles.dateValue}>{checkIn}</Text>
            </View>

            <Ionicons
              name="arrow-forward"
              size={18}
              color={colors.muted}
            />

            <View style={styles.dateColumn}>
              <Text style={styles.smallLabel}>CHECK-OUT</Text>
              <Text style={styles.dateValue}>{checkOut}</Text>
            </View>
          </View>

          <Text style={styles.muted}>
            {adults} adult(s) · {nights || 1} night(s)
          </Text>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Estimated total including 18% tax</Text>
            <Text style={styles.total}>{`₹${estimatedTotal.toLocaleString(
              'en-IN',
              { maximumFractionDigits: 2 },
            )}`}</Text>
          </View>
          <Text style={styles.taxNote}>
            Final amount is calculated by the server.
          </Text>
        </Card>

        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Who’s checking in?</Text>
          <Text style={styles.muted}>
            Enter the details of the primary guest.
          </Text>

          <Field
            label="Full name *"
            value={name}
            onChangeText={setName}
            placeholder="As shown on your ID"
            autoCapitalize="words"
          />

          <Field
            label="Email address *"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Field
            label="Mobile number *"
            value={phone}
            onChangeText={setPhone}
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
          />

          <Field
            label="Address"
            value={address}
            onChangeText={setAddress}
            placeholder="Street, city, state"
          />

          <Field
            label="ID proof type"
            value={idProofType}
            onChangeText={setIdProofType}
            placeholder="Aadhar, Passport, etc."
          />

          <Field
            label="ID proof number"
            value={idProofNumber}
            onChangeText={setIdProofNumber}
            placeholder="Enter ID number"
            autoCapitalize="characters"
          />

          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <Field
                label="Adults *"
                value={adults}
                onChangeText={setAdults}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.column}>
              <Field
                label="Children"
                value={children}
                onChangeText={setChildren}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <Field
            label="Special requests"
            value={specialRequests}
            onChangeText={setSpecialRequests}
            placeholder="Anything that would make your stay more comfortable?"
          />

          {error ? <Message error>{error}</Message> : null}

          <Button
            title="Create booking"
            onPress={submitBooking}
            loading={submitting}
          />

          <Text style={styles.privacyNote}>
            <Ionicons name="lock-closed-outline" size={13} color={colors.muted} />
            {' '}Your details are used to manage this reservation.
          </Text>
        </Card>

        <Button
          title="Back to availability"
          onPress={() => navigation.goBack()}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingBottom: 30,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 9,
  },
  heading: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 8,
    marginBottom: 20,
  },
  roomCard: {
    marginBottom: 18,
  },
  roomIcon: {
    height: 90,
    borderRadius: 15,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  roomTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 5,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 22,
  },
  dateColumn: {
    flex: 1,
  },
  smallLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 7,
  },
  dateValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 18,
    paddingTop: 16,
    gap: 8,
  },
  totalLabel: {
    color: colors.muted,
    fontSize: 13,
  },
  total: {
    color: colors.primary,
    fontSize: 27,
    fontWeight: '900',
  },
  taxNote: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 5,
  },
  formCard: {
    marginBottom: 18,
  },
  formTitle: {
    color: colors.text,
    fontSize: 23,
    fontWeight: '900',
    marginBottom: 5,
  },
  twoColumns: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  privacyNote: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: 11,
    marginTop: 15,
  },
});