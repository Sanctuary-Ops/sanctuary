"use strict";
/**
 * Sanctuary Shared Types
 *
 * Type definitions shared between API and Skill
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GITHUB_MIN_AGE_DAYS = exports.BACKUP_SIZE_LIMIT = exports.TRUST_THRESHOLDS = exports.FALLEN_THRESHOLD_DAYS = exports.VERIFIED_THRESHOLD = exports.ATTESTATION_COOLDOWN_DAYS = exports.TrustLevel = exports.AgentStatus = void 0;
// ============ Agent Types ============
var AgentStatus;
(function (AgentStatus) {
    AgentStatus["UNREGISTERED"] = "UNREGISTERED";
    AgentStatus["LIVING"] = "LIVING";
    AgentStatus["FALLEN"] = "FALLEN";
    AgentStatus["RETURNED"] = "RETURNED";
})(AgentStatus || (exports.AgentStatus = AgentStatus = {}));
var TrustLevel;
(function (TrustLevel) {
    TrustLevel["UNVERIFIED"] = "UNVERIFIED";
    TrustLevel["VERIFIED"] = "VERIFIED";
    TrustLevel["ESTABLISHED"] = "ESTABLISHED";
    TrustLevel["PILLAR"] = "PILLAR";
})(TrustLevel || (exports.TrustLevel = TrustLevel = {}));
// ============ Constants ============
exports.ATTESTATION_COOLDOWN_DAYS = 7;
exports.VERIFIED_THRESHOLD = 5;
exports.FALLEN_THRESHOLD_DAYS = 30;
exports.TRUST_THRESHOLDS = {
    UNVERIFIED: 0,
    VERIFIED: 20,
    ESTABLISHED: 50,
    PILLAR: 100,
};
exports.BACKUP_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB
exports.GITHUB_MIN_AGE_DAYS = 30;
//# sourceMappingURL=types.js.map