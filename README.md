#  AtomX Protocol

**AtomX Protocol is a decentralized habit-building platform designed to cure procrastination among Gen-Z by turning daily discipline into a high-stakes, highly rewarding experience.**

Built securely on the lightning-fast Solana blockchain, AtomX solves the common struggle of abandoned commitments by introducing real financial accountability through smart contract staking. In a powerful approach to social impact, forfeited stakes from broken habits are automatically redirected to charitable causes—ensuring that even personal setbacks contribute to the greater good.

Unlike traditional habit trackers that rely on easily faked self-reporting, we innovate with an AI-powered **"Proof-of-Habit"** mechanism, utilizing AI Vision to instantly and accurately evaluate and verify user-submitted visual evidence of completed tasks. Targeted at students and self-improvement enthusiasts, AtomX combines a gamified, friction-free user experience with a sustainable business model driven by automated protocol fees and dynamic reward pools, providing the ultimate infrastructure to help the next generation forge life-changing habits while giving back to society.

---

##  Core Mechanics

### 1. The Commitment Lifecycle
- **Setup:** Define your habit, duration, and target minutes per day.
- **Stake:** Lock USDT into a program-owned escrow.
- **Proof:** Daily visual proof is required. A built-in timer ensures minimum effort is met.
- **AI Validation:** Visual proofs are analyzed by **Groq Vision / Gemini AI** to verify activity relevance and duration.
- **Claim:** Upon completion, retrieve your stake plus a loyalty bonus and a unique **Champion Medal (cNFT)**.

### 2. Slashing & Redistribution
Failures are handled by the protocol's "Never Miss Twice" rule:
- **First Miss:** Partial stake slashing.
- **Second Miss:** Full stake liquidation.
- **Redistribution:** Slashed funds are split between **Charity (35%)**, **Protocol Rewards (30%)**, **Treasury (25%)**, and **Backup (10%)**.

---

##  Architecture (Web 2.5 Hybrid)

AtomX operates on a hybrid model to balance high-performance UI with decentralized security.

- **On-Chain (Solana):** The source of truth for all financial actions. Handles PDAs, escrow vaults, proof hashes, and slashing logic.
- **Off-Chain (Supabase):** Acts as a high-speed metadata cache and indexer for user profiles, commitment history, and NFT data.
- **AI Engine (Groq/Gemini):** Server-side vision processing for autonomous proof validation.
- **Event Sync:** Uses **Helius Webhooks** to synchronize on-chain events (Slashes, Claims, Mints) back to the Supabase database in real-time.

---

##  Tech Stack

- **Blockchain:** Solana (Anchor Framework v0.32.1, Rust)
- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS v4
- **Backend/Cache:** Supabase (PostgreSQL)
- **AI Integration:** Groq SDK / Google Generative AI
- **Infrastructure:** Helius (Webhooks & DAS API), Bun (Package Manager)
- **Icons & UI:** Lucide React, Framer Motion

---

##  Project Structure

```text
atomx-protocol/
├── apps/web/                 # Next.js frontend application
│   ├── app/                  # App Router pages & API routes
│   ├── components/           # Reusable UI components
│   └── lib/                  # Utilities & IDL
├── programs/atomx-program/   # Solana (Anchor) source code
│   ├── src/instructions/     # Instruction handlers
│   └── src/state/            # Account state definitions
├── tests/                    # Anchor & Backend integration tests
├── scripts/                  # Devnet setup & utility scripts
└── progress_daily/           # Sprint logs & development context
```

---

##  Getting Started

### Prerequisites
- [Bun](https://bun.sh/)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor CLI](https://www.anchor-lang.com/docs/installation)

### Smart Contract
```bash
# Build the program
anchor build

# Run tests
anchor test
```

### Web Frontend
```bash
# Install dependencies
bun install

# Start development server
npm run web-dev
```

---

##  Security & Integrity

- **Non-Custodial:** Funds are locked in program-derived addresses (PDAs).
- **Immutable Proofs:** A SHA256 hash of every proof is recorded on-chain.
- **UTC-Enforced:** Daily submissions are locked to UTC calendar days to prevent "speed-running" commitments.

---

##  Contributing

We follow strict clean code standards and English-only documentation rules. Refer to `GEMINI.md` for detailed engineering standards used in this project.

---

##  License

Private / All Rights Reserved. (C) 2026 AtomX Protocol Team.
