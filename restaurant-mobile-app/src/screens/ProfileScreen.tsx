
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Screen from '../components/Screen';
import { Card, Button } from '../components/Ui';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../utils/theme';

export default function ProfileScreen({
  navigation,
}: {
  navigation: any;
}) {
  const { user, signOut } = useAuth();

  const openLogin = () => navigation.navigate('Login');

  const openBookings = () => {
    navigation.navigate('MyBookings');
  };

  const openOrders = () => {
    navigation.navigate('MyOrders');
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.page}
      >
        {/* Brand header */}
        <View style={styles.header}>
          <View style={styles.brandIcon}>
            <Ionicons
              name="restaurant-outline"
              size={23}
              color={colors.primaryDark}
            />
          </View>

          <View style={styles.brandText}>
            <Text style={styles.brandName}>MAURYA</Text>
            <Text style={styles.brandSubtitle}>
              KITCHEN & STAYS
            </Text>
          </View>

          <Pressable
            style={styles.homeButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Ionicons
              name="arrow-back"
              size={16}
              color={colors.primaryDark}
            />
            <Text style={styles.homeButtonText}>Home</Text>
          </Pressable>
        </View>

        {user ? (
          <>
            {/* Welcome card */}
            <View style={styles.welcomeCard}>
              <View style={styles.welcomeTop}>
                <Text style={styles.welcomeEyebrow}>
                  YOUR MAURYA MOMENTS
                </Text>
                <Ionicons
                  name="sparkles-outline"
                  size={23}
                  color="#E6C99A"
                />
              </View>

              <View style={styles.circleDecoration} />

              <Text style={styles.welcomeTitle}>
                A LITTLE{'\n'}SPACE{'\n'}THAT'S ALL
              </Text>
              <Text style={styles.welcomeAccent}>YOURS.</Text>

              <Text style={styles.welcomeDescription}>
                Good to have you here, {user.name}. Your stays,
                meals and details are all in one place.
              </Text>

              <View style={styles.guestRow}>
                <View style={styles.guestAvatar}>
                  <Text style={styles.avatarLetter}>
                    {user.name?.trim()?.charAt(0)?.toUpperCase() || 'G'}
                  </Text>
                </View>
                <View style={styles.guestInfo}>
                  <Text style={styles.guestName}>{user.name}</Text>
                  <Text style={styles.guestRole}>Hotel Maurya guest</Text>
                </View>
              </View>
            </View>

            {/* Account details */}
            <View style={styles.section}>
              <Text style={styles.eyebrow}>ACCOUNT DETAILS</Text>
              <Text style={styles.sectionTitle}>Your profile</Text>
              <Text style={styles.sectionSubtitle}>
                Information connected to your account.
              </Text>

              <Card style={styles.detailsCard}>
                <DetailRow
                  icon="person-outline"
                  label="Full name"
                  value={user.name || 'Not available'}
                />
                <View style={styles.rowDivider} />
                <DetailRow
                  icon="mail-outline"
                  label="Email address"
                  value={user.email || 'Not available'}
                />
                <View style={styles.rowDivider} />
                <DetailRow
                  icon="shield-checkmark-outline"
                  label="Account type"
                  value={user.role?.replace(/_/g, ' ') || 'Customer'}
                />
              </Card>
            </View>

            {/* Activity */}
            <View style={styles.section}>
              <Text style={styles.eyebrow}>PICK UP WHERE YOU LEFT OFF</Text>
              <Text style={styles.sectionTitle}>Your activity</Text>

              <View style={styles.activityCard}>
                <ActivityRow
                  icon="calendar-outline"
                  title="Room bookings"
                  subtitle="View your upcoming and past stays"
                  onPress={openBookings}
                />
                <View style={styles.rowDivider} />
                <ActivityRow
                  icon="bag-handle-outline"
                  title="Food orders"
                  subtitle="See what you've enjoyed from our kitchen"
                  onPress={openOrders}
                />
              </View>

              <Pressable
                style={styles.signOutButton}
                onPress={() => {
                  void signOut();
                }}
              >
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.signOutText}>
                  Sign out of this account
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Card style={styles.signedOutCard}>
            <View style={styles.signedOutIcon}>
              <Ionicons
                name="person-circle-outline"
                size={52}
                color={colors.primary}
              />
            </View>
            <Text style={styles.sectionTitle}>Your profile</Text>
            <Text style={styles.sectionSubtitle}>
              Sign in to access your bookings, food orders and account details.
            </Text>
            <Button title="Sign in" onPress={openLogin} />
          </Card>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            HOSPITALITY, WITH HEART ✦
          </Text>
          <Pressable onPress={() => navigation.navigate('Menu')}>
            <Text style={styles.exploreText}>
              Explore today's menu  →
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={20} color={colors.muted} />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function ActivityRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.activityRow,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.activityIcon}>
        <Ionicons name={icon} size={21} color={colors.muted} />
      </View>

      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{title}</Text>
        <Text style={styles.activitySubtitle}>{subtitle}</Text>
      </View>

      <Ionicons
        name="arrow-forward"
        size={17}
        color={colors.muted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 10,
    gap: 10,
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0E8D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    flex: 1,
  },
  brandName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1,
  },
  brandSubtitle: {
    color: colors.muted,
    fontSize: 9,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 8,
  },
  homeButtonText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  welcomeCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: 24,
    padding: 23,
    minHeight: 385,
    overflow: 'hidden',
    justifyContent: 'flex-start',
    marginBottom: 32,
  },
  welcomeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeEyebrow: {
    color: '#E6C99A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  circleDecoration: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 24,
    borderColor: 'rgba(255,255,255,0.045)',
    right: -100,
    top: 100,
  },
  welcomeTitle: {
    color: '#E6C99A',
    fontSize: 31,
    lineHeight: 38,
    fontWeight: '900',
    marginTop: 22,
    letterSpacing: -1,
  },
  welcomeAccent: {
    color: '#F6E6CE',
    fontSize: 35,
    lineHeight: 40,
    fontWeight: '900',
    marginTop: -1,
  },
  welcomeDescription: {
    color: '#F5F0E8',
    fontSize: 13,
    lineHeight: 21,
    marginTop: 13,
    maxWidth: 280,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginTop: 'auto',
    paddingTop: 21,
  },
  guestAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E6C99A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
  },
  guestInfo: {
    flex: 1,
  },
  guestName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  guestRole: {
    color: '#D4D8D1',
    fontSize: 11,
    marginTop: 4,
  },
  section: {
    marginBottom: 30,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 9,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  sectionSubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  detailsCard: {
    marginTop: 20,
    paddingVertical: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
  },
  detailIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 11,
    marginBottom: 5,
  },
  detailValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  activityCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 18,
    paddingHorizontal: 13,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 17,
  },
  activityIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  activitySubtitle: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  pressed: {
    opacity: 0.65,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 18,
    marginTop: 7,
  },
  signOutText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  signedOutCard: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 30,
  },
  signedOutIcon: {
    marginBottom: 12,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 20,
    gap: 22,
  },
  footerText: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.7,
    textAlign: 'right',
  },
  exploreText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
});
