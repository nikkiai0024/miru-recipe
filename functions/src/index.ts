import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import {GoogleGenAI} from "@google/genai";

setGlobalOptions({maxInstances: 10});

const appSecret = defineSecret("APP_SECRET");
const geminiApiKey = defineSecret("GEMINI_API_KEY");
const youtubeApiKey = defineSecret("YOUTUBE_API_KEY");
const iosBundleIdentifier = "com.mirurecipe.app";
const youtubeUserAgent = [
  "Mozilla/5.0 (Linux; Android 10; SM-G981B)",
  "AppleWebKit/537.36 Chrome/80 Mobile Safari/537.36",
].join(" ");
const maxTranscriptChars = 30000;

interface CaptionTrack {
  baseUrl?: string;
  languageCode: string;
}

interface PlayerResponse {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: CaptionTrack[];
    };
  };
}

/**
 * Decode one YouTube caption XML node into plain text.
 * @param {string} node - Raw XML node
 * @return {string} Decoded text
 */
function decodeCaptionNode(node: string): string {
  return node
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/**
 * Extract captions from known YouTube XML formats.
 * @param {string} xml - Caption XML body
 * @return {string} Joined transcript text
 */
function extractCaptionText(xml: string): string {
  let texts = (xml.match(/<text[^>]*>(.*?)<\/text>/g) || [])
    .map(decodeCaptionNode);
  if (texts.length === 0) {
    texts = (xml.match(/<s[^>]*>([^<]+)<\/s>/g) || [])
      .map(decodeCaptionNode);
  }
  if (texts.length === 0) {
    texts = (xml.match(/<p[^>]*>(.*?)<\/p>/g) || [])
      .map(decodeCaptionNode);
  }
  return texts.filter((text) => text).join(" ");
}

/**
 * YouTube字幕をInnerTube API経由で取得
 * @param {string} videoId - YouTube動画ID
 * @return {Promise<string>} 字幕テキスト
 */
async function fetchYouTubeTranscript(videoId: string): Promise<string> {
  const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent": youtubeUserAgent,
      "Accept-Language": "ja,en;q=0.9",
    },
  });
  const html = await watchRes.text();
  const apiKey = html.match(/"INNERTUBE_API_KEY":\s*"([a-zA-Z0-9_-]+)"/)?.[1];
  if (!apiKey) {
    throw new Error("Could not find INNERTUBE_API_KEY");
  }

  const playerRes = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`,
    {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        context: {
          client: {clientName: "ANDROID", clientVersion: "20.10.38"},
        },
        videoId,
      }),
    }
  );
  const playerData = await playerRes.json() as PlayerResponse;
  const captionTracks =
    playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!captionTracks || captionTracks.length === 0) {
    throw new Error("No caption tracks");
  }

  const track =
    captionTracks.find((t) => t.languageCode.startsWith("ja")) ||
    captionTracks[0];
  if (!track.baseUrl) {
    throw new Error("No track URL");
  }

  const xmlRes = await fetch(track.baseUrl.replace(/&fmt=\d+/g, "") + "&fmt=1");
  const xml = await xmlRes.text();
  if (!xml.includes("<timedtext")) {
    throw new Error("Invalid transcript response");
  }
  const text = extractCaptionText(xml);
  if (!text) {
    throw new Error("No transcript text");
  }
  return text;
}

/**
 * YouTube Data API v3 プロキシ
 * クライアントにAPIキーを持たせず、サーバー経由でYouTube APIを叩く
 */
export const getVideoInfo = onRequest(
  {
    region: "asia-northeast1",
    secrets: [appSecret, youtubeApiKey],
    cors: true,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    const {videoId, secret} = req.body;

    if (secret !== appSecret.value()) {
      res.status(401).json({error: "Unauthorized"});
      return;
    }

    if (!videoId || typeof videoId !== "string" ||
        !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      res.status(400).json({error: "Invalid videoId"});
      return;
    }

    const apiKey = youtubeApiKey.value();
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;

    try {
      const apiRes = await fetch(apiUrl, {
        headers: {"X-Ios-Bundle-Identifier": iosBundleIdentifier},
      });
      if (!apiRes.ok) {
        res.status(apiRes.status).json({
          error: `YouTube API error: ${apiRes.status}`,
        });
        return;
      }
      const data = await apiRes.json();
      if (!data.items || data.items.length === 0) {
        res.status(404).json({error: "Video not found"});
        return;
      }
      const snippet = data.items[0].snippet;
      res.json({
        videoId,
        title: snippet.title,
        description: snippet.description,
        thumbnailUrl:
          snippet.thumbnails?.high?.url ||
          snippet.thumbnails?.default?.url || "",
        channelTitle: snippet.channelTitle,
      });
    } catch (e) {
      res.status(500).json({error: String(e)});
    }
  }
);

/**
 * レシピ手順をVertex AI Geminiで生成するHTTP Function
 */
export const getRecipeSteps = onRequest(
  {
    region: "asia-northeast1",
    secrets: [appSecret, geminiApiKey],
    cors: true,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    const APP_SECRET = appSecret.value();
    const GEMINI_KEY = geminiApiKey.value();
    const {
      videoId, transcriptText: clientTranscript, commentText, secret,
    } = req.body;

    if (secret !== APP_SECRET) {
      res.status(401).json({error: "Unauthorized"});
      return;
    }

    let transcriptText = clientTranscript || "";

    if (!transcriptText) {
      if (!videoId) {
        res.status(400).json({error: "videoId or transcriptText required"});
        return;
      }
      try {
        transcriptText = await fetchYouTubeTranscript(videoId);
      } catch {
        res.status(404).json({error: "No transcript available"});
        return;
      }
    }

    if (!transcriptText || transcriptText.length < 50) {
      res.status(404).json({error: "Transcript too short"});
      return;
    }

    const prompt = `以下はYouTube料理動画の字幕・説明欄テキストです。
材料と調理手順をJSONで返してください。

要件:
- 材料: 動画で使われる食材・調味料をすべて抽出（分量も可能な限り含める）
- 手順: 調理の具体的な手順を最初から最後まですべて抽出（挨拶・自己紹介・チャンネル登録は除外）
- 手順は省略せず、調理開始から盛り付け・完成まで漏れなく含めること
- 明示的な手順がない場合でも、料理名と材料から自然な調理工程を補完すること
- 日本語・体言止め
- ステップ数に上限なし（実際の調理工程に忠実に）
- JSONのみ返す

出力フォーマット:
{"steps":[{"number":1,"text":"手順"}],"ingredients":[{"name":"食材名","amount":"量"}]}

字幕・説明欄:
${transcriptText.slice(0, maxTranscriptChars)}${commentText ? `

コメント欄の情報も参考に（材料・分量参照）:
${commentText.slice(0, 3000)}` : ""}`;

    try {
      // @google/genai でAPIキーを使ってGemini Developer APIを呼ぶ
      const ai = new GoogleGenAI({apiKey: GEMINI_KEY});
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      const responseText = response.text ?? "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        res.status(500).json({error: "Failed to parse AI response"});
        return;
      }
      const parsed = JSON.parse(jsonMatch[0]);
      const steps = parsed.steps ?? [];
      const ingredients = parsed.ingredients ?? [];
      res.json({steps, ingredients, source: "transcript"});
    } catch (e) {
      res.status(500).json({error: String(e)});
    }
  }
);
