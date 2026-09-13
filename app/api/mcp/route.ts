import { createHmac } from "node:crypto";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { listVoices, synthesizeSpeech } from "../../../lib/speechify";

function signingSecret(): string {
  const secret = process.env.MCP_ACCESS_TOKEN;
  if (!secret) throw new Error("MCP_ACCESS_TOKEN is required for signed audio download links.");
  return secret;
}

function createDownloadUrl(request: Request, params: {
  input: string;
  voiceId: string;
  model: string;
  audioFormat: "mp3" | "wav" | "ogg" | "aac";
}) {
  const encodedInput = Buffer.from(params.input, "utf8").toString("base64url");
  const exp = String(Date.now() + 15 * 60 * 1000);
  const payload = [encodedInput, params.voiceId, params.model, params.audioFormat, exp].join("|");
  const sig = createHmac("sha256", signingSecret()).update(payload).digest("hex");
  const base = new URL(request.url).origin;
  const url = new URL("/api/audio", base);
  url.searchParams.set("input", encodedInput);
  url.searchParams.set("voice_id", params.voiceId);
  url.searchParams.set("model", params.model);
  url.searchParams.set("format", params.audioFormat);
  url.searchParams.set("exp", exp);
  url.searchParams.set("sig", sig);
  return url.toString();
}

const handler = createMcpHandler((server) => {
  server.registerTool(
    "speechify_list_voices",
    {
      title: "List Speechify Voices",
      description: "List Speechify voices. Useful for finding a voice_id before generating speech.",
      inputSchema: z.object({
        locale: z.string().optional().describe("Locale such as en, en-GB, or en-US."),
        model: z.string().optional().default("simba-3.2"),
        gender: z.string().optional(),
        type: z.string().optional(),
      }),
    },
    async ({ locale, model, gender, type }) => {
      const voices = await listVoices({ locale, model, gender, type });
      return { content: [{ type: "text", text: JSON.stringify(voices, null, 2) }] };
    },
  );

  server.registerTool(
    "speechify_generate_speech",
    {
      title: "Generate Speech with Speechify",
      description: "Generate spoken audio from text with Speechify. Returns MCP audio plus a temporary signed download URL.",
      inputSchema: z.object({
        input: z.string().min(1).max(20000),
        voice_id: z.string().min(1),
        model: z.string().optional().default("simba-3.2"),
        audio_format: z.enum(["mp3", "wav", "ogg", "aac"]).optional().default("mp3"),
      }),
    },
    async ({ input, voice_id, model, audio_format }, extra) => {
      const result = await synthesizeSpeech({ input, voiceId: voice_id, model, audioFormat: audio_format });
      const mimeType =
        audio_format === "wav" ? "audio/wav" :
        audio_format === "ogg" ? "audio/ogg" :
        audio_format === "aac" ? "audio/aac" : "audio/mpeg";
      const request = extra?.requestInfo?.request as Request | undefined;
      const downloadUrl = request
        ? createDownloadUrl(request, { input, voiceId: voice_id, model, audioFormat: audio_format })
        : undefined;
      const text = [
        "Speech generated successfully.",
        result.requestId ? `Speechify request ID: ${result.requestId}` : undefined,
        downloadUrl ? `Download audio: ${downloadUrl}` : undefined,
      ].filter(Boolean).join("\n");
      return {
        content: [
          { type: "audio", data: result.audioData, mimeType },
          { type: "text", text },
        ],
      };
    },
  );

  server.registerTool(
    "speechify_speak_uk_english",
    {
      title: "Speak UK English",
      description: "Convenience tool for UK-English speech using Speechify Simba 3.2. Returns MCP audio plus a temporary signed download URL.",
      inputSchema: z.object({
        input: z.string().min(1).max(20000),
        voice_id: z.string().min(1),
        audio_format: z.enum(["mp3", "wav"]).optional().default("mp3"),
      }),
    },
    async ({ input, voice_id, audio_format }, extra) => {
      const model = "simba-3.2";
      const result = await synthesizeSpeech({ input, voiceId: voice_id, model, audioFormat: audio_format });
      const request = extra?.requestInfo?.request as Request | undefined;
      const downloadUrl = request
        ? createDownloadUrl(request, { input, voiceId: voice_id, model, audioFormat: audio_format })
        : undefined;
      const text = [
        "Speech generated successfully.",
        result.requestId ? `Speechify request ID: ${result.requestId}` : undefined,
        downloadUrl ? `Download audio: ${downloadUrl}` : undefined,
      ].filter(Boolean).join("\n");
      return {
        content: [
          { type: "audio", data: result.audioData, mimeType: audio_format === "wav" ? "audio/wav" : "audio/mpeg" },
          { type: "text", text },
        ],
      };
    },
  );
});

function authorized(request: Request) {
  const expected = process.env.MCP_ACCESS_TOKEN;
  if (!expected) return true;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

async function protectedHandler(request: Request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  return handler(request);
}

export const GET = protectedHandler;
export const POST = protectedHandler;
