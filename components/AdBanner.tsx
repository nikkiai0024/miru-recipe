import { Platform } from 'react-native';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

let BannerAd: any;
let BannerAdSize: any;
let TestIds: any;

if (!isExpoGo) {
  try {
    const ads = require('react-native-google-mobile-ads');
    BannerAd = ads.BannerAd;
    BannerAdSize = ads.BannerAdSize;
    TestIds = ads.TestIds;
  } catch {}
}

export default function AdBanner() {
  if (isExpoGo || !BannerAd) {
    return null;
  }

  const adUnitId = __DEV__
    ? TestIds.ADAPTIVE_BANNER
    : Platform.OS === 'ios'
      ? 'ca-app-pub-1198964108696763/1932705052'
      : 'ca-app-pub-1198964108696763/6387922989';

  return (
    <BannerAd
      unitId={adUnitId}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      onAdFailedToLoad={(error: any) => console.warn('AdBanner failed:', error)}
    />
  );
}
