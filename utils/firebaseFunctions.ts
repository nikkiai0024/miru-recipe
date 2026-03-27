// Firebase Functions呼び出しユーティリティ
const FUNCTION_URL = "https://getrecipesteps-placeholder.a.run.app"; // デプロイ後に更新
import Constants from "expo-constants";

const APP_SECRET = Constants.expoConfig?.extra?.appSecret ?? "";

export interface AIStep {
  number: number;
  text: string;
}

export async function fetchStepsFromTranscript(videoId: string): Promise<AIStep[]> {
  try {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { videoId, secret: APP_SECRET },
      }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    return json.result?.steps ?? [];
  } catch (e) {
    if (__DEV__) console.error("fetchStepsFromTranscript error:", e);
    return [];
  }
}
