import Constants from "expo-constants";

/**
 * YouTubeコメント欄からトップコメントを取得する
 * 料理動画では固定コメントや投稿者コメントに材料・分量が記載されていることが多い
 */
export async function fetchVideoComments(videoId: string): Promise<string> {
  const apiKey = Constants.expoConfig?.extra?.youtubeApiKey;
  if (!apiKey) return "";
  try {
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?videoId=${videoId}&part=snippet&maxResults=20&order=relevance&key=${apiKey}`;
    const bundleId = Constants.expoConfig?.ios?.bundleIdentifier ?? 'com.mirurecipe.app';
    const res = await fetch(url, {
      headers: { 'X-Ios-Bundle-Identifier': bundleId },
    });
    if (!res.ok) return "";
    const data = await res.json();
    const comments = data.items?.map((item: any) =>
      item.snippet.topLevelComment.snippet.textDisplay
    ) ?? [];
    return comments.join("\n");
  } catch {
    return "";
  }
}

/**
 * YouTube字幕をInnerTube API経由で取得する
 * youtube_transcript_api (Python) と同じロジックをTypeScriptで実装
 */
export async function fetchYouTubeTranscript(videoId: string): Promise<string> {
  // Step 1: YouTubeのHTMLからINNERTUBE_API_KEYを取得
  const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 Chrome/80.0.3987.162 Mobile Safari/537.36",
      "Accept-Language": "ja,en;q=0.9",
    },
  });
  const html = await watchRes.text();

  const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":\s*"([a-zA-Z0-9_-]+)"/);
  if (!apiKeyMatch) throw new Error("Could not find INNERTUBE_API_KEY");
  const apiKey = apiKeyMatch[1];
  if (__DEV__) console.log("[transcript] apiKey found:", apiKey.slice(0, 10) + "...");

  // Step 2: InnerTube player APIで字幕トラック一覧を取得
  const playerRes = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: {
          client: { clientName: "ANDROID", clientVersion: "20.10.38" },
        },
        videoId,
      }),
    }
  );
  const playerData = await playerRes.json();

  const captionTracks =
    playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (__DEV__) console.log("[transcript] captionTracks:", captionTracks?.length ?? "none");
  if (!captionTracks || captionTracks.length === 0) {
    throw new Error("No caption tracks");
  }

  // 日本語優先、なければ最初のトラック
  const track =
    captionTracks.find((t: { languageCode: string }) =>
      t.languageCode.startsWith("ja")
    ) || captionTracks[0];

  if (!track?.baseUrl) throw new Error("No track URL");

  // Step 3: 字幕XMLをfetch
  // format=3を回避してシンプルなXMLフォーマットを強制
  const cleanUrl = track.baseUrl.replace(/&fmt=\d+/g, "") + "&fmt=1";
  if (__DEV__) console.log("[transcript] track lang:", track.languageCode, "url:", cleanUrl.slice(0, 60));
  const xmlRes = await fetch(cleanUrl);
  const xml = await xmlRes.text();
  if (__DEV__) console.log("[transcript] xml length:", xml.length, "sample:", xml.slice(0, 80));
  if (!xml.includes("<timedtext")) {
    throw new Error("Invalid transcript response");
  }

  // XMLからテキスト抽出（format=3の<p><s>タグとformat=1の<text>タグ両対応）
  const decode = (s: string) =>
    s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
     .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ");
  const textFromXmlNode = (node: string) =>
    decode(node.replace(/<[^>]+>/g, "").trim());

  let rawTexts: string[] = [];
  if (xml.includes('format="3"')) {
    // format=3: <p t="..."><s>テキスト</s></p>
    rawTexts = (xml.match(/<s[^>]*>([^<]+)<\/s>/g) || [])
      .map(textFromXmlNode);

    // 手動字幕では <p t="...">テキスト</p> の場合がある
    if (rawTexts.length === 0) {
      rawTexts = (xml.match(/<p[^>]*>(.*?)<\/p>/g) || [])
        .map(textFromXmlNode);
    }
  } else {
    // format=1: <text start="...">テキスト</text>
    rawTexts = (xml.match(/<text[^>]*>(.*?)<\/text>/g) || [])
      .map(textFromXmlNode);
  }
  const texts = rawTexts.filter((t) => t && !t.startsWith("["));

  return texts.join(" ");
}
