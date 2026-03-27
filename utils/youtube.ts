import Constants from 'expo-constants';

export interface VideoInfo {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
}

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
 * YouTube Data API v3で動画情報を取得
 */
export async function fetchVideoInfo(videoId: string): Promise<VideoInfo> {
  const apiKey = Constants.expoConfig?.extra?.youtubeApiKey;

  if (!apiKey) {
    return fetchViaOEmbed(videoId);
  }

  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;

  // iOSのAPIキー制限はX-Ios-Bundle-Identifierヘッダーで照合される
  // fetch()はこのヘッダーを自動付与しないため明示的に指定が必要
  const bundleId = Constants.expoConfig?.ios?.bundleIdentifier ?? 'com.mirurecipe.app';
  const response = await fetch(url, {
    headers: {
      'X-Ios-Bundle-Identifier': bundleId,
    },
  });
  if (!response.ok) {
    // 403/401/429はAPI Key問題やレート制限 → oEmbedにフォールバック
    if (response.status === 403 || response.status === 401 || response.status === 429) {
      return fetchViaOEmbed(videoId);
    }
    throw new Error(`YouTube API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.items || data.items.length === 0) {
    throw new Error('動画が見つかりませんでした');
  }

  const snippet = data.items[0].snippet;
  return {
    videoId,
    title: snippet.title,
    description: snippet.description,
    thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
    channelTitle: snippet.channelTitle,
  };
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
