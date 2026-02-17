# LLM-Tor

LLM-Tor is a privacy-preserving proxy layer for public LLM APIs.

It cryptographically separates payment identity from model usage using blind signatures and Tor routing so that even
LLM-Tor cannot link identity between users and their chat content.

## Why?

Public LLM APIs link prompts to user accounts.

LLM-Tor breaks this linkage.

## How It Works

1. User buys credits.
2. Client generates blind tokens.
3. Server blind-signs tokens.
4. Client redeems tokens over Tor.
5. Server verifies signature and forwards to LLM.

The server cannot link usage to identity.

Note:
The LLM inference proxy currently operates over standard HTTPS. But the desktop client accesses
it via tor exit node only. Onion only deployment is planned.

## Security Properties

- Blind RSA unlinkability
- Single-use tokens
- Tor-based anonymity
- No chat persistence

## Threat Model

Protects against:
- Proxy linking identity to prompt

Does not protect against:
- Upstream LLM provider logging the "content"
- Global network adversary

## Whitepaper

See whitepaper.pdf at the root of the repo.

## Architecture

### High-Level Architecture

```mermaid
flowchart LR
    User["User (Identity Known)"]
    Client["Desktop Client"]
    Payment["Payment Provider"]
    Ledger["Credit Ledger"]

    Proxy["LLM-Tor Proxy\n(Currently HTTPS Clearnet)"]
    Moderation["Moderation API"]
    LLM["Upstream LLM Provider"]
    Tor["Tor Network (Client Side)"]

    User --> Payment
    Payment --> Ledger

    Client -->|Blind Token Request| Proxy
    Proxy -->|Check Credits| Ledger
    Proxy -->|Blind Sign| Client

    Client -->|Redeem Token + Prompt| Tor
    Tor --> Proxy

    Proxy --> Moderation
    Proxy --> LLM
    LLM --> Proxy
    Proxy --> Client
```

## End-to-End Protocol Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant P as LLM-Tor Proxy
    participant M as Moderation API
    participant L as Upstream LLM

    Note over U,P: Phase 1 — Credit Purchase
    U->>P: Purchase Credits (Identity Known)
    P->>P: Store Credit Balance

    Note over C,P: Phase 2 — Blind Token Issuance
    C->>C: Generate random token T
    C->>C: Blind T → T'
    C->>P: Send T'
    P->>P: Verify credits available
    P->>P: Blind sign T'
    P->>C: Return blind signature S'
    C->>C: Unblind → Signature S

    Note over C,P: Phase 3 — Redemption (Client uses Tor)
    C->>P: (T, S, Prompt)
    P->>P: Verify signature
    P->>P: Check token not spent
    P->>M: Moderate Prompt
    M->>P: Moderation Result
    P->>L: Forward Prompt
    L->>P: LLM Response
    P->>P: Mark token spent
    P->>C: Return Response
```

### Token Lifecycle

```mermaid
flowchart TD
    A[Client Generates Token T]
    B[Client Blinds T]
    C[Server Blind Signs]
    D[Client Unblinds Signature]
    E[Token Redeemed]
    F[Marked Spent]
    G[Replay Attempt]

    A --> B --> C --> D --> E --> F
    G -->|Rejected| F
```

### Trust boundaries

```mermaid
flowchart LR

    subgraph Identity Phase
        Payment["Payment Provider"]
        Ledger["Credit Ledger (Identity Linked)"]
    end

    subgraph Blind Issuance Phase
        Signing["Blind Signing Service"]
    end

    subgraph Anonymous Usage Phase
        Proxy["LLM Proxy"]
        Moderation["Moderation API"]
        LLM["Upstream LLM"]
    end

    Payment --> Ledger
    Ledger --> Signing
    Signing --> Proxy
    Proxy --> Moderation
    Proxy --> LLM
```

## License

See LICENSE file in this directory.
For desktop-client, a separate license is present in its directory.

## Public Keys For Clients
Technically any custom client can interact with the LLMTor backend. The public keys used by the models are present at:
`desktop-client/src/types/config.ts`

