import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import {GoogleGenAI} from "@google/genai";
import * as https from "https";

setGlobalOptions({maxInstances: 10});

const appSecret = defineSecret("APP_SECRET");
const geminiApiKey = defineSecret("GEMINI_API_KEY");
const youtubeApiKey = defineSecret("YOUTUBE_API_KEY");

/**
 * YouTube字幕をInnerTube API経由で取得
 * @param {string} videoId - YouTube動画ID
 * @return {Promise<string>} 字幕テキスト
 */
async function fetchYouTubeTranscript(videoId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    https.get(url, {headers: {"User-Agent": "Mozilla/5.0"}}, (res) => {
      let html = "";
      res.on("data", (chunk) => (html += chunk));
      res.on("end", () => {
        const match = html.match(/"captionTracks":(\[.*?\])/);
        if (!match) {
          reject(new Error("No captions found"));
          return;
        }
        try {
          const tracks = JSON.parse(match[1]);
          const track =
            tracks.find((t: {languageCode: string}) =>
              t.languageCode.startsWith("ja")
            ) || tracks[0];
          if (!track?.baseUrl) {
            reject(new Error("No track URL"));
            return;
          }
          https.get(track.baseUrl, (r2) => {
            let xml = "";
            r2.on("data", (c) => (xml += c));
            r2.on("end", () => {
              const texts = (xml.match(/<text[^>]*>(.*?)<\/text>/g) || [])
                .map((t) =>
                  t
                    .replace(/<[^>]+>/g, "")
                    .replace(/&amp;/g, "&")
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/&#39;/g, "\"")
                    .replace(/&quot;/g, "\"")
                )
                .filter((t) => t.trim());
              resolve(texts.join(" "));
            });
          }).on("error", reject);
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
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
      const apiRes = await fetch(apiUrl);
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

    const prompt = `以下はYouTube料理動画の字幕テキストです。
材料と調理手順をJSONで返してください。

要件:
- 材料: 動画で使われる食材・調味料をすべて抽出（分量も可能な限り含める）
- 手順: 調理の具体的な手順を最初から最後まですべて抽出（挨拶・自己紹介・チャンネル登録は除外）
- 手順は省略せず、調理開始から盛り付け・完成まで漏れなく含めること
- 日本語・体言止め
- ステップ数に上限なし（実際の調理工程に忠実に）
- JSONのみ返す

出力フォーマット:
{"steps":[{"number":1,"text":"手順"}],"ingredients":[{"name":"食材名","amount":"量"}]}

字幕:
${transcriptText.slice(0, 10000)}${commentText ? `

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


