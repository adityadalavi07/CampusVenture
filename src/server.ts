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

async function handleServerSendCode(request: Request, env: unknown): Promise<Response> {
  try {
    const body = (await request.json()) as { email?: string; code?: string; role?: string };
    const { email, code, role = "student" } = body || {};

    if (!email || !code) {
      return new Response(JSON.stringify({ success: false, error: "Missing email or code" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    console.info(`[CampusVenture Auth] Security Code dispatched to ${cleanEmail} (${role}): ${code}`);

    // If Resend API key is configured on the server, dispatch a 100% clean email with ONLY the 6-digit code
    // NO external login link, NO Lovable redirect, NO third-party URL
    const envObj = (env && typeof env === "object" ? env : {}) as Record<string, string | undefined>;
    const procEnv = typeof process !== "undefined" && process.env ? process.env : {};
    const resendApiKey =
      envObj["RESEND_API_KEY"] ||
      procEnv["RESEND_API_KEY"] ||
      "";

    if (resendApiKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "CampusVenture <security@campusventure.in>",
            to: [cleanEmail],
            subject: `Your CampusVenture Verification Code: ${code}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">CampusVenture Verification Code</h2>
                <p style="color: #475569; font-size: 15px; line-height: 1.5;">Use the 6-digit verification code below to verify your academic credentials and complete your account setup:</p>
                <div style="margin: 24px 0; padding: 18px; background: #f8fafc; border-radius: 8px; text-align: center; border: 1px dashed #6366f1;">
                  <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #4f46e5; font-family: monospace;">${code}</span>
                </div>
                <p style="color: #64748b; font-size: 13px;">This code will expire in 10 minutes. Enter this code directly into the CampusVenture verification dialog.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">CampusVenture • Institutional Student & Investor Ecosystem</p>
              </div>
            `,
          }),
        });
      } catch (sendErr) {
        console.error("[CampusVenture Auth] Resend mail dispatch error:", sendErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Security code dispatched to ${cleanEmail}`,
        code,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || "Failed to dispatch code" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
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
      if (url.pathname === "/api/auth/send-code" && request.method === "POST") {
        return await handleServerSendCode(request, env);
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
