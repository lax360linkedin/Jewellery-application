import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import { ArrowLeft, SlidersHorizontal, X, RotateCcw } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';
import ActionSheet from '../components/ActionSheet';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';
import { globalStyles } from '../styles/globalStyles';

export default function TransactionHistoryScreen({ route, navigation }) {
  const { transactions, fetchTransactions } = useApp();
  const fromScreen = route?.params?.fromScreen || 'Home';
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);
  // Active filters
  const [activeAsset, setActiveAsset] = useState('All');
  const [activeStatus, setActiveStatus] = useState('All');
  const [activePaymentMethod, setActivePaymentMethod] = useState('All');

  // Draft filters inside modal
  const [draftAsset, setDraftAsset] = useState('All');
  const [draftStatus, setDraftStatus] = useState('All');
  const [draftPaymentMethod, setDraftPaymentMethod] = useState('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const openFilterModal = () => {
    setDraftAsset(activeAsset);
    setDraftStatus(activeStatus);
    setDraftPaymentMethod(activePaymentMethod);
    setIsFilterOpen(true);
  };

  const applyFilters = () => {
    setActiveAsset(draftAsset);
    setActiveStatus(draftStatus);
    setActivePaymentMethod(draftPaymentMethod);
    setIsFilterOpen(false);
  };

  const resetFilters = () => {
    setDraftAsset('All');
    setDraftStatus('All');
    setDraftPaymentMethod('All');
    setActiveAsset('All');
    setActiveStatus('All');
    setActivePaymentMethod('All');
    setIsFilterOpen(false);
  };

  const hasActiveFilters = activeAsset !== 'All' || activeStatus !== 'All' || activePaymentMethod !== 'All';

  // Multi-condition filtering
  const filteredTransactions = useMemo(() => {
    const list = Array.isArray(transactions) ? transactions : [];
    return list.filter((item) => {
      if (activeAsset !== 'All' && (item.asset || '').toLowerCase() !== activeAsset.toLowerCase()) {
        return false;
      }
      if (activeStatus !== 'All' && (item.status || '').toLowerCase() !== activeStatus.toLowerCase()) {
        return false;
      }
      if (activePaymentMethod !== 'All' && (item.paymentMethod || 'UPI').toLowerCase() !== activePaymentMethod.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [transactions, activeAsset, activeStatus, activePaymentMethod]);

  // Group by Date
  const groupedTransactions = useMemo(() => {
    const getGroupHeader = (dateStr) => {
      const normalized = (dateStr || '').trim();
      const now = new Date();
      const todayFormatted = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayFormatted = yesterday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

      if (normalized === todayFormatted) {
        return { label: 'TODAY', sub: normalized };
      }
      if (normalized === yesterdayFormatted) {
        return { label: 'YESTERDAY', sub: normalized };
      }
      return { label: normalized ? normalized.toUpperCase() : 'OTHER', sub: null };
    };

    const groups = [];
    const dateMap = new Map();

    filteredTransactions.forEach((txn) => {
      const dateKey = txn.date || 'Other';
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey).push(txn);
    });

    dateMap.forEach((items, dateKey) => {
      groups.push({
        dateKey,
        header: getGroupHeader(dateKey),
        items,
      });
    });

    return groups;
  }, [filteredTransactions]);

  const handleBack = () => {
    if (fromScreen === 'buy') {
      navigation.navigate('BuyNow');
    } else if (fromScreen === 'profile') {
      navigation.navigate('Profile');
    } else if (fromScreen === 'holdings') {
      navigation.navigate('Holdings');
    } else if (fromScreen === 'withdraw') {
      navigation.navigate('Withdraw');
    } else {
      navigation.navigate('Home');
    }
  };

  const handleNavigate = (screen, params = {}) => {
    setIsActionSheetOpen(false);
    if (screen === 'home') navigation.navigate('Home');
    else if (screen === 'buy') navigation.navigate('BuyNow', { assetType: 'gold', ...params });
    else if (screen === 'holdings') navigation.navigate('Holdings');
    else if (screen === 'profile') navigation.navigate('Profile', params);
    else if (screen === 'withdraw') navigation.navigate('Withdraw', { fromScreen: 'transactions', ...params });
    else if (screen === 'transactions') navigation.navigate('TransactionHistory');
    else if (screen === 'contact') navigation.navigate('ContactUs', { fromScreen: 'transactions', ...params });
  };

  const renderStatusBadge = (status) => {
    let bg = '#ede7fc';
    let text = COLORS.primaryPurple;

    switch (status) {
      case 'Success':
        bg = COLORS.greenBadgeBg;
        text = COLORS.greenBadgeText;
        break;
      case 'Pending':
        bg = COLORS.orangeBadgeBg;
        text = COLORS.orangeBadgeText;
        break;
      case 'Processing':
        bg = COLORS.blueBadgeBg;
        text = COLORS.blueBadgeText;
        break;
      case 'Cancelled':
        bg = '#f1f5f9';
        text = '#64748b';
        break;
      case 'Failed':
        bg = COLORS.redDangerBg;
        text = COLORS.redDangerText;
        break;
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: bg }]}>
        <Text style={[styles.statusBadgeText, { color: text }]}>{status}</Text>
      </View>
    );
  };

  return (
    <View style={globalStyles.container}>
      {/* 1. Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityLabel="Back"
          >
            <ArrowLeft size={20} color="#1e1b2e" strokeWidth={2.5} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Transaction History</Text>
            <Text style={styles.headerSubtitle}>Your gold & silver activity</Text>
          </View>
        </View>

        {/* Filter Button */}
        <TouchableOpacity
          style={[styles.filterBtn, hasActiveFilters && styles.filterBtnActive]}
          onPress={openFilterModal}
          activeOpacity={0.8}
        >
          <SlidersHorizontal size={14} color={hasActiveFilters ? '#1e1b2e' : COLORS.primaryPurple} />
          <Text style={[styles.filterBtnText, hasActiveFilters && styles.filterBtnTextActive]}>
            Filter{hasActiveFilters ? ' •' : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Scrollable Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Filter Chips Bar */}
        {hasActiveFilters && (
          <View style={styles.activeFiltersBar}>
            <View style={styles.chipsRow}>
              <Text style={styles.chipsTitle}>Filters:</Text>
              {activeAsset !== 'All' && (
                <View style={styles.chipPill}>
                  <Text style={styles.chipPillText}>{activeAsset}</Text>
                </View>
              )}
              {activeStatus !== 'All' && (
                <View style={styles.chipPill}>
                  <Text style={styles.chipPillText}>{activeStatus}</Text>
                </View>
              )}
              {activePaymentMethod !== 'All' && (
                <View style={styles.chipPill}>
                  <Text style={styles.chipPillText}>{activePaymentMethod}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={resetFilters}>
              <Text style={styles.clearFiltersText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Grouped Transaction List */}
        {groupedTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Transactions Yet</Text>
            <Text style={styles.emptySubtitle}>
              {hasActiveFilters
                ? 'No transactions match your active filters.'
                : 'Your gold and silver purchase history will appear here.'}
            </Text>
          </View>
        ) : (
          groupedTransactions.map((group) => (
            <View key={group.dateKey} style={styles.groupContainer}>
              <Text style={styles.groupHeaderLabel}>{group.header.label}</Text>

              {group.items.map((txn) => {
                const isGold = (txn.asset || '').toLowerCase() === 'gold';
                return (
                  <View key={txn.id} style={styles.txnCard}>
                    <View style={styles.txnTopRow}>
                      <View style={styles.txnAssetCol}>
                        <View style={styles.txnIconWrap}>
                          <Text style={{ fontSize: 18 }}>{isGold ? '🪙' : '🥈'}</Text>
                        </View>
                        <View>
                          <Text style={styles.txnAssetName}>{txn.asset || 'Gold'}</Text>
                          <Text style={styles.txnTimeText}>
                            {txn.time || ''} • {txn.paymentMethod || 'UPI'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.txnAmountCol}>
                        <Text style={styles.txnAmountText}>
                          ₹{Number(txn.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                        <Text style={styles.txnGramsText}>
                          {txn.quantity || `${txn.grams} gm`}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.txnBottomRow}>
                      <Text style={styles.txnRateText}>
                        Rate: ₹{Number(txn.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}/gm
                      </Text>
                      {renderStatusBadge(txn.status || 'Success')}
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      {/* 3. BottomNav */}
      <BottomNav
        activeTab="transactions"
        onSelectTab={handleNavigate}
        onTogglePlus={() => setIsActionSheetOpen(true)}
      />

      {/* Quick Menu Action Sheet */}
      <ActionSheet
        isOpen={isActionSheetOpen}
        onClose={() => setIsActionSheetOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* Filter Modal */}
      <Modal
        visible={isFilterOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFilterOpen(false)}
      >
        <View style={globalStyles.modalOverlay}>
          <View style={styles.filterSheet}>
            <View style={styles.filterHeaderRow}>
              <Text style={styles.filterSheetTitle}>Filter Transactions</Text>
              <TouchableOpacity onPress={() => setIsFilterOpen(false)}>
                <X size={22} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Asset Type */}
              <Text style={styles.filterSectionTitle}>Metal</Text>
              <View style={styles.filterPillsRow}>
                {['All', 'Gold', 'Silver'].map((asset) => (
                  <TouchableOpacity
                    key={asset}
                    style={[styles.filterPill, draftAsset === asset && styles.filterPillActive]}
                    onPress={() => setDraftAsset(asset)}
                  >
                    <Text style={[styles.filterPillText, draftAsset === asset && styles.filterPillTextActive]}>
                      {asset}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Status */}
              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.filterPillsRow}>
                {['All', 'Success', 'Pending', 'Processing', 'Cancelled', 'Failed'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.filterPill, draftStatus === st && styles.filterPillActive]}
                    onPress={() => setDraftStatus(st)}
                  >
                    <Text style={[styles.filterPillText, draftStatus === st && styles.filterPillTextActive]}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Payment Method */}
              <Text style={styles.filterSectionTitle}>Payment Method</Text>
              <View style={styles.filterPillsRow}>
                {['All', 'UPI', 'Net Banking', 'Debit Card'].map((pm) => (
                  <TouchableOpacity
                    key={pm}
                    style={[styles.filterPill, draftPaymentMethod === pm && styles.filterPillActive]}
                    onPress={() => setDraftPaymentMethod(pm)}
                  >
                    <Text style={[styles.filterPillText, draftPaymentMethod === pm && styles.filterPillTextActive]}>
                      {pm}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.filterActionButtons}>
              <TouchableOpacity style={styles.resetFilterBtn} onPress={resetFilters}>
                <RotateCcw size={16} color={COLORS.primaryPurple} />
                <Text style={styles.resetFilterBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[globalStyles.primaryButton, { flex: 1 }]} onPress={applyFilters}>
                <Text style={globalStyles.primaryButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
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
    justifyContent: 'space-between',
    zIndex: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    fontWeight: '400',
  },
  filterBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...SHADOWS.light,
  },
  filterBtnActive: {
    backgroundColor: COLORS.yellowAccent,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  filterBtnTextActive: {
    color: '#1e1b2e',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 95,
  },
  activeFiltersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.md,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e0d7fc',
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  chipsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  chipPill: {
    backgroundColor: '#f0ebfd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  chipPillText: {
    color: COLORS.primaryPurple,
    fontSize: 11.5,
    fontWeight: '600',
  },
  clearFiltersText: {
    color: COLORS.primaryPurple,
    fontSize: 12.5,
    fontWeight: '600',
    paddingLeft: 8,
  },
  groupContainer: {
    marginBottom: 16,
  },
  groupHeaderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#736d85',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 2,
  },
  txnCard: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e8e2fa',
    ...SHADOWS.light,
  },
  txnTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  txnAssetCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  txnIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1ecfe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnAssetName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  txnTimeText: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '400',
  },
  txnAmountCol: {
    alignItems: 'flex-end',
  },
  txnAmountText: {
    fontSize: 15.5,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  txnGramsText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryPurple,
    marginTop: 2,
  },
  txnBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f6f2ff',
    paddingTop: 8,
  },
  txnRateText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '400',
  },
  filterSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 20,
    paddingBottom: 34,
    maxHeight: '80%',
  },
  filterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  filterSectionTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 8,
    marginTop: 10,
  },
  filterPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterPill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCardPurpleSoft,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  filterPillActive: {
    backgroundColor: COLORS.primaryPurple,
    borderColor: COLORS.primaryPurple,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textDark,
  },
  filterPillTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  filterActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  resetFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCardPurpleSoft,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    justifyContent: 'center',
  },
  resetFilterBtnText: {
    color: COLORS.primaryPurple,
    fontWeight: '600',
    fontSize: 14,
  },
});
