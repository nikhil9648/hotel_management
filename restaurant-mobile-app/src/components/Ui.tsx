import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { colors } from '../utils/theme';

export function Title({ children, subtitle }: React.PropsWithChildren<{ subtitle?: string }>) {
  return <View style={styles.titleWrap}><Text style={styles.title}>{children}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>;
}
export function Button({ title, onPress, loading, disabled, variant = 'primary' }: { title: string; onPress: () => void; loading?: boolean; disabled?: boolean; variant?: 'primary' | 'outline' }) {
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled || loading} style={[styles.button, variant === 'outline' && styles.outline, (disabled || loading) && styles.disabled]}>{loading ? <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.primary} /> : <Text style={[styles.buttonText, variant === 'outline' && styles.outlineText]}>{title}</Text>}</Pressable>;
}
export function Field(props: TextInputProps & { label: string }) {
  const { label, style, ...inputProps } = props;
  return <View style={styles.fieldWrap}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor={colors.muted} style={[styles.input, style]} {...inputProps} /></View>;
}
export function Message({ children, error = false }: React.PropsWithChildren<{ error?: boolean }>) {
  return <Text accessibilityRole="alert" style={[styles.message, error ? styles.error : styles.success]}>{children}</Text>;
}
export function FoodPhoto({ uri, name }: { uri?: string; name: string }) {
  return uri ? <Image source={{ uri }} accessibilityLabel={name} style={styles.photo} resizeMode="cover" /> : <View style={[styles.photo, styles.photoFallback]}><Text style={{ fontSize: 30 }}>🍽️</Text></View>;
}
export function Card({ children, style }: React.PropsWithChildren<{ style?: ViewStyle }>) { return <View style={[styles.card, style]}>{children}</View>; }
const styles = StyleSheet.create({ titleWrap: { marginTop: 8, marginBottom: 16 }, title: { fontSize: 26, fontWeight: '800', color: colors.text }, subtitle: { marginTop: 5, fontSize: 14, lineHeight: 21, color: colors.muted }, button: { minHeight: 48, backgroundColor: colors.primary, borderRadius: 13, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', marginTop: 12 }, buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' }, outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary }, outlineText: { color: colors.primary }, disabled: { opacity: 0.6 }, fieldWrap: { marginBottom: 14 }, label: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 7 }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 13, color: colors.text, fontSize: 15 }, message: { fontSize: 13, lineHeight: 19, marginTop: 10 }, error: { color: colors.danger }, success: { color: colors.success }, photo: { width: '100%', height: 155, borderRadius: 13, backgroundColor: '#F2E8DC' }, photoFallback: { alignItems: 'center', justifyContent: 'center' }, card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 13, marginBottom: 13 } });
