import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { ArrowLeft, ArrowUp, AlertTriangle, ShieldCheck, CheckCircle2, X } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';
import ActionSheet from '../components/ActionSheet';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';
import { globalStyles } from '../styles/globalStyles';

export default function WithdrawScreen({ route, navigation }) {
  const {
    currentUser,
    holdings,
    goldRate,
    silverRate,
    submitKycRequest,
    requestWithdrawalOtp,
    resendWithdrawalOtp,
    verifyWithdrawalOtp,
    fetchHoldings,
    fetchLiveRates,
    fetchProfile,
  } = useApp();
  const fromScreen = route?.params?.fromScreen || 'Home';
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  useEffect(() => {
    fetchHoldings();
    fetchLiveRates();
    fetchProfile();
  }, [fetchHoldings, fetchLiveRates, fetchProfile]);

  const isKycVerified =
    (currentUser?.kycStatus || '').toLowerCase() === 'verified' ||
    (currentUser?.kycStatus || '').toLowerCase() === 'approved';

  // KYC Modal States
  const [showKycModal, setShowKycModal] = useState(false);
  const [pan, setPan] = useState(currentUser?.pan || '');
  const [aadhar, setAadhar] = useState(currentUser?.aadhar || '');
  const [kycError, setKycError] = useState('');
  const [kycSuccess, setKycSuccess] = useState(false);
  const [isSubmittingKyc, setIsSubmittingKyc] = useState(false);

  // Withdraw Modal States
  const [withdrawAsset, setWithdrawAsset] = useState('Gold');
  const [withdrawGrams, setWithdrawGrams] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [modalStep, setModalStep] = useState('form'); // 'form' | 'otp'
  const [challengeId, setChallengeId] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  // Resend Countdown Timer Effect
  useEffect(() => {
    let timer = null;
    if (resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCountdown]);

  const goldTotal = Number(holdings?.goldGrams) || 0;
  const goldReserved = Number(holdings?.goldReservedGrams) || 0;
  const goldAvailable = holdings?.goldAvailableGrams !== undefined
    ? Number(holdings.goldAvailableGrams)
    : Math.max(0, goldTotal - goldReserved);

  const silverTotal = Number(holdings?.silverGrams) || 0;
  const silverReserved = Number(holdings?.silverReservedGrams) || 0;
  const silverAvailable = holdings?.silverAvailableGrams !== undefined
    ? Number(holdings.silverAvailableGrams)
    : Math.max(0, silverTotal - silverReserved);

  const goldGrams = goldTotal;
  const silverGrams = silverTotal;

  const handleBack = () => {
    if (fromScreen === 'profile') {
      navigation.navigate('Profile');
    } else {
      navigation.navigate('Home');
    }
  };

  const handleInitiateWithdraw = (asset) => {
    if (!isKycVerified) {
      setShowKycModal(true);
      return;
    }
    setWithdrawAsset(asset);
    setWithdrawGrams('');
    setWithdrawError('');
    setOtpError('');
    setOtpValue('');
    setChallengeId('');
    setModalStep('form');
    setShowWithdrawModal(true);
  };

  const handleSubmitKyc = async () => {
    if (isSubmittingKyc) return;
    setKycError('');
    const cleanPan = (pan || '').trim().toUpperCase();
    const cleanAadhar = (aadhar || '').replace(/\D/g, '');

    if (!cleanPan || !cleanAadhar) {
      setKycError('Please enter both PAN Card and Aadhaar Number.');
      return;
    }

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      setKycError('Please enter a valid 10-char PAN (e.g. ABCDE1234F).');
      return;
    }

    if (cleanAadhar.length !== 12) {
      setKycError('Please enter a valid 12-digit Aadhaar Number.');
      return;
    }

    setIsSubmittingKyc(true);
    try {
      await submitKycRequest({ pan: cleanPan, aadhar: cleanAadhar });
      setKycSuccess(true);
      setTimeout(() => {
        setKycSuccess(false);
        setShowKycModal(false);
        setIsSubmittingKyc(false);
      }, 1000);
    } catch (err) {
      setIsSubmittingKyc(false);
      setKycError(err.message || 'KYC submission failed. Please try again.');
    }
  };

  // Step 1: Request OTP Challenge (NO withdrawal created, NO balance reserved)
  const handleRequestOtp = async () => {
    if (isRequestingOtp) return;
    setWithdrawError('');
    setOtpError('');

    const raw = (withdrawGrams || '').trim();
    if (!raw) {
      setWithdrawError('Please enter a withdrawal quantity.');
      return;
    }

    if (!/^\d+(\.\d+)?$/.test(raw)) {
      setWithdrawError('Please enter a valid gram quantity.');
      return;
    }

    const g = parseFloat(raw);
    if (isNaN(g) || !isFinite(g) || g <= 0) {
      setWithdrawError('Please enter a valid withdrawal quantity.');
      return;
    }

    const normalizedGrams = Math.round(g * 10000) / 10000;
    if (normalizedGrams <= 0) {
      setWithdrawError('Please enter a valid withdrawal quantity.');
      return;
    }

    const minGrams = 0.001; // Authoritative backend rule: 0.0010 gm
    if (normalizedGrams < minGrams) {
      setWithdrawError(`Minimum withdrawal quantity is ${minGrams.toFixed(4)} gm.`);
      return;
    }

    const isGold = withdrawAsset === 'Gold';
    const availableGrams = isGold ? goldAvailable : silverAvailable;

    if (normalizedGrams > availableGrams) {
      setWithdrawError(`Insufficient ${withdrawAsset} balance.`);
      return;
    }

    setIsRequestingOtp(true);
    try {
      const res = await requestWithdrawalOtp({
        metal: withdrawAsset.toLowerCase(),
        quantity_grams: normalizedGrams,
        grams: normalizedGrams,
        withdrawal_mode: 'physical',
      });

      if (res && res.challenge_id) {
        setChallengeId(res.challenge_id);
        setOtpValue('');
        setModalStep('otp');
        setResendCountdown(30);
      } else {
        throw new Error(res?.message || 'Failed to dispatch withdrawal OTP.');
      }
    } catch (err) {
      setWithdrawError(err.message || 'Failed to request OTP. Please try again.');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  // Step 2: Verify OTP and Execute Real Withdrawal Creation
  const handleVerifyOtp = async () => {
    if (isVerifyingOtp) return;
    setOtpError('');

    const cleanOtp = (otpValue || '').trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setOtpError('Please enter the complete 6-digit OTP code.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      await verifyWithdrawalOtp(challengeId, cleanOtp);

      setWithdrawSuccess(true);
      setModalStep('form');
      setChallengeId('');
      setOtpValue('');

      setTimeout(() => {
        setWithdrawSuccess(false);
        setShowWithdrawModal(false);
        navigation.navigate('TransactionHistory', { fromScreen: 'withdraw' });
      }, 1500);
    } catch (err) {
      setOtpError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Resend OTP Handler
  const handleResendOtp = async () => {
    if (isResendingOtp || resendCountdown > 0) return;
    setOtpError('');
    setIsResendingOtp(true);

    try {
      await resendWithdrawalOtp(challengeId);
      setResendCountdown(30);
      setOtpSuccessMsg('New OTP dispatched to your registered mobile.');
      setTimeout(() => setOtpSuccessMsg(''), 3000);
    } catch (err) {
      setOtpError(err.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setIsResendingOtp(false);
    }
  };

  // Clean Cancel Handler
  const handleCloseWithdrawModal = () => {
    setShowWithdrawModal(false);
    setModalStep('form');
    setChallengeId('');
    setOtpValue('');
    setWithdrawError('');
    setOtpError('');
  };

  const handleNavigate = (screen, params = {}) => {
    setIsActionSheetOpen(false);
    if (screen === 'home') navigation.navigate('Home');
    else if (screen === 'buy') navigation.navigate('BuyNow', { assetType: 'gold', ...params });
    else if (screen === 'holdings') navigation.navigate('Holdings');
    else if (screen === 'profile') navigation.navigate('Profile', params);
    else if (screen === 'withdraw') navigation.navigate('Withdraw', { fromScreen: 'home', ...params });
    else if (screen === 'transactions') navigation.navigate('TransactionHistory', { fromScreen: 'withdraw', ...params });
    else if (screen === 'contact') navigation.navigate('ContactUs', { fromScreen: 'withdraw', ...params });
  };

  return (
    <View style={globalStyles.container}>
      {/* 1. Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          activeOpacity={0.7}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color="#1e1b2e" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mode of Withdraw</Text>
      </View>

      {/* 2. Scrollable Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Gold Asset Card */}
        <View style={styles.withdrawAssetCard}>
          <Text style={styles.assetNameTitle}>Gold</Text>
          <Text style={styles.assetBalanceAmount}>{goldGrams.toFixed(4)}</Text>
          <View style={styles.gramPill}>
            <Text style={styles.gramPillText}>Gram</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.withdrawActionBtn,
              isKycVerified ? styles.withdrawActionBtnVerified : styles.withdrawActionBtnPending,
            ]}
            onPress={() => handleInitiateWithdraw('Gold')}
            activeOpacity={0.8}
          >
            <ArrowUp
              size={18}
              color={isKycVerified ? '#ffffff' : '#5b5375'}
              strokeWidth={2.5}
            />
            <Text
              style={[
                styles.withdrawActionBtnText,
                isKycVerified ? styles.withdrawActionBtnTextVerified : styles.withdrawActionBtnTextPending,
              ]}
            >
              Withdraw
            </Text>
          </TouchableOpacity>
        </View>

        {/* Silver Asset Card */}
        <View style={styles.withdrawAssetCard}>
          <Text style={styles.assetNameTitle}>Silver</Text>
          <Text style={styles.assetBalanceAmount}>{silverGrams.toFixed(4)}</Text>
          <View style={styles.gramPill}>
            <Text style={styles.gramPillText}>Gram</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.withdrawActionBtn,
              isKycVerified ? styles.withdrawActionBtnVerified : styles.withdrawActionBtnPending,
            ]}
            onPress={() => handleInitiateWithdraw('Silver')}
            activeOpacity={0.8}
          >
            <ArrowUp
              size={18}
              color={isKycVerified ? '#ffffff' : '#5b5375'}
              strokeWidth={2.5}
            />
            <Text
              style={[
                styles.withdrawActionBtnText,
                isKycVerified ? styles.withdrawActionBtnTextVerified : styles.withdrawActionBtnTextPending,
              ]}
            >
              Withdraw
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 3. BottomNav */}
      <BottomNav
        activeTab="withdraw"
        onSelectTab={handleNavigate}
        onTogglePlus={() => setIsActionSheetOpen(true)}
      />

      {/* Quick Menu Action Sheet */}
      <ActionSheet
        isOpen={isActionSheetOpen}
        onClose={() => setIsActionSheetOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* KYC Verification Modal */}
      <Modal
        visible={showKycModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowKycModal(false)}
      >
        <View style={globalStyles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={24} color={COLORS.primaryPurple} />
                <Text style={styles.modalSheetTitle}>KYC Verification Required</Text>
              </View>
              <TouchableOpacity onPress={() => setShowKycModal(false)}>
                <X size={22} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            {kycSuccess ? (
              <View style={styles.modalSuccessWrap}>
                <CheckCircle2 size={54} color="#059669" />
                <Text style={styles.modalSuccessTitle}>KYC Submitted Successfully!</Text>
                <Text style={styles.modalSuccessSub}>You can now proceed with your withdrawal.</Text>
              </View>
            ) : (
              <View>
                <Text style={styles.modalDesc}>
                  Please provide your PAN and Aadhaar details to verify your account and enable vault withdrawals.
                </Text>

                {kycError ? (
                  <View style={globalStyles.errorBox}>
                    <Text style={globalStyles.errorBoxText}>{kycError}</Text>
                  </View>
                ) : null}

                <View style={globalStyles.inputGroup}>
                  <Text style={globalStyles.inputLabel}>PAN Card Number *</Text>
                  <TextInput
                    style={globalStyles.inputField}
                    placeholder="ABCDE1234F"
                    placeholderTextColor={COLORS.textMuted}
                    value={pan}
                    onChangeText={(val) => setPan(val.toUpperCase())}
                    autoCapitalize="characters"
                    maxLength={10}
                  />
                </View>

                <View style={globalStyles.inputGroup}>
                  <Text style={globalStyles.inputLabel}>Aadhaar Number *</Text>
                  <TextInput
                    style={globalStyles.inputField}
                    placeholder="12-digit Aadhaar Number"
                    placeholderTextColor={COLORS.textMuted}
                    value={aadhar}
                    onChangeText={(val) => setAadhar(val.replace(/\D/g, ''))}
                    keyboardType="number-pad"
                    maxLength={12}
                  />
                </View>

                <TouchableOpacity
                  style={[globalStyles.primaryButton, { marginTop: 10 }, isSubmittingKyc && { opacity: 0.7 }]}
                  onPress={handleSubmitKyc}
                  disabled={isSubmittingKyc}
                  activeOpacity={0.8}
                >
                  {isSubmittingKyc ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={globalStyles.primaryButtonText}>Verify & Proceed</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Withdrawal Form & OTP Verification Modal */}
      <Modal
        visible={showWithdrawModal}
        transparent
        animationType="slide"
        onRequestClose={handleCloseWithdrawModal}
      >
        <View style={globalStyles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalSheetTitle}>
                {modalStep === 'otp' ? 'Verify Withdrawal' : `Withdraw ${withdrawAsset}`}
              </Text>
              <TouchableOpacity onPress={handleCloseWithdrawModal}>
                <X size={22} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            {withdrawSuccess ? (
              <View style={styles.modalSuccessWrap}>
                <CheckCircle2 size={54} color="#059669" />
                <Text style={styles.modalSuccessTitle}>Withdrawal Requested!</Text>
                <Text style={styles.modalSuccessSub}>
                  Your physical {withdrawAsset.toLowerCase()} request has been submitted and is pending admin processing.
                </Text>
              </View>
            ) : modalStep === 'otp' ? (
              /* STEP 2: OTP VERIFICATION */
              <View>
                <View style={{ marginBottom: 12 }}>
                  <Text style={styles.modalDesc}>
                    We sent a 6-digit OTP code to your registered mobile number:
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginTop: 3 }}>
                    +91 {currentUser?.mobile && currentUser.mobile.length >= 4 ? `******${currentUser.mobile.slice(-4)}` : 'registered mobile'}
                  </Text>
                </View>

                {otpError ? (
                  <View style={globalStyles.errorBox}>
                    <Text style={globalStyles.errorBoxText}>{otpError}</Text>
                  </View>
                ) : null}

                {otpSuccessMsg ? (
                  <View style={{ backgroundColor: '#ecfdf5', borderRadius: 8, padding: 10, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#059669' }}>
                    <Text style={{ fontSize: 13, color: '#065f46', fontWeight: '600' }}>{otpSuccessMsg}</Text>
                  </View>
                ) : null}

                <View style={globalStyles.inputGroup}>
                  <Text style={globalStyles.inputLabel}>Enter 6-Digit OTP *</Text>
                  <TextInput
                    style={[
                      globalStyles.inputField,
                      { fontSize: 22, fontWeight: '700', letterSpacing: 8, textAlign: 'center', height: 48 }
                    ]}
                    placeholder="------"
                    placeholderTextColor={COLORS.textMuted}
                    value={otpValue}
                    onChangeText={(val) => {
                      setOtpValue(val.replace(/\D/g, '').slice(0, 6));
                      setOtpError('');
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                  <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
                    Requested: {withdrawGrams} gm {withdrawAsset}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    globalStyles.primaryButton,
                    { marginTop: 8 },
                    (isVerifyingOtp || otpValue.length < 6) && { opacity: 0.7 }
                  ]}
                  onPress={handleVerifyOtp}
                  disabled={isVerifyingOtp || otpValue.length < 6}
                  activeOpacity={0.8}
                >
                  {isVerifyingOtp ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <ActivityIndicator color="#ffffff" size="small" style={{ marginRight: 8 }} />
                      <Text style={globalStyles.primaryButtonText}>Verifying OTP...</Text>
                    </View>
                  ) : (
                    <Text style={globalStyles.primaryButtonText}>Verify OTP</Text>
                  )}
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setModalStep('form');
                      setOtpError('');
                    }}
                    disabled={isVerifyingOtp}
                    style={{ paddingVertical: 6 }}
                  >
                    <Text style={{ fontSize: 13, color: COLORS.primaryPurple, fontWeight: '600' }}>
                      « Change Quantity
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleResendOtp}
                    disabled={resendCountdown > 0 || isResendingOtp}
                    style={{ paddingVertical: 6 }}
                  >
                    <Text style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: resendCountdown > 0 ? COLORS.textMuted : COLORS.primaryPurple
                    }}>
                      {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : (isResendingOtp ? 'Sending...' : 'Resend OTP')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* STEP 1: QUANTITY INPUT */
              <View>
                <View style={styles.pickupDisclaimer}>
                  <AlertTriangle size={18} color="#d97706" />
                  <Text style={styles.pickupDisclaimerText}>
                    Physical delivery: You will receive pure certified physical {withdrawAsset.toLowerCase()} directly from our Salem jewelry showroom upon presenting your OTP & ID.
                  </Text>
                </View>

                {withdrawError ? (
                  <View style={globalStyles.errorBox}>
                    <Text style={globalStyles.errorBoxText}>{withdrawError}</Text>
                  </View>
                ) : null}

                <View style={globalStyles.inputGroup}>
                  <Text style={globalStyles.inputLabel}>
                    Quantity to Withdraw (Grams)
                  </Text>
                  <TextInput
                    style={globalStyles.inputField}
                    placeholder="Min 0.0010"
                    placeholderTextColor={COLORS.textMuted}
                    value={withdrawGrams}
                    onChangeText={(val) => {
                      setWithdrawGrams(val);
                      setWithdrawError('');
                    }}
                    keyboardType="numeric"
                  />
                  <Text style={styles.balanceHint}>
                    Available: {withdrawAsset === 'Gold' ? goldAvailable.toFixed(4) : silverAvailable.toFixed(4)} gm
                  </Text>
                </View>

                <TouchableOpacity
                  style={[globalStyles.primaryButton, { marginTop: 10 }, isRequestingOtp && { opacity: 0.7 }]}
                  onPress={handleRequestOtp}
                  disabled={isRequestingOtp}
                  activeOpacity={0.8}
                >
                  {isRequestingOtp ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={globalStyles.primaryButtonText}>Confirm Request</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
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
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 95,
    gap: 18,
  },
  withdrawAssetCard: {
    backgroundColor: '#dcd0ff',
    borderRadius: RADIUS.xl,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c9b8fc',
    ...SHADOWS.light,
  },
  assetNameTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  assetBalanceAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textDark,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  gramPill: {
    paddingHorizontal: 14,
    paddingVertical: 2,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
  },
  gramPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#33295c',
  },
  withdrawActionBtn: {
    width: '100%',
    height: 46,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  withdrawActionBtnVerified: {
    backgroundColor: COLORS.primaryPurple,
    ...SHADOWS.primaryBtn,
  },
  withdrawActionBtnPending: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: '#b2a2e0',
  },
  withdrawActionBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  withdrawActionBtnTextVerified: {
    color: '#ffffff',
  },
  withdrawActionBtnTextPending: {
    color: '#5b5375',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 20,
    paddingBottom: 34,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalSheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  modalDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 14,
  },
  modalSuccessWrap: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  modalSuccessTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#059669',
    marginTop: 10,
  },
  modalSuccessSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  pickupDisclaimer: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#fef3c7',
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  pickupDisclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
    fontWeight: '500',
    lineHeight: 16,
  },
  balanceHint: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryPurple,
    marginTop: 4,
  },
});
