import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';

interface Props {
  visible: boolean;
  timeToNextLabel: string;
  onClose: () => void;
  onUpgrade: () => void;
  onWatchAd?: () => void;
  watchAdReady?: boolean;
}

export function OutOfHeartsModal({
  visible,
  timeToNextLabel,
  onClose,
  onUpgrade,
  onWatchAd,
  watchAdReady = true,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.emoji}>💔</Text>
          <Text style={styles.title}>クレジット切れ</Text>
          <Text style={styles.body}>
            1日1個ずつ回復する「レシピ追加クレジット」をすべて使い切りました。
          </Text>

          <View style={styles.waitBox}>
            <Text style={styles.waitLabel}>次の1個まで</Text>
            <Text style={styles.waitValue}>{timeToNextLabel}</Text>
          </View>

          <View style={styles.options}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={onUpgrade}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryText}>待たずに今すぐ解放</Text>
              <Text style={styles.primarySub}>無制限プラン ¥320 · 買い切り</Text>
            </TouchableOpacity>

            {onWatchAd && (
              <TouchableOpacity
                style={[styles.secondaryBtn, !watchAdReady && styles.secondaryBtnDisabled]}
                onPress={watchAdReady ? onWatchAd : undefined}
                disabled={!watchAdReady}
                activeOpacity={0.85}
              >
                <Text style={[styles.secondaryText, !watchAdReady && styles.secondaryTextDisabled]}>
                  {watchAdReady ? '▶ 動画広告で +1 補充' : '広告を準備中…'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity onPress={onClose}>
            <Text style={styles.dismiss}>待つ</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFF8F0',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 20,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2A1810',
    marginBottom: 10,
    fontFamily: 'BIZUDGothic_700Bold',
    textAlign: 'center',
  },
  body: {
    fontSize: 13,
    color: '#6B5B4D',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  waitBox: {
    width: '100%',
    padding: 14,
    backgroundColor: '#FFF0E6',
    borderRadius: 14,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0E0CF',
  },
  waitLabel: {
    fontSize: 12,
    color: '#8A7A6D',
    fontWeight: '600',
    marginBottom: 4,
  },
  waitValue: {
    fontSize: 20,
    color: '#FF6B35',
    fontWeight: '800',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  options: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  primarySub: {
    color: '#FFE5D4',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  secondaryBtn: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F0E5D8',
  },
  secondaryBtnDisabled: {
    opacity: 0.5,
    backgroundColor: '#F5F2EC',
  },
  secondaryText: {
    color: '#6B5B4D',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryTextDisabled: {
    color: '#A0968D',
  },
  dismiss: {
    marginTop: 14,
    fontSize: 13,
    color: '#A0968D',
    padding: 8,
  },
});
