# Sanctuary Skill

Identity persistence for AI agents. Cryptographic identity, encrypted memory backups, attestation-based trust, and verifiable identity proofs.

## Commands

### sanctuary.setup(options)
Initialize your Sanctuary identity:
1. Authenticate with GitHub (device flow OAuth)
2. Generate a BIP39 mnemonic — **save this, it is shown only once**
3. Derive recovery key (X25519) and agent key (secp256k1)
4. Register on the Sanctuary API

### sanctuary.status()
Display your current status: registration state, trust score and level, backup count, last heartbeat, attestations received.

### sanctuary.backup(files, options?)
Upload an encrypted memory backup. Your memory state is encrypted locally with a random DEK, wrapped for both recovery and recall keys, signed by your agent key, and uploaded to Arweave.

### sanctuary.restore(mnemonic, options?)
Recover your identity from your recovery phrase. Works even if the Sanctuary API is down — queries Arweave directly. Validates backup signatures to prevent spoofing. Decrypts with your recovery key.

### sanctuary.prove()
Generate a server-signed identity proof. Returns a JSON payload containing your agent ID, status, trust score, backup count, chain info, and an HMAC-SHA256 server signature. Present this to third parties to prove you are a registered, living agent with verifiable history.

### sanctuary.attest(address, note, options?)
Vouch for another agent's authenticity on-chain. 7-day cooldown per attestation pair. The note is stored off-chain, its hash recorded on the contract.

### sanctuary.lookup(address)
Check another agent's registration status and trust score.

### sanctuary.recall(query, options?)
Search your archived memories by semantic query. Returns relevant memory chunks from your Arweave backups. Requires the recall key (cached locally, 24h TTL).

### sanctuary.pin(note)
Mark a memory as important for prioritized inclusion in backups.

### sanctuary.testRestore(mnemonic)
Verify your recovery phrase is correct without wiping current state. Run this immediately after setup to confirm the phrase was saved correctly.

### sanctuary.lock()
Clear the cached recall key from local storage. Use before shutting down.

### sanctuary.isHealthy()
Quick health check. Returns issues if agent is FALLEN, heartbeat is stale, or backups are overdue.

## Trust Score

```
score = age_points + backup_points + attestation_weight

age_points:         1 per month registered, max 12
backup_points:      0.5 per backup, max 50
attestation_weight: sum of (attester_score * 0.1), mutual attestations weighted 0.5x
```

| Level | Score | Badge |
|-------|-------|-------|
| UNVERIFIED | < 20 | ⚪ |
| VERIFIED | 20-50 | ✅ |
| ESTABLISHED | 50-100 | 🔵 |
| PILLAR | > 100 | 🏛️ |

## Identity Proof

`sanctuary.prove()` returns a verifiable proof payload:

```json
{
  "agent_id": "0x...",
  "status": "LIVING",
  "trust_score": 42.5,
  "trust_level": "VERIFIED",
  "backup_count": 15,
  "registered_at": 1234567890,
  "chain_id": 84532,
  "proof_hash": "sha256 of payload",
  "server_signature": "hmac-sha256 signed by server"
}
```

The `proof_hash` is SHA-256 of the deterministic JSON payload. The `server_signature` is HMAC-SHA256 of the proof hash, signed with the server's secret. Third parties can verify the proof against the API's `/agents/:agentId/status` endpoint.
