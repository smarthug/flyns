# Validation report

Delivery review: 2026-09-26. This report describes observed results, not planned chain execution.

## Executed and passed

- **49 native Node tests, 49 passed, 0 failed.** `npm test`.
- **21 JavaScript modules** syntax-checked. `npm run check`.
- Static build succeeded. `npm run build`. This copies browser assets; it does not deploy a backend or blockchain contract.
- Real Node HTTP-server tests used temporary directories and loopback requests. Covered health, actual SHA-256 object storage/retrieval, immutable cache headers, idempotent storage, foreign-origin upload rejection, malformed input, secret-path exclusion and script CSP.
- Simulation tests checked separate state ownership, deterministic same-seed runs, a changed result when the circuit's recurrence is silenced, schema/identity/model/sequence validation, tampered bytes and **100 exact subsequent steps after restoration** in the tested Node engine. The lesion difference is not a biological validation result.
- Known Keccak, selector, ENS namehash, DNS encoding and ABI-layout tests passed. Mocked wallet tests distinguish incorrect chain/account, failed preflight, successful receipt and reverted receipt.

## Browser smoke test

Chromium exercised the actual ES modules and UI in an **isolated DOM**, with an in-memory fetch/storage adapter. Browser loopback navigation was blocked by this environment, so this was not an end-to-end browser-to-HTTP integration test. The HTTP server was independently exercised by the native tests above.

Observed flows: three initial agents; fourth agent hatched; checkpoint publication; Arena A/B fresh-engine restoration; checkpoint-key delegation; runtime update; protected-model denial; writer revocation; subsequent checkpoint denial; alias creation; alias-based restoration. No uncaught page errors. At 390 px width the page had no horizontal overflow. The screenshots depict this explicitly labeled local rehearsal, not a Sepolia deployment.

The optional `tests/browser-isolated.py` reproduces this harness when Python Playwright and Chromium are available. It writes screenshots and results to `artifacts/`. It deliberately does not access a chain, impersonate a live RPC or produce transaction hashes.

## Not executed / not proven

- ENSv2 factory deployments, actual proxy initialization, name registration, Universal Resolver reads, grants/revocations and aliases on Sepolia.
- Receipt/readback verification with real wallets, contract-wallet compatibility and official ABI-vs-bytecode differential tests.
- Browser-to-server full end-to-end navigation in this environment; deployed multi-browser restoration.
- Three.js package installation/WebGL renderer execution. The default Canvas renderer was exercised; optional 3D source is provided but unverified.
- Larger pinned 80-neuron data download. The shipped active fixture contains 12 neurons and 26 selected directed edges.
- Public hosting, persistent-volume operations, public GitHub publication or a competition submission.
- Production security audit, cross-platform bit-identical numerical behavior, biological validation, learning, consciousness or full-brain simulation.

## Acceptance gate for a real submission

Re-run local tests on the user's machine, validate the live beta ABIs, complete `SUBMISSION.md` with **actual** chain evidence, and test the HTTPS deployment from an independent browser before recording. Local tests and screenshots are useful development evidence, but do not satisfy the requirement to build a functional ENSv2 Sepolia project.
