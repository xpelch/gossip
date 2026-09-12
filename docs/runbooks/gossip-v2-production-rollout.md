# Gossip v2 production rollout

This runbook turns the locally proven Gossip v2 stack into a production
candidate without promoting unverified capabilities. It applies to the existing
Railway `Sherwood / production` environment and its `engine` service.

## Known production state

The current known Sherwood production source is `main` at commit
`d71207e96c21a28c1487436eff665ed14dc0a64b`. The deployment is healthy:
`/health` returns HTTP 200, unauthenticated `POST /mcp` returns HTTP 401, and
anonymous `GET /v2/gossip/capabilities` returns HTTP 401 because the v2 route is
protected.

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
synthetic signing keys. The package provenance workflow is artifact-only; tag,
package, and endpoint publication remain explicit later actions after
acceptance.

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
Sherwood__GossipV2__ReceiptSigningKeyFile=<absolute-protected-runtime-path>
Sherwood__GossipV2__ReceiptSigningKeyId=<approved-production-key-id>
Sherwood__GossipV2__ConsultationEnabled=true
Sherwood__GossipV2__IdentitySessionEnabled=true
Sherwood__GossipV2__ConsultationAcceptanceVerified=false
Sherwood__GossipV2__IdentitySessionAcceptanceVerified=false
```

The receipt key file must contain exactly one lowercase 32-byte secp256k1 scalar
encoded as 64 hexadecimal characters. Provision it through the approved
Railway secret-file procedure with access limited to the engine process. The
repository, deployment logs, acceptance artifacts, and agent prompts must never
contain the scalar. The current engine service has no mounted volume, so the
operator must establish a durable protected-file delivery and rotation method
before enabling receipt signing.

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
