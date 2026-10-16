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
import { ArrowLeft, CheckCircle2, ShieldCheck, Smartphone, CreditCard, Building2, X } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';
import ActionSheet from '../components/ActionSheet';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';
import { globalStyles } from '../styles/globalStyles';

export default function BuyNowScreen({ route, navigation }) {

  const { goldRate, silverRate, addPurchaseTransaction, buyNowState, setBuyNowState } = useApp();
  const initialAsset = route?.params?.assetType || buyNowState?.assetType || 'gold';

  const [selectedAsset, setSelectedAsset] = useState(initialAsset);
  const isGold = selectedAsset === 'gold';
  const ratePerGram = isGold ? goldRate : silverRate;

  const [mode, setMode] = useState(buyNowState?.mode || 'rupees');
  const [selectedQuickOption, setSelectedQuickOption] = useState(buyNowState?.selectedQuickOption || '100');

  const rupeesPresets = ['50', '100', '150', '200'];
  const gramsPresets = isGold
    ? ['0.0050', '0.0100', '0.0200', '0.0500']
    : ['1.00', '5.00', '10.00', '25.00'];

  const [rupeesVal, setRupeesVal] = useState(buyNowState?.rupeesVal || '100');
  const [gramsVal, setGramsVal] = useState(buyNowState?.gramsVal || (100 / ratePerGram).toFixed(4));

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  // Recalculate if selectedAsset or ratePerGram changes from live rates
  useEffect(() => {
    if (!ratePerGram || ratePerGram <= 0) return;
    if (mode === 'rupees') {
      const num = parseFloat(rupeesVal) || 100;
      setGramsVal((num / ratePerGram).toFixed(4));
    } else {
      const gm = parseFloat(gramsVal) || (isGold ? 0.01 : 5);
      setRupeesVal((gm * ratePerGram).toFixed(2));
    }
  }, [selectedAsset, ratePerGram]);
  // Sync state back to context for preservation
  useEffect(() => {
    setBuyNowState({
      assetType: selectedAsset,
      mode,
      rupeesVal,
      gramsVal,
      selectedQuickOption,
    });
  }, [selectedAsset, mode, rupeesVal, gramsVal, selectedQuickOption]);

  const handleAssetSwitch = (asset) => {
    setSelectedAsset(asset);
    const newRate = asset === 'gold' ? goldRate : silverRate;
    if (mode === 'rupees') {
      const num = parseFloat(rupeesVal) || 100;
      setGramsVal((num / newRate).toFixed(4));
    } else {
      const defaultGm = asset === 'gold' ? '0.0100' : '5.00';
      setSelectedQuickOption(defaultGm);
      setGramsVal(defaultGm);
      setRupeesVal((parseFloat(defaultGm) * newRate).toFixed(2));
    }
  };

  const handleRupeesChange = (val) => {
    setRupeesVal(val);
    const num = parseFloat(val) || 0;
    setGramsVal((num / ratePerGram).toFixed(4));
    if (rupeesPresets.includes(val)) {
      setSelectedQuickOption(val);
    } else {
      setSelectedQuickOption(null);
    }
  };

  const handleGramsChange = (val) => {
    setGramsVal(val);
    const num = parseFloat(val) || 0;
    setRupeesVal((num * ratePerGram).toFixed(2));
    if (gramsPresets.includes(val)) {
      setSelectedQuickOption(val);
    } else {
      setSelectedQuickOption(null);
    }
  };

  const handleSwitchMode = (newMode) => {
    setMode(newMode);
    if (newMode === 'rupees') {
      const defaultAmt = '100';
      setSelectedQuickOption(defaultAmt);
      setRupeesVal(defaultAmt);
      setGramsVal((parseFloat(defaultAmt) / ratePerGram).toFixed(4));
    } else {
      const defaultGm = isGold ? '0.0100' : '5.00';
      setSelectedQuickOption(defaultGm);
      setGramsVal(defaultGm);
      setRupeesVal((parseFloat(defaultGm) * ratePerGram).toFixed(2));
    }
  };

  const rawAmount = parseFloat(rupeesVal || '0');
  const gstAmount = rawAmount * 0.03;
  const totalAmountWithGst = rawAmount + gstAmount;

  const handleProceed = () => {
    const gNum = parseFloat(gramsVal);
    if (parseFloat(rupeesVal) <= 0 || !gNum || gNum <= 0) {
      alert('Please enter a valid amount or gram quantity.');
      return;
    }
    if (isGold && gNum < 0.001) {
      alert('Minimum gold purchase quantity is 0.001 grams.');
      return;
    }
    if (!isGold && gNum < 0.01) {
      alert('Minimum silver purchase quantity is 0.01 grams.');
      return;
    }
    setShowConfirmModal(true);
    setPaymentSuccess(false);
    setIsProcessing(false);
  };

  const handleConfirmPay = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    const currentAsset = selectedAsset === 'gold' ? 'gold' : 'silver';
    const gramsNumber = parseFloat(gramsVal) || 0;
    const metalVal = gramsNumber * ratePerGram;
    const gstVal = parseFloat((metalVal * 0.03).toFixed(2));
    const totalVal = parseFloat((metalVal + gstVal).toFixed(2));

    try {
      await addPurchaseTransaction({
        assetType: currentAsset,
        asset: currentAsset === 'gold' ? 'Gold' : 'Silver',
        amount: totalVal,
        grams: gramsNumber,
        ratePerGram: ratePerGram,
        paymentMethod: selectedMethod || 'UPI',
      });

      setPaymentSuccess(true);
      setIsProcessing(false);

      setTimeout(() => {
        setShowConfirmModal(false);
        setPaymentSuccess(false);
        navigation.navigate('TransactionHistory', { fromScreen: 'buy' });
      }, 1200);
    } catch (err) {
      setIsProcessing(false);
      alert(err.message || 'Purchase failed. Please try again.');
    }
  };

  const handleNavigate = (screen, params = {}) => {
    setIsActionSheetOpen(false);
    if (screen === 'home') navigation.navigate('Home');
    else if (screen === 'buy') navigation.navigate('BuyNow', { assetType: 'gold', ...params });
    else if (screen === 'holdings') navigation.navigate('Holdings', { fromScreen: 'buy', ...params });
    else if (screen === 'profile') navigation.navigate('Profile', params);
    else if (screen === 'withdraw') navigation.navigate('Withdraw', { fromScreen: 'buy', ...params });
    else if (screen === 'transactions') navigation.navigate('TransactionHistory', { fromScreen: 'buy', ...params });
    else if (screen === 'contact') navigation.navigate('ContactUs', { fromScreen: 'buy', ...params });
  };

  return (
    <View style={globalStyles.container}>
      {/* 1. Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#1e1b2e" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buy Now</Text>
      </View>

      {/* 2. Scrollable Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Live Gold/Silver Rate Card */}
        <View style={styles.rateCard}>
          <View style={styles.liveBadgeRow}>
            <View style={styles.livePulseDot} />
            <Text style={styles.liveBadgeText}>Live {isGold ? 'Gold' : 'Silver'} Rate</Text>
          </View>

          {/* Metal Toggle Pills */}
          <View style={styles.metalTogglePill}>
            <TouchableOpacity
              style={[styles.metalTabBtn, isGold && styles.metalTabBtnActive]}
              onPress={() => handleAssetSwitch('gold')}
              activeOpacity={0.8}
            >
              <Text style={[styles.metalTabText, isGold && styles.metalTabTextActive]}>
                Gold
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.metalTabBtn, !isGold && styles.metalTabBtnActive]}
              onPress={() => handleAssetSwitch('silver')}
              activeOpacity={0.8}
            >
              <Text style={[styles.metalTabText, !isGold && styles.metalTabTextActive]}>
                Silver
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.liveRateText}>
            ₹{ratePerGram.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/gm
          </Text>
        </View>

        {/* Input Mode Selector (Rupees vs Grams) */}
        <View style={styles.modeToggleContainer}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'rupees' && styles.modeBtnActive]}
            onPress={() => handleSwitchMode('rupees')}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeBtnText, mode === 'rupees' && styles.modeBtnTextActive]}>
              Buy in Rupees (₹)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeBtn, mode === 'grams' && styles.modeBtnActive]}
            onPress={() => handleSwitchMode('grams')}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeBtnText, mode === 'grams' && styles.modeBtnTextActive]}>
              Buy in Grams (gm)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount & Grams Calculator Card */}
        <View style={styles.calculatorCard}>
          {mode === 'rupees' ? (
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.inputLabel}>Enter Amount in Rupees (₹)</Text>
              <View style={styles.amountInputWrap}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="100"
                  placeholderTextColor={COLORS.textMuted}
                  value={rupeesVal}
                  onChangeText={handleRupeesChange}
                  keyboardType="numeric"
                />
              </View>
              <Text style={styles.approxGramsText}>
                ≈ {gramsVal} gm of {isGold ? '22KT Gold' : '99.9% Silver'}
              </Text>
            </View>
          ) : (
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.inputLabel}>Enter Quantity in Grams (gm)</Text>
              <View style={styles.amountInputWrap}>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.0100"
                  placeholderTextColor={COLORS.textMuted}
                  value={gramsVal}
                  onChangeText={handleGramsChange}
                  keyboardType="numeric"
                />
                <Text style={styles.unitSuffix}>gm</Text>
              </View>
              <Text style={styles.approxGramsText}>
                ≈ ₹{rupeesVal}
              </Text>
            </View>
          )}

          {/* Quick Presets */}
          <Text style={styles.presetsTitle}>Quick Select</Text>
          <View style={styles.presetsRow}>
            {(mode === 'rupees' ? rupeesPresets : gramsPresets).map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetChip,
                  selectedQuickOption === preset && styles.presetChipActive,
                ]}
                onPress={() => {
                  if (mode === 'rupees') {
                    handleRupeesChange(preset);
                  } else {
                    handleGramsChange(preset);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    selectedQuickOption === preset && styles.presetChipTextActive,
                  ]}
                >
                  {mode === 'rupees' ? `₹${preset}` : `${preset} gm`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* GST & Breakdown Summary */}
          <View style={styles.breakdownCard}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Metal Value</Text>
              <Text style={styles.breakdownValue}>
                ₹{rawAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>GST (3%)</Text>
              <Text style={styles.breakdownValue}>
                ₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownTotalLabel}>Total Payable</Text>
              <Text style={styles.breakdownTotalValue}>
                ₹{totalAmountWithGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          {/* CTA Proceed Button */}
          <TouchableOpacity
            style={globalStyles.primaryButton}
            onPress={handleProceed}
            activeOpacity={0.8}
          >
            <Text style={globalStyles.primaryButtonText}>
              Buy {isGold ? 'Gold' : 'Silver'} Now
            </Text>
          </TouchableOpacity>
        </View>

        {/* Security & Vault Guarantee */}
        <View style={styles.securityBadge}>
          <ShieldCheck size={20} color={COLORS.primaryPurple} />
          <Text style={styles.securityText}>
            100% Pure Certified 22KT Gold & 99.9% Silver • Secured in Bank-Grade Insured Vaults
          </Text>
        </View>
      </ScrollView>

      {/* 3. Fixed Bottom Nav */}
      <BottomNav
        activeTab="buy"
        onSelectTab={handleNavigate}
        onTogglePlus={() => setIsActionSheetOpen(true)}
      />

      {/* Quick Menu Action Sheet Modal */}
      <ActionSheet
        isOpen={isActionSheetOpen}
        onClose={() => setIsActionSheetOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* Payment Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="slide"
        onRequestClose={() => !isProcessing && setShowConfirmModal(false)}
      >
        <View style={globalStyles.modalOverlay}>
          <View style={styles.confirmSheet}>
            {/* Header */}
            <View style={styles.confirmHeader}>
              <Text style={styles.confirmTitle}>Confirm Purchase</Text>
              {!isProcessing && !paymentSuccess && (
                <TouchableOpacity onPress={() => setShowConfirmModal(false)}>
                  <X size={22} color={COLORS.textDark} />
                </TouchableOpacity>
              )}
            </View>

            {paymentSuccess ? (
              <View style={styles.successContainer}>
                <CheckCircle2 size={60} color="#059669" />
                <Text style={styles.successTitle}>Payment Successful!</Text>
                <Text style={styles.successSubtitle}>
                  {gramsVal} gm of {isGold ? 'Gold' : 'Silver'} has been added to your vault.
                </Text>
              </View>
            ) : (
              <View>
                {/* Order Summary Box */}
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryAsset}>
                    {isGold ? '22KT Pure Gold' : '99.9% Fine Silver'}
                  </Text>
                  <Text style={styles.summaryGrams}>{gramsVal} gm</Text>
                  <Text style={styles.summaryTotal}>
                    ₹{totalAmountWithGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>

                {/* Payment Methods */}
                <Text style={styles.paymentMethodsTitle}>Select Payment Method</Text>
                <View style={styles.paymentMethodsCol}>
                  <TouchableOpacity
                    style={[styles.methodItem, selectedMethod === 'UPI' && styles.methodItemActive]}
                    onPress={() => setSelectedMethod('UPI')}
                  >
                    <Smartphone size={20} color={COLORS.primaryPurple} />
                    <Text style={styles.methodText}>UPI (GPay / PhonePe / Paytm)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.methodItem, selectedMethod === 'Net Banking' && styles.methodItemActive]}
                    onPress={() => setSelectedMethod('Net Banking')}
                  >
                    <Building2 size={20} color={COLORS.primaryPurple} />
                    <Text style={styles.methodText}>Net Banking (All Major Banks)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.methodItem, selectedMethod === 'Debit Card' && styles.methodItemActive]}
                    onPress={() => setSelectedMethod('Debit Card')}
                  >
                    <CreditCard size={20} color={COLORS.primaryPurple} />
                    <Text style={styles.methodText}>Debit / ATM Card</Text>
                  </TouchableOpacity>
                </View>

                {/* Pay Button */}
                <TouchableOpacity
                  style={[globalStyles.primaryButton, { marginTop: 16 }, isProcessing && { opacity: 0.7 }]}
                  onPress={handleConfirmPay}
                  disabled={isProcessing}
                  activeOpacity={0.8}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={globalStyles.primaryButtonText}>
                      Pay ₹{totalAmountWithGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
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
    paddingTop: 16,
    paddingBottom: 95,
    gap: 16,
  },
  rateCard: {
    backgroundColor: '#ded4fc',
    borderRadius: RADIUS.xl,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c9b8fc',
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  liveBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  metalTogglePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 30,
    padding: 3,
    flexDirection: 'row',
    width: 180,
    marginBottom: 8,
  },
  metalTabBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
  },
  metalTabBtnActive: {
    backgroundColor: COLORS.primaryPurple,
  },
  metalTabText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: COLORS.textDark,
  },
  metalTabTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  liveRateText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  modeToggleContainer: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.lg,
    padding: 4,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e8e2fa',
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: COLORS.primaryPurple,
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  modeBtnTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  calculatorCard: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e8e2fa',
    ...SHADOWS.light,
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCardPurpleSoft,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: 16,
    height: 50,
  },
  currencyPrefix: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.primaryPurple,
    marginRight: 6,
  },
  unitSuffix: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textDark,
    marginLeft: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  approxGramsText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.primaryPurple,
    marginTop: 6,
  },
  presetsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 8,
    marginTop: 4,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCardPurpleSoft,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  presetChipActive: {
    backgroundColor: COLORS.primaryPurple,
    borderColor: COLORS.primaryPurple,
  },
  presetChipText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: COLORS.textDark,
  },
  presetChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  breakdownCard: {
    backgroundColor: '#fbf9ff',
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: '#eee7ff',
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  breakdownLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '600',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#e8e2fa',
    marginVertical: 6,
  },
  breakdownTotalLabel: {
    fontSize: 14.5,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  breakdownTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primaryPurple,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e8e2fa',
  },
  securityText: {
    flex: 1,
    fontSize: 11.5,
    color: COLORS.textDark,
    fontWeight: '500',
    lineHeight: 16,
  },
  confirmSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 20,
    paddingBottom: 34,
  },
  confirmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  summaryBox: {
    backgroundColor: COLORS.bgCardPurpleSoft,
    borderRadius: RADIUS.lg,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryAsset: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  summaryGrams: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textDark,
    marginVertical: 4,
  },
  summaryTotal: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  paymentMethodsTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 10,
  },
  paymentMethodsCol: {
    gap: 8,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    backgroundColor: '#fbf9ff',
    borderWidth: 1,
    borderColor: '#e8e2fa',
  },
  methodItemActive: {
    borderColor: COLORS.primaryPurple,
    backgroundColor: '#f1ecfe',
  },
  methodText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#059669',
    marginTop: 12,
  },
  successSubtitle: {
    fontSize: 13.5,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
