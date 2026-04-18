import React, { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  BIZUDGothic_400Regular,
  BIZUDGothic_700Bold,
} from '@expo-google-fonts/biz-udgothic';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { runMigrations, startTrial } from '../utils/storage';
import { useTrial } from '../hooks/useTrial';
import { TrialEndWarningModal } from '../components/TrialEndWarningModal';

const sentryDsn = Constants.expoConfig?.extra?.sentryDsn;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,
  });
}

/**
 * グローバルトライアル警告コンテナ
 * どの画面にいても、トライアル終了24h前に表示される
 */
function GlobalTrialWarning() {
  const router = useRouter();
  const trial = useTrial();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trial.shouldShowEndWarning) setVisible(true);
  }, [trial.shouldShowEndWarning]);

  return (
    <TrialEndWarningModal
      visible={visible}
      hoursRemaining={trial.status.hoursRemaining}
      onClose={async () => {
        setVisible(false);
        await trial.dismissWarning();
      }}
      onUpgrade={async () => {
        setVisible(false);
        await trial.dismissWarning();
        router.push('/pro');
      }}
    />
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BIZUDGothic_400Regular,
    BIZUDGothic_700Bold,
  });

  // アプリ起動時にマイグレーション + 初回のみトライアル自動開始
  useEffect(() => {
    (async () => {
      await runMigrations();
      await startTrial();
    })();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8F0' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#FF6B35' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700', fontSize: 16, fontFamily: 'BIZUDGothic_700Bold' },
          contentStyle: { backgroundColor: '#FFF8F0' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'ミルレシピ' }} />
        <Stack.Screen name="add" options={{ title: 'レシピ追加', presentation: 'modal' }} />
        <Stack.Screen name="recipe/[id]" options={{ title: 'レシピ詳細' }} />
        <Stack.Screen
          name="cooking/[id]"
          options={{
            title: '調理モード',
            headerStyle: { backgroundColor: '#1a1a1a' },
            contentStyle: { backgroundColor: '#1a1a1a' },
          }}
        />
        <Stack.Screen name="edit/[id]" options={{ title: 'レシピ編集' }} />
        <Stack.Screen name="shopping" options={{ title: '買い物リスト' }} />
        <Stack.Screen name="pro" options={{ title: 'Pro版', presentation: 'modal' }} />
      </Stack>
      <GlobalTrialWarning />
    </GestureHandlerRootView>
  );
}
