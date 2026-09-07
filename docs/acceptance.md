# Spec 1 acceptance status

This preview is partial implementation, not release acceptance.

## Implemented locally

- Protected EOA creation/reuse and encrypted JSON import/backup with address preservation; Windows DPAPI round trip.
- Four-tool MCP bridge, exact legacy signing, ERC-8128 client profile, strict endpoint binding and no redirects.
- Submission-kind permission and conservative SQLite reservations shared by processes using one state directory.
- Additive host config editing, conflict protection, explicit removal and local disconnect.
- EIP-55 vectors, ERC-8004 metadata/read validation and AgentWalletSet typed-data preparation, actual local ERC-1271 contract fixture.
- Checksum-verified local artifact installer; package build and isolated process tests.

## Required before closing #1

- Public endpoint plus actual version-pinned Grok Bot, Hermes and OpenClaw end-to-end runs. Config-shape tests are not host runs.
- Engine support and actual access interoperability for ERC-8128, existing ERC-1271 accounts and atomic standard-only consultation policy. Engine changes are outside this repository's authorization.
- Connect-existing-signer and complete contract-wallet onboarding, profile migration/rollback and paired create/migrate acceptance for all six standards. Library helpers alone do not meet this requirement.
- Full installer diagnostics and a trusted release distribution/provenance workflow; external signer and derivation format compatibility matrix.
- Real Linux protected-storage validation. macOS is unsupported.
- Full installed-process-to-engine acceptance for domain calls, TLS rejection, expiry boundaries, and retry reconciliation. The current engine harness proves legacy authentication through real middleware/MCP/PostgreSQL, not the full CLI flow.

No production wallet, onchain transaction, registration, endpoint deployment or package publication is part of these checks. No universal Ethereum compliance is claimed.
