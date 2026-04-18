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
  hoursRemaining: number;
  onClose: () => void;
  onUpgrade: () => void;
}

export function TrialEndWarningModal({
  visible,
  hoursRemaining,
  onClose,
  onUpgrade,
}: Props) {
  const hoursLabel =
    hoursRemaining >= 24
      ? `あと約${Math.ceil(hoursRemaining / 24)}日`
      : `あと${Math.max(1, hoursRemaining)}時間`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.emoji}>⏰</Text>
          <Text style={styles.title}>Pro体験 もうすぐ終了</Text>
          <Text style={styles.remaining}>{hoursLabel}</Text>

          <Text style={styles.body}>
            トライアル中に使った便利な機能は{'\n'}
            終了後にロックされます。
          </Text>

          <View style={styles.featureBox}>
            <Text style={styles.featureTitle}>失う機能:</Text>
            <Text style={styles.featureItem}>🔊 調理モードの音声読み上げ</Text>
            <Text style={styles.featureItem}>👆 画面左右タップで前後操作</Text>
            <Text style={styles.featureItem}>🛒 買い物リスト</Text>
            <Text style={styles.featureItem}>♾️ レシピ追加の無制限</Text>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onUpgrade}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryText}>維持する (¥480 買い切り)</Text>
            <Text style={styles.primarySub}>個別合計より¥160お得</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose}>
            <Text style={styles.dismiss}>後で決める</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2A1810',
    fontFamily: 'BIZUDGothic_700Bold',
    textAlign: 'center',
  },
  remaining: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 14,
    fontFamily: 'BIZUDGothic_700Bold',
  },
  body: {
    fontSize: 13,
    color: '#6B5B4D',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  featureBox: {
    width: '100%',
    padding: 14,
    backgroundColor: '#FFF0E6',
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0E0CF',
  },
  featureTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E85D2C',
    marginBottom: 6,
  },
  featureItem: {
    fontSize: 12,
    color: '#2A1810',
    paddingVertical: 2,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
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
  dismiss: {
    marginTop: 14,
    fontSize: 13,
    color: '#A0968D',
    padding: 8,
  },
});
