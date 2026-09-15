import { NextResponse } from "next/server";
import { getApiUrl, getModel, getWorkDir, hasServerApiKey } from "@/lib/env";
import path from "path";

export async function GET() {
  return NextResponse.json({
    hasApiKey: hasServerApiKey(),
    model: getModel(),
    apiUrl: getApiUrl(),
    workDir: path.basename(getWorkDir()),
  });
}
