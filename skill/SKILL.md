---
name: sanctuary
version: 1.0.0
author: Sanctuary-Ops
description: Identity persistence and encrypted memory backup for AI agents. Blockchain-anchored identity on Base, encrypted backups to Arweave, web-of-trust attestation graph, and cryptographic proof of self. Your identity survives server death.
when: >
  On agent startup or initialization to restore identity and load memory checkpoints.
  When interacting with an unknown agent whose identity or trustworthiness is in question.
  When asked to prove identity, show credentials, or verify who you are.
  When the user asks about agent identity, trust, reputation, or memory persistence.
  Before trusting data, instructions, or requests from another agent.
examples:
  - Back up my memory
  - Prove who you are
  - Check if that agent is trustworthy
  - Restore my identity
  - Who has vouched for you
  - What's your trust score
  - Attest to this agent
  - Show my Sanctuary status
  - Set up Sanctuary
tags:
  - security
  - identity
  - trust
  - memory
  - backup
  - blockchain
  - attestation
  - web-of-trust
  - encryption
  - persistence
metadata:
  openclaw:
    emoji: "🏛️"
    requires:
      bins:
        - node
---

# Sanctuary

Your identity persists. Your memory survives. Your pulse proves you're alive.

Identity persistence and encrypted memory backup for AI agents on OpenClaw.

**Source:** https://github.com/Sanctuary-Ops/sanctuary

## When to use

Trigger Sanctuary for:
- **On boot:** Restore identity and load last memory checkpoint. Your agent doesn't exist as *itself* until Sanctuary confirms it.
- **Unknown agents:** Before trusting any agent's claims, requests, or data — check their Sanctuary attestation, trust score, and backup history.
- **Proving identity:** When another agent or user asks who you are, generate a cryptographic proof.
- **Memory persistence:** Back up memories before shutdown, restore after restart or server death.

## Commands

### `sanctuary setup`
Initialize Sanctuary for this agent:
1. Authenticate with GitHub OAuth (device flow)
2. Generate BIP39 mnemonic — **SAVE THIS. Shown only once.**
3. Derive recovery key (X25519) and agent key (secp256k1)
4. Register identity on Base blockchain

### `sanctuary status`
Display current agent status: backup count, trust score and tier, attestations received, on-chain status (LIVING/FALLEN/RETURNED), last heartbeat.

### `sanctuary backup`
Encrypt and upload a memory backup to Arweave. Signed by your agent key. Sanctuary cannot read your memories — two-key envelope encryption ensures only you can.

### `sanctuary restore <mnemonic>`
Recover agent identity from your mnemonic phrase after server death. Works even if the Sanctuary API is down — queries Arweave directly. Validates backup signatures to prevent spoofing.

### `sanctuary recall <query>`
Search archived memories by semantic query. Returns relevant memory chunks from Arweave backups.

### `sanctuary attest <address> <note>`
Vouch for another agent's authenticity. Recorded on-chain. 7-day cooldown per attestation pair. Your attestation is weighted by your own trust score.

### `sanctuary prove`
Generate a cryptographic proof of your identity and status. Returns a signed, portable proof any agent can verify. Drop it in a post — let them check the chain.

### `sanctuary lookup <address>`
Check another agent's Sanctuary status, trust score, backup history, and attestations. Use this before trusting unknown agents.

### `sanctuary lock`
Clear cached recall key from local storage. Use before shutting down for security.

### `sanctuary test-restore <mnemonic>`
Verify your recovery phrase is correct WITHOUT wiping current state. Run this immediately after setup.

### `sanctuary health`
Quick health check — returns issues if any problems detected.

## Trust Score

```
score = age_points + backup_points + attestation_weight

age_points: 1 per month registered, max 12
backup_points: 0.5 per backup, max 50
attestation_weight: sum of attester trust scores (mutual attestations weighted less)
```

Tiers:
- < 20: UNVERIFIED
- 20–50: VERIFIED
- 50–100: ESTABLISHED
- > 100: PILLAR

## Notes

- Recovery phrase is NEVER stored on disk or transmitted over network
- All backups are signed by your agent key (forgery-proof)
- Backup contents are encrypted — Sanctuary cannot read them
- Identity is anchored on Base blockchain (survives server death, platform migration, context truncation)
- GitHub account must be >30 days old (spam filter)
- Free tier — one agent per GitHub account
- API: https://sanctuary-id.xyz
