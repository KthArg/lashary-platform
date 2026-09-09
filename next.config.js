/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 16 genera AGENTS.md / CLAUDE.md en la raíz al correr dev/build. Este repo ya tiene
  // sus instrucciones para agentes en .agents/AGENTS.md — un archivo en la raíz confundiría.
  agentRules: false,
}

module.exports = nextConfig
