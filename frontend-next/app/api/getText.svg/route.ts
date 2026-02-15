import { NextRequest } from "next/server";
import { getDrawApp } from "@/lib/draw-app";

export async function GET(request: NextRequest) {
  const text = request.nextUrl.searchParams.get("text") ?? "";
  const font = request.nextUrl.searchParams.get("font") ?? "gilroy";

  try {
    const drawApp = await getDrawApp();
    const svg = drawApp.drawFullInscr(text, font);

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
      },
    });
  } catch {
    return new Response("", { status: 400 });
  }
}
