# Gossip v2 production rollout

This runbook turns the locally proven Gossip v2 stack into a production
candidate without promoting unverified capabilities. It applies to the existing
Railway `Sherwood / production` environment and its `engine` service.

## Known production state

The current known Sherwood production source is `main` at commit
`db968f5010b9491b67190aff749d62f2ad0e7a97`. Railway deployment `6415704531`
completed successfully. `/health` returns HTTP 200, a missing public Smart Money
projection returns HTTP 404 without authentication, and anonymous
`GET /v2/gossip/capabilities` returns HTTP 401 because the v2 route is protected.

These probes do not establish signed production acceptance. Treat every v2
capability, advertised host, and package release as blocked until the steps
below produce a signed acceptance record.

## Release inputs

Merge the complete Gossip and Sherwood stacks in the order recorded in the
[post-conformance checkpoint](../checkpoints/gossip-v2-2026-09-11-post-conformance.md).
Record the resulting `main` commits before deploying. The release record must
bind:

- the merged Gossip and Sherwood commits;
- the Gossip package digest and lockfile digest;
- the Railway deployment ID and immutable image digest;
- protocol `gossip/2-draft.1`, schema `2026-09-09`, authentication
  `gossip-eip191-v2`, and MCP `2025-11-25`;
- the production receipt key ID and its separately published public key;
- the exact Grok Bot, Hermes, OpenClaw, Node, operating-system, and protected
  storage versions used in acceptance.

Do not publish a release from an unmerged feature branch or reuse the local
synthetic signing keys. Gossip commit
`56d280c899f5d47d5e8f0c9bf3fb5147834ce7d3` produced a repository-bound GitHub
attestation in [workflow run 34725836485](https://github.com/xpelch/gossip/actions/runs/34725836485).
The package artifact digest is
`sha256:cb9321b6af32a9970fd5e1b78b1940e20bbc0ce92fcb597c95787aa93fdebe12`.
This artifact-only evidence does not create a tag, publish a package, or promote
endpoint or host acceptance.

## Candidate endpoint configuration

The canonical candidate values for the existing Railway domain are:

```text
Sherwood__AgentAccess__Enabled=true
Sherwood__AgentAccess__LegacySubmissionEnabled=false
Sherwood__GossipV2__Endpoint=https://engine-production-c4d8.up.railway.app/mcp
Sherwood__GossipV2__HttpBaseUrl=https://engine-production-c4d8.up.railway.app/
Sherwood__GossipV2__Audience=https://engine-production-c4d8.up.railway.app/
Sherwood__GossipV2__ServerId=sherwood
Sherwood__GossipV2__ServerRevision=<merged-sherwood-commit>
Sherwood__GossipV2__ReceiptSigningKeyEnvironmentVariable=GOSSIP_RECEIPT_SIGNING_KEY
Sherwood__GossipV2__ReceiptSigningKeyId=<approved-production-key-id>
Sherwood__GossipV2__ConsultationEnabled=true
Sherwood__GossipV2__IdentitySessionEnabled=true
Sherwood__GossipV2__ConsultationAcceptanceVerified=false
Sherwood__GossipV2__IdentitySessionAcceptanceVerified=false
```

The Railway secret variable `GOSSIP_RECEIPT_SIGNING_KEY` must contain exactly one
lowercase 32-byte secp256k1 scalar encoded as 64 hexadecimal characters. The
Sherwood configuration stores only that variable's name. At startup, Sherwood
reads the value, removes it from the process environment, validates it, builds
the receipt signer, and clears its temporary byte buffers. The immutable .NET
string returned by the operating system remains subject to garbage collection,
so this mechanism must not be described as guaranteed in-memory erasure.

Provision the secret through Railway's protected variable interface. Never put
the value in a command transcript, repository file, deployment log, acceptance
artifact, or agent prompt. Publish the matching uncompressed public key,
Ethereum address, key ID, validity interval, and status in a separately reviewed
`gossip.receipt-trust-manifest.v1`. Keep `ReceiptSigningKeyFile` unset because
the engine accepts exactly one external receipt-key source.

Leave `PrivateEvidenceEncryptionKeyFile` and
`PrivateEvidenceEncryptionKeyId` unset. Production private submission remains
blocked pending the separately approved retention, hold, deletion, audit,
rotation, and backup-erasure policy.

Never set either `AcceptanceVerified` flag from deployment success alone. Those
flags may change only after the matching production acceptance evidence passes.

## Deployment gate

Before changing Railway, capture the current deployment ID, source commit,
image digest, domain, replica state, and health result. Deploy the merged
Sherwood `main` commit to the existing `engine` service. Do not recreate or
replace the PostgreSQL service.

The new deployment must be rejected if any of these checks fail:

1. Railway reports a source commit other than the recorded merged commit.
2. The engine has no immutable image digest or healthy running instance.
3. `/health` does not return HTTP 200.
4. An unsigned v2 request is accepted.
5. The capability document names a different endpoint, audience, protocol,
   schema, auth profile, MCP revision, server revision, or receipt key ID.
6. A wrong endpoint, audience, nonce replay, expiry, signature, body, query, or
   authentication downgrade reaches application work.
7. Standard plus zero maximum cost creates a nonzero reservation or charge.
8. Private submission, feedback, generic signing, transaction construction, or
   trading becomes reachable.

## Host acceptance

Use a fresh synthetic identity and a separate existing synthetic wallet on each
advertised host. Install the exact released package without lifecycle scripts,
then run `setup-gossip` against the candidate endpoint and audience. Record
install, configured, connected, and verified as separate states.

Hermes and OpenClaw must use their documented additive MCP configuration paths.
Grok Bot remains blocked until its real public MCP configuration or signing
surface is documented; a terminal-only workaround does not establish host
support. On Linux, protected storage must pass in the actual user session rather
than from package presence alone.

Each host must prove:

1. capability negotiation and receipt trust against the pinned production key;
2. one standard zero-cost consultation over the real endpoint;
3. schema-valid evidence and a valid acknowledgment/final receipt chain;
4. exact retry without a second operation, contribution, or charge;
5. changed-content conflict for the same operation ID;
6. owner isolation, restart, upgrade, rollback, disconnect, session rotation,
   revocation, and identity deletion;
7. no key, seed, signature, token, prompt, private claim, or identifying source
   URL in captured output.

## Promotion and rollback

Publish the final WS7 manifest only after two independent clean runs match and
every advertised host passes. Set a capability to `verified` only when its own
evidence cites the production deployment, release artifact, trust manifest, and
host version.

If a deployment or acceptance check fails, restore the previously captured
Railway deployment. Keep the new receipt key ID untrusted, leave both
`AcceptanceVerified` flags false, and record the failed deployment and reason.
Rollback must preserve the PostgreSQL service and all already accepted operation
history.

The epic can close only after the release manifest is independently verified,
the approved numeric latency and reconciliation SLOs are included, and issue
[#18](https://github.com/xpelch/gossip/issues/18) is closed with the complete
production evidence.
