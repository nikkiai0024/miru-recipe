import * as Sentry from '@sentry/react-native';
import Constants from "expo-constants";

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
const MAX_TRANSCRIPT_CHARS = 30000;

const APP_SECRET = Constants.expoConfig?.extra?.appSecret ?? "";

export interface AIRecipeResult {
  steps: AIStep[];
  ingredients: AIIngredient[];
}

interface FunctionRecipeResponse {
  steps?: AIStep[];
  ingredients?: AIIngredient[];
  error?: string;
}

/**
 * YouTube動画IDからAIで料理手順と材料を取得する
 */
export async function fetchStepsFromTranscript(videoId: string, transcriptText?: string, commentText?: string): Promise<AIRecipeResult> {
  try {
    // 字幕テキストが空なら、Function側でvideoIdから再取得する
    if (__DEV__) console.log("[AI] Sending to Firebase Function...");
    const body: Record<string, string> = { secret: APP_SECRET };
    if (transcriptText && transcriptText.length >= 50) {
      body.transcriptText = transcriptText.slice(0, MAX_TRANSCRIPT_CHARS);
    } else {
      body.videoId = videoId;
    }
    if (commentText) {
      body.commentText = commentText;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (__DEV__) console.log("[AI] Function status:", response.status);
    const text = await response.text();
    if (__DEV__) console.log("[AI] Function response:", text.slice(0, 200));
    if (!text) throw new Error("Empty response");
    let json: FunctionRecipeResponse;
    try {
      json = JSON.parse(text);
    } catch {
      if (__DEV__) console.error("Invalid JSON from Firebase:", text.slice(0, 200));
      return { steps: [], ingredients: [] };
    }
    if (json.error) throw new Error(json.error);
    return { steps: json.steps ?? [], ingredients: json.ingredients ?? [] };
  } catch (e) {
    if (__DEV__) console.error("fetchStepsFromTranscript error:", e);
    Sentry.captureException(e);
    return { steps: [], ingredients: [] };
  }
}
