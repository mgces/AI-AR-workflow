import { REQUIREMENT_AGENT } from '../workflows/requirement/agent.js';
import { DELIVERY_AGENT } from '../workflows/ar-delivery/agent.js';

// Registry only. Role descriptions and business instructions belong to workflows/*.
export const DOMAIN_AGENTS = Object.freeze([REQUIREMENT_AGENT, DELIVERY_AGENT]);
export function agentInstructions(agent) { return agent.instructions; }
