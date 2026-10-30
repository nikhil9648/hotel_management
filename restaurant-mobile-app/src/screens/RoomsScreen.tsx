import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Screen from '../components/Screen';
import { Button, Card, Field, FoodPhoto, Message } from '../components/Ui';
import { api, assetUrl, getApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { Room } from '../types';
import { colors } from '../utils/theme';

const dateText = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateText(date);
};

const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00`);

  return !Number.isNaN(date.getTime()) && dateText(date) === value;
};

const getNights = (checkIn: string, checkOut: string) => {
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);

  return Math.round((end.getTime() - start.getTime()) / 86400000);
};

const money = (value: number) =>
  `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function RoomsScreen({
  navigation,
}: {
  navigation: any;
}) {
  const { user } = useAuth();

  const [checkIn, setCheckIn] = useState(addDays(1));
  const [checkOut, setCheckOut] = useState(addDays(2));
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const nights = useMemo(
    () => getNights(checkIn, checkOut),
    [checkIn, checkOut],
  );

  const searchRooms = async () => {
    setError('');
    setSearched(false);

    if (!user) {
      navigation.navigate('Login');
      return;
    }

    if (!isValidDate(checkIn) || !isValidDate(checkOut)) {
      setError('Please enter valid dates in YYYY-MM-DD format.');
      return;
    }

    if (checkOut <= checkIn) {
      setError('Check-out must be after check-in.');
      return;
    }

    if (checkIn < dateText(new Date())) {
      setError('Check-in date cannot be in the past.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.get('/bookings/available-rooms', {
        params: {
          checkInDate: checkIn,
          checkOutDate: checkOut,
        },
      });

      setRooms(response.data?.rooms ?? []);
      setSearched(true);
    } catch (err) {
      setError(getApiError(err));
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const chooseRoom = (room: Room) => {
  if (!user) {
    navigation.navigate('Login');
    return;
  }

  navigation.navigate('BookingForm', {
    room,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    nights,
  });
};

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero section */}
        <ImageBackground
          source={require('../../assets/hotel-maurya.jpg')}
          style={styles.hero}
          imageStyle={styles.heroImage}
          resizeMode="cover"
        >
          <View style={styles.heroOverlay}>
            <View style={styles.eyebrow}>
              <Ionicons
                name="sparkles-outline"
                size={16}
                color="#F2D4A0"
              />
              <Text style={styles.eyebrowText}>
                A MORE THOUGHTFUL WAY TO STAY
              </Text>
            </View>

            <Text style={styles.heroTitle}>
              Make room for{'\\n'}
              <Text style={styles.heroAccent}>something wonderful.</Text>
            </Text>

            <Text style={styles.heroDescription}>
              Your dates, your pace, and a little more room to enjoy the journey.
            </Text>

            <View style={styles.highlights}>
              <View style={styles.highlight}>
                <Ionicons name="checkmark" size={17} color="#F2D4A0" />
                <Text style={styles.highlightText}>Thoughtful comfort</Text>
              </View>

              <View style={styles.highlight}>
                <Ionicons name="checkmark" size={17} color="#F2D4A0" />
                <Text style={styles.highlightText}>Maurya hospitality</Text>
              </View>
            </View>

            <View style={styles.hotelSignature}>
              <Ionicons name="bed-outline" size={20} color="#F2D4A0" />
              <Text style={styles.hotelSignatureText}>HOTEL MAURYA</Text>
            </View>
          </View>
        </ImageBackground>

        {/* Search panel */}
        <View style={styles.bookingPanel}>
          <View style={styles.panelHeading}>
            <View style={styles.calendarIcon}>
              <Ionicons
                name="calendar-outline"
                size={26}
                color={colors.primary}
              />
            </View>

            <View style={styles.panelHeadingText}>
              <Text style={styles.panelEyebrow}>PLAN YOUR STAY</Text>
              <Text style={styles.panelTitle}>Find your room</Text>
              <Text style={styles.panelSubtitle}>
                Choose your dates to see what’s available.
              </Text>
            </View>
          </View>

          <Field
            label="Check-in (YYYY-MM-DD)"
            value={checkIn}
            onChangeText={setCheckIn}
            placeholder="2026-11-01"
            autoCapitalize="none"
            accessibilityLabel="Check-in date"
          />

          <Field
            label="Check-out (YYYY-MM-DD)"
            value={checkOut}
            onChangeText={setCheckOut}
            placeholder="2026-11-02"
            autoCapitalize="none"
            accessibilityLabel="Check-out date"
          />

          {error ? <Message error>{error}</Message> : null}

          <Pressable
            accessibilityRole="button"
            onPress={searchRooms}
            disabled={loading}
            style={({ pressed }) => [
              styles.searchButton,
              pressed && styles.pressed,
              loading && styles.disabledButton,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="search-outline" size={19} color="#FFFFFF" />
                <Text style={styles.searchButtonText}>
                  Search availability
                </Text>
              </>
            )}
          </Pressable>

          <View style={styles.secureNoteRow}>
            <Ionicons
              name="checkmark-circle-outline"
              size={17}
              color={colors.success}
            />
            <Text style={styles.secureNote}>
              Live availability from Hotel Maurya
            </Text>
          </View>
        </View>

        {/* Intro */}
        <View style={styles.introSection}>
          <Text style={styles.sectionEyebrow}>
            A STAY THAT FEELS LIKE YOURS
          </Text>
          <Text style={styles.sectionTitle}>Slow down. Settle in.</Text>
          <Text style={styles.sectionAccent}>
            We’ll take care of the rest.
          </Text>
          <Text style={styles.sectionDescription}>
            Check your dates to explore available rooms and choose the right
            space for your stay.
          </Text>
        </View>

        {/* Loading */}
        {loading ? (
          <ActivityIndicator
            style={styles.loader}
            size="large"
            color={colors.primary}
          />
        ) : null}

        {/* Empty result */}
        {searched && !loading && rooms.length === 0 ? (
          <Card>
            <View style={styles.emptyIcon}>
              <Ionicons name="bed-outline" size={30} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No rooms available</Text>
            <Text style={styles.empty}>
              No rooms are available for these dates. Try different dates.
            </Text>
          </Card>
        ) : null}

        {/* Results heading */}
        {searched && rooms.length > 0 ? (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsEyebrow}>YOUR STAY OPTIONS</Text>
            <Text style={styles.resultsTitle}>Available rooms</Text>
            <Text style={styles.resultsSubtitle}>
              {rooms.length} room(s) available for your selected dates
            </Text>
          </View>
        ) : null}

        {/* Room cards */}
        {rooms.map((room) => {
          const type = room.roomType;
          const image = room.image || type?.image || type?.images?.[0];
          const price = Number(room.price ?? type?.basePrice ?? 0);
          const capacity = Number(type?.capacity ?? 2);

          return (
            <Card key={room._id} style={styles.roomCard}>
              <View style={styles.photoContainer}>
                <FoodPhoto
                  uri={assetUrl(image)}
                  name={`Room ${room.roomNumber ?? ''}`}
                />

                <View style={styles.availableBadge}>
                  <Ionicons
                    name="checkmark-circle"
                    size={13}
                    color={colors.success}
                  />
                  <Text style={styles.availableBadgeText}>
                    AVAILABLE FOR YOUR DATES
                  </Text>
                </View>
              </View>

              <Text style={styles.roomType}>
                {type?.name || 'Maurya room'}
              </Text>

              <Text style={styles.roomName}>
                Room {room.roomNumber ?? '—'}
              </Text>

              <View style={styles.roomDetailRow}>
                <Ionicons
                  name="location-outline"
                  size={17}
                  color={colors.muted}
                />
                <Text style={styles.details}>
                  Floor {room.floor ?? '—'}
                </Text>
              </View>

              <View style={styles.roomDetailRow}>
                <Ionicons
                  name="people-outline"
                  size={17}
                  color={colors.muted}
                />
                <Text style={styles.details}>
                  Up to {capacity} guests
                </Text>
              </View>

              <View style={styles.roomDetailRow}>
                <Ionicons
                  name="wifi-outline"
                  size={17}
                  color={colors.muted}
                />
                <Text style={styles.details} numberOfLines={2}>
                  {type?.amenities?.length
                    ? type.amenities.join(' · ')
                    : 'A comfortable stay'}
                </Text>
              </View>

              <View style={styles.roomFooter}>
                <View style={styles.priceContainer}>
                  <Text style={styles.price}>{money(price)}</Text>
                  <Text style={styles.perNight}>/ night</Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => chooseRoom(room)}
                  style={({ pressed }) => [
                    styles.chooseButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.chooseButtonText}>Choose room</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={17}
                    color="#FFFFFF"
                  />
                </Pressable>
              </View>
            </Card>
          );
        })}

        {/* Booking estimate */}
        {searched && rooms.length > 0 && nights > 0 ? (
          <View style={styles.dateSummary}>
            <Ionicons
              name="calendar-outline"
              size={19}
              color={colors.primary}
            />
            <Text style={styles.dateSummaryText}>
              Your stay: {nights} night(s) · {checkIn} to {checkOut}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingBottom: 28,
  },
  hero: {
    minHeight: 360,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.primaryDark,
    marginTop: 5,
  },
  heroImage: {
    borderRadius: 24,
  },
  heroOverlay: {
    flex: 1,
    minHeight: 360,
    paddingHorizontal: 23,
    paddingVertical: 28,
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 31, 27, 0.76)',
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 23,
  },
  eyebrowText: {
    color: '#F2D4A0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    flexShrink: 1,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 37,
    lineHeight: 45,
    fontWeight: '900',
    letterSpacing: -1,
  },
  heroAccent: {
    color: '#F0D9C7',
  },
  heroDescription: {
    color: '#F4EEE6',
    fontSize: 15,
    lineHeight: 25,
    marginTop: 17,
  },
  highlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 13,
    marginTop: 23,
  },
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  highlightText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  hotelSignature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 28,
  },
  hotelSignatureText: {
    color: '#F2D4A0',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  bookingPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 25,
    padding: 20,
    marginTop: 0,
    marginBottom: 35,
  },
  panelHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  calendarIcon: {
    width: 60,
    height: 60,
    borderRadius: 19,
    backgroundColor: '#F8EBDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelHeadingText: {
    flex: 1,
  },
  panelEyebrow: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
    marginTop: 5,
  },
  panelSubtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 3,
  },
  searchButton: {
    minHeight: 60,
    backgroundColor: colors.primary,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 14,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.78,
  },
  disabledButton: {
    opacity: 0.7,
  },
  secureNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 17,
  },
  secureNote: {
    color: colors.muted,
    fontSize: 13,
  },
  introSection: {
    marginBottom: 26,
    paddingHorizontal: 3,
  },
  sectionEyebrow: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 37,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  sectionAccent: {
    color: colors.primary,
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  sectionDescription: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 25,
    marginTop: 12,
  },
  loader: {
    marginVertical: 25,
  },
  resultsSection: {
    marginBottom: 18,
  },
  resultsEyebrow: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  resultsTitle: {
    color: colors.text,
    fontSize: 27,
    fontWeight: '900',
  },
  resultsSubtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
  },
  roomCard: {
    padding: 15,
    marginBottom: 18,
    borderRadius: 23,
  },
  photoContainer: {
    position: 'relative',
  },
  availableBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  availableBadgeText: {
    color: colors.text,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  roomType: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginTop: 17,
    textTransform: 'uppercase',
  },
  roomName: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 25,
    marginTop: 5,
  },
  roomDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  details: {
    color: colors.muted,
    fontSize: 15,
    flexShrink: 1,
    lineHeight: 22,
  },
  roomFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 18,
    paddingTop: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 5,
  },
  price: {
    color: colors.primary,
    fontSize: 25,
    fontWeight: '900',
  },
  perNight: {
    color: colors.muted,
    fontSize: 13,
  },
  chooseButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chooseButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  dateSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 15,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 2,
  },
  dateSummaryText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    lineHeight: 20,
  },
  emptyIcon: {
    alignSelf: 'center',
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8EBDD',
    marginBottom: 13,
  },
  emptyTitle: {
    textAlign: 'center',
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  empty: {
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 22,
  },
});

