import type { AiProvider, DraftRequest, DraftResult, ExtractionResult } from "./provider";
import { AnthropicProvider } from "./anthropic";

/**
 * AI-off mode (spec §33): the core CRM keeps working with AI disabled.
 * Callers should check `enabled` and offer manual entry instead.
 */
class DisabledProvider implements AiProvider {
  readonly name = "disabled";
  readonly enabled = false;

  async draft(): Promise<DraftResult> {
    throw new Error("AI drafting is not enabled. Add ANTHROPIC_API_KEY to turn it on.");
  }

  async extractFromMeetingNotes(): Promise<ExtractionResult> {
    throw new Error("AI extraction is not enabled. Add ANTHROPIC_API_KEY to turn it on.");
  }
}

export function getAiProvider(): AiProvider {
  const key = process.env.ANTHROPIC_API_KEY;
  if (key && process.env.AI_DISABLED !== "true") {
    return new AnthropicProvider(key);
  }
  return new DisabledProvider();
}

export type { AiProvider, DraftRequest, DraftResult, ExtractionResult };
