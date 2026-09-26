# Validation report

Desktop follow-up: **2026-09-27 JST** (evidence timestamps use UTC). This report separates local execution, actual read-only Sepolia calls, and work still requiring wallets or public hosting.

## Executed on the desktop

- **53 native Node tests passed, 0 failed**, using Node v24.19.0. Raw TAP: [evidence/native-test-results.tap](evidence/native-test-results.tap).
- **29 JavaScript modules** syntax-checked; static build passed. Building `dist/` does not deploy the Node backend or contracts.
- Existing server/storage, deterministic simulation, checkpoint integrity, identity/model/sequence, and mocked-wallet tests passed against the active 80-neuron circuit.
- Added checks that a protected-write denial requires the official EAC error for the expected key, role, and account. Generic reverts, JSON-RPC code 3, network errors, and unrelated EAC errors are not accepted as evidence. The effective-revocation test remains a **mock-transport** test.
- Replaced the hand-written ABI/Keccak implementation with pinned viem 2.56.9 primitives. Official ENS function ABIs are generated from deployment artifacts at commit `71a3b7339dbc55ab47667abdfe8303bac4f4c24e`; [the manifest](evidence/ens-abi-manifest.json) records sources and SHA-256 hashes. The wallet transport remains custom and unaudited.
- Imported the pinned **80-neuron / 1,296-edge** selected circuit. Preserved the original **12-neuron / 26-edge** fixture in `data/circuit-microfixture.json`. Current model SHA-256: `60d8a7561f74e210f967d9856e969ef26e51d8fd86e2feb473af60f4d653ce63`.

## Real browser → HTTP → disk

`npm run test:browser` ran Chromium 153.0.8010.12 against the actual Node server and temporary filesystem storage, without a fetch adapter or RPC mock. Its identities and permission actions are still explicitly **LOCAL REHEARSAL**.

Observed and asserted:

- Three initial independent agents; a fourth hatched.
- Actual checkpoint HTTP upload, SHA-256-addressed file bytes, and Arena A/B fresh-engine restoration.
- Local checkpoint-key grant, successful runtime update, protected-model denial, denial on another agent, revocation, and refusal to upload or change the canonical pointer afterward.
- Alias creation and restoration through the local alias.
- The HTTP server was stopped and restarted with the same storage directory; checkpoint bytes persisted unchanged.
- A clean browser context with no source identity in its localStorage fetched the stored checkpoint and produced **100 identical subsequent simulation steps**. The test supplied expected identity/model metadata explicitly; this was **not ENS-name resolution**.
- Three.js 0.180.0 WebGL rendering and switching back to Canvas worked. A 90-frame headless sample measured a 16.7 ms median and 16.8 ms 95th percentile; this is an observation on this machine, not a general performance guarantee.
- At 390 px viewport width there was no horizontal overflow. Desktop and mobile screenshots were inspected. No uncaught page errors occurred.
- When the local registry contained identities for an older graph, the app preserved those identities and created new names for the current graph.

Results: [evidence/browser-http.json](evidence/browser-http.json). Screenshots from a local run are under `artifacts/browser-http/` (not committed). Reproduce with `npm ci`, `npx playwright install chromium --only-shell`, then `npm run test:browser`.

## Actual Sepolia reads

- All five configured addresses matched the pinned official artifacts and had nonempty deployed code: [evidence/sepolia-code-check.json](evidence/sepolia-code-check.json). `verify:sepolia` remains a **code-presence-only** check.
- `verify:sepolia:reads` made actual `eth_call` requests at one recorded block: `ETHRegistry.getState`, `PermissionedResolverImpl.decodeSetter`, and the Universal Resolver proxy's `ROOT_REGISTRY`. Raw calldata, return bytes, decoded values and block number are in [evidence/sepolia-read-check.json](evidence/sepolia-read-check.json).
- The deployed resolver derived exactly the checkpoint-key resource and TEXT role expected by the app. The Universal Resolver proxy returned a root registry with deployed code.
- No private keys, signatures, submitted transactions, funded wallets, or fabricated receipt IDs were used. These calls do **not** prove the complete live lifecycle.

## Historical delivery environment — limitations retained

The initial 2026-09-26 package was generated without external npm/Sepolia access. It passed 49 native tests and syntax checks for 21 modules. Its Chromium test ran in an isolated DOM with an in-memory fetch/storage adapter because browser loopback navigation was blocked. The HTTP server was tested independently. That original report is represented by `docs/native-test-results.tap` and `docs/browser-test-results.json`; `tests/browser-isolated.py` remains a separate historical harness.

The new desktop browser test removes the previous browser-to-HTTP validation gap for **local rehearsal**. It does not turn historical isolated tests into chain execution or public deployment evidence.

## Not executed / not proven

- Signed ENSv2 factory proxy deployments, registration, Universal Resolver **agent-record** reads, successful delegated checkpoint transactions, grants/revocations, or aliases with funded wallets.
- Real contract errors demonstrating protected-model, other-agent, and post-revocation write denial after the intended grant/revoke sequence.
- ENS-based restoration in a clean independent client using publicly hosted checkpoint bytes.
- Public HTTPS hosting, durable volume operations on a public host, TLS certificate issuance, or the prepared Docker Compose deployment (Docker/hosting access unavailable).
- The final demo video and competition submission.
- Production security audit, broad wallet compatibility, cross-platform bit-identical numerical behavior, or biological validation.

The public source repository exists at https://github.com/smarthug/flyns. A CI workflow is included for native tests, build, bundle reproduction and the real HTTP browser test; local passes do not by themselves prove a successful GitHub Actions run.

## Acceptance gate for submission

Use two separate user-controlled Sepolia wallets, obtain real receipts/readbacks for the full lifecycle, deploy HTTPS storage, and restore by ENS name from a clean browser. Complete `SUBMISSION.md` from those observations before recording the final demo.
