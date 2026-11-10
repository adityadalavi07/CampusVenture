/**
 * Gemini Provider Implementation — CampusVenture Central AI Engine
 * Wraps Google Generative Language REST API v1beta.
 * API key is read exclusively from server-side environment variables.
 * Never call this from browser code.
 */

import type { AIProvider, AIMessage, AIRequestOptions, AIResponse } from "./types";
import { AIProviderError } from "./types";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash-lite";
const DEFAULT_TIMEOUT_MS = 55_000; // 55 s — stay under Vercel 60 s limit
const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_MAX_TOKENS = 8192;

// Very rough cost estimate — update when Google publishes pricing changes
const COST_PER_1K_INPUT = 0.000075; // $0.075 per 1M input tokens
const COST_PER_1K_OUTPUT = 0.0003; // $0.30  per 1M output tokens

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  readonly modelId: string;
  private readonly apiKey: string;

  constructor(apiKey: string, modelId: string = DEFAULT_MODEL) {
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 10) {
      throw new AIProviderError(
        "INVALID_API_KEY",
        "GEMINI_API_KEY is missing or invalid. Set it in Vercel environment variables.",
        "gemini",
        false,
      );
    }
    this.apiKey = apiKey.trim();
    this.modelId = modelId.trim() || DEFAULT_MODEL;
  }

  async complete(messages: AIMessage[], options: AIRequestOptions = {}): Promise<AIResponse> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const temperature = options.temperature ?? DEFAULT_TEMPERATURE;
    const maxOutputTokens = options.maxOutputTokens ?? DEFAULT_MAX_TOKENS;
    const jsonMode = options.jsonMode ?? true;

    // Gemini uses a flat "contents" array — merge system prompt into first user turn
    const systemMsg = messages.find((m) => m.role === "system");
    const userMessages = messages.filter((m) => m.role !== "system");

    const contents = userMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Prepend system prompt to first user message if present
    if (systemMsg && contents.length > 0) {
      contents[0].parts[0].text = `${systemMsg.content}\n\n---\n\n${contents[0].parts[0].text}`;
    }

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens,
        ...(jsonMode ? { responseMimeType: "application/json" } : {}),
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
      ],
    };

    const url = `${BASE_URL}/${this.modelId}:generateContent?key=${this.apiKey}`;
    const startMs = Date.now();

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutHandle);
      const isTimeout =
        err instanceof Error && (err.name === "AbortError" || err.message.includes("aborted"));
      throw new AIProviderError(
        isTimeout ? "TIMEOUT" : "PROVIDER_ERROR",
        isTimeout
          ? `Gemini request timed out after ${timeoutMs}ms`
          : `Network error calling Gemini: ${err instanceof Error ? err.message : String(err)}`,
        this.name,
        true,
        isTimeout ? 5_000 : 2_000,
      );
    } finally {
      clearTimeout(timeoutHandle);
    }

    const latencyMs = Date.now() - startMs;
    const rawBody = await response.text();

    if (!response.ok) {
      let parsed: { error?: { code?: number; message?: string; status?: string } } = {};
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        /* ignore */
      }
      const msg = parsed?.error?.message || rawBody.slice(0, 300);
      const status = parsed?.error?.status || "";

      if (response.status === 401 || status === "UNAUTHENTICATED") {
        throw new AIProviderError("INVALID_API_KEY", `Gemini: ${msg}`, this.name, false);
      }
      if (response.status === 429 || status === "RESOURCE_EXHAUSTED") {
        const retryAfter = Number(response.headers.get("Retry-After") || "60") * 1000;
        throw new AIProviderError("RATE_LIMITED", `Gemini rate limit: ${msg}`, this.name, true, retryAfter);
      }
      if (response.status === 404) {
        throw new AIProviderError(
          "MODEL_NOT_FOUND",
          `Gemini model "${this.modelId}" not found. Update GEMINI_MODEL env var.`,
          this.name,
          false,
        );
      }
      throw new AIProviderError(
        "PROVIDER_ERROR",
        `Gemini HTTP ${response.status}: ${msg}`,
        this.name,
        response.status >= 500,
        response.status >= 500 ? 10_000 : undefined,
      );
    }

    let data: {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };
    try {
      data = JSON.parse(rawBody);
    } catch {
      throw new AIProviderError(
        "INVALID_RESPONSE",
        "Gemini returned non-JSON response",
        this.name,
        true,
      );
    }

    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new AIProviderError(
        "INVALID_RESPONSE",
        "Gemini returned no candidates",
        this.name,
        true,
      );
    }
    if (candidate.finishReason === "SAFETY") {
      throw new AIProviderError(
        "CONTENT_FILTERED",
        "Gemini blocked the response due to safety filters. Rephrase the prompt.",
        this.name,
        false,
      );
    }

    const text = candidate.content?.parts?.[0]?.text || "";
    if (!text) {
      throw new AIProviderError(
        "INVALID_RESPONSE",
        "Gemini candidate had empty text",
        this.name,
        true,
      );
    }

    const promptTokens = data.usageMetadata?.promptTokenCount ?? 0;
    const completionTokens = data.usageMetadata?.candidatesTokenCount ?? 0;
    const totalTokens = data.usageMetadata?.totalTokenCount ?? 0;
    const estimatedCostUsd =
      (promptTokens / 1000) * COST_PER_1K_INPUT +
      (completionTokens / 1000) * COST_PER_1K_OUTPUT;

    return {
      text,
      usage: { promptTokens, completionTokens, totalTokens, estimatedCostUsd },
      provider: this.name,
      modelId: this.modelId,
      latencyMs,
    };
  }

  async healthCheck(): Promise<{ ok: boolean; message: string; latencyMs: number }> {
    const start = Date.now();
    try {
      await this.complete(
        [{ role: "user", content: 'Reply with the single word: OK' }],
        { timeoutMs: 10_000, jsonMode: false, maxOutputTokens: 10 },
      );
      return { ok: true, message: `Gemini ${this.modelId} is reachable`, latencyMs: Date.now() - start };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - start,
      };
    }
  }
}
