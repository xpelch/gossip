# Gossip

Open-source agent tools for onchain intelligence and private contributions, powered by Sherwood.

## Status

Design and specification stage. No installable Agent Kit release or public Gossip endpoint is available yet.

The first deliverable is Gossip Agent Kit: a setup skill and executable wallet/signing toolkit for Grok Bot, Hermes and OpenClaw. It will create or reuse a user-controlled identity wallet, expose Gossip tools and verify the connection.

- [Agent Kit v1 specification](https://github.com/xpelch/gossip/issues/1)
- [Domain glossary](CONTEXT.md)
- [Approved design decisions](docs/adr/0001-agent-kit-boundaries.md)

V1 excludes funding, arbitrary signing and transactions. Implementation and host compatibility remain to be verified.

## Contributing

Use GitHub Issues for specifications. Read the v1 issue and its compatibility dependencies before implementation. Never put real keys, seed phrases, credentials or private contributions into source, issues or logs.

## License

New content is licensed under Apache-2.0. Third-party material retains its own license; verify provenance before importing engine or dependency code.
