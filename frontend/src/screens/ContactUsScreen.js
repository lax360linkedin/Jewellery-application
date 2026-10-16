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
  Linking,
} from 'react-native';
import { ArrowLeft, Phone, Mail, MapPin, Send, CheckCircle2 } from 'lucide-react-native';
import BottomNav from '../components/BottomNav';
import ActionSheet from '../components/ActionSheet';
import { CUSTOMER_SUPPORT_PHONE, CUSTOMER_SUPPORT_EMAIL, STORE_ADDRESS } from '../constants/config';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';
import { globalStyles } from '../styles/globalStyles';

export default function ContactUsScreen({ route, navigation }) {
  const fromScreen = route?.params?.fromScreen || 'Home';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  const handleBack = () => {
    if (fromScreen === 'profile') {
      navigation.navigate('Profile');
    } else if (fromScreen === 'holdings') {
      navigation.navigate('Holdings');
    } else if (fromScreen === 'withdraw') {
      navigation.navigate('Withdraw');
    } else if (fromScreen === 'transactions') {
      navigation.navigate('TransactionHistory');
    } else {
      navigation.navigate('Home');
    }
  };

  const handleCall = () => {
    const digits = CUSTOMER_SUPPORT_PHONE.replace(/[^\d+]/g, '');
    Linking.openURL(`tel:${digits}`).catch((err) => {
      console.warn('Cannot open dialer:', err);
    });
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${CUSTOMER_SUPPORT_EMAIL}`).catch((err) => {
      console.warn('Cannot open mail app:', err);
    });
  };

  const handleSubmit = () => {
    if (!name.trim() || !message.trim()) {
      alert('Please enter your name and message.');
      return;
    }
    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      setName('');
      setEmail('');
      setMessage('');
      alert('Your inquiry has been submitted! Our support team will get in touch shortly.');
    }, 1200);
  };

  const handleNavigate = (screen, params = {}) => {
    setIsActionSheetOpen(false);
    if (screen === 'home') navigation.navigate('Home');
    else if (screen === 'buy') navigation.navigate('BuyNow', { assetType: 'gold', ...params });
    else if (screen === 'holdings') navigation.navigate('Holdings');
    else if (screen === 'profile') navigation.navigate('Profile', params);
    else if (screen === 'withdraw') navigation.navigate('Withdraw', { fromScreen: 'contact', ...params });
    else if (screen === 'transactions') navigation.navigate('TransactionHistory', { fromScreen: 'contact', ...params });
    else if (screen === 'contact') navigation.navigate('ContactUs');
  };

  return (
    <KeyboardAvoidingView
      style={globalStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
        <Text style={styles.headerTitle}>Contact Us</Text>
      </View>

      {/* 2. Scrollable Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Support Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>SJ Jewelers Customer Support</Text>

          <TouchableOpacity style={styles.contactRow} onPress={handleCall} activeOpacity={0.7}>
            <View style={styles.contactIconWrap}>
              <Phone size={18} color={COLORS.primaryPurple} />
            </View>
            <Text style={styles.contactLinkText}>{CUSTOMER_SUPPORT_PHONE}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactRow} onPress={handleEmail} activeOpacity={0.7}>
            <View style={styles.contactIconWrap}>
              <Mail size={18} color={COLORS.primaryPurple} />
            </View>
            <Text style={styles.contactLinkText}>{CUSTOMER_SUPPORT_EMAIL}</Text>
          </TouchableOpacity>

          <View style={styles.contactRow}>
            <View style={styles.contactIconWrap}>
              <MapPin size={18} color={COLORS.primaryPurple} />
            </View>
            <Text style={styles.addressText}>{STORE_ADDRESS}</Text>
          </View>
        </View>

        {/* Message Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Send us a Message</Text>

          <View style={globalStyles.inputGroup}>
            <TextInput
              style={globalStyles.inputField}
              placeholder="Your Name"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={globalStyles.inputGroup}>
            <TextInput
              style={globalStyles.inputField}
              placeholder="Email Address"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={globalStyles.inputGroup}>
            <TextInput
              style={[globalStyles.inputField, globalStyles.inputFieldMultiline]}
              placeholder="Write your query or feedback here..."
              placeholderTextColor={COLORS.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={[globalStyles.primaryButton, { marginTop: 4 }]}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            {sentSuccess ? (
              <>
                <CheckCircle2 size={18} color="#ffffff" />
                <Text style={globalStyles.primaryButtonText}>Message Sent!</Text>
              </>
            ) : (
              <>
                <Send size={18} color="#ffffff" />
                <Text style={globalStyles.primaryButtonText}>Send Message</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 3. BottomNav */}
      <BottomNav
        activeTab="contact"
        onSelectTab={handleNavigate}
        onTogglePlus={() => setIsActionSheetOpen(true)}
      />

      {/* Quick Menu Action Sheet */}
      <ActionSheet
        isOpen={isActionSheetOpen}
        onClose={() => setIsActionSheetOpen(false)}
        onNavigate={handleNavigate}
      />
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 95,
    gap: 16,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e8e2fa',
    gap: 14,
    ...SHADOWS.light,
  },
  infoCardTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgCardPurpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  addressText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '400',
    color: COLORS.textDark,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e8e2fa',
    ...SHADOWS.light,
  },
  formTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 14,
  },
});
