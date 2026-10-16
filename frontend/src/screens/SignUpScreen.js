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
} from 'react-native';
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { cleanIndianMobileDigits, isValidIndianMobile, isValidFullName } from '../utils/phoneUtils';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';
import { globalStyles } from '../styles/globalStyles';

import { authService } from '../services';

export default function SignUpScreen({ navigation }) {
  const { registerUser } = useApp();

  const [step, setStep] = useState(1); // Step 1: Info -> Step 2: OTP -> Step 3: Password
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleStep1Submit = async () => {
    if (isLoading) return;
    setError('');
    const cleanName = name.trim();
    const cleanMobile = cleanIndianMobileDigits(mobile);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !isValidFullName(cleanName)) {
      setError('Please enter a valid full name (letters only).');
      return;
    }

    if (!cleanMobile || cleanMobile.length !== 10 || !isValidIndianMobile(cleanMobile)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.sendOtp(cleanMobile);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to dispatch verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2VerifyOtp = async () => {
    if (isLoading) return;
    setError('');
    const cleanOtp = otp.trim();
    const cleanMobile = cleanIndianMobileDigits(mobile);
    if (!cleanOtp || cleanOtp.length < 4) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    try {
      await authService.verifyOtp(cleanMobile, cleanOtp);
      setStep(3);
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep3Finish = async () => {
    if (isLoading) return;
    setError('');
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const cleanName = name.trim();
    const cleanMobile = cleanIndianMobileDigits(mobile);
    const cleanEmail = email.trim().toLowerCase();

    setIsLoading(true);
    try {
      const registered = await registerUser(cleanName, cleanMobile, password, cleanEmail);
      if (registered) {
        navigation.replace('CreateProfile', { mode: 'create', source: 'signup', fromScreen: 'signup' });
      } else {
        setError('An account with this mobile number already exists.');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError('');
    } else {
      navigation.navigate('SignIn');
    }
  };

  return (
    <KeyboardAvoidingView
      style={globalStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#1e1b2e" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Account</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Step Progress Pills */}
        <View style={styles.stepsIndicatorRow}>
          <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
            <Text style={[styles.stepDotNum, step >= 1 && styles.stepDotNumActive]}>1</Text>
          </View>
          <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
          <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
            <Text style={[styles.stepDotNum, step >= 2 && styles.stepDotNumActive]}>2</Text>
          </View>
          <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
          <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]}>
            <Text style={[styles.stepDotNum, step >= 3 && styles.stepDotNumActive]}>3</Text>
          </View>
        </View>

        {/* Error Alert */}
        {error ? (
          <View style={globalStyles.errorBox}>
            <Text style={globalStyles.errorBoxText}>{error}</Text>
          </View>
        ) : null}

        {/* STEP 1: Basic Info */}
        {step === 1 && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              <Text style={styles.sectionSubtitle}>Enter your full name and mobile number to register</Text>
            </View>

            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.inputLabel}>Full Name</Text>
              <TextInput
                style={globalStyles.inputField}
                placeholder="Enter Full Name"
                placeholderTextColor={COLORS.textMuted}
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (error) setError('');
                }}
              />
            </View>

            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.inputLabel}>Mobile Number</Text>
              <TextInput
                style={globalStyles.inputField}
                placeholder="Enter Mobile Number"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                maxLength={10}
                value={mobile}
                onChangeText={(val) => {
                  setMobile(cleanIndianMobileDigits(val));
                  if (error) setError('');
                }}
              />
            </View>

            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.inputLabel}>Email Address</Text>
              <TextInput
                style={globalStyles.inputField}
                placeholder="Enter Email Address"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (error) setError('');
                }}
              />
            </View>

            <TouchableOpacity
              style={[globalStyles.primaryButton, { marginTop: 12 }, isLoading && { opacity: 0.7 }]}
              onPress={handleStep1Submit}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={globalStyles.primaryButtonText}>Send OTP</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: OTP Verification */}
        {step === 2 && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Verify Mobile Number</Text>
              <Text style={styles.sectionSubtitle}>
                Enter the verification code sent to +91 {mobile}
              </Text>
            </View>

            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.inputLabel}>Enter 6-Digit OTP</Text>
              <TextInput
                style={[globalStyles.inputField, styles.otpInput]}
                placeholder="123456"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={(val) => {
                  setOtp(val.replace(/\D/g, ''));
                  if (error) setError('');
                }}
              />
            </View>

            <TouchableOpacity
              style={[globalStyles.primaryButton, { marginTop: 12 }, isLoading && { opacity: 0.7 }]}
              onPress={handleStep2VerifyOtp}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={globalStyles.primaryButtonText}>Verify & Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: Password Creation */}
        {step === 3 && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Create Password</Text>
              <Text style={styles.sectionSubtitle}>Choose a strong password to protect your account</Text>
            </View>

            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.inputLabel}>Password</Text>
              <View style={styles.passwordInputWrap}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="At least 6 characters"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (error) setError('');
                  }}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  {showPassword ? <EyeOff size={18} color={COLORS.textMuted} /> : <Eye size={18} color={COLORS.textMuted} />}
                </TouchableOpacity>
              </View>
            </View>

            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.inputLabel}>Confirm Password</Text>
              <View style={styles.passwordInputWrap}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Re-enter password"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    if (error) setError('');
                  }}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  activeOpacity={0.7}
                >
                  {showConfirmPassword ? <EyeOff size={18} color={COLORS.textMuted} /> : <Eye size={18} color={COLORS.textMuted} />}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[globalStyles.primaryButton, { marginTop: 12 }, isLoading && { opacity: 0.7 }]}
              onPress={handleStep3Finish}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={globalStyles.primaryButtonText}>Complete Registration</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Existing User Redirect Link */}
        <View style={styles.footerWrap}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
            <Text style={styles.signInLinkText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.primaryPurple,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    zIndex: 20,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.light,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 36,
  },
  stepsIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5deff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: COLORS.primaryPurple,
  },
  stepDotNum: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  stepDotNumActive: {
    color: '#ffffff',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e5deff',
  },
  stepLineActive: {
    backgroundColor: COLORS.primaryPurple,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  sectionSubtitle: {
    fontSize: 13.5,
    color: COLORS.textMuted,
    marginTop: 4,
    lineHeight: 18,
    fontWeight: '400',
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 8,
    fontWeight: '700',
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
  footerWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '400',
  },
  signInLinkText: {
    color: COLORS.primaryPurple,
    fontSize: 14,
    fontWeight: '700',
  },
});
