// Gera anon + service_role JWT assinados com EC key do gotrue (mesma do Supabase local)
const crypto = require('crypto')

const ES256_KEY = {
  d: 'dIhR8wywJlqlua4y_yMq2SLhlFXDZJBCvFrY1DCHyVU',
  x: 'M5Sjqn5zwC9Kl1zVfUUGvv9boQjCGd45G8sdopBExB4',
  y: 'P6IXMvA2WYXSHSOMTBH2jsw_9rrzGy89FjPf6oOsIxQ',
  crv: 'P-256',
}

function sign(role) {
  const header = { alg: 'ES256', kid: 'b81269f1-21d8-4f2e-b719-c2240a840d90', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: 'supabase',
    ref: 'local',
    role,
    iat: now,
    exp: now + 31536000,
    aud: 'authenticated',
  }
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const msg = `${enc(header)}.${enc(payload)}`

  // construir EC key privada a partir de JWK
  const jwk = { ...ES256_KEY, kty: 'EC', use: 'sig', key_ops: ['sign'], alg: 'ES256', ext: true }
  const key = crypto.createPrivateKey({ key: jwk, format: 'jwk' })
  const sig = crypto.sign('SHA256', Buffer.from(msg), { key, dsaEncoding: 'ieee-p1363' })
  return `${msg}.${sig.toString('base64url')}`
}

const fs = require('fs')
const env = `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=${sign('anon')}
SUPABASE_SERVICE_ROLE_KEY=${sign('service_role')}
NEXT_PUBLIC_SITE_URL=http://localhost:3000
`
fs.writeFileSync('/root/salao-pwa/.env.local', env)
console.log('wrote .env.local')
console.log('anon=' + sign('anon').slice(0, 40) + '...')
console.log('service=' + sign('service_role').slice(0, 40) + '...')
