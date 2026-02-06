/**
 * Sanctuary Skill Types
 */

// Re-export shared types
export * from '../../shared/types.js';

/**
 * Skill configuration
 */
export interface SkillConfig {
  apiUrl: string;
  chainId: number;
  contractAddress: string;
}

/**
 * Derived keys from mnemonic
 */
export interface DerivedKeys {
  recoverySecret: Uint8Array;
  recoveryPubKey: Uint8Array;
  agentSecret: Uint8Array;
  agentAddress: string;
  recallSecret: Uint8Array;
  recallPubKey: Uint8Array;
}

/**
 * Agent state
 */
export interface AgentState {
  agentId: string;
  agentSecret: Uint8Array;
  recoveryPubKey: Uint8Array;
  manifestHash: string;
  manifestVersion: number;
  registeredAt: number;
}

/**
 * Backup file contents
 */
export interface BackupFiles {
  manifest: string;          // SOUL.md + version info
  memory?: string;           // Agent memory state (JSON)
  entities?: string;         // Entity index (JSON)
  keywords?: string;         // Keyword index (JSON)
  pins?: string;             // Pinned memories (JSON)
  user?: string;             // User-provided context (JSON)
}

/**
 * Recall query result
 */
export interface RecallResult {
  query: string;
  matches: Array<{
    content: string;
    relevance: number;
    source: string;
    timestamp: number;
  }>;
  fromBackupSeq: number;
}

/**
 * Setup result
 */
export interface SetupResult {
  success: boolean;
  agentId?: string;
  recoveryPhrase?: string;   // SHOWN ONCE - user must save!
  error?: string;
}

/**
 * Status result
 */
export interface StatusResult {
  agentId: string;
  status: string;
  trustScore: number;
  trustLevel: string;
  backupCount: number;
  lastBackup?: {
    seq: number;
    timestamp: number;
    arweaveTxId: string;
  };
  lastHeartbeat?: number;
  attestationsReceived: number;
}

/**
 * Backup result
 */
export interface BackupResult {
  success: boolean;
  backupId?: string;
  backupSeq?: number;
  arweaveTxId?: string;
  sizeBytes?: number;
  error?: string;
}

/**
 * Restore result
 */
export interface RestoreResult {
  success: boolean;
  agentId?: string;
  backupsFound?: number;
  latestBackupSeq?: number;
  error?: string;
}

/**
 * Attestation result
 */
export interface AttestResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Lookup result
 */
export interface LookupResult {
  agentId: string;
  exists: boolean;
  status?: string;
  trustScore?: number;
  trustLevel?: string;
  registeredAt?: number;
  attestationCount?: number;
}

/**
 * Identity proof result
 */
export interface ProofResult {
  agentId: string;
  status: string;
  trustScore: number;
  trustLevel: string;
  backupCount: number;
  lastHeartbeat: number | null;
  registeredAt: number;
  chainId: number;
  contractAddress: string;
  issuedAt: number;
  proofHash: string;
  serverSignature: string;
  verifyUrl: string;
}
