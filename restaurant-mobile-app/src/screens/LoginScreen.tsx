import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { Button, Field, Message, Title } from '../components/Ui';
import { useAuth } from '../auth/AuthContext';
import { getApiError } from '../api/client';
import { colors } from '../utils/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setError('');
    if (!email.trim() || !password) { setError('Email and password are required.'); return; }
    setLoading(true);
    try { await signIn(email, password); }
    catch (err) { setError(err instanceof Error && err.message && !('isAxiosError' in err) ? err.message : getApiError(err)); }
    finally { setLoading(false); }
  };
  return <Screen contentStyle={styles.content}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.mark}><Ionicons name="restaurant" size={36} color={colors.primary}/></View>
    <Text style={styles.brand}>MAURYA</Text><Text style={styles.tagline}>HOTEL & RESTAURANT</Text>
    <Title subtitle="Sign in to manage your bookings, orders and more.">Welcome back</Title>
    <Field label="Email address" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
    <Field label="Password" placeholder="Enter your password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="password" onSubmitEditing={submit} />
    {error ? <Message error>{error}</Message> : null}
    <Button title="Sign in" onPress={submit} loading={loading}/>
    <Text style={styles.note}>Use your existing website account. Account registration and staff access will be connected in a later step.</Text>
  </KeyboardAvoidingView></Screen>;
}
const styles = StyleSheet.create({ content: { flexGrow: 1, justifyContent: 'center', paddingTop: 28 }, mark: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#FDEBD5', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12 }, brand: { textAlign: 'center', color: colors.primaryDark, fontWeight: '900', fontSize: 23, letterSpacing: 3 }, tagline: { textAlign: 'center', color: colors.muted, fontSize: 10, letterSpacing: 2, marginTop: 3, marginBottom: 30 }, note: { textAlign: 'center', color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 18, paddingHorizontal: 10 } });
