/**
 * AI Provider Interface — CampusVenture Central AI Engine
 * Abstracts all provider-specific details behind a common contract.
 * Adding a new provider (OpenAI, Anthropic, etc.) requires only
 * implementing this interface — zero changes to the evaluation engine.
 */

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIRequestOptions {
  /** Max milliseconds to wait for a response before timing out */
  timeoutMs?: number;
  /** Temperature (0 = deterministic, 1 = creative) */
  temperature?: number;
  /** Force JSON output mode if the provider supports it */
  jsonMode?: boolean;
  /** Maximum output tokens */
  maxOutputTokens?: number;
}

export interface AIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd?: number;
}

export interface AIResponse {
  /** Raw text returned by the provider */
  text: string;
  /** Token usage for billing and monitoring */
  usage: AIUsage;
  /** Provider name for logging */
  provider: string;
  /** Exact model identifier used */
  modelId: string;
  /** Round-trip latency in ms */
  latencyMs: number;
}

export interface AIProvider {
  /** Provider identifier (e.g. "gemini", "openai") */
  readonly name: string;
  /** Model identifier being used */
  readonly modelId: string;

  /**
   * Send a completion request and return structured response.
   * Must throw a typed AIProviderError on failure — never return fake data.
   */
  complete(messages: AIMessage[], options?: AIRequestOptions): Promise<AIResponse>;

  /** Test if the provider is reachable with current credentials */
  healthCheck(): Promise<{ ok: boolean; message: string; latencyMs: number }>;
}

// ---------------------------------------------------------------------------
// Typed error so callers can distinguish AI failures from other errors
// ---------------------------------------------------------------------------
export type AIErrorCode =
  | "INVALID_API_KEY"
  | "QUOTA_EXHAUSTED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "PROVIDER_ERROR"
  | "INVALID_RESPONSE"
  | "CONTENT_FILTERED"
  | "MODEL_NOT_FOUND";

export class AIProviderError extends Error {
  constructor(
    public readonly code: AIErrorCode,
    message: string,
    public readonly provider: string,
    public readonly retryable: boolean = false,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}
