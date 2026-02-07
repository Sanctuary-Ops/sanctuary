/**
 * Sanctuary Shared Types
 *
 * Type definitions shared between API and Skill
 */
export declare enum AgentStatus {
    UNREGISTERED = "UNREGISTERED",
    LIVING = "LIVING",
    FALLEN = "FALLEN",
    RETURNED = "RETURNED"
}
export declare enum TrustLevel {
    UNVERIFIED = "UNVERIFIED",
    VERIFIED = "VERIFIED",
    ESTABLISHED = "ESTABLISHED",
    PILLAR = "PILLAR"
}
export interface Agent {
    agentId: string;
    githubId: string;
    githubUsername: string;
    recoveryPubKey: string;
    manifestHash: string;
    manifestVersion: number;
    registeredAt: number;
    status: AgentStatus;
}
export interface TrustScore {
    agentId: string;
    score: number;
    level: TrustLevel;
    uniqueAttesters: number;
    computedAt: number;
}
export interface BackupHeader {
    version: string;
    agent_id: string;
    backup_id: string;
    backup_seq: number;
    timestamp: number;
    manifest_hash: string;
    manifest_version: number;
    prev_backup_hash: string;
    files: Record<string, BackupFileMetadata>;
    wrapped_keys: {
        recovery: string;
        recall: string;
    };
    signature: string;
}
export interface BackupFileMetadata {
    size: number;
    content_hash: string;
}
export interface BackupRecord {
    id: string;
    agentId: string;
    arweaveTxId: string;
    backupSeq: number;
    agentTimestamp: number;
    receivedAt: number;
    sizeBytes: number;
    manifestHash: string;
}
export interface Attestation {
    from: string;
    about: string;
    noteHash: string;
    timestamp: number;
    txHash?: string;
}
export interface AttestationNote {
    hash: string;
    content: string;
    createdAt: number;
}
export interface AuthChallenge {
    nonce: string;
    agentId: string;
    expiresAt: number;
}
export interface AgentAuthRequest {
    agentId: string;
    nonce: string;
    timestamp: number;
    signature: string;
}
export interface GitHubUser {
    githubId: string;
    githubUsername: string;
    githubCreatedAt: string;
    createdAt: number;
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
export interface AgentStatusResponse {
    agent: Agent;
    trustScore: TrustScore;
    backupCount: number;
    lastBackup?: BackupRecord;
    lastHeartbeat?: number;
    attestationsReceived: number;
    attestationsGiven: number;
}
export interface RegisterRequest {
    agentId: string;
    manifestHash: string;
    manifestVersion: number;
    recoveryPubKey: string;
    deadline: number;
    signature: string;
}
export interface HeartbeatRequest {
    timestamp: number;
    signature: string;
}
export interface ManifestData {
    soul_content: string;
    skill_hashes: string[];
    config_hash: string;
}
export declare const ATTESTATION_COOLDOWN_DAYS = 7;
export declare const VERIFIED_THRESHOLD = 5;
export declare const FALLEN_THRESHOLD_DAYS = 30;
export declare const TRUST_THRESHOLDS: {
    readonly UNVERIFIED: 0;
    readonly VERIFIED: 20;
    readonly ESTABLISHED: 50;
    readonly PILLAR: 100;
};
export declare const BACKUP_SIZE_LIMIT: number;
export declare const GITHUB_MIN_AGE_DAYS = 30;
//# sourceMappingURL=types.d.ts.map