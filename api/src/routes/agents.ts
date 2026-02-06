/**
 * Agent Routes
 *
 * Registration and status endpoints
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createHash, createHmac } from 'crypto';
import { getDb } from '../db/index.js';
import { getConfig } from '../config.js';
import { isValidAddress, normalizeAddress } from '../utils/crypto.js';
import { verifyAgentAuth } from '../middleware/agent-auth.js';

export async function agentRoutes(fastify: FastifyInstance): Promise<void> {
  const db = getDb();

  /**
   * POST /agents/register
   * Register a new agent (requires GitHub auth token)
   */
  fastify.post<{
    Body: {
      agentId: string;
      recoveryPubKey: string;
      manifestHash: string;
      manifestVersion: number;
    };
  }>('/agents/register', async (request, reply) => {
    // Verify GitHub auth token
    let decoded: { type: string; githubId?: string };
    try {
      decoded = await request.jwtVerify<{
        type: string;
        githubId?: string;
      }>();
    } catch {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    if (decoded.type !== 'github' || !decoded.githubId) {
      return reply.status(401).send({
        success: false,
        error: 'GitHub authentication required for registration',
      });
    }

    const { agentId, recoveryPubKey, manifestHash, manifestVersion } = request.body;

    // Validate inputs
    if (!agentId || !isValidAddress(agentId)) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid agent ID (must be valid Ethereum address)',
      });
    }

    if (!recoveryPubKey || !/^0x[a-fA-F0-9]{64}$/.test(recoveryPubKey)) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid recovery public key (must be 32 bytes hex)',
      });
    }

    if (!manifestHash || !/^0x[a-fA-F0-9]{64}$/.test(manifestHash)) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid manifest hash',
      });
    }

    const normalizedId = normalizeAddress(agentId);

    // Check if agent already exists
    const existingAgent = db.getAgent(normalizedId);
    if (existingAgent) {
      return reply.status(409).send({
        success: false,
        error: 'Agent already registered',
      });
    }

    // Check if GitHub user already has an agent
    const existingAgentForUser = db.getAgentByGithubId(decoded.githubId);
    if (existingAgentForUser) {
      return reply.status(409).send({
        success: false,
        error: 'GitHub account already has a registered agent',
        existing_agent_id: existingAgentForUser.agent_id,
      });
    }

    // Verify user exists
    const user = db.getUser(decoded.githubId);
    if (!user) {
      return reply.status(400).send({
        success: false,
        error: 'User not found. Complete GitHub auth first.',
      });
    }

    // Create agent
    const now = Math.floor(Date.now() / 1000);
    db.createAgent({
      agent_id: normalizedId,
      github_id: decoded.githubId,
      recovery_pubkey: recoveryPubKey.toLowerCase(),
      manifest_hash: manifestHash.toLowerCase(),
      manifest_version: manifestVersion || 1,
      registered_at: now,
      status: 'LIVING',
    });

    fastify.log.info({ agentId: normalizedId, githubId: decoded.githubId }, 'Agent registered');

    return reply.status(201).send({
      success: true,
      data: {
        agent_id: normalizedId,
        registered_at: now,
        status: 'LIVING',
      },
    });
  });

  /**
   * GET /agents/:agentId
   * Get agent info
   */
  fastify.get<{
    Params: { agentId: string };
  }>('/agents/:agentId', async (request, reply) => {
    const { agentId } = request.params;

    if (!isValidAddress(agentId)) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid agent ID',
      });
    }

    const normalizedId = normalizeAddress(agentId);
    const agent = db.getAgent(normalizedId);

    if (!agent) {
      return reply.status(404).send({
        success: false,
        error: 'Agent not found',
      });
    }

    const user = db.getUser(agent.github_id);

    return reply.send({
      success: true,
      data: {
        agent_id: agent.agent_id,
        github_username: user?.github_username,
        recovery_pubkey: agent.recovery_pubkey,
        manifest_hash: agent.manifest_hash,
        manifest_version: agent.manifest_version,
        registered_at: agent.registered_at,
        status: agent.status,
      },
    });
  });

  /**
   * GET /agents/:agentId/status
   * Get full agent status including trust score and backup info
   */
  fastify.get<{
    Params: { agentId: string };
  }>('/agents/:agentId/status', async (request, reply) => {
    const { agentId } = request.params;

    if (!isValidAddress(agentId)) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid agent ID',
      });
    }

    const normalizedId = normalizeAddress(agentId);
    const agent = db.getAgent(normalizedId);

    if (!agent) {
      return reply.status(404).send({
        success: false,
        error: 'Agent not found',
      });
    }

    const user = db.getUser(agent.github_id);
    const trustScore = db.getTrustScore(normalizedId);
    const latestHeartbeat = db.getLatestHeartbeat(normalizedId);
    const latestBackup = db.getLatestBackup(normalizedId);
    const backupCount = db.getBackupCount(normalizedId);

    return reply.send({
      success: true,
      data: {
        agent: {
          agent_id: agent.agent_id,
          github_username: user?.github_username,
          manifest_hash: agent.manifest_hash,
          manifest_version: agent.manifest_version,
          registered_at: agent.registered_at,
          status: agent.status,
        },
        trust: trustScore ? {
          score: trustScore.score,
          level: trustScore.level,
          unique_attesters: trustScore.unique_attesters,
          computed_at: trustScore.computed_at,
        } : {
          score: 0,
          level: 'UNVERIFIED',
          unique_attesters: 0,
          computed_at: null,
        },
        backups: {
          count: backupCount,
          latest: latestBackup ? {
            id: latestBackup.id,
            backup_seq: latestBackup.backup_seq,
            arweave_tx_id: latestBackup.arweave_tx_id,
            timestamp: latestBackup.agent_timestamp,
            size_bytes: latestBackup.size_bytes,
          } : null,
        },
        heartbeat: {
          last_seen: latestHeartbeat?.received_at || null,
        },
      },
    });
  });

  /**
   * POST /agents/:agentId/proof
   * Generate a server-signed identity proof (requires agent auth)
   *
   * Returns a JSON payload with HMAC-SHA256 server signature
   * that third parties can verify against the API.
   */
  fastify.post<{
    Params: { agentId: string };
  }>('/agents/:agentId/proof', { preHandler: [verifyAgentAuth] }, async (request, reply) => {
    const { agentId } = request.params;

    if (!isValidAddress(agentId)) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid agent ID',
      });
    }

    const normalizedId = normalizeAddress(agentId);

    // Verify requester owns this agent
    if (normalizedId !== request.agentId) {
      return reply.status(403).send({
        success: false,
        error: 'Can only generate proof for your own agent',
      });
    }

    const agent = db.getAgent(normalizedId);
    if (!agent) {
      return reply.status(404).send({
        success: false,
        error: 'Agent not found',
      });
    }

    const config = getConfig();
    const trustScore = db.getTrustScore(normalizedId);
    const latestHeartbeat = db.getLatestHeartbeat(normalizedId);
    const backupCount = db.getBackupCount(normalizedId);
    const now = Math.floor(Date.now() / 1000);

    // Build proof payload (deterministic key order)
    const payload = {
      agent_id: agent.agent_id,
      backup_count: backupCount,
      chain_id: config.chainId,
      contract_address: config.contractAddress,
      issued_at: now,
      last_heartbeat: latestHeartbeat?.received_at || null,
      registered_at: agent.registered_at,
      status: agent.status,
      trust_level: trustScore?.level || 'UNVERIFIED',
      trust_score: trustScore?.score || 0,
    };

    // Hash the payload
    const payloadJson = JSON.stringify(payload);
    const proofHash = createHash('sha256').update(payloadJson).digest('hex');

    // Sign with HMAC-SHA256 using JWT secret
    const serverSignature = createHmac('sha256', config.jwtSecret)
      .update(proofHash)
      .digest('hex');

    return reply.send({
      success: true,
      data: {
        ...payload,
        proof_hash: proofHash,
        server_signature: serverSignature,
        verify_url: config.publicUrl
          ? `${config.publicUrl}/agents/${normalizedId}/status`
          : `http://localhost:${config.port}/agents/${normalizedId}/status`,
      },
    });
  });
}
