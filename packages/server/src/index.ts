/**
 * @pga-ai/server — PGA Evolution Server
 *
 * Secure Pull/Push API for external agents in any language.
 * PGA never touches LLM traffic — only evolved prompts and metrics flow.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026
 */

export { PGAServer } from './PGAServer.js';
export type { PGAServerConfig, RegisterGenomeOptions, GenomeEntry } from './PGAServer.js';
export { HMACVerifier } from './auth/HMACVerifier.js';
