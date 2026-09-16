/** @type {import('next').NextConfig} */
const nextConfig = {
  // El repo ya tiene su manual de agentes en .agents/AGENTS.md; no generamos otro en la raíz.
  agentRules: false,
}

module.exports = nextConfig
