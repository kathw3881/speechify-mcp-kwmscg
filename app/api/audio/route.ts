import { createHmac, timingSafeEqual } from "node:crypto";
import { synthesizeSpeech } from "../../../lib/speechify";

function signingSecret(): string {
  const secret = process.env.MCP_ACCESS_TOKEN;
  if (!secret) throw new Error("MCP_ACCESS_TOKEN is required for signed audio downloads.");
  return secret;
}

function expectedSignature(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("hex");
}

function validSignature(payload: string, provided: string): boolean {
  const expected = expectedSignature(payload);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const encodedInput = url.searchParams.get("input") ?? "";
    const voiceId = url.searchParams.get("voice_id") ?? "";
    const model = url.searchParams.get("model") ?? "simba-3.2";
    const format = url.searchParams.get("format") ?? "mp3";
    const exp = url.searchParams.get("exp") ?? "";
    const sig = url.searchParams.get("sig") ?? "";

    if (!encodedInput || !voiceId || !exp || !sig) {
      return new Response("Missing download parameters.", { status: 400 });
    }

    if (!(["mp3", "wav", "ogg", "aac"] as const).includes(format as "mp3" | "wav" | "ogg" | "aac")) {
      return new Response("Unsupported audio format.", { status: 400 });
    }

    const expiresAt = Number(exp);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
      return new Response("Download link expired.", { status: 410 });
    }

    const payload = [encodedInput, voiceId, model, format, exp].join("|");
    if (!validSignature(payload, sig)) {
      return new Response("Invalid download signature.", { status: 401 });
    }

    let input: string;
    try {
      input = Buffer.from(encodedInput, "base64url").toString("utf8");
    } catch {
      return new Response("Invalid encoded input.", { status: 400 });
    }

    if (!input || input.length > 20000) {
      return new Response("Invalid text length.", { status: 400 });
    }

    const result = await synthesizeSpeech({
      input,
      voiceId,
      model,
      audioFormat: format as "mp3" | "wav" | "ogg" | "aac",
    });

    const bytes = Buffer.from(result.audioData, "base64");
    const mimeType =
      format === "wav" ? "audio/wav" :
      format === "ogg" ? "audio/ogg" :
      format === "aac" ? "audio/aac" : "audio/mpeg";

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `attachment; filename="speechify-${result.requestId ?? "audio"}.${format}"`,
        "Cache-Control": "private, no-store, max-age=0",
        ...(result.requestId ? { "Speechify-Request-Id": result.requestId } : {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Audio generation failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
