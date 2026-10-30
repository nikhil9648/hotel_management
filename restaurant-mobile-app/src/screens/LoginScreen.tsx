import React, { useState } from 'react';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { Button, Card, Field, Message } from '../components/Ui';
import { useAuth } from '../auth/AuthContext';
import { getApiError } from '../api/client';
import { colors } from '../utils/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error && err.message && !('isAxiosError' in err) ? err.message : getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ImageBackground
          source={require('../../assets/hotel-maurya.jpg')}
          imageStyle={styles.heroImage}
          style={styles.hero}
          resizeMode="cover"
        >
          <View style={styles.heroShade} />
          <View style={styles.heroBrand}>
            <View style={styles.brandMark}><Ionicons name="restaurant-outline" size={22} color={colors.primaryDark} /></View>
            <View><Text style={styles.brandName}>MAURYA</Text><Text style={styles.brandSub}>KITCHEN & HOSPITALITY</Text></View>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>A WARM WELCOME, ALWAYS</Text>
            <Text style={styles.heroTitle}>Good to have{ '\n' }you back.</Text>
          </View>
        </ImageBackground>

        <Card style={styles.formCard}>
          <View style={styles.formHeading}>
            <View style={styles.formIcon}><Ionicons name="person-outline" size={20} color={colors.primaryDark} /></View>
            <View style={styles.formHeadingCopy}>
              <Text style={styles.formTitle}>Sign in to Maurya</Text>
              <Text style={styles.formSubtitle}>Access your stays and guest profile.</Text>
            </View>
          </View>

          <Field
            label="Email address"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
          />
          <Field
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="password"
            onSubmitEditing={submit}
            returnKeyType="go"
          />
          <Pressable onPress={() => setShowPassword((value) => !value)} style={styles.showPassword} accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={17} color={colors.muted} />
            <Text style={styles.showPasswordText}>{showPassword ? 'Hide password' : 'Show password'}</Text>
          </Pressable>

          {error ? <Message error>{error}</Message> : null}
          <Button title="Sign in" onPress={submit} loading={loading} />
          <View style={styles.secureNote}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.success} />
            <Text style={styles.note}>Use the same account as the Hotel Maurya website.</Text>
          </View>
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>HOSPITALITY, WITH HEART</Text>
          <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8, paddingBottom: 24 },
  hero: { minHeight: 255, justifyContent: 'space-between', padding: 21, borderRadius: 22, overflow: 'hidden', backgroundColor: colors.primaryDark, marginBottom: -20 },
  heroImage: { borderRadius: 22 },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(18, 39, 31, 0.62)' },
  heroBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#F3EBDD', alignItems: 'center', justifyContent: 'center' },
  brandName: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 1.8 },
  brandSub: { color: '#E2E7DF', fontSize: 8, fontWeight: '700', letterSpacing: 1.15, marginTop: 2 },
  heroCopy: { marginBottom: 9 },
  heroEyebrow: { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1.6 },
  heroTitle: { color: '#fff', fontSize: 32, lineHeight: 38, fontWeight: '900', letterSpacing: -0.7, marginTop: 7 },
  formCard: { padding: 19, borderRadius: 21, marginBottom: 18 },
  formHeading: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 19 },
  formIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.softGold, alignItems: 'center', justifyContent: 'center' },
  formHeadingCopy: { flex: 1 },
  formTitle: { color: colors.text, fontSize: 19, fontWeight: '900' },
  formSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  showPassword: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: -12 },
  showPasswordText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  secureNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 13 },
  note: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 15 },
  footerText: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
});
