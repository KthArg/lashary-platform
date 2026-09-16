// Imágenes del CMS (docs/contracts/cms-api.md § Formas de valor): en despliegue son de Vercel
// Blob; en desarrollo uno-cms las sirve desde su propio origen (/api/media/local/…).
function cmsImagePatterns() {
  const patterns = [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }]
  try {
    const cms = new URL(process.env.CMS_URL ?? '')
    patterns.push({
      protocol: cms.protocol.replace(':', ''),
      hostname: cms.hostname,
      ...(cms.port ? { port: cms.port } : {}),
      pathname: '/api/media/**',
    })
  } catch {
    // Sin CMS_URL válida la landing sirve el respaldo, que no tiene imágenes.
  }
  return patterns
}

// Next bloquea por SSRF las imágenes de IPs privadas. Un uno-cms local (localhost) lo es, así que
// solo en `next dev` y solo si CMS_URL apunta a loopback se permite. Nunca en producción.
function allowLocalCmsImages() {
  if (process.env.NODE_ENV !== 'development') return false
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.CMS_URL ?? '').hostname)
  } catch {
    return false
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // El repo ya tiene su manual de agentes en .agents/AGENTS.md; no generamos otro en la raíz.
  agentRules: false,
  images: {
    remotePatterns: cmsImagePatterns(),
    dangerouslyAllowLocalIP: allowLocalCmsImages(),
  },
}

module.exports = nextConfig
