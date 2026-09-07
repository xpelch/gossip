# Gossip agent instructions

Read README.md, CONTEXT.md and relevant architecture decisions before work.

Use GitHub Issues on xpelch/gossip through gh. Specifications use ready-for-agent. The triage vocabulary is needs-triage, needs-info, ready-for-agent, ready-for-human and wontfix. Read dependencies; ready-for-agent does not mean external dependencies are delivered.

Gossip is the public product; Sherwood is the engine. Preserve exact authentication identifiers. Follow the approved spec; do not improvise cryptography, credential fallbacks, spending permissions or host compatibility.

Test external behavior at the kit process/MCP-to-engine boundary with synthetic identities and real verifier integration. Document unsupported environments. Installation alone does not establish a working connection.

## Agent skills

### Issue tracker

GitHub Issues on xpelch/gossip, operated through gh. See docs/agents/issue-tracker.md.

### Triage labels

Default vocabulary: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See docs/agents/triage-labels.md.

### Domain docs

Single-context: CONTEXT.md and docs/adr/ at the repository root. See docs/agents/domain.md.
