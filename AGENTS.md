# Continue FlyNS in Codex

This is a NEW project, not an incremental branch of an existing fruitfly-connectome repository. The target is ETHGlobal Tokyo 2026 Best Use of ENSv2, not the Continuity track. User prefers several independent fly agents, each with an ENS name. Keep scope on Hatch / Observe / Save & Resume / Delegate & Revoke.

## Read first

README.md, docs/PROJECT.ko.md, docs/ENS-INTEGRATION.md, docs/SECURITY.md, docs/VALIDATION.md, docs/SUBMISSION.md.

## Highest priority work

1. Run native tests and the app. Inspect current ENSv2 beta docs and deployed ABI artifacts. Reconfirm all public/config.json addresses. `verify:sepolia` checks code presence only.
2. With user-authorized Sepolia accounts, exercise setup, official factory proxies, name registration, universal resolution, key delegation, actual delegated update, key revocation and effective-denial tests. Store real receipts and readbacks, not fabricated IDs. Never ask to paste a private key; use the user's wallet.
3. Public HTTPS Node deployment with durable checkpoint storage and PUBLIC_ORIGIN. Verify restore in a second client using ENS records and fetched state, not localStorage identity records. Publish the original repository only when an authorized write tool or CLI is available.
4. On an internet-enabled machine, run optional setup:3d and data:fetch; validate UI/performance and scientific attribution. The included fallback is explicitly a 12-node selected-edge fixture, not the full source circuit.
5. Record the three-minute demo and fill SUBMISSION.md from actual evidence. Prefer a maintained web3 client with official generated ABIs over extending the custom codec for production.

## Non-negotiable boundaries

- One independent agent per Permissioned Resolver. Resolver key grants are NOT name-scoped.
- Stable UUID separate from mutable registry token ID; DNS-encoded ENSv2 setters.
- Single atomic `flyns.checkpoint` value contains URI/hash/sequence.
- Distinct custodian/runtime wallet. Root TEXT authority defeats key-only revocation.
- `live.*` is a wildcard record-bundle alias, not a tokenized independent agent.
- Keep .demo local and Sepolia explicit. Never fabricate transaction receipts or claim simulation is chain execution.
- Revocation cannot kill processes, prevent forks or erase snapshots. Managed ancestors and expiry remain relevant.
- ENGINE_VERSION must change with behavior-changing code. Model hash commits to graph and version/config, not full source code.
- Do not claim whole-brain emulation, intelligence, learning, biological memory transfer or profitable behavior. Circuit inputs/outputs are engineered.
- No template application/mesh reuse without its actual license. Data CC BY notice stays visible. No fonts or proprietary assets.
- Native RPC tests are mocked transport tests. Isolated browser smoke uses a fetch adapter. Neither validates deployed ENS contracts.

## Commands

npm run dev
npm test
npm run check
npm run build
npm run setup:3d
npm run data:fetch
SEPOLIA_RPC_URL=... npm run verify:sepolia

The environment that generated this package had no external network for npm or Sepolia and browser loopback navigation was blocked. It exercised browser modules in an isolated no-network DOM harness and separately tested the actual HTTP server with Node. Do not silently erase these validation limitations.
