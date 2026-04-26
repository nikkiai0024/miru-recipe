import Constants from 'expo-constants';

export interface VideoInfo {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
}

const PROXY_URL = 'https://asia-northeast1-miru-recipe-backend-cac53.cloudfunctions.net/getVideoInfo';
const APP_SECRET = Constants.expoConfig?.extra?.appSecret ?? '';
const CONFIG_ERROR_MESSAGE =
  'YouTube動画情報の取得設定に問題があります。アプリを最新版に更新してください。';

/**
 * YouTube URLからvideoIdを抽出
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * バックエンドプロキシ経由でYouTube動画情報を取得
 * APIキーはサーバー側で管理し、クライアントには持たせない
 */
export async function fetchVideoInfo(videoId: string): Promise<VideoInfo> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, secret: APP_SECRET }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 401 || response.status === 403) {
      throw new Error(CONFIG_ERROR_MESSAGE);
    }

    if (!response.ok) {
      // 一時的なプロキシ失敗時はoEmbedにフォールバック
      return fetchViaOEmbed(videoId);
    }

    const data = await response.json();
    return {
      videoId: data.videoId,
      title: data.title ?? '',
      description: data.description ?? '',
      thumbnailUrl: data.thumbnailUrl ?? '',
      channelTitle: data.channelTitle ?? '',
    };
  } catch (e) {
    if (e instanceof Error && e.message === CONFIG_ERROR_MESSAGE) {
      throw e;
    }
    // ネットワークエラー・タイムアウト時はoEmbedにフォールバック
    return fetchViaOEmbed(videoId);
  }
}

/**
 * YouTube oEmbed APIで動画情報を取得（API Key不要）
 */
async function fetchViaOEmbed(videoId: string): Promise<VideoInfo> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);
    if (!response.ok) throw new Error('oEmbed failed');
    const data = await response.json();
    return {
      videoId,
      title: data.title || '動画タイトル',
      description: '', // oEmbedではdescription取得不可 → 手動入力を促す
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      channelTitle: data.author_name || '',
    };
  } catch {
    // oEmbedも失敗した場合はサムネイルだけでも正しいものを返す
    return {
      videoId,
      title: '動画情報を取得できませんでした',
      description: '',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      channelTitle: '',
    };
  }
}
