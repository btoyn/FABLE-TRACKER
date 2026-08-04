import type {
  AiProvider,
  DraftRequest,
  DraftResult,
  ExtractionResult,
} from "./provider";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.AI_MODEL ?? "claude-sonnet-5";

/**
 * Anthropic implementation of the AI provider. Requires ANTHROPIC_API_KEY.
 * Uses plain fetch to avoid an SDK dependency until AI is actually enabled.
 */
export class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";
  readonly enabled = true;

  constructor(private apiKey: string) {}

  private async complete(system: string, user: string, maxTokens = 1024): Promise<string> {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) {
      throw new Error(`AI request failed (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as {
      content: { type: string; text?: string }[];
    };
    return data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
  }

  async draft(request: DraftRequest): Promise<DraftResult> {
    const voice = request.voice;
    const system = [
      "You draft short, human-sounding messages for an SBA 504 business development officer who maintains relationships with commercial lenders.",
      "Sound casual, conversational, and natural — like a quick note from a colleague, never like marketing copy.",
      voice?.tone ? `Preferred tone: ${voice.tone}.` : "",
      voice?.styleNotes ? `Style notes: ${voice.styleNotes}` : "",
      voice?.neverSay?.length
        ? `Never use these phrases: ${voice.neverSay.join("; ")}.`
        : "",
      voice?.examples?.length
        ? `Match the voice of these real examples:\n${voice.examples.map((e) => `---\n${e}`).join("\n")}`
        : "",
      "Never invent familiarity or personal details that are not in the provided context.",
      "Return only the message body, no subject line, no commentary.",
    ]
      .filter(Boolean)
      .join("\n");

    const user = `Message type: ${request.kind}\nInstruction: ${request.instruction}\n\nRelationship context:\n${request.context}`;
    const text = await this.complete(system, user);
    return { text: text.trim(), promptPreview: user };
  }

  async extractFromMeetingNotes(
    rawNotes: string,
    context: string,
  ): Promise<ExtractionResult> {
    const system =
      "You extract structured follow-up data from rough meeting notes for a lender-relationship CRM. " +
      "Respond with ONLY valid JSON matching: " +
      '{"cleanedSummary": string, "personalDetails": [{"category": string, "detail": string}], ' +
      '"promises": [{"direction": "i_promised"|"they_promised", "description": string}], ' +
      '"followUps": [{"title": string, "dueInDays": number}], "potentialOpportunity": string|null}. ' +
      "personalDetails categories: long_term_interest, life_event, family, sports, golf, restaurant, community, communication_preference, meeting_preference, follow_up_topic, other. " +
      "Only extract what is actually in the notes; never invent.";

    const raw = await this.complete(
      system,
      `Meeting context:\n${context}\n\nRaw notes:\n${rawNotes}`,
      2048,
    );
    const jsonText = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const parsed = JSON.parse(jsonText) as ExtractionResult & {
      potentialOpportunity: string | null;
    };
    return {
      cleanedSummary: parsed.cleanedSummary ?? "",
      personalDetails: parsed.personalDetails ?? [],
      promises: parsed.promises ?? [],
      followUps: parsed.followUps ?? [],
      potentialOpportunity: parsed.potentialOpportunity ?? undefined,
    };
  }
}
