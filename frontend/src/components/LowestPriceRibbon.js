import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

export default function LowestPriceRibbon() {
  return (
    <View style={styles.ribbonContainer} pointerEvents="none">
      <View style={styles.ribbonBanner}>
        <Text style={styles.ribbonText}>LOWEST PRICE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ribbonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 105,
    height: 105,
    overflow: 'hidden',
    borderTopLeftRadius: 24,
    zIndex: 10,
  },
  ribbonBanner: {
    position: 'absolute',
    top: 18,
    left: -32,
    width: 140,
    backgroundColor: COLORS.orangeRibbon,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-45deg' }],
    shadowColor: '#ff7a00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  ribbonText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
