export type Platform = 'youtube' | 'youtube_shorts' | 'tiktok' | 'cookpad' | 'recipe_site' | 'unknown';

/**
 * URLからプラットフォームを自動判定
 */
export function detectPlatform(url: string): Platform {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');

    // YouTube Shorts
    if (
      (host === 'youtube.com' || host === 'm.youtube.com') &&
      parsed.pathname.startsWith('/shorts/')
    ) {
      return 'youtube_shorts';
    }

    // YouTube
    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtu.be'
    ) {
      return 'youtube';
    }

    // TikTok
    if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
      return 'tiktok';
    }

    // Cookpad
    if (host === 'cookpad.com' || host.endsWith('.cookpad.com')) {
      return 'cookpad';
    }

    // 既知のレシピサイト
    const recipeSites = [
      'kurashiru.com',
      'delishkitchen.tv',
      'macaro-ni.jp',
      'erecipe.woman.excite.co.jp',
      'recipe.rakuten.co.jp',
      'bob-an.com',
      'orangepage.net',
      'lettuceclub.net',
    ];
    if (recipeSites.some((site) => host === site || host.endsWith(`.${site}`))) {
      return 'recipe_site';
    }

    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * YouTube/Shorts URLからvideoIdを抽出
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * プラットフォームの日本語表示名
 */
export function getPlatformLabel(platform: Platform): string {
  const labels: Record<Platform, string> = {
    youtube: 'YouTube',
    youtube_shorts: 'YouTube Shorts',
    tiktok: 'TikTok',
    cookpad: 'Cookpad',
    recipe_site: 'レシピサイト',
    unknown: 'その他',
  };
  return labels[platform];
}
