import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Pencil, UserPlus, LogOut, ShieldCheck, Hand, FileText, Phone, ChevronRight } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';
import ActionSheet from '../components/ActionSheet';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';
import { globalStyles } from '../styles/globalStyles';

export default function ProfileScreen({ navigation }) {
  const { currentUser, logoutUser } = useApp();
  const [isActionSheetOpen, setIsActionSheetOpen] = React.useState(false);
  const isProfileCompleted = currentUser.profileCompleted === true;

  const getKycBadgeColor = () => {
    const st = (currentUser.kycStatus || 'pending').toLowerCase();
    switch (st) {
      case 'verified':
      case 'approved':
        return { bg: COLORS.greenBadgeBg, text: COLORS.greenBadgeText, label: 'Verified' };
      case 'under review':
        return { bg: COLORS.blueBadgeBg, text: COLORS.blueBadgeText, label: 'Under Review' };
      case 'rejected':
        return { bg: COLORS.redDangerBg, text: COLORS.redDangerText, label: 'Rejected' };
      default:
        return { bg: COLORS.orangeBadgeBg, text: COLORS.orangeBadgeText, label: 'Pending' };
    }
  };

  const kycColors = getKycBadgeColor();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logoutUser();
            // Reset navigation stack so back button cannot navigate to Home/Profile
            navigation.reset({
              index: 0,
              routes: [{ name: 'SignIn' }],
            });
          },
        },
      ]
    );
  };

  const handleNavigate = (screen, params = {}) => {
    setIsActionSheetOpen(false);
    if (screen === 'home') navigation.navigate('Home');
    else if (screen === 'buy') navigation.navigate('BuyNow', { assetType: 'gold', ...params });
    else if (screen === 'holdings') navigation.navigate('Holdings', { fromScreen: 'profile', ...params });
    else if (screen === 'profile') navigation.navigate('Profile');
    else if (screen === 'withdraw') navigation.navigate('Withdraw', { fromScreen: 'profile', ...params });
    else if (screen === 'transactions') navigation.navigate('TransactionHistory', { fromScreen: 'profile', ...params });
    else if (screen === 'contact') navigation.navigate('ContactUs', { fromScreen: 'profile', ...params });
    else if (screen === 'create-profile') navigation.navigate('CreateProfile', { mode: 'create', source: 'profile', fromScreen: 'profile', ...params });
    else if (screen === 'edit-profile') navigation.navigate('CreateProfile', { mode: 'edit', source: 'profile', fromScreen: 'profile', ...params });
  };

  return (
    <View style={globalStyles.container}>
      {/* 1. Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.profileActionBtn}
          onPress={() => handleNavigate(isProfileCompleted ? 'edit-profile' : 'create-profile')}
          activeOpacity={0.8}
        >
          {isProfileCompleted ? (
            <>
              <Pencil size={14} color={COLORS.primaryPurple} />
              <Text style={styles.profileActionText}>Edit Profile</Text>
            </>
          ) : (
            <>
              <UserPlus size={14} color={COLORS.primaryPurple} />
              <Text style={styles.profileActionText}>Create Profile</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* 2. Scrollable Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info Avatar Card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{currentUser.name || 'New User'}</Text>
          <Text style={styles.userMobile}>{currentUser.mobile || 'No mobile number'}</Text>

          <View style={[styles.kycBadge, { backgroundColor: kycColors.bg }]}>
            <ShieldCheck size={14} color={kycColors.text} />
            <Text style={[styles.kycBadgeText, { color: kycColors.text }]}>
              KYC: {kycColors.label}
            </Text>
          </View>
        </View>

        {/* Quick Menu Options */}
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleNavigate('withdraw')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Hand size={20} color={COLORS.primaryPurple} />
              <Text style={styles.menuItemText}>Mode of Withdraw</Text>
            </View>
            <ChevronRight size={18} color="#908ba6" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleNavigate('transactions')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <FileText size={20} color={COLORS.primaryPurple} />
              <Text style={styles.menuItemText}>Transaction History</Text>
            </View>
            <ChevronRight size={18} color="#908ba6" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={() => handleNavigate('contact')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Phone size={20} color={COLORS.primaryPurple} />
              <Text style={styles.menuItemText}>Contact Us</Text>
            </View>
            <ChevronRight size={18} color="#908ba6" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={globalStyles.dangerButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LogOut size={20} color="#ffffff" />
          <Text style={globalStyles.dangerButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 3. BottomNav */}
      <BottomNav
        activeTab="profile"
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
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  profileActionBtn: {
    backgroundColor: '#ede7fc',
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...SHADOWS.light,
  },
  profileActionText: {
    color: COLORS.primaryPurple,
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 95,
    gap: 16,
  },
  avatarCard: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.primaryPurple,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...SHADOWS.medium,
  },
  avatarLetter: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  userMobile: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  kycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 10,
  },
  kycBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.xl,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e8e2fa',
    ...SHADOWS.light,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3eeff',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textDark,
  },
});
