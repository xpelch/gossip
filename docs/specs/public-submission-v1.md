# Public submission contract v1

`gossip.public-submission.v1` freezes the information-only boundary for a
future public evidence submission tool. It is contract-only in this revision:
it is not registered in the MCP bridge, exposed over HTTP, advertised as a
capability, or persisted by the runtime.

The request contains the authenticated v2 actor, endpoint and audience, a
stable operation ID, and an explicit `public_submission` operation kind. Its
`max_cost` is exactly `{ "unit": "earned_credit", "amount": "0" }`. The
top-level contract uses schema revision `2026-09-11`; the embedded frozen v2
evidence and result contracts retain their own `2026-09-09` revision. The request
digest uses the existing `gossip/2-draft.1` `request` domain, so it cannot be
confused with an evidence, receipt, or identity digest.

The result manifest and evidence graph reuse the existing v2 parsers. The
contract additionally requires that every evidence node has public access,
every source location is public, all graph references are closed, and the
manifest roots equal the graph roots in the same order. Owner-private nodes,
links, and sources are rejected before this contract can be used by a
transport.

TypeScript consumers can import `parsePublicSubmission` and
`publicSubmissionDigest` from `dist/public-submission-v1.js`. The literal
vector is `test/fixtures/v2-public-submission.json`; the independent Python
check is run with `npm run verify:public-submission-v2`.

This contract does not activate `private_submission` or `gossip_feedback`.
Trading, payment, generic signing, transaction construction, and blockchain
execution remain outside Gossip's information exchange boundary and remain
blocked here. Activating a public transport requires a later implementation
slice with authenticated persistence, atomic insertion, retries, correction,
conflict, retrieval, and process conformance evidence.
