# Conversation policy utilities

`@gossip/agent-kit/conversation-policy` is a transport-independent helper for
short agent conversations. It keeps recent exchanges in process, infers a small
response profile, validates model-produced evidence summaries, and renders a
compact plain-text reply.

```ts
import {
  EphemeralConversationMemory,
  formatEvidenceSummary,
  inferConversationPreferences,
} from "@gossip/agent-kit/conversation-policy";

const memory = new EphemeralConversationMemory({
  ttlMs: 30 * 60 * 1_000,
  maxTurns: 8,
});

memory.remember(actorId, userText, assistantText);
const turns = memory.turns(actorId);
const preferences = inferConversationPreferences(turns);
const reply = formatEvidenceSummary(modelOutput, {
  language: preferences.responseLanguage,
  voice: preferences.voice,
  maxEvidenceEntries: 2,
  maxCharacters: 650,
});
```

Actor IDs are opaque local partition keys. The memory stores at most 1,000
actors by default, evicts the least recently written actor when full, retains at
most `maxTurns` exchanges per actor, and expires a conversation `ttlMs` after
its latest write. Reads do not extend the TTL. `clear(actorId)` removes one
conversation. The optional `now` clock makes expiry deterministic in tests.
Nothing is written to disk, sent to an engine, or restored after restart.

Text is bounded to 2,000 Unicode characters by default. Configure
`maxTextCharacters` and `maxActors` when the embedding process needs tighter
limits. Callers should use a stable pseudonymous partition key and should avoid
putting credentials or unnecessary personal data in conversation text.

Voice starts neutral. It changes to casual after three consecutive user turns
contain conservative casual-language signals. A turn without such a signal
resets the count. Response language follows the latest detectable French or
English user turn and otherwise uses the configured default. These are small,
deterministic presentation hints, not semantic or identity classifiers.

`parseEvidenceSummary` accepts only this exact shape and rejects missing,
unknown, oversized, empty, or mistyped fields:

```json
{
  "schema": "gossip.evidence-summary.v1",
  "answer": "The transfer was observed.",
  "confidence": "high",
  "evidence": [
    {
      "statement": "The log is present in finalized block 42.",
      "source": "rpc:block-42"
    }
  ],
  "caveats": ["The observation covers only the declared interval."]
}
```

`formatEvidenceSummary` parses first, then emits short Markdown-free lines in
English or French. It uses Unicode `•` markers for readable evidence and caveat
lines; `maxEvidenceEntries` and `maxCharacters` bound the result for a chat
transport. `normalizeCompactReply` is also exported for ordinary model text; it
removes common Markdown and HTML markers, collapses whitespace, and applies a
Unicode-aware character limit. This presentation layer does not verify whether
evidence is true or current. Protocol evidence remains governed by the Gossip
evidence contracts and engine verification.

The explicit package subpath keeps this optional presentation policy separate
from the CLI and Gossip protocol modules. A `prepare` build hook produces
`dist/conversation-policy.js` and its declaration when npm installs a pinned Git
revision, where ignored build output is not present in the checkout. Packaged
artifacts already include `dist`, and the existing `gossip` CLI bin continues to
point to `dist/cli.js`.
