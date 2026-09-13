import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { listVoices, synthesizeSpeech } from "../../../lib/speechify";

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
      description: "Generate spoken audio from text with Speechify and return MCP audio content.",
      inputSchema: z.object({
        input: z.string().min(1).max(20000),
        voice_id: z.string().min(1),
        model: z.string().optional().default("simba-3.2"),
        audio_format: z.enum(["mp3", "wav", "ogg", "aac"]).optional().default("mp3"),
      }),
    },
    async ({ input, voice_id, model, audio_format }) => {
      const result = await synthesizeSpeech({ input, voiceId: voice_id, model, audioFormat: audio_format });
      const mimeType =
        audio_format === "wav" ? "audio/wav" :
        audio_format === "ogg" ? "audio/ogg" :
        audio_format === "aac" ? "audio/aac" : "audio/mpeg";
      return {
        content: [
          { type: "audio", data: result.audioData, mimeType },
          { type: "text", text: result.requestId ? `Speech generated successfully. Speechify request ID: ${result.requestId}` : "Speech generated successfully." },
        ],
      };
    },
  );

  server.registerTool(
    "speechify_speak_uk_english",
    {
      title: "Speak UK English",
      description: "Convenience tool for UK-English speech using Speechify Simba 3.2.",
      inputSchema: z.object({
        input: z.string().min(1).max(20000),
        voice_id: z.string().min(1),
        audio_format: z.enum(["mp3", "wav"]).optional().default("mp3"),
      }),
    },
    async ({ input, voice_id, audio_format }) => {
      const result = await synthesizeSpeech({ input, voiceId: voice_id, model: "simba-3.2", audioFormat: audio_format });
      return { content: [{ type: "audio", data: result.audioData, mimeType: audio_format === "wav" ? "audio/wav" : "audio/mpeg" }] };
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
