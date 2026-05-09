# AtomX Protocol

## Project Overview
AtomX Protocol is a decentralized application built on the Solana blockchain. It allows users to make "commitments" (daily tasks or habits) and stake tokens (USDT) against their success. Users must submit daily visual proof of their activities, which are validated by an AI (Groq Vision / Gemini) before being recorded on-chain. If a user fails to meet their commitment, their stake is slashed.

## Architecture & Technologies
The project is structured as a workspace with a Solana program (smart contract) and a web frontend.
- **Package Manager:** Bun
- **Frontend (Web App):**
  - Next.js (App Router)
  - React 19
  - Tailwind CSS v4
  - Supabase (Backend/Database metadata)
  - AI Integrations: Groq SDK, Google Generative AI
  - Solana Wallet Adapter & `@coral-xyz/anchor` for blockchain interaction
- **Smart Contract (Solana Program):**
  - Framework: Anchor (v0.32.1)
  - Language: Rust (Edition 2021)
  - Program ID: `3nrc4dPYdhztn9d82QmrznATBbYEi9hhvRyx6AnHVGk9` (Devnet)
- **Testing:**
  - Mocha/Chai with TypeScript (`ts-mocha`) for Anchor tests.

## Code Quality Rules
 
### 1. Clean Code Standards
 
- Write **self-documenting code**: variable and function names must clearly express intent.
- Keep functions **small and single-purpose** — one function does one thing.
- Avoid deeply nested logic; prefer early returns and guard clauses.
- No unused variables, dead code, or commented-out blocks left in the codebase.
- Prefer **explicit over implicit** — avoid magic numbers, use named constants.
### 2. Comments & Documentation Language
 
- **All comments, JSDoc, and inline documentation must be written in English.**
- Indonesian is strictly prohibited in any comment, docstring, or documentation string.
- Comments must add context that the code itself cannot express — never restate the obvious.
**❌ Prohibited:**
```ts
// Ambil data dari supabase
// Ini untuk validasi proof
```
 
**✅ Required:**
```ts
// Fetch the user's active commitment record from Supabase
// Validate AI proof response before writing to chain
```
 
### 3. Function & Section Descriptions
 
Every function, hook, and major code section must have a brief English description explaining
**what it does** and **why it exists**.
 
#### TypeScript / JavaScript
 
Use JSDoc for exported functions, hooks, and utilities:
 
```ts
/**
 * Fetches the active commitment for a given wallet address.
 * Returns null if no commitment is found or if it has already expired.
 */
export async function getActiveCommitment(wallet: string): Promise<Commitment | null> { ... }
```
 
Use inline section comments for logical blocks within a function:
 
```ts
async function submitProof(proofData: ProofInput) {
  // Validate image size and format before sending to AI
  const validated = await validateProofImage(proofData.imageUrl);
 
  // Send to Groq Vision for activity verification
  const aiResult = await verifyWithGroq(validated);
 
  // Record result on-chain via Anchor instruction
  await sendProofTransaction(aiResult);
}
```
 
#### Rust (Anchor Program)
 
Use `///` doc comments on all public instruction handlers and state structs:
 
```rust
/// Initializes a new commitment account for the user.
/// Locks the specified USDT stake amount and records the habit description.
pub fn create_commitment(ctx: Context<CreateCommitment>, params: CommitmentParams) -> Result<()> {
    // Validate stake amount is within allowed bounds
    require!(params.stake_amount >= MIN_STAKE, AtomxError::StakeTooLow);
    ...
}
```

 
## Non-Negotiable Rules Summary
 
| Rule                                          | Status     |
|-----------------------------------------------|------------|
| All comments in English                       | ✅ Required |
| Indonesian in comments                        | ❌ Forbidden|
| JSDoc on every exported function              | ✅ Required |
| Section comment on major logic blocks         | ✅ Required |
| Single-purpose functions                      | ✅ Required |
| No unused variables or dead code              | ✅ Required |
| No magic numbers (use named constants)        | ✅ Required |
| No inline styles (use Tailwind only)          | ✅ Required |
| No hardcoded secrets                          | ✅ Required |
 

## Directory Structure
- `apps/web/`: The Next.js frontend application.
  - `app/`: Next.js App Router pages and API routes (includes webhooks and cron jobs).
  - `components/`: Reusable React components (e.g., `dashboard/`).
  - `lib/`: Utility functions and IDL definitions.
- `programs/atomx-program/`: The Rust source code for the Anchor Solana program.
  - `src/instructions/`: Individual instruction handlers (e.g., `create_commitment`, `submit_proof`).
  - `src/state/`: Account state definitions.
- `tests/`: TypeScript integration tests for the Anchor program.
- `scripts/`: Utility scripts for setting up devnet, transferring tokens, and triggering cron jobs.
- `migrations/`: Anchor deployment scripts.
- `progress_daily/`: Ignored directory containing AI context files, sprint logs, current workflow documentation, and pending features.

## Building and Running

### Prerequisites
- Install `bun`
- Install Rust and Solana CLI tool suite
- Install Anchor CLI (`avm`)

### Blockchain & Smart Contract
To build the Anchor program:
```bash
anchor build
```

To run the smart contract tests (using local validator):
```bash
npm run anchor-test
# or using Anchor directly:
anchor test
```

### Web Frontend
To start the Next.js development server:
```bash
npm run web-dev
# This executes: bun --env-file=.env.local --cwd apps/web dev
```

To build the frontend for production:
```bash
npm run web-build
```

## Development Conventions
- **Frontend:** Follows standard Next.js App Router conventions. Uses Tailwind CSS for styling and Lucide React for icons. Components are split into smaller, focused modules (as seen in the `commitment-detail` refactoring).
- **Smart Contract:** Organizes logic into `instructions` and `state` modules. Follows Anchor best practices for account validation and error handling.
- **Linting & Formatting:** The project uses ESLint for the frontend and Prettier for formatting (`.prettierignore-anchor` indicates specific formatting rules).
- **Environment Variables:** Local development relies on `.env.local` for the web app (injected via Bun). Ensure necessary Supabase, RPC, and AI API keys are configured.