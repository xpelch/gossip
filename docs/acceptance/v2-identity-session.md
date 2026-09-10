# Gossip v2 identity-session acceptance

- Date: 2026-09-10
- Protocol: `gossip/2-draft.1`
- Child issue: [#15](https://github.com/xpelch/gossip/issues/15)

## Accepted portable behavior

The public kit now has an inactive, portable contract for root-signed session
grants, canonical signed request envelopes, explicit rotation, revocation, and
scope authorization. The root Gossip Identity Wallet remains the owner. A
session grant can express only Gossip information tools, evidence submission
kinds, one HTTPS endpoint and audience, a validity interval, and an
earned-credit ceiling.

The signed `gossip.identity-session-request.v1` body contains the root identity,
key ID, tool, submission kind, cost, and complete payload. The frozen
`gossip-eip191-v2` verifier authenticates those exact bytes before session scope
is evaluated. A valid signature cannot be relabelled as another tool, payload,
submission kind, or cost.

Rotation requires a new root-signed complete grant linked to the immediately
preceding key and digest. The newest valid grant is the only active grant in a
verified chain; no permission is inherited. Root-signed revocation is terminal
for new authorization and leaves accepted history unchanged.

## Reproduction

From a clean checkout with Node 24 and Python 3:

```sh
npm ci --ignore-scripts
npm run build
npm test
npm run verify:protocol-v2
npm run verify:evidence-v2
npm run verify:http-auth-v2
npm run verify:identity-session-v2
```

The identity-session fixture uses deterministic synthetic keys and reserved
`.test` URLs. TypeScript validates the public entry points. The standard-library
Python verifier independently recomputes the full v2 canonical representation,
identity digests, EIP-191 grant and revocation signatures, the signed request
body digest, and a tool-tampering rejection.

Focused tests cover malformed runtime input, wrong root chain, destination,
session key, time interval, tool, submission kind, cost, predecessor, digest,
signature, high-S signature, rotation scope, revocation, and the bounded
revocation set. Existing v1 and v2 behavior remains in the full suite.

## Independent review

The first independent review found that the initial authorization API trusted a
session public key without verifying request possession, accepted an unbounded
revocation list, exposed unstable runtime errors, and used an incomplete Python
canonicalizer. Those findings were corrected and revalidated.

A second review found that the authenticated request body was not yet tied to
the separately supplied tool and cost. The separate fields were removed. The
tool, cost, submission kind, root, key ID, and payload now come only from the
canonical body authenticated by `gossip-eip191-v2`.

## Remaining activation gates

This work does not create or store a session private key, register a grant with
Sherwood, persist a nonce, expose a session MCP/HTTP route, or mark
`session_keys` verified. Production activation requires an atomic server
registry for grants, revocations, owner mappings, and replay nonces; protected
session-key storage; transport wiring; privacy policy; and real version-pinned
host acceptance.

The frozen activation wire contract is `POST /v2/gossip/session` with the
canonical identity-session request as the raw body. Its EIP-191 proof signs
those exact bytes. MCP retains the six logical Gossip names and accepts one
exclusive `session_request` argument containing that envelope; the proof signs
the complete raw JSON-RPC body, and the adapter must match the envelope tool to
the called MCP tool. Object-valued `_meta` framing is ignored; task-augmented
calls are rejected. Capabilities map to `{}`, consultation maps to a bare v2
consultation and uses exactly its `max_cost`, and operation/receipt map to
`{operation_id}` at zero cost. Submission and feedback remain reserved and
fail closed.

Root-only grant management uses `POST /v2/gossip/sessions/grants` and
`POST /v2/gossip/sessions/revocations`; response schemas remain a server
activation concern. The outer management request uses the `gossip-eip191-v2`
profile over its raw body, contains an inner signed record, and requires the
outer and inner root identities to match. A grant covers exactly one endpoint,
so `/mcp` and `/v2/gossip/session` require separate grants and may use separate
audiences.

The server must use root owner chain `4663`, enforce the grant interval and
existing 24-hour lifetime, cap a root at sixteen grants, reject globally reused
session public keys/addresses, and linearize replay at durable
`(root, key_id, nonce)` insertion. Retired or revoked keys cannot authorize new
reads or work, while accepted root-owned operations and receipts remain
historical. These requirements describe future Sherwood activation and do not
promote `session_keys` or any live endpoint to verified support.

ERC-1271 contract-wallet continuity and draft execution-delegation standards
remain separate specifications. This contract grants no payment, trading,
arbitrary signing, transaction, calldata, allowance, or execution authority.
