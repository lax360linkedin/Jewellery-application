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
  Modal,
} from 'react-native';
import { ArrowLeft, ChevronDown } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { cleanIndianMobileDigits, formatToE164, isValidIndianMobile, isValidFullName } from '../utils/phoneUtils';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';
import { globalStyles } from '../styles/globalStyles';

const RELATIONSHIP_OPTIONS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Other'];

export default function CreateProfileScreen({ route, navigation }) {
  const { currentUser, completeUserProfile, skipProfile, hasSkippedProfile } = useApp();

  const params = route?.params || {};
  const mode = params.mode || (currentUser?.profileCompleted ? 'edit' : 'create');

  // Check stack history if available
  const navState = navigation.getState ? navigation.getState() : null;
  const prevRouteName = navState?.routes && navState.routes.length > 1
    ? navState.routes[navState.routes.length - 2]?.name
    : '';

  // Determine if opened from Profile page (Flow B) vs Initial Signup Onboarding (Flow A)
  // Flow B is active if:
  // 1. Explicit param: source === 'profile' OR fromScreen === 'profile'
  // 2. Or mode === 'edit'
  // 3. Or previous route in navigation stack was 'Profile'
  // 4. Or user is already inside the main app (hasSkippedProfile is true) AND source is NOT explicitly 'signup'
  const isFromProfile =
    params.source === 'profile' ||
    params.fromScreen === 'profile' ||
    mode === 'edit' ||
    prevRouteName === 'Profile' ||
    (hasSkippedProfile && params.source !== 'signup' && params.fromScreen !== 'signup');

  const isEditMode = mode === 'edit';

  const [formData, setFormData] = useState({
    name: currentUser.name || '',
    email: currentUser.email || '',
    mobile: currentUser.mobile ? cleanIndianMobileDigits(currentUser.mobile) : '',
    address: currentUser.address || '',
    pan: currentUser.pan || '',
    aadhar: currentUser.aadhar || '',
    accountNumber: currentUser.accountNumber || '',
    ifsc: currentUser.ifsc || '',
    nomineeName: currentUser.nomineeName || '',
    nomineeMobile: currentUser.nomineeMobile ? cleanIndianMobileDigits(currentUser.nomineeMobile) : '',
    nomineeDob: currentUser.nomineeDob || '',
    nomineeAddress: currentUser.nomineeAddress || '',
    relationship: currentUser.relationship || '',
    relationshipDetails: currentUser.relationshipDetails || '',
  });

  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRelModal, setShowRelModal] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'relationship' && value !== 'Other') {
        updated.relationshipDetails = '';
      }
      return updated;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
    setErrorMessage('');
  };

  // Flow A: Skip post-signup onboarding -> navigates directly to Home
  const handleSkip = async () => {
    await skipProfile();
    navigation.replace('Home');
  };

  // Flow B: Cancel when opened from Profile page -> returns strictly to Profile page
  const handleCancel = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Profile');
    }
  };

  // Top header back button
  const handleHeaderBack = () => {
    if (isFromProfile) {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Profile');
      }
    } else {
      navigation.replace('SignIn');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // 1. Name
    const nameClean = (formData.name || '').trim();
    if (!nameClean || !isValidFullName(nameClean)) {
      newErrors.name = 'Please enter a valid name';
    }

    // 2. Email (optional, validate if provided)
    const emailClean = (formData.email || '').trim();
    if (emailClean && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      newErrors.email = 'Enter a valid email address';
    }

    // 3. Mobile
    const mobileClean = cleanIndianMobileDigits(formData.mobile);
    if (!mobileClean || mobileClean.length !== 10 || !isValidIndianMobile(mobileClean)) {
      newErrors.mobile = 'Enter a valid 10-digit mobile number';
    }

    // 4. Address
    const addressClean = (formData.address || '').trim();
    if (!addressClean) {
      newErrors.address = 'Full address is required';
    } else if (addressClean.length < 5) {
      newErrors.address = 'Address must be at least 5 characters';
    }

    // 5. PAN (10-char alphanumeric: 5 letters, 4 digits, 1 letter)
    const panClean = (formData.pan || '').trim().toUpperCase();
    if (!panClean) {
      newErrors.pan = 'PAN card number is required';
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panClean)) {
      newErrors.pan = 'Enter valid 10-char PAN (e.g. ABCDE1234F)';
    }

    // 6. Aadhaar (12 digits)
    const aadharClean = (formData.aadhar || '').replace(/\D/g, '');
    if (!aadharClean) {
      newErrors.aadhar = 'Aadhaar number is required';
    } else if (aadharClean.length !== 12) {
      newErrors.aadhar = 'Enter a valid 12-digit Aadhaar number';
    }

    // 7. Bank Account Number (9 to 18 digits)
    const accountClean = (formData.accountNumber || '').replace(/\D/g, '');
    if (!accountClean) {
      newErrors.accountNumber = 'Bank account number is required';
    } else if (accountClean.length < 9 || accountClean.length > 18) {
      newErrors.accountNumber = 'Enter valid account number (9 to 18 digits)';
    }

    // 8. IFSC (11-char alphanumeric)
    const ifscClean = (formData.ifsc || '').trim().toUpperCase();
    if (!ifscClean) {
      newErrors.ifsc = 'IFSC code is required';
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscClean)) {
      newErrors.ifsc = 'Enter valid 11-character IFSC (e.g. SBIN0001234)';
    }

    // 9. Nominee Name
    const nomineeNameClean = (formData.nomineeName || '').trim();
    if (!nomineeNameClean || !isValidFullName(nomineeNameClean)) {
      newErrors.nomineeName = 'Please enter a valid nominee name';
    }

    // 10. Nominee Mobile
    const nomineeMobileClean = cleanIndianMobileDigits(formData.nomineeMobile);
    if (!nomineeMobileClean || nomineeMobileClean.length !== 10 || !isValidIndianMobile(nomineeMobileClean)) {
      newErrors.nomineeMobile = 'Enter valid 10-digit mobile number';
    }

    // 11. Nominee DOB
    const nomineeDobClean = (formData.nomineeDob || '').trim();
    if (!nomineeDobClean) {
      newErrors.nomineeDob = 'Nominee date of birth is required';
    }

    // 12. Nominee Address
    const nomineeAddressClean = (formData.nomineeAddress || '').trim();
    if (!nomineeAddressClean) {
      newErrors.nomineeAddress = 'Nominee address is required';
    } else if (nomineeAddressClean.length < 5) {
      newErrors.nomineeAddress = 'Nominee address must be at least 5 characters';
    }

    // 13. Relationship
    const relClean = (formData.relationship || '').trim();
    if (!relClean) {
      newErrors.relationship = 'Please select a relationship';
    }

    // 14. Relationship Details if Other
    const relDetailsClean = (formData.relationshipDetails || '').trim();
    if (relClean === 'Other' && (!relDetailsClean || relDetailsClean.length < 2)) {
      newErrors.relationshipDetails = 'Please specify relationship details';
    }

    return newErrors;
  };

  const handleSubmit = async () => {
    setErrorMessage('');

    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      setErrorMessage('Please correct the highlighted fields before submitting.');
      return;
    }
    setErrors({});

    setIsSubmitting(true);
    try {
      const updatedUserObj = {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        mobile: formatToE164(formData.mobile),
        address: formData.address.trim(),
        pan: formData.pan.trim().toUpperCase(),
        aadhar: formData.aadhar.replace(/\D/g, ''),
        accountNumber: formData.accountNumber.replace(/\D/g, ''),
        ifsc: formData.ifsc.trim().toUpperCase(),
        nomineeName: formData.nomineeName.trim(),
        nomineeMobile: formatToE164(formData.nomineeMobile),
        nomineeDob: formData.nomineeDob.trim(),
        nomineeAddress: formData.nomineeAddress.trim(),
        relationship: formData.relationship.trim(),
        relationshipDetails: formData.relationship === 'Other' ? formData.relationshipDetails.trim() : '',
        profileCompleted: true,
        isAuthenticated: true,
      };

      await completeUserProfile(updatedUserObj);
      setIsSubmitting(false);

      if (isFromProfile) {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('Profile');
        }
      } else {
        navigation.replace('Home');
      }
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Failed to update profile. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Clean Top Header (Title + Back Button) */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={handleHeaderBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#1e1b2e" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitleText}>
          {isEditMode ? 'Edit Profile' : 'Create Profile'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Error Alert */}
        {errorMessage ? (
          <View style={globalStyles.errorBox}>
            <Text style={globalStyles.errorBoxText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* SECTION 1: Personal Information */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Personal Details</Text>

          {/* Full Name */}
          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.inputLabel}>Full Name *</Text>
            <TextInput
              style={globalStyles.inputField}
              placeholder="Full Name"
              placeholderTextColor={COLORS.textMuted}
              value={formData.name}
              onChangeText={(val) => handleChange('name', val)}
            />
            {errors.name ? <Text style={globalStyles.fieldErrorText}>{errors.name}</Text> : null}
          </View>

          {/* Mobile Number */}
          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.inputLabel}>Mobile Number *</Text>
            <TextInput
              style={globalStyles.inputField}
              placeholder="10-digit Mobile Number"
              placeholderTextColor={COLORS.textMuted}
              value={formData.mobile}
              onChangeText={(val) => handleChange('mobile', cleanIndianMobileDigits(val))}
              keyboardType="number-pad"
              maxLength={10}
            />
            {errors.mobile ? <Text style={globalStyles.fieldErrorText}>{errors.mobile}</Text> : null}
          </View>

          {/* Email */}
          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.inputLabel}>Email Address (Optional)</Text>
            <TextInput
              style={globalStyles.inputField}
              placeholder="email@example.com"
              placeholderTextColor={COLORS.textMuted}
              value={formData.email}
              onChangeText={(val) => handleChange('email', val)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email ? <Text style={globalStyles.fieldErrorText}>{errors.email}</Text> : null}
          </View>

          {/* Address */}
          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.inputLabel}>Full Address *</Text>
            <TextInput
              style={[globalStyles.inputField, globalStyles.inputFieldMultiline]}
              placeholder="Complete Residential Address"
              placeholderTextColor={COLORS.textMuted}
              value={formData.address}
              onChangeText={(val) => handleChange('address', val)}
              multiline
              numberOfLines={3}
            />
            {errors.address ? <Text style={globalStyles.fieldErrorText}>{errors.address}</Text> : null}
          </View>
        </View>

        {/* SECTION 2: Identity & Banking */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>KYC & Banking Information</Text>

          {/* PAN Card */}
          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.inputLabel}>PAN Card Number *</Text>
            <TextInput
              style={globalStyles.inputField}
              placeholder="ABCDE1234F"
              placeholderTextColor={COLORS.textMuted}
              value={formData.pan}
              onChangeText={(val) => handleChange('pan', val.toUpperCase())}
              autoCapitalize="characters"
              maxLength={10}
            />
            {errors.pan ? <Text style={globalStyles.fieldErrorText}>{errors.pan}</Text> : null}
          </View>

          {/* Aadhaar Number */}
          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.inputLabel}>Aadhaar Number *</Text>
            <TextInput
              style={globalStyles.inputField}
              placeholder="12-digit Aadhaar Number"
              placeholderTextColor={COLORS.textMuted}
              value={formData.aadhar}
              onChangeText={(val) => handleChange('aadhar', val.replace(/\D/g, ''))}
              keyboardType="number-pad"
              maxLength={12}
            />
            {errors.aadhar ? <Text style={globalStyles.fieldErrorText}>{errors.aadhar}</Text> : null}
          </View>

          {/* Bank Account Number */}
          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.inputLabel}>Bank Account Number *</Text>
            <TextInput
              style={globalStyles.inputField}
              placeholder="Enter Account Number"
              placeholderTextColor={COLORS.textMuted}
              value={formData.accountNumber}
              onChangeText={(val) => handleChange('accountNumber', val.replace(/\D/g, ''))}
              keyboardType="number-pad"
              maxLength={18}
            />
            {errors.accountNumber ? <Text style={globalStyles.fieldErrorText}>{errors.accountNumber}</Text> : null}
          </View>

          {/* Bank IFSC */}
          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.inputLabel}>IFSC Code *</Text>
            <TextInput
              style={globalStyles.inputField}
              placeholder="e.g. SBIN0001234"
              placeholderTextColor={COLORS.textMuted}
              value={formData.ifsc}
              onChangeText={(val) => handleChange('ifsc', val.toUpperCase())}
              autoCapitalize="characters"
              maxLength={11}
            />
            {errors.ifsc ? <Text style={globalStyles.fieldErrorText}>{errors.ifsc}</Text> : null}
          </View>
        </View>

        {/* SECTION 3: Nominee Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Nominee Details</Text>

          {/* Nominee Name */}
          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.inputLabel}>Nominee Full Name *</Text>
            <TextInput
              style={globalStyles.inputField}
              placeholder="Nominee Name"
              placeholderTextColor={COLORS.textMuted}
              value={formData.nomineeName}
              onChangeText={(val) => handleChange('nomineeName', val)}
            />
            {errors.nomineeName ? <Text style={globalStyles.fieldErrorText}>{errors.nomineeName}</Text> : null}
          </View>

          {/* Nominee Mobile */}
          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.inputLabel}>Nominee Mobile *</Text>
            <TextInput
              style={globalStyles.inputField}
              placeholder="10-digit Mobile Number"
              placeholderTextColor={COLORS.textMuted}
              value={formData.nomineeMobile}
              onChangeText={(val) => handleChange('nomineeMobile', cleanIndianMobileDigits(val))}
              keyboardType="number-pad"
              maxLength={10}
            />
            {errors.nomineeMobile ? <Text style={globalStyles.fieldErrorText}>{errors.nomineeMobile}</Text> : null}
          </View>

          {/* Nominee DOB */}
          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.inputLabel}>Nominee Date of Birth (DD/MM/YYYY) *</Text>
            <TextInput
              style={globalStyles.inputField}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={COLORS.textMuted}
              value={formData.nomineeDob}
              onChangeText={(val) => handleChange('nomineeDob', val)}
            />
            {errors.nomineeDob ? <Text style={globalStyles.fieldErrorText}>{errors.nomineeDob}</Text> : null}
          </View>

          {/* Nominee Address */}
          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.inputLabel}>Nominee Address *</Text>
            <TextInput
              style={[globalStyles.inputField, globalStyles.inputFieldMultiline]}
              placeholder="Nominee Residential Address"
              placeholderTextColor={COLORS.textMuted}
              value={formData.nomineeAddress}
              onChangeText={(val) => handleChange('nomineeAddress', val)}
              multiline
              numberOfLines={3}
            />
            {errors.nomineeAddress ? <Text style={globalStyles.fieldErrorText}>{errors.nomineeAddress}</Text> : null}
          </View>

          {/* Relationship Picker */}
          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.inputLabel}>Relationship with Nominee *</Text>
            <TouchableOpacity
              style={[globalStyles.inputField, styles.selectTrigger]}
              onPress={() => setShowRelModal(true)}
              activeOpacity={0.7}
            >
              <Text style={{ color: formData.relationship ? COLORS.textDark : COLORS.textMuted, fontSize: 14.5, fontWeight: '500' }}>
                {formData.relationship || 'Select Relationship'}
              </Text>
              <ChevronDown size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
            {errors.relationship ? <Text style={globalStyles.fieldErrorText}>{errors.relationship}</Text> : null}
          </View>

          {/* If Relationship === 'Other', Details */}
          {formData.relationship === 'Other' && (
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.inputLabel}>Specify Relationship *</Text>
              <TextInput
                style={globalStyles.inputField}
                placeholder="Relationship Details"
                placeholderTextColor={COLORS.textMuted}
                value={formData.relationshipDetails}
                onChangeText={(val) => handleChange('relationshipDetails', val)}
              />
              {errors.relationshipDetails ? <Text style={globalStyles.fieldErrorText}>{errors.relationshipDetails}</Text> : null}
            </View>
          )}
        </View>

        {/* Lower Action Buttons:
            Flow A (New Signup): Shows 'Skip' (-> Home) and 'Submit'
            Flow B (From Profile): Shows 'Cancel' (-> Profile) and 'Submit' / 'Save Changes'
        */}
        <View style={styles.bottomButtonsRow}>
          {isFromProfile ? (
            <TouchableOpacity
              style={styles.cancelSkipBtn}
              onPress={handleCancel}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelSkipBtnText}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.cancelSkipBtn}
              onPress={handleSkip}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelSkipBtnText}>Skip</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.saveSubmitBtn, isSubmitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.textDark} size="small" />
            ) : (
              <Text style={styles.saveSubmitBtnText}>
                {isEditMode ? 'Save Changes' : 'Submit'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Relationship Selection Modal */}
      <Modal
        visible={showRelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRelModal(false)}
      >
        <TouchableOpacity
          style={globalStyles.modalCenteredOverlay}
          activeOpacity={1}
          onPress={() => setShowRelModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Relationship</Text>
            {RELATIONSHIP_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.modalOption, formData.relationship === opt && styles.modalOptionActive]}
                onPress={() => {
                  handleChange('relationship', opt);
                  setShowRelModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    formData.relationship === opt && styles.modalOptionTextActive,
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgLavender,
  },
  topHeader: {
    backgroundColor: COLORS.primaryPurple,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.light,
  },
  headerTitleText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.xl,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8e2fa',
    ...SHADOWS.light,
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: COLORS.primaryPurple,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1ecfe',
    paddingBottom: 8,
  },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 10,
    marginBottom: 30,
  },
  cancelSkipBtn: {
    flex: 1,
    height: 50,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelSkipBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  saveSubmitBtn: {
    flex: 1,
    height: 50,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
    backgroundColor: '#ede7fc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveSubmitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.xl,
    padding: 20,
    ...SHADOWS.medium,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 14,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    marginBottom: 8,
    backgroundColor: COLORS.bgCardPurpleSoft,
  },
  modalOptionActive: {
    backgroundColor: COLORS.primaryPurple,
  },
  modalOptionText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: COLORS.textDark,
    textAlign: 'center',
  },
  modalOptionTextActive: {
    color: '#ffffff',
  },
});
