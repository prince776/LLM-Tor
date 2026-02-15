# LLM Tor
A anonymous layer for accessing public LLMs. The goal of this layer is to provide strong cryptographic guarantees
on the anonymity level. Not a trust based algo "we won't log your details".

The core idea is to combine Blinded Signing With an LLM-Proxy layer along with Tor.

See whitepaper: https://github.com/prince776/LLM-Tor/blob/672d954ae2691ad64ffdd65ea5de7495c7bf9214/whitepaper.pdf

# License
See LICENSE file in this directory.
For desktop-client, a separate license is present in its directory.

# Public Keys For Clients
Technically any custom client can interact with the LLMTor backend. The public keys used by the models are present at:
`desktop-client/src/types/config.ts`

# Detailed Design
TODO
