import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/theme';

export function BrandHeader({
  onProfile,
  trailing,
}: {
  onProfile?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <View style={styles.brandHeader}>
      <View style={styles.brandMark}>
        <Ionicons name="restaurant-outline" size={21} color={colors.primaryDark} />
      </View>
      <View style={styles.brandCopy}>
        <Text style={styles.brandName}>MAURYA</Text>
        <Text style={styles.brandSub}>KITCHEN & HOSPITALITY</Text>
      </View>
      {trailing}
      {onProfile ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open your profile"
          onPress={onProfile}
          style={({ pressed }) => [styles.profileAction, pressed && styles.pressed]}
          hitSlop={6}
        >
          <Ionicons name="person-outline" size={20} color={colors.primaryDark} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Title({
  children,
  subtitle,
  eyebrow,
}: React.PropsWithChildren<{ subtitle?: string; eyebrow?: string }>) {
  return (
    <View style={styles.titleWrap}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{children}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline';
}) {
  const blocked = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={blocked}
      style={({ pressed }) => [
        styles.button,
        variant === 'outline' && styles.outline,
        blocked && styles.disabled,
        pressed && !blocked && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : colors.primaryDark} />
      ) : (
        <Text style={[styles.buttonText, variant === 'outline' && styles.outlineText]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label: string }) {
  const { label, style, ...inputProps } = props;
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, style]}
        {...inputProps}
      />
    </View>
  );
}

export function Message({
  children,
  error = false,
}: React.PropsWithChildren<{ error?: boolean }>) {
  return (
    <View style={[styles.messageBox, error ? styles.errorBox : styles.successBox]}>
      <Ionicons
        name={error ? 'alert-circle-outline' : 'checkmark-circle-outline'}
        size={18}
        color={error ? colors.danger : colors.success}
      />
      <Text accessibilityRole="alert" style={[styles.message, error ? styles.error : styles.success]}>
        {children}
      </Text>
    </View>
  );
}

export function FoodPhoto({ uri, name }: { uri?: string; name: string }) {
  return uri ? (
    <Image source={{ uri }} accessibilityLabel={name} style={styles.photo} resizeMode="cover" />
  ) : (
    <View style={[styles.photo, styles.photoFallback]}>
      <Ionicons name="restaurant-outline" size={34} color={colors.primary} />
    </View>
  );
}

export function Card({
  children,
  style,
}: React.PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  brandHeader: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
    marginBottom: 22,
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.softGold,
    borderWidth: 1,
    borderColor: '#E9DCC6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandCopy: { flex: 1 },
  brandName: { color: colors.primaryDark, fontSize: 17, fontWeight: '900', letterSpacing: 1.7 },
  brandSub: { color: colors.muted, fontSize: 8, fontWeight: '700', letterSpacing: 1.25, marginTop: 2 },
  profileAction: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: { marginTop: 5, marginBottom: 18 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.8, marginBottom: 7 },
  title: { fontSize: 29, lineHeight: 35, fontWeight: '900', letterSpacing: -0.7, color: colors.text },
  subtitle: { marginTop: 6, fontSize: 14, lineHeight: 21, color: colors.muted },
  button: {
    minHeight: 52,
    backgroundColor: colors.primaryDark,
    borderRadius: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 3,
  },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.1 },
  outline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, shadowOpacity: 0, elevation: 0 },
  outlineText: { color: colors.primaryDark },
  disabled: { opacity: 0.56 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  fieldWrap: { marginBottom: 14 },
  label: { color: colors.text, fontSize: 13, fontWeight: '800', marginBottom: 7 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 13,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 15,
  },
  messageBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, borderRadius: 12, marginTop: 8, marginBottom: 4 },
  errorBox: { backgroundColor: '#FDF0EE' },
  successBox: { backgroundColor: colors.softGreen },
  message: { flex: 1, fontSize: 13, lineHeight: 19 },
  error: { color: colors.danger },
  success: { color: colors.success },
  photo: { width: '100%', height: 174, borderRadius: 15, backgroundColor: colors.softGold },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 19,
    padding: 15,
    marginBottom: 14,
    shadowColor: '#24372B',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.045,
    shadowRadius: 14,
    elevation: 1,
  },
});
