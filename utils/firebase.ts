import { fetchYouTubeTranscript as fetchTranscript } from "./transcript";

export interface AIStep {
  number: number;
  text: string;
}

export interface AIIngredient {
  name: string;
  amount: string;
}

const FUNCTION_URL =
  "https://getrecipesteps-ivjrmq62mq-an.a.run.app";
import Constants from "expo-constants";

const APP_SECRET = Constants.expoConfig?.extra?.appSecret ?? "";

export interface AIRecipeResult {
  steps: AIStep[];
  ingredients: AIIngredient[];
}

/**
 * YouTube動画IDからAIで料理手順と材料を取得する
 */
export async function fetchStepsFromTranscript(videoId: string, transcriptText?: string, commentText?: string): Promise<AIRecipeResult> {
  try {
    // 1. アプリ側でYouTube字幕を取得（外部から渡されなかった場合）
    if (!transcriptText) {
      if (__DEV__) console.log("[AI] Fetching transcript for", videoId);
      try {
        transcriptText = await fetchTranscript(videoId);
        if (__DEV__) console.log("[AI] Transcript length:", transcriptText.length);
      } catch (transcriptErr) {
        if (__DEV__) console.log("[AI] Transcript fetch failed:", transcriptErr);
        return { steps: [], ingredients: [] };
      }
    }

    if (!transcriptText || transcriptText.length < 50) {
      if (__DEV__) console.log("[AI] Transcript too short, skipping");
      return { steps: [], ingredients: [] };
    }

    // 2. 字幕テキストをFirebase Functionsに送ってGemini AIで手順・材料生成
    if (__DEV__) console.log("[AI] Sending to Firebase Function...");
    const body: Record<string, string> = { transcriptText: transcriptText.slice(0, 3500), secret: APP_SECRET };
    if (commentText) {
      body.commentText = commentText;
    }
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (__DEV__) console.log("[AI] Function status:", response.status);
    const text = await response.text();
    if (__DEV__) console.log("[AI] Function response:", text.slice(0, 200));
    if (!text) throw new Error("Empty response");
    const json = JSON.parse(text);
    if (json.error) throw new Error(json.error);
    return { steps: json.steps ?? [], ingredients: json.ingredients ?? [] };
  } catch (e) {
    if (__DEV__) console.error("fetchStepsFromTranscript error:", e);
    return { steps: [], ingredients: [] };
  }
}
