// Shared config for Electron main and renderer
export const SERVER_URL = 'http://localhost:8080' // Update as needed

const gemini25FlashPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAltEfFcuqWqCzIWo1KoBw
7CkuhN+0H6mkryHtXsxpf65wAJEF2WtYFSFcV1fkAlS8NaSszYJWf7NAQNta91nX
NqZUgj2/sGANpnIaCjjPZvu5cWNJdExj76lvRXbNGdJZE6elWIpoASqVkOHitkiC
NvBwetIXK2mTDt1mZjghTBpRDL55CO9OZibaUu5O4Ne2jJbuXDQXUa0ILKvJv/P/
u/tOsYmsQMcLI0Kr0PH7sG811PDVj3bhjVPTYIGulWVPEuiZ9bCLl17LtvZvuP5b
c6FMS+X3zFNcYkytaUhtqN9wTLYi50T5rtEOA+r1y3Hl6uzqNw/+1zBQA89FjtP5
bwIDAQAB
-----END PUBLIC KEY-----`

const gemini25ProPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAltEfFcuqWqCzIWo1KoBw
7CkuhN+0H6mkryHtXsxpf65wAJEF2WtYFSFcV1fkAlS8NaSszYJWf7NAQNta91nX
NqZUgj2/sGANpnIaCjjPZvu5cWNJdExj76lvRXbNGdJZE6elWIpoASqVkOHitkiC
NvBwetIXK2mTDt1mZjghTBpRDL55CO9OZibaUu5O4Ne2jJbuXDQXUa0ILKvJv/P/
u/tOsYmsQMcLI0Kr0PH7sG811PDVj3bhjVPTYIGulWVPEuiZ9bCLl17LtvZvuP5b
c6FMS+X3zFNcYkytaUhtqN9wTLYi50T5rtEOA+r1y3Hl6uzqNw/+1zBQA89FjtP5
bwIDAQAB
-----END PUBLIC KEY-----`

export const RSAKeys = {
  'gemini-2.5-flash': gemini25FlashPublicKey,
  'gemini-2.5-pro': gemini25ProPublicKey
}
