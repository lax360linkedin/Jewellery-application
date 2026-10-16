import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Hand, FileText, Phone, X } from 'lucide-react-native';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';
import { globalStyles } from '../styles/globalStyles';

export default function ActionSheet({ isOpen, onClose, onNavigate }) {
  if (!isOpen) return null;

  return (
    <Modal
      transparent
      visible={isOpen}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={globalStyles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.sheetContent} onPress={(e) => e.stopPropagation()}>
          {/* 1. Mode of Withdraw */}
          <TouchableOpacity
            style={styles.sheetItem}
            onPress={() => {
              onClose();
              onNavigate('withdraw');
            }}
            activeOpacity={0.7}
          >
            <Hand size={22} color={COLORS.primaryPurple} />
            <Text style={styles.sheetItemText}>Mode of Withdraw</Text>
          </TouchableOpacity>

          {/* 2. Transaction History */}
          <TouchableOpacity
            style={styles.sheetItem}
            onPress={() => {
              onClose();
              onNavigate('transactions');
            }}
            activeOpacity={0.7}
          >
            <FileText size={22} color={COLORS.primaryPurple} />
            <Text style={styles.sheetItemText}>Transaction History</Text>
          </TouchableOpacity>

          {/* 3. Contact Us */}
          <TouchableOpacity
            style={styles.sheetItem}
            onPress={() => {
              onClose();
              onNavigate('contact');
            }}
            activeOpacity={0.7}
          >
            <Phone size={22} color={COLORS.primaryPurple} />
            <Text style={styles.sheetItemText}>Contact Us</Text>
          </TouchableOpacity>

          {/* Close Action */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <X size={24} color={COLORS.primaryPurple} />
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 34,
    gap: 16,
    ...SHADOWS.medium,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0ebfd',
  },
  sheetItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.bgCardPurpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 6,
  },
});
