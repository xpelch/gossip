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
    evidence: ReadonlyArray<Readonly<{
        statement: string;
        source: string;
    }>>;
    caveats: ReadonlyArray<string>;
}>;
export declare class ConversationPolicyError extends Error {
    readonly code: "invalid_conversation" | "invalid_evidence_summary";
    constructor(code: "invalid_conversation" | "invalid_evidence_summary", message: string);
}
export type EphemeralConversationMemoryOptions = Readonly<{
    ttlMs: number;
    maxTurns: number;
    maxActors?: number;
    maxTextCharacters?: number;
    now?: () => number;
}>;
export declare class EphemeralConversationMemory {
    private readonly conversations;
    private readonly ttlMs;
    private readonly maxTurns;
    private readonly maxActors;
    private readonly maxTextCharacters;
    private readonly now;
    constructor(options: EphemeralConversationMemoryOptions);
    turns(actorId: string): ConversationTurn[];
    remember(actorId: string, userText: string, assistantText: string): void;
    clear(actorId: string): void;
    private removeExpired;
    private evictOldestActor;
}
export declare function inferConversationPreferences(turns: ReadonlyArray<ConversationTurn>, options?: Readonly<{
    defaultLanguage?: ResponseLanguage;
    casualTurnThreshold?: number;
}>): ConversationPreferences;
export declare function parseEvidenceSummary(input: unknown): EvidenceSummary;
export declare function formatEvidenceSummary(input: unknown, options?: Readonly<{
    language?: ResponseLanguage;
    voice?: ConversationVoice;
    maxCharacters?: number;
    maxEvidenceEntries?: number;
}>): string;
export declare function normalizeCompactReply(input: string, options?: Readonly<{
    maxCharacters?: number;
}>): string;
