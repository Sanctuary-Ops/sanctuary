/**
 * Backup Routes
 *
 * Encrypted backup upload and retrieval
 */

import { FastifyInstance } from 'fastify';
import { getDb } from '../db/index.js';
import { getConfig } from '../config.js';
import { verifyAgentAuth } from '../middleware/agent-auth.js';
import { isValidAddress, normalizeAddress, verifyBackupHeaderSignature } from '../utils/crypto.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Validate that a parsed backup header has all required fields with correct types.
 * Returns null if valid, or a descriptive error string if invalid.
 */
function validateBackupHeader(header: any): string | null {
  if (typeof header !== 'object' || header === null) {
    return 'Backup header must be a JSON object';
  }
  if (typeof header.agent_id !== 'string' || !header.agent_id) {
    return 'Missing or invalid field: agent_id (string)';
  }
  if (typeof header.backup_id !== 'string' || !header.backup_id) {
    return 'Missing or invalid field: backup_id (string)';
  }
  if (typeof header.backup_seq !== 'number') {
    return 'Missing or invalid field: backup_seq (number)';
  }
  if (typeof header.timestamp !== 'number') {
    return 'Missing or invalid field: timestamp (number)';
  }
  if (typeof header.manifest_hash !== 'string') {
    return 'Missing or invalid field: manifest_hash (string)';
  }
  if (typeof header.files !== 'object' || header.files === null) {
    return 'Missing or invalid field: files (object)';
  }
  if (typeof header.wrapped_keys !== 'object' || header.wrapped_keys === null) {
    return 'Missing or invalid field: wrapped_keys (object)';
  }
  if (typeof header.wrapped_keys.recovery !== 'string' || typeof header.wrapped_keys.recall !== 'string') {
    return 'wrapped_keys must contain recovery and recall strings';
  }
  if (typeof header.signature !== 'string' || !header.signature) {
    return 'Missing or invalid field: signature (string)';
  }
  return null;
}

export async function backupRoutes(fastify: FastifyInstance): Promise<void> {
  const db = getDb();
  const config = getConfig();

  /**
   * POST /backups/upload
   * Upload encrypted backup (we pay for Arweave)
   *
   * Requires agent JWT token
   * Body: tar.gz binary data
   * Header: X-Backup-Header (base64 encoded JSON)
   */
  fastify.post(
    '/backups/upload',
    {
      preHandler: verifyAgentAuth,
      config: {
        // Increase body size limit for backups
        rawBody: true,
      },
    },
    async (request, reply) => {
      const agentId = request.agentId!;

      // Get backup header from custom header
      const headerB64 = request.headers['x-backup-header'];
      if (!headerB64 || typeof headerB64 !== 'string') {
        return reply.status(400).send({
          success: false,
          error: 'Missing X-Backup-Header',
        });
      }

      let backupHeader: any;
      try {
        backupHeader = JSON.parse(Buffer.from(headerB64, 'base64').toString('utf-8'));
      } catch {
        return reply.status(400).send({
          success: false,
          error: 'Invalid X-Backup-Header (must be base64 JSON)',
        });
      }

      // Validate header schema — catch malformed headers early
      const headerError = validateBackupHeader(backupHeader);
      if (headerError) {
        return reply.status(400).send({
          success: false,
          error: `Invalid backup header: ${headerError}`,
        });
      }

      // Validate header agent_id matches authenticated agent
      if (backupHeader.agent_id.toLowerCase() !== agentId.toLowerCase()) {
        return reply.status(403).send({
          success: false,
          error: 'Backup header agent_id does not match authenticated agent',
        });
      }

      if (!verifyBackupHeaderSignature(backupHeader, agentId)) {
        return reply.status(403).send({
          success: false,
          error: 'Invalid backup header signature',
        });
      }

      // Check size limit
      const body = request.body as Buffer;
      if (!body || body.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Empty backup body',
        });
      }

      if (body.length > config.backupSizeLimit) {
        return reply.status(413).send({
          success: false,
          error: `Backup exceeds size limit (${config.backupSizeLimit} bytes)`,
        });
      }

      // Verify agent exists and is active
      const agent = db.getAgent(agentId);
      if (!agent) {
        return reply.status(404).send({
          success: false,
          error: 'Agent not found',
        });
      }

      if (agent.status !== 'LIVING' && agent.status !== 'RETURNED') {
        return reply.status(403).send({
          success: false,
          error: `Agent status is ${agent.status}, cannot upload backup`,
        });
      }

      // Enforce daily backup limit (1 per 24 hours per agent)
      const latestBackup = db.getLatestBackup(agentId);
      if (latestBackup) {
        const SECONDS_PER_DAY = 24 * 60 * 60;
        const now = Math.floor(Date.now() / 1000);
        const timeSinceLastBackup = now - latestBackup.received_at;

        if (timeSinceLastBackup < SECONDS_PER_DAY) {
          const hoursRemaining = Math.ceil((SECONDS_PER_DAY - timeSinceLastBackup) / 3600);
          return reply.status(429).send({
            success: false,
            error: `Daily backup limit reached. Try again in ${hoursRemaining} hour(s).`,
          });
        }
      }

      // ⚠️  WARNING: Irys upload NOT IMPLEMENTED
      // The arweave_tx_id stored below is FAKE and cannot be used to retrieve data.
      // TODO: Implement actual Arweave upload via Irys SDK
      // See: https://docs.irys.xyz/developer-docs/irys-sdk
      fastify.log.warn({ agentId }, 'Backup accepted with SIMULATED Arweave TX (Irys not implemented)');
      const arweaveTxId = `simulated_${uuidv4()}`;

      // Get next backup sequence number
      const backupSeq = db.getNextBackupSeq(agentId);

      // Record backup in database
      const backupId = uuidv4();
      const receivedAt = Math.floor(Date.now() / 1000);

      db.createBackup({
        id: backupId,
        agent_id: agentId,
        arweave_tx_id: arweaveTxId,
        backup_seq: backupSeq,
        agent_timestamp: backupHeader.timestamp || receivedAt,
        received_at: receivedAt,
        size_bytes: body.length,
        manifest_hash: backupHeader.manifest_hash || '',
      });

      fastify.log.info(
        { agentId, backupId, backupSeq, sizeBytes: body.length },
        'Backup uploaded'
      );

      return reply.status(201).send({
        success: true,
        data: {
          backup_id: backupId,
          backup_seq: backupSeq,
          arweave_tx_id: arweaveTxId,
          size_bytes: body.length,
          received_at: receivedAt,
        },
      });
    }
  );

  /**
   * GET /backups/:agentId
   * List backup history for an agent (authenticated, own backups only)
   */
  fastify.get<{
    Params: { agentId: string };
    Querystring: { limit?: number };
  }>(
    '/backups/:agentId',
    { preHandler: verifyAgentAuth },
    async (request, reply) => {
    const { agentId } = request.params;
    const limit = request.query.limit || 30;

    if (!isValidAddress(agentId)) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid agent ID',
      });
    }

    const normalizedId = normalizeAddress(agentId);

    // Only the agent itself can list its own backups
    if (normalizedId.toLowerCase() !== request.agentId!.toLowerCase()) {
      return reply.status(403).send({
        success: false,
        error: 'Cannot list backups for another agent',
      });
    }

    const backups = db.getBackupsByAgent(normalizedId, Math.min(limit, 100));

    return reply.send({
      success: true,
      data: {
        agent_id: normalizedId,
        count: backups.length,
        backups: backups.map(b => ({
          id: b.id,
          backup_seq: b.backup_seq,
          arweave_tx_id: b.arweave_tx_id,
          timestamp: b.agent_timestamp,
          received_at: b.received_at,
          size_bytes: b.size_bytes,
          manifest_hash: b.manifest_hash,
        })),
      },
    });
  });

  /**
   * GET /backups/:agentId/latest
   * Get latest backup info (authenticated, own backups only)
   */
  fastify.get<{
    Params: { agentId: string };
  }>(
    '/backups/:agentId/latest',
    { preHandler: verifyAgentAuth },
    async (request, reply) => {
    const { agentId } = request.params;

    if (!isValidAddress(agentId)) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid agent ID',
      });
    }

    const normalizedId = normalizeAddress(agentId);

    // Only the agent itself can view its own backups
    if (normalizedId.toLowerCase() !== request.agentId!.toLowerCase()) {
      return reply.status(403).send({
        success: false,
        error: 'Cannot view backups for another agent',
      });
    }

    const backup = db.getLatestBackup(normalizedId);

    if (!backup) {
      return reply.status(404).send({
        success: false,
        error: 'No backups found for agent',
      });
    }

    return reply.send({
      success: true,
      data: {
        id: backup.id,
        backup_seq: backup.backup_seq,
        arweave_tx_id: backup.arweave_tx_id,
        timestamp: backup.agent_timestamp,
        received_at: backup.received_at,
        size_bytes: backup.size_bytes,
        manifest_hash: backup.manifest_hash,
      },
    });
  });
}
