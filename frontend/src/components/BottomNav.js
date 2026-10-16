import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Home, Wallet, FolderClosed, User, Plus } from 'lucide-react-native';
import { COLORS } from '../constants/theme';

export default function BottomNav({ activeTab = 'home', onSelectTab, onTogglePlus }) {
  return (
    <View style={styles.bottomNavContainer}>
      {/* 1. Home Tab */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onSelectTab('home')}
        activeOpacity={0.7}
      >
        <Home
          size={22}
          color={activeTab === 'home' ? COLORS.yellowAccent : '#ffffff'}
          strokeWidth={activeTab === 'home' ? 2.5 : 2}
        />
        <Text style={[styles.navLabel, activeTab === 'home' && styles.navLabelActive]}>
          Home
        </Text>
      </TouchableOpacity>

      {/* 2. Buy Tab */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onSelectTab('buy')}
        activeOpacity={0.7}
      >
        <Wallet
          size={22}
          color={activeTab === 'buy' ? COLORS.yellowAccent : '#ffffff'}
          strokeWidth={activeTab === 'buy' ? 2.5 : 2}
        />
        <Text style={[styles.navLabel, activeTab === 'buy' && styles.navLabelActive]}>
          Buy
        </Text>
      </TouchableOpacity>

      {/* 3. Floating Center + Button (White background, purple border, purple plus) */}
      <View style={styles.plusBtnWrapper}>
        <TouchableOpacity
          style={styles.floatingPlusBtn}
          onPress={onTogglePlus}
          activeOpacity={0.85}
          accessibilityLabel="Quick Menu"
        >
          <Plus size={28} color={COLORS.primaryPurple} strokeWidth={3} />
        </TouchableOpacity>
      </View>

      {/* 4. Holdings Tab */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onSelectTab('holdings')}
        activeOpacity={0.7}
      >
        <FolderClosed
          size={22}
          color={activeTab === 'holdings' ? COLORS.yellowAccent : '#ffffff'}
          strokeWidth={activeTab === 'holdings' ? 2.5 : 2}
        />
        <Text style={[styles.navLabel, activeTab === 'holdings' && styles.navLabelActive]}>
          Holdings
        </Text>
      </TouchableOpacity>

      {/* 5. Profile Tab */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onSelectTab('profile')}
        activeOpacity={0.7}
      >
        <User
          size={22}
          color={activeTab === 'profile' ? COLORS.yellowAccent : '#ffffff'}
          strokeWidth={activeTab === 'profile' ? 2.5 : 2}
        />
        <Text style={[styles.navLabel, activeTab === 'profile' && styles.navLabelActive]}>
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNavContainer: {
    height: 64,
    backgroundColor: COLORS.primaryPurple,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    borderTopWidth: 0,
    paddingBottom: Platform.OS === 'ios' ? 12 : 0,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
  },
  navLabel: {
    color: '#b7a9ff',
    fontSize: 11,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  plusBtnWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    top: -16,
    zIndex: 60,
  },
  floatingPlusBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: COLORS.primaryPurple,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});
