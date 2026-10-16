import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';
import ActionSheet from '../components/ActionSheet';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';
import { globalStyles } from '../styles/globalStyles';

export default function HoldingsScreen({ route, navigation }) {
  const { holdings, goldRate, silverRate, fetchHoldings, fetchLiveRates } = useApp();
  const fromScreen = route?.params?.fromScreen || 'Home';
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  useEffect(() => {
    fetchHoldings();
    fetchLiveRates();
  }, [fetchHoldings, fetchLiveRates]);
  const [lastUpdated] = useState(() => {
    const now = new Date();
    return `${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  });

  const goldGrams = Number(holdings?.goldGrams) || 0;
  const silverGrams = Number(holdings?.silverGrams) || 0;
  const currentGoldRate = Number(goldRate) || 0;
  const currentSilverRate = Number(silverRate) || 0;

  const goldValue = typeof holdings?.goldCurrentValue === 'number' && holdings.goldCurrentValue > 0
    ? holdings.goldCurrentValue
    : goldGrams * currentGoldRate;

  const silverValue = typeof holdings?.silverCurrentValue === 'number' && holdings.silverCurrentValue > 0
    ? holdings.silverCurrentValue
    : silverGrams * currentSilverRate;

  const totalValue = typeof holdings?.totalCurrentValue === 'number' && holdings.totalCurrentValue > 0
    ? holdings.totalCurrentValue
    : goldValue + silverValue;

  const handleNavigate = (screen, params = {}) => {
    setIsActionSheetOpen(false);
    if (screen === 'home') navigation.navigate('Home');
    else if (screen === 'buy') navigation.navigate('BuyNow', { assetType: 'gold', ...params });
    else if (screen === 'holdings') navigation.navigate('Holdings');
    else if (screen === 'profile') navigation.navigate('Profile', params);
    else if (screen === 'withdraw') navigation.navigate('Withdraw', { fromScreen: 'holdings', ...params });
    else if (screen === 'transactions') navigation.navigate('TransactionHistory', { fromScreen: 'holdings', ...params });
    else if (screen === 'contact') navigation.navigate('ContactUs', { fromScreen: 'holdings', ...params });
  };

  const handleBack = () => {
    if (fromScreen === 'profile') {
      navigation.navigate('Profile');
    } else {
      navigation.navigate('Home');
    }
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
        <Text style={styles.headerTitle}>Holdings</Text>
      </View>

      {/* 2. Scrollable Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Total Value Box */}
        <View style={styles.totalValueCard}>
          <Text style={styles.totalValueTitle}>Total Current Value</Text>
          <Text style={styles.totalValueAmount}>
            ₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>

        {/* Gold Holdings Card */}
        <View style={styles.metalHoldingCard}>
          <View style={styles.metalHeaderRow}>
            <View style={styles.goldBadge}>
              <Text style={styles.goldBadgeEmoji}>🪙</Text>
            </View>
            <Text style={styles.metalName}>Gold</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Grams Held</Text>
            <Text style={styles.detailValue}>{goldGrams.toFixed(4)} gm</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Rate</Text>
            <Text style={styles.detailValue}>
              ₹{currentGoldRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/gm
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Current Value</Text>
            <Text style={styles.totalValueGold}>
              ₹{goldValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Silver Holdings Card */}
        <View style={styles.metalHoldingCard}>
          <View style={styles.metalHeaderRow}>
            <View style={styles.silverBadge}>
              <Text style={styles.silverBadgeEmoji}>🥈</Text>
            </View>
            <Text style={styles.metalName}>Silver</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Grams Held</Text>
            <Text style={styles.detailValue}>{silverGrams.toFixed(4)} gm</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Rate</Text>
            <Text style={styles.detailValue}>
              ₹{currentSilverRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/gm
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Current Value</Text>
            <Text style={styles.totalValueSilver}>
              ₹{silverValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimerText}>
          Last updated: {lastUpdated}{'\n'}Based on successful transactions only
        </Text>
      </ScrollView>

      {/* 3. Fixed Bottom Nav */}
      <BottomNav
        activeTab="holdings"
        onSelectTab={handleNavigate}
        onTogglePlus={() => setIsActionSheetOpen(true)}
      />

      {/* Quick Menu Action Sheet */}
      <ActionSheet
        isOpen={isActionSheetOpen}
        onClose={() => setIsActionSheetOpen(false)}
        onNavigate={handleNavigate}
      />
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
  totalValueCard: {
    backgroundColor: '#dcd0ff',
    borderRadius: RADIUS.xl,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c9b8fc',
  },
  totalValueTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  totalValueAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#e05252',
    letterSpacing: -0.5,
  },
  metalHoldingCard: {
    backgroundColor: '#dcd0ff',
    borderRadius: RADIUS.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: '#c9b8fc',
  },
  metalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  goldBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffd000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldBadgeEmoji: {
    fontSize: 17,
  },
  silverBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  silverBadgeEmoji: {
    fontSize: 17,
  },
  metalName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13.5,
    fontWeight: '500',
    color: COLORS.textDark,
  },
  detailValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  divider: {
    height: 1,
    backgroundColor: '#c5b6f0',
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  totalValueGold: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primaryPurple,
  },
  totalValueSilver: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primaryPurple,
  },
  disclaimerText: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '400',
    marginTop: 4,
    lineHeight: 16,
  },
});
