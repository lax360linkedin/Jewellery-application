import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { PhoneCall, Eye, EyeOff } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { cleanIndianMobileDigits, isValidIndianMobile } from '../utils/phoneUtils';
import { CUSTOMER_SUPPORT_PHONE } from '../constants/config';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';
import { globalStyles } from '../styles/globalStyles';

export default function SignInScreen({ navigation }) {
  const { loginUser } = useApp();

  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleMobileChange = (text) => {
    const digits = cleanIndianMobileDigits(text);
    setMobile(digits);
    if (error) setError('');
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (error) setError('');
  };

  const handleCallHelp = () => {
    const digits = CUSTOMER_SUPPORT_PHONE.replace(/[^\d+]/g, '');
    Linking.openURL(`tel:${digits}`).catch((err) => {
      console.warn('Cannot open dialer:', err);
    });
  };

  const handleSignIn = async () => {
    if (isLoading) return;
    setError('');

    const cleanMobile = cleanIndianMobileDigits(mobile);
    if (!cleanMobile || cleanMobile.length !== 10 || !isValidIndianMobile(cleanMobile)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const user = await loginUser(cleanMobile, password);
      if (user) {
        if (!user.profileCompleted) {
          navigation.replace('CreateProfile', { mode: 'create', source: 'signup', fromScreen: 'signup' });
        } else {
          navigation.replace('Home');
        }
      } else {
        setError('Invalid mobile number or password.');
      }
    } catch (err) {
      setError(err.message || 'Invalid mobile number or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={globalStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Centered Welcome Heading */}
        <View style={styles.welcomeWrap}>
          <Text style={styles.welcomeTitle}>Welcome !</Text>
          <Text style={styles.welcomeSubtitle}>Glad to see you !</Text>
        </View>

        {/* Main Sign In Header */}
        <View style={styles.headerWrap}>
          <Text style={styles.mainTitle}>Sign In</Text>
          <Text style={styles.subtitle}>Enter your mobile number and password to access your account</Text>
        </View>

        {/* Error Alert */}
        {error ? (
          <View style={globalStyles.errorBox}>
            <Text style={globalStyles.errorBoxText}>{error}</Text>
          </View>
        ) : null}

        {/* Mobile Input Group (No +91 prefix) */}
        <View style={globalStyles.inputGroup}>
          <Text style={globalStyles.inputLabel}>Mobile Number</Text>
          <TextInput
            style={globalStyles.inputField}
            placeholder="Enter Mobile Number"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="number-pad"
            maxLength={10}
            value={mobile}
            onChangeText={handleMobileChange}
            editable={!isLoading}
          />
        </View>

        {/* Password Input Group */}
        <View style={globalStyles.inputGroup}>
          <Text style={globalStyles.inputLabel}>Password</Text>
          <View style={styles.passwordInputWrap}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={handlePasswordChange}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              {showPassword ? (
                <EyeOff size={18} color={COLORS.textMuted} />
              ) : (
                <Eye size={18} color={COLORS.textMuted} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Forgot Password Link */}
        <TouchableOpacity
          style={styles.forgotLinkWrap}
          onPress={() => navigation.navigate('ForgotPassword')}
          activeOpacity={0.7}
        >
          <Text style={styles.forgotLinkText}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* Sign In CTA Button */}
        <TouchableOpacity
          style={[globalStyles.primaryButton, isLoading && { opacity: 0.7 }]}
          onPress={handleSignIn}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={globalStyles.primaryButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Sign Up Redirect Link */}
        <View style={styles.footerWrap}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.signUpLinkText}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Help Card (Positioned naturally below form content) */}
        <View style={styles.helpCard}>
          <View style={styles.helpTextCol}>
            <Text style={styles.helpTitle}>Need help signing in?</Text>
            <Text style={styles.helpSubtitle}>Call our dedicated customer care team</Text>
          </View>
          <TouchableOpacity
            style={styles.callHelpBtn}
            onPress={handleCallHelp}
            activeOpacity={0.8}
          >
            <PhoneCall size={15} color="#ffffff" />
            <Text style={styles.callHelpBtnText}>Call</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 28,
  },
  welcomeWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textDark,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textDark,
    textAlign: 'center',
    marginTop: 2,
  },
  headerWrap: {
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textDark,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13.5,
    color: COLORS.textMuted,
    marginTop: 4,
    lineHeight: 18,
    fontWeight: '400',
  },
  passwordInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    height: 50,
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  eyeBtn: {
    padding: 6,
  },
  forgotLinkWrap: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
  },
  forgotLinkText: {
    color: COLORS.primaryPurple,
    fontSize: 13.5,
    fontWeight: '600',
  },
  footerWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '400',
  },
  signUpLinkText: {
    color: COLORS.primaryPurple,
    fontSize: 14,
    fontWeight: '700',
  },
  helpCard: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    borderWidth: 1,
    borderColor: '#e8e2fa',
    ...SHADOWS.light,
  },
  helpTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  helpTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  helpSubtitle: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '400',
  },
  callHelpBtn: {
    backgroundColor: COLORS.primaryPurple,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  callHelpBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '600',
  },
});
