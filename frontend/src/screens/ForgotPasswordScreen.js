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
import { cleanIndianMobileDigits, isValidIndianMobile } from '../utils/phoneUtils';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';
import { globalStyles } from '../styles/globalStyles';

import { authService } from '../services';

export default function ForgotPasswordScreen({ navigation }) {
  const { resetUserPassword } = useApp();

  const [step, setStep] = useState(1); // 1: Mobile -> 2: OTP -> 3: New Password
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleStep1SendOtp = async () => {
    if (isLoading) return;
    setError('');
    const cleanMobile = cleanIndianMobileDigits(mobile);
    if (!cleanMobile || cleanMobile.length !== 10 || !isValidIndianMobile(cleanMobile)) {
      setError('Please enter a valid registered 10-digit mobile number.');
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
      setError('Please enter the verification code.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.verifyOtp(cleanMobile, cleanOtp);
      setStep(3);
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep3Reset = async () => {
    setError('');
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setTimeout(async () => {
      const reset = await resetUserPassword(mobile.trim(), newPassword);
      setIsLoading(false);

      if (reset) {
        setIsSuccess(true);
        setTimeout(() => {
          navigation.replace('SignIn');
        }, 1200);
      } else {
        setError('No account found with this mobile number.');
      }
    }, 400);
  };

  const handleBack = () => {
    if (step > 1 && !isSuccess) {
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
        <Text style={styles.headerTitle}>Reset Password</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isSuccess ? (
          <View style={styles.successWrapper}>
            <CheckCircle2 size={64} color="#059669" />
            <Text style={styles.successTitle}>Password Reset Successful!</Text>
            <Text style={styles.successSubtitle}>
              You can now sign in to your SJ Jewelers account with your new password.
            </Text>
          </View>
        ) : (
          <View>
            {/* Steps Indicator */}
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

            {/* STEP 1: Enter Mobile */}
            {step === 1 && (
              <View>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Find Your Account</Text>
                  <Text style={styles.sectionSubtitle}>
                    Enter your registered mobile number to receive a verification OTP
                  </Text>
                </View>

                <View style={globalStyles.inputGroup}>
                  <Text style={globalStyles.inputLabel}>Registered Mobile Number</Text>
                  <View style={styles.phoneInputWrap}>
                    <View style={styles.prefixBadge}>
                      <Text style={styles.prefixText}>+91</Text>
                    </View>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="10-digit Mobile Number"
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
                </View>

                <TouchableOpacity
                  style={[globalStyles.primaryButton, { marginTop: 12 }, isLoading && { opacity: 0.7 }]}
                  onPress={handleStep1SendOtp}
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

            {/* STEP 2: Verify OTP */}
            {step === 2 && (
              <View>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Enter Verification Code</Text>
                  <Text style={styles.sectionSubtitle}>
                    Enter the 6-digit OTP code sent to +91 {mobile}
                  </Text>
                </View>

                <View style={globalStyles.inputGroup}>
                  <Text style={globalStyles.inputLabel}>6-Digit OTP</Text>
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
                    <Text style={globalStyles.primaryButtonText}>Verify OTP</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 3: Set New Password */}
            {step === 3 && (
              <View>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Set New Password</Text>
                  <Text style={styles.sectionSubtitle}>
                    Enter your new secure password for +91 {mobile}
                  </Text>
                </View>

                <View style={globalStyles.inputGroup}>
                  <Text style={globalStyles.inputLabel}>New Password</Text>
                  <View style={styles.passwordInputWrap}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="At least 6 characters"
                      placeholderTextColor={COLORS.textMuted}
                      secureTextEntry={!showPassword}
                      value={newPassword}
                      onChangeText={(val) => {
                        setNewPassword(val);
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
                  <Text style={globalStyles.inputLabel}>Confirm New Password</Text>
                  <View style={styles.passwordInputWrap}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Re-enter new password"
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
                  onPress={handleStep3Reset}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={globalStyles.primaryButtonText}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Back to Sign In Link */}
            <View style={styles.footerWrap}>
              <Text style={styles.footerText}>Remember your password? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                <Text style={styles.signInLinkText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
  phoneInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    height: 50,
    overflow: 'hidden',
  },
  prefixBadge: {
    backgroundColor: '#f7f4ff',
    paddingHorizontal: 14,
    height: '100%',
    justifyContent: 'center',
    borderRightWidth: 1.5,
    borderRightColor: '#e0d8fa',
  },
  prefixText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    color: COLORS.textDark,
    fontWeight: '500',
    letterSpacing: 0.5,
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
  successWrapper: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#059669',
    marginTop: 16,
  },
  successSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    fontWeight: '400',
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
