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

// In-memory sliding window rate limiter
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimits = new Map<string, RateLimitRecord>();

function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const record = rateLimits.get(key);
  if (!record || now > record.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (record.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return { allowed: false, retryAfterSec };
  }
  record.count++;
  return { allowed: true };
}

async function handleServerAIAnalyze(request: Request, env: unknown): Promise<Response> {
  try {
    const clientIp = request.headers.get("x-forwarded-for") || "unknown-client";
    const rateCheck = checkRateLimit(`ai:${clientIp}`, 6, 60000);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          fallback: true,
          error: `Rate limit reached. Please wait ${rateCheck.retryAfterSec}s before running another AI audit.`,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(rateCheck.retryAfterSec || 60),
          },
        }
      );
    }
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

    const countWords = (t: string) => (t || "").trim().split(/\s+/).filter(Boolean).length;
    const pWords = countWords(startup.problem);
    const sWords = countWords(startup.solution);

    // Strict institutional screening: If problem or solution is under 50 words or nonsense, return an immediate failing due diligence audit
    if (pWords < 50 || sWords < 50) {
      const isBoth = pWords < 50 && sWords < 50;
      const failReason = isBoth
        ? `Both problem statement (${pWords}/50 words) and solution description (${sWords}/50 words) fail minimum depth requirements.`
        : pWords < 50
        ? `Problem statement contains only ${pWords}/50 words. A minimum of 50 descriptive words is required.`
        : `Solution statement contains only ${sWords}/50 words. A minimum of 50 descriptive words is required.`;

      const lowScore = isBoth ? 6 : 10;
      const resultObj = {
        overallScore: lowScore,
        investorGrade: "F",
        verdict: "Uninvestable — Incoherent / Nonsense Submission",
        honestTake: `Blunt institutional truth: This application fails basic diligence screening. ${failReason} Professional investors and university incubation committees reject submissions lacking sufficient customer discovery and technical architecture.`,
        redFlags: [
          `Submission rejected at pre-screening: ${failReason}`,
          "Incomplete due diligence data: founders must articulate real customer pain and viable technical product.",
        ],
        fatalFlaws: [
          `CRITICAL DEALBREAKER: ${failReason}`,
          "Cannot conduct venture due diligence on placeholders or unarticulated ideas.",
        ],
        grillingQuestions: [
          "Who specifically is your target customer and what quantifiable financial loss do they suffer today?",
          "What is your proprietary technical architecture that prevents incumbents from copying this in a weekend?",
          "Why did you submit an unarticulated proposal without conducting customer discovery interviews?",
        ],
        categories: {
          "Problem clarity": {
            score: pWords < 50 ? 5 : 45,
            critique: pWords < 50 ? `CRITICAL GAP: Problem statement has only ${pWords}/50 words. Fails minimum standard.` : "Adequate length, but needs quantifiable evidence.",
            honestFeedback: pWords < 50 ? "Unacceptable problem statement. Investors will not read past this line." : "Recognizable pain point.",
            actionItem: "Expand problem statement to at least 50 words with verified customer cost and daily urgency metrics.",
          },
          "Solution strength": {
            score: sWords < 50 ? 5 : 45,
            critique: sWords < 50 ? `CRITICAL GAP: Solution statement has only ${sWords}/50 words. No technical architecture.` : "Adequate length, but technical moat is unproven.",
            honestFeedback: sWords < 50 ? "Incoherent technical product statement." : "Viable prototype concept.",
            actionItem: "Articulate your actual technical solution, workflow, and core algorithmic mechanism in at least 50 words.",
          },
          "Market opportunity": { score: 35, critique: "Market sizing cannot be validated without a coherent problem definition.", honestFeedback: "Unquantifiable TAM/SAM.", actionItem: "Model a bottom-up TAM once problem is clarified." },
          "Business model": { score: 25, critique: "No verified pricing power or unit economics.", honestFeedback: "Pre-revenue unproven model.", actionItem: "Establish pricing model with target users." },
          "Product readiness": { score: startup.githubUrl ? 40 : 20, critique: startup.githubUrl ? "Repo connected but feature claims unverified." : "No code repository connected.", honestFeedback: "Vaporware risk.", actionItem: "Connect working GitHub repository." },
          "Traction": { score: startup.revenue ? 40 : 15, critique: "Zero validated user retention metrics.", honestFeedback: "No verified customer pull.", actionItem: "Run a 30-day pilot with at least 5 target users." },
          "Competitive advantage": { score: 20, critique: "Zero visible moat against competitors.", honestFeedback: "Easily cloned.", actionItem: "Define unique data or campus distribution moat." },
          "Team readiness": { score: 35, critique: "Team execution ability unproven at this stage.", honestFeedback: "Need to prove delivery speed.", actionItem: "Document founder roles and technical responsibilities." },
          "Funding clarity": { score: 25, critique: "Funding request lacks milestone-based justification.", honestFeedback: "Arbitrary capital ask.", actionItem: "Upload an 18-month financial use-of-funds roadmap." },
        },
        strengths: ["Submitted venture for institutional feedback."],
        weaknesses: [
          failReason,
          "Lacks defensibility and verified customer traction.",
          "High execution and platform risk.",
        ],
        recommendations: [
          "Expand the problem statement to at least 50 words describing customer pain and financial impact.",
          "Expand the solution description to at least 50 words detailing technical architecture and moat.",
          "Conduct 10 in-person customer interviews before requesting investor funding.",
          "Upload pitch deck and connect a working product demo or repository.",
        ],
      };

      return new Response(
        JSON.stringify({ success: true, rawJson: JSON.stringify(resultObj) }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an elite, highly discerning early-stage Venture Capital Principal and Startup Due Diligence Auditor.
Evaluate the student venture realistically. Do not give vanity scores or false praise.
MANDATORY QUALITY RULE: If problem or solution contains nonsense, gibberish, placeholder text, or is under 50 words, you MUST award an overallScore between 0 and 15, assign investorGrade 'F', and set verdict to 'Uninvestable — Incoherent / Nonsense Submission'.
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
    const clientIp = request.headers.get("x-forwarded-for") || "unknown-ip";
    const rateCheck = checkRateLimit(`code:${cleanEmail}:${clientIp}`, 4, 120000);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Too many verification requests. Please wait ${rateCheck.retryAfterSec}s before requesting another code.`,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(rateCheck.retryAfterSec || 60),
          },
        }
      );
    }
    console.info(`[CampusVenture Auth] Security Code dispatched to ${cleanEmail} (${role}): ${code}`);

    // If Resend API key is configured on the server, dispatch a 100% clean email with ONLY the 6-digit code
    // NO external login link, NO Lovable redirect, NO third-party URL
    const envObj = (env && typeof env === "object" ? env : {}) as Record<string, string | undefined>;
    const procEnv = typeof process !== "undefined" && process.env ? process.env : {};
    const resendApiKey =
      envObj["RESEND_API_KEY"] ||
      procEnv["RESEND_API_KEY"] ||
      "";

    const resendFrom =
      envObj["RESEND_FROM"] ||
      procEnv["RESEND_FROM"] ||
      "CampusVenture <onboarding@resend.dev>";

    if (resendApiKey) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: resendFrom,
            to: [cleanEmail],
            subject: `Your CampusVenture Verification Code: ${code}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">CampusVenture Security Verification</h2>
                <p style="color: #475569; font-size: 15px; line-height: 1.5;">Use the 6-digit verification code below to verify your email and complete your account setup:</p>
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

        if (!emailRes.ok) {
          const errText = await emailRes.text();
          console.warn("[CampusVenture Auth] Resend mail dispatch warning:", errText);
        } else {
          const resData = await emailRes.json();
          console.info("[CampusVenture Auth] Resend email dispatched successfully:", resData);
        }
      } catch (sendErr) {
        console.error("[CampusVenture Auth] Resend mail dispatch error:", sendErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Security code dispatched to ${cleanEmail}`,
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
