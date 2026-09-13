export type ResponseLanguage = "en" | "fr";
export type ConversationVoice = "neutral" | "casual";

export type ConversationTurn = Readonly<{
  userText: string;
  assistantText: string;
  observedAt: number;
}>;

export type ConversationPreferences = Readonly<{
  responseLanguage: ResponseLanguage;
  voice: ConversationVoice;
  casualSignalCount: number;
}>;

export type EvidenceSummary = Readonly<{
  schema: "gossip.evidence-summary.v1";
  answer: string;
  confidence: "unknown" | "low" | "medium" | "high";
  evidence: ReadonlyArray<
    Readonly<{
      statement: string;
      source: string;
    }>
  >;
  caveats: ReadonlyArray<string>;
}>;

export class ConversationPolicyError extends Error {
  constructor(
    readonly code: "invalid_conversation" | "invalid_evidence_summary",
    message: string,
  ) {
    super(message);
    this.name = "ConversationPolicyError";
  }
}

export type EphemeralConversationMemoryOptions = Readonly<{
  ttlMs: number;
  maxTurns: number;
  maxActors?: number;
  maxTextCharacters?: number;
  now?: () => number;
}>;

type StoredConversation = {
  turns: ConversationTurn[];
  expiresAt: number;
};

export class EphemeralConversationMemory {
  private readonly conversations = new Map<string, StoredConversation>();
  private readonly ttlMs: number;
  private readonly maxTurns: number;
  private readonly maxActors: number;
  private readonly maxTextCharacters: number;
  private readonly now: () => number;

  constructor(options: EphemeralConversationMemoryOptions) {
    this.ttlMs = positiveInteger(options.ttlMs, "ttlMs");
    this.maxTurns = positiveInteger(options.maxTurns, "maxTurns");
    this.maxActors = positiveInteger(options.maxActors ?? 1_000, "maxActors");
    this.maxTextCharacters = positiveInteger(
      options.maxTextCharacters ?? 2_000,
      "maxTextCharacters",
    );
    this.now = options.now ?? Date.now;
  }

  turns(actorId: string): ConversationTurn[] {
    const id = opaqueActorId(actorId);
    const now = currentTime(this.now);
    this.removeExpired(now);

    const conversation = this.conversations.get(id);
    if (conversation === undefined) {
      return [];
    }

    return conversation.turns.map((turn) => ({ ...turn }));
  }

  remember(actorId: string, userText: string, assistantText: string): void {
    const id = opaqueActorId(actorId);
    const user = boundedText(
      userText,
      this.maxTextCharacters,
      "userText",
      "invalid_conversation",
    );
    const assistant = boundedText(
      assistantText,
      this.maxTextCharacters,
      "assistantText",
      "invalid_conversation",
    );
    const now = currentTime(this.now);

    this.removeExpired(now);

    const existing = this.conversations.get(id);
    const turns = existing?.turns ?? [];
    turns.push({ userText: user, assistantText: assistant, observedAt: now });

    if (turns.length > this.maxTurns) {
      turns.splice(0, turns.length - this.maxTurns);
    }

    this.conversations.delete(id);
    const expiresAt = now + this.ttlMs;
    if (!Number.isSafeInteger(expiresAt)) {
      throw new ConversationPolicyError(
        "invalid_conversation",
        "The conversation expiry exceeds the safe time range.",
      );
    }

    this.conversations.set(id, { turns, expiresAt });
    this.evictOldestActor();
  }

  clear(actorId: string): void {
    this.conversations.delete(opaqueActorId(actorId));
  }

  private removeExpired(now: number): void {
    for (const [actorId, conversation] of this.conversations) {
      if (conversation.expiresAt <= now) {
        this.conversations.delete(actorId);
      }
    }
  }

  private evictOldestActor(): void {
    while (this.conversations.size > this.maxActors) {
      const oldestActor = this.conversations.keys().next().value as
        | string
        | undefined;

      if (oldestActor === undefined) {
        return;
      }

      this.conversations.delete(oldestActor);
    }
  }
}

export function inferConversationPreferences(
  turns: ReadonlyArray<ConversationTurn>,
  options: Readonly<{
    defaultLanguage?: ResponseLanguage;
    casualTurnThreshold?: number;
  }> = {},
): ConversationPreferences {
  const casualTurnThreshold = positiveInteger(
    options.casualTurnThreshold ?? 3,
    "casualTurnThreshold",
  );
  let responseLanguage = options.defaultLanguage ?? "en";
  let casualSignalCount = 0;

  for (const turn of turns) {
    const language = detectLanguage(turn.userText);
    if (language !== undefined) {
      responseLanguage = language;
    }

    casualSignalCount = hasCasualSignal(turn.userText)
      ? casualSignalCount + 1
      : 0;
  }

  return {
    responseLanguage,
    voice: casualSignalCount >= casualTurnThreshold ? "casual" : "neutral",
    casualSignalCount,
  };
}

export function parseEvidenceSummary(input: unknown): EvidenceSummary {
  const summary = strictObject(
    input,
    ["schema", "answer", "confidence", "evidence", "caveats"],
    "evidence summary",
  );

  if (summary.schema !== "gossip.evidence-summary.v1") {
    invalidSummary("Unsupported evidence summary schema.");
  }

  const confidence = summary.confidence;
  if (
    confidence !== "unknown" &&
    confidence !== "low" &&
    confidence !== "medium" &&
    confidence !== "high"
  ) {
    invalidSummary("Evidence summary confidence is invalid.");
  }

  if (!Array.isArray(summary.evidence) || summary.evidence.length === 0) {
    invalidSummary("Evidence summary must contain evidence.");
  }
  if (summary.evidence.length > 8) {
    invalidSummary("Evidence summary contains too many evidence entries.");
  }
  if (!Array.isArray(summary.caveats) || summary.caveats.length > 5) {
    invalidSummary("Evidence summary caveats are invalid.");
  }

  const evidence = summary.evidence.map((entry, index) => {
    const item = strictObject(
      entry,
      ["statement", "source"],
      `evidence entry ${index}`,
    );

    return {
      statement: boundedText(
        item.statement,
        500,
        `evidence[${index}].statement`,
        "invalid_evidence_summary",
      ),
      source: boundedText(
        item.source,
        300,
        `evidence[${index}].source`,
        "invalid_evidence_summary",
      ),
    };
  });

  const caveats = summary.caveats.map((caveat, index) =>
    boundedText(caveat, 400, `caveats[${index}]`, "invalid_evidence_summary"),
  );

  return {
    schema: "gossip.evidence-summary.v1",
    answer: boundedText(
      summary.answer,
      1_000,
      "answer",
      "invalid_evidence_summary",
    ),
    confidence,
    evidence,
    caveats,
  };
}

export function formatEvidenceSummary(
  input: unknown,
  options: Readonly<{
    language?: ResponseLanguage;
    voice?: ConversationVoice;
    maxCharacters?: number;
    maxEvidenceEntries?: number;
  }> = {},
): string {
  const summary = parseEvidenceSummary(input);
  const language = options.language ?? "en";
  const voice = options.voice ?? "neutral";
  const maxEvidenceEntries = positiveInteger(
    options.maxEvidenceEntries ?? summary.evidence.length,
    "maxEvidenceEntries",
  );

  const labels = summaryLabels(language, voice);
  const answer = normalizeCompactReply(summary.answer, { maxCharacters: 600 });
  const evidence = summary.evidence
    .slice(0, maxEvidenceEntries)
    .map((entry) => {
      const statement = normalizeCompactReply(entry.statement, {
        maxCharacters: 260,
      });
      const source = normalizeCompactReply(entry.source, {
        maxCharacters: 140,
      });
      return `• ${statement} (${labels.source}: ${source})`;
    })
    .join("\n");
  const caveats = summary.caveats
    .map(
      (caveat) => `• ${normalizeCompactReply(caveat, { maxCharacters: 220 })}`,
    )
    .join("\n");
  const confidence = labels.confidenceValues[summary.confidence];
  const segments = [
    `${labels.answer}: ${answer}`,
    `${labels.evidence}:\n${evidence}`,
    `${labels.confidence}: ${confidence}`,
  ];

  if (caveats.length > 0) {
    segments.push(`${labels.caveats}:\n${caveats}`);
  }

  return truncateText(
    segments.map(completeSentence).join("\n"),
    options.maxCharacters ?? 2_000,
  );
}

export function normalizeCompactReply(
  input: string,
  options: Readonly<{ maxCharacters?: number }> = {},
): string {
  if (typeof input !== "string") {
    throw new ConversationPolicyError(
      "invalid_conversation",
      "Reply must be a string.",
    );
  }

  const maximum = positiveInteger(
    options.maxCharacters ?? 2_000,
    "maxCharacters",
  );
  const withoutLinks = input
    .replace(/!\[([^\]]*)\]\([^)]*\)/gu, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gu, "$1 $2")
    .replace(/<[^>]*>/gu, "")
    .replace(/^\s{0,3}(?:#{1,6}|>|[-+*]\s|\d+[.)]\s)\s*/gmu, "")
    .replace(/```[^\n]*\n?/gu, "")
    .replace(/`+/gu, "")
    .replace(/_{1,2}([^_\n]+)_{1,2}/gu, "$1")
    .replace(/[*~]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();

  if (withoutLinks.length === 0) {
    return "";
  }

  const characters = Array.from(withoutLinks);
  if (characters.length <= maximum) {
    return withoutLinks;
  }

  if (maximum === 1) {
    return "…";
  }

  return `${characters
    .slice(0, maximum - 1)
    .join("")
    .trimEnd()}…`;
}

function detectLanguage(text: string): ResponseLanguage | undefined {
  const normalized = text.toLocaleLowerCase();
  const words = normalized.match(/\p{L}+(?:['’]\p{L}+)?/gu) ?? [];
  const frenchWords = new Set([
    "avec",
    "bonjour",
    "ça",
    "ce",
    "comme",
    "dans",
    "des",
    "est",
    "faire",
    "mais",
    "merci",
    "nous",
    "pas",
    "pour",
    "que",
    "qui",
    "sur",
    "une",
    "vous",
  ]);
  const englishWords = new Set([
    "and",
    "are",
    "can",
    "do",
    "for",
    "from",
    "hello",
    "how",
    "is",
    "please",
    "that",
    "the",
    "this",
    "to",
    "what",
    "with",
    "you",
    "your",
  ]);
  let frenchScore = /[àâçéèêëîïôùûüÿœ]/u.test(normalized) ? 2 : 0;
  let englishScore = 0;

  for (const word of words) {
    if (frenchWords.has(word)) {
      frenchScore += 1;
    }
    if (englishWords.has(word)) {
      englishScore += 1;
    }
  }

  if (frenchScore === englishScore) {
    return undefined;
  }

  return frenchScore > englishScore ? "fr" : "en";
}

function hasCasualSignal(text: string): boolean {
  return (
    /\p{Extended_Pictographic}/u.test(text) ||
    /(?:!{2,}|\?{2,})/u.test(text) ||
    /\b(?:coucou|hey|haha|lol|salut|stp|yo)\b/iu.test(text) ||
    /\b(?:j['’]ai|j['’]suis|t['’]as|tu|ça|i['’]m|you['’]re|can['’]t|don['’]t|let['’]s)\b/iu.test(
      text,
    )
  );
}

function completeSentence(value: string): string {
  return /[.!?…]$/u.test(value) ? value : `${value}.`;
}

function truncateText(value: string, maximum: number): string {
  const limit = positiveInteger(maximum, "maxCharacters");
  const characters = Array.from(value);
  if (characters.length <= limit) {
    return value;
  }

  if (limit === 1) {
    return "…";
  }

  return `${characters
    .slice(0, limit - 1)
    .join("")
    .trimEnd()}…`;
}

function summaryLabels(language: ResponseLanguage, voice: ConversationVoice) {
  if (language === "fr") {
    return {
      answer: voice === "casual" ? "En bref" : "Réponse",
      evidence: voice === "casual" ? "Indices" : "Éléments probants",
      source: "source",
      confidence: "Confiance",
      caveats: voice === "casual" ? "À garder en tête" : "Réserves",
      confidenceValues: {
        unknown: "inconnue",
        low: "faible",
        medium: "moyenne",
        high: "élevée",
      },
    } as const;
  }

  return {
    answer: voice === "casual" ? "Quick take" : "Answer",
    evidence: "Evidence",
    source: "source",
    confidence: "Confidence",
    caveats: voice === "casual" ? "Keep in mind" : "Caveats",
    confidenceValues: {
      unknown: "unknown",
      low: "low",
      medium: "medium",
      high: "high",
    },
  } as const;
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new ConversationPolicyError(
      "invalid_conversation",
      `${name} must be a positive safe integer.`,
    );
  }

  return value;
}

function currentTime(now: () => number): number {
  const value = now();
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ConversationPolicyError(
      "invalid_conversation",
      "The conversation clock must return a non-negative safe integer.",
    );
  }

  return value;
}

function opaqueActorId(value: string): string {
  return boundedText(value, 256, "actorId", "invalid_conversation");
}

function boundedText(
  value: unknown,
  maximum: number,
  name: string,
  code: ConversationPolicyError["code"],
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value !== value.trim() ||
    Array.from(value).length > maximum ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)
  ) {
    throw new ConversationPolicyError(code, `${name} is invalid.`);
  }

  return value;
}

function strictObject(
  value: unknown,
  keys: ReadonlyArray<string>,
  name: string,
): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    invalidSummary(`${name} must be a plain object.`);
  }

  const object = value as Record<string, unknown>;
  const actualKeys = Object.keys(object).sort();
  const expectedKeys = [...keys].sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    invalidSummary(`${name} has unknown or missing fields.`);
  }

  return object;
}

function invalidSummary(message: string): never {
  throw new ConversationPolicyError("invalid_evidence_summary", message);
}
