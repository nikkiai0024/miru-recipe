export interface TikTokMeta {
  title: string;
  author: string;
  thumbnail: string;
}

/**
 * TikTok oEmbed APIで動画メタ情報を取得
 */
export async function fetchTikTokMeta(url: string): Promise<TikTokMeta> {
  const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;

  const response = await fetch(oembedUrl);
  if (!response.ok) {
    throw new Error('TikTok動画情報の取得に失敗しました');
  }

  const data = await response.json();

  return {
    title: data.title || 'TikTok動画',
    author: data.author_name || '',
    thumbnail: data.thumbnail_url || '',
  };
}
