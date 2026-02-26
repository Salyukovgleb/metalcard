import { POST as merchantPost } from "@/app/api/payme/merchant/route";
import { NextResponse } from "next/server";

export const POST = merchantPost;

export async function GET() {
  return NextResponse.json({ error: "POST required" }, { status: 405 });
}
