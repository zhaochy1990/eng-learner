import { NextRequest, NextResponse } from "next/server";
import { EdgeTTS } from "@travisvn/edge-tts";

const ALLOWED_VOICES = new Set([
  "en-US-JennyNeural",
  "en-US-GuyNeural",
  "en-US-AriaNeural",
  "en-US-ChristopherNeural",
]);

const MAX_TEXT_LENGTH = 2000;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const text = searchParams.get("text");
  const voice = searchParams.get("voice") || "en-US-JennyNeural";
  const rateParam = searchParams.get("rate") || "0";

  if (!text) {
    return NextResponse.json(
      { error: "Missing text parameter" },
      { status: 400 }
    );
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `Text too long (max ${MAX_TEXT_LENGTH} chars)` },
      { status: 400 }
    );
  }

  if (!ALLOWED_VOICES.has(voice)) {
    return NextResponse.json({ error: "Invalid voice" }, { status: 400 });
  }

  const rate = Math.max(-50, Math.min(100, parseInt(rateParam, 10) || 0));
  const rateStr = rate >= 0 ? `+${rate}%` : `${rate}%`;

  try {
    const tts = new EdgeTTS(text, voice, { rate: rateStr });
    const result = await tts.synthesize();
    const buffer = Buffer.from(await result.audio.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("Edge TTS synthesis failed:", err);
    return NextResponse.json(
      { error: "TTS synthesis failed" },
      { status: 500 }
    );
  }
}
