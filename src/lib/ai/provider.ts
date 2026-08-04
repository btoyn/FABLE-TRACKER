/**
 * AI provider abstraction (spec §4, §39.8): models can change without
 * rewriting the app. Only the allowed context of §33 may ever be passed in;
 * callers are responsible for never including confidential loan documents,
 * financial statements, SSNs, or anything marked confidential.
 */

export interface DraftRequest {
  /** What kind of writing this is; drives tone/template selection. */
  kind:
    | "personal_outreach"
    | "scheduling"
    | "loan_update"
    | "campaign_intro"
    | "thank_you"
    | "text_message";
  /** Plain-language instruction, e.g. "short check-in about the gym deal". */
  instruction: string;
  /** Approved relationship context (names, history summaries, personal notes). */
  context: string;
  /** Voice examples + tone guidance from the user's voice profile. */
  voice?: {
    tone: string;
    examples: string[];
    neverSay: string[];
    styleNotes?: string;
  };
}

export interface DraftResult {
  text: string;
  /** What the model was told, for the AI-input preview requirement (§33). */
  promptPreview: string;
}

export interface ExtractionResult {
  cleanedSummary: string;
  personalDetails: { category: string; detail: string }[];
  promises: { direction: "i_promised" | "they_promised"; description: string }[];
  followUps: { title: string; dueInDays?: number }[];
  potentialOpportunity?: string;
}

export interface AiProvider {
  readonly name: string;
  readonly enabled: boolean;
  draft(request: DraftRequest): Promise<DraftResult>;
  extractFromMeetingNotes(rawNotes: string, context: string): Promise<ExtractionResult>;
}
