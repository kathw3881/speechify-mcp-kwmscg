const SPEECHIFY_BASE_URL = "https://api.speechify.ai";

function apiKey(): string {
  const key = process.env.SPEECHIFY_API_KEY;
  if (!key) {
    throw new Error("SPEECHIFY_API_KEY is not configured on the MCP server.");
  }
  return key;
}

async function speechifyFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${apiKey()}`);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${SPEECHIFY_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Speechify API ${response.status}: ${body || response.statusText}`);
  }
  return response;
}

export async function listVoices(params: {
  locale?: string;
  model?: string;
  gender?: string;
  type?: string;
}) {
  const query = new URLSearchParams();
  if (params.locale) query.set("locale", params.locale);
  if (params.model) query.set("model", params.model);
  if (params.gender) query.set("gender", params.gender);
  if (params.type) query.set("type", params.type);

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await speechifyFetch(`/v1/voices${suffix}`);
  return response.json();
}

export async function synthesizeSpeech(params: {
  input: string;
  voiceId: string;
  audioFormat?: "mp3" | "wav" | "ogg" | "aac";
  model?: string;
}) {
  const response = await speechifyFetch("/v1/audio/speech", {
    method: "POST",
    body: JSON.stringify({
      input: params.input,
      voice_id: params.voiceId,
      audio_format: params.audioFormat ?? "mp3",
      model: params.model ?? "simba-3.2"
    })
  });

  const data = (await response.json()) as Record<string, unknown>;
  const audioData =
    (typeof data.audio_data === "string" && data.audio_data) ||
    (typeof data.audioData === "string" && data.audioData);

  if (!audioData) {
    throw new Error("Speechify returned no audio_data field.");
  }

  return {
    audioData,
    requestId: response.headers.get("Speechify-Request-Id") ?? undefined
  };
}
