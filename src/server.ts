import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

async function handleServerAIAnalyze(request: Request, env: unknown): Promise<Response> {
  try {
    const body = (await request.json()) as { startup?: any; honestyLevel?: string };
    if (!body?.startup) {
      return new Response(JSON.stringify({ error: "Missing startup data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const envObj = (env && typeof env === "object" ? env : {}) as Record<string, string | undefined>;
    const procEnv = typeof process !== "undefined" && process.env ? process.env : {};
    const apiKey =
      envObj["GEMINI_API_KEY"] ||
      procEnv["GEMINI_API_KEY"] ||
      envObj["VITE_GEMINI_API_KEY"] ||
      procEnv["VITE_GEMINI_API_KEY"] ||
      "";

    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, fallback: true, message: "No server Gemini API key configured" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const { startup, honestyLevel = "brutal" } = body;
    const systemPrompt = `You are an elite, highly discerning early-stage Venture Capital Principal and Startup Due Diligence Auditor.
Evaluate the student venture realistically. Do not give vanity scores or false praise.
Output strict JSON with fields:
overallScore (number 0-100),
investorGrade (one of "A+", "A", "B", "C", "D", "F"),
verdict (string),
honestTake (2-3 sentences of blunt institutional truth),
redFlags (array of 2-4 strings),
fatalFlaws (array of 1-3 strings),
grillingQuestions (array of 3 tough VC partner meeting questions),
categories (object with problemClarity, solutionMoat, marketSize, tractionProof, teamExecution, businessModel, defensibility, unitEconomics, fundingClarity, each having score, critique, honestFeedback, actionItem),
strengths (array of 3 strings),
weaknesses (array of 3 strings),
recommendations (array of 4 actionable strings).`;

    const userPrompt = `STARTUP PROFILE FOR DUE DILIGENCE:
Company Name: ${startup.name || "Untitled"}
Tagline: ${startup.tagline || ""}
Sector: ${startup.sector || ""}
Stage: ${startup.stage || ""}
University: ${startup.university || ""}
Team Size: ${startup.teamSize || 1}
Funding Required: $${Number(startup.fundingRequired || 0).toLocaleString()}
Revenue Generated: ${startup.revenue ? "Yes" : "No"}
Monthly Active Users: ${Number(startup.monthlyUsers || 0).toLocaleString()}
Traction: "${startup.traction || ""}"
Business Model: "${startup.businessModel || ""}"
Problem Statement: "${startup.problem || ""}"
Solution Statement: "${startup.solution || ""}"
Honesty Level: ${String(honestyLevel).toUpperCase()}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;
    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(
        JSON.stringify({ success: false, fallback: true, error: errText }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const geminiData = (await geminiRes.json()) as any;
    const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      return new Response(
        JSON.stringify({ success: false, fallback: true, error: "Empty AI response" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, rawJson: candidateText }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, fallback: true, error: err?.message || "Server AI error" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/ai/analyze" && request.method === "POST") {
        return await handleServerAIAnalyze(request, env);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
