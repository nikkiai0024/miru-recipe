export interface Caption {
  start: number;
  dur: number;
  text: string;
}

/**
 * 字幕取得は無効化済み
 * YouTube HTMLスクレイピングはApp Store審査リスクがあるため、
 * 説明文パース + 手動入力に依存する方針に変更
 */
export async function fetchCaptions(
  _videoId: string,
  _lang: string = 'ja'
): Promise<Caption[] | null> {
  return null;
}
