import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  ConversationPolicyError,
  EphemeralConversationMemory,
  formatEvidenceSummary,
  inferConversationPreferences,
  normalizeCompactReply,
  parseEvidenceSummary,
  type ConversationTurn,
} from "../src/conversation-policy.js";

function turn(userText: string, observedAt: number): ConversationTurn {
  return { userText, assistantText: "Acknowledged.", observedAt };
}

test("bounds actor memory and expires it without refreshing on reads", () => {
  let now = 1_000;
  const memory = new EphemeralConversationMemory({
    ttlMs: 100,
    maxTurns: 2,
    maxActors: 2,
    now: () => now,
  });

  memory.remember("actor-a", "First", "One");
  now += 10;
  memory.remember("actor-a", "Second", "Two");
  memory.remember("actor-a", "Third", "Three");

  assert.deepEqual(
    memory.turns("actor-a").map((item) => item.userText),
    ["Second", "Third"],
  );

  memory.remember("actor-b", "Hello", "Hi");
  memory.remember("actor-c", "Bonjour", "Bonjour");
  assert.deepEqual(memory.turns("actor-a"), []);

  now += 100;
  assert.deepEqual(memory.turns("actor-b"), []);
  assert.deepEqual(memory.turns("actor-c"), []);
});

test("isolates actors, returns copies, and clears one conversation", () => {
  const memory = new EphemeralConversationMemory({
    ttlMs: 1_000,
    maxTurns: 3,
    now: () => 20,
  });
  memory.remember("opaque:a", "Question", "Answer");

  const returned = memory.turns("opaque:a");
  returned[0] = turn("Changed", 20);

  assert.equal(memory.turns("opaque:a")[0]?.userText, "Question");
  assert.deepEqual(memory.turns("opaque:b"), []);

  memory.clear("opaque:a");
  assert.deepEqual(memory.turns("opaque:a"), []);
});

test("moves from neutral to casual only after consistent signals", () => {
  const first = [turn("Salut, tu peux regarder ça?", 1)];
  const second = [...first, turn("Coucou, t'as le détail?", 2)];
  const third = [...second, turn("Merci, tu peux résumer stp?", 3)];

  assert.deepEqual(inferConversationPreferences(first), {
    responseLanguage: "fr",
    voice: "neutral",
    casualSignalCount: 1,
  });
  assert.equal(inferConversationPreferences(second).voice, "neutral");
  assert.deepEqual(inferConversationPreferences(third), {
    responseLanguage: "fr",
    voice: "casual",
    casualSignalCount: 3,
  });

  const reset = [...third, turn("Please provide the current evidence.", 4)];
  assert.deepEqual(inferConversationPreferences(reset), {
    responseLanguage: "en",
    voice: "neutral",
    casualSignalCount: 0,
  });
});

test("recognizes common informal French without switching after one turn", () => {
  const first = [turn("yo check ce token", 1)];
  const second = [...first, turn("ouais dis-moi le risk", 2)];

  assert.equal(
    inferConversationPreferences(first, { casualTurnThreshold: 2 }).voice,
    "neutral",
  );
  assert.equal(
    inferConversationPreferences(second, { casualTurnThreshold: 2 }).voice,
    "casual",
  );
  assert.equal(
    inferConversationPreferences([turn("c’est quoi le risque ici", 3)], {
      defaultLanguage: "en",
    }).responseLanguage,
    "fr",
  );
});

test("strictly parses and localizes a bounded evidence summary", () => {
  const summary = {
    schema: "gossip.evidence-summary.v1",
    answer: "Le jeton a été observé sur la chaîne.",
    confidence: "high",
    evidence: [
      {
        statement: "Le transfert figure dans le bloc finalisé.",
        source: "rpc:block-42",
      },
    ],
    caveats: ["La source décrit seulement cet intervalle."],
  };

  assert.deepEqual(parseEvidenceSummary(summary), summary);
  assert.equal(
    formatEvidenceSummary(summary, { language: "fr", voice: "casual" }),
    [
      "En bref: Le jeton a été observé sur la chaîne.",
      "Indices:",
      "• Le transfert figure dans le bloc finalisé. (source: rpc:block-42).",
      "Confiance: élevée.",
      "À garder en tête:",
      "• La source décrit seulement cet intervalle.",
    ].join("\n"),
  );
});

test("limits rendered evidence entries and total reply length", () => {
  const summary = {
    schema: "gossip.evidence-summary.v1",
    answer: "Observed activity.",
    confidence: "medium",
    evidence: [
      { statement: "First observation.", source: "source-one" },
      { statement: "Second observation.", source: "source-two" },
      { statement: "Third observation.", source: "source-three" },
    ],
    caveats: [],
  };

  const rendered = formatEvidenceSummary(summary, {
    maxEvidenceEntries: 2,
    maxCharacters: 650,
  });

  assert.match(rendered, /First observation/);
  assert.match(rendered, /Second observation/);
  assert.doesNotMatch(rendered, /Third observation/);
  assert.equal(Array.from(rendered).length <= 650, true);
  assert.equal(rendered.includes("**"), false);
});

test("rejects unknown summary fields and malformed evidence", () => {
  const invalid = {
    schema: "gossip.evidence-summary.v1",
    answer: "Observed.",
    confidence: "high",
    evidence: [],
    caveats: [],
    extra: true,
  };

  assert.throws(
    () => parseEvidenceSummary(invalid),
    (error) =>
      error instanceof ConversationPolicyError &&
      error.code === "invalid_evidence_summary",
  );
});

test("normalizes links, formatting, whitespace, and Unicode length", () => {
  const reply =
    "# Result\n- **Safe** [`source`](https://evidence.test)\n> Done";

  assert.equal(
    normalizeCompactReply(reply),
    "Result Safe source https://evidence.test Done",
  );
  assert.equal(normalizeCompactReply("🙂🙂🙂", { maxCharacters: 2 }), "🙂…");
  assert.equal(
    normalizeCompactReply("token_name C:\\cache"),
    "token_name C:\\cache",
  );
});

test("validates memory limits and text at its boundary", () => {
  assert.throws(
    () => new EphemeralConversationMemory({ ttlMs: 0, maxTurns: 2 }),
    /ttlMs must be a positive safe integer/,
  );

  const memory = new EphemeralConversationMemory({
    ttlMs: 10,
    maxTurns: 1,
    maxTextCharacters: 4,
  });
  assert.throws(() => memory.remember("actor", "five!", "ok"), /userText/);
  assert.throws(() => memory.turns(" actor "), /actorId/);
});
