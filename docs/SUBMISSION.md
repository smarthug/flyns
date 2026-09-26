# Submission evidence — not yet complete

## Track

ETHGlobal Tokyo 2026 → ENS → Best Use of ENSv2 (new project, not the Existing Project/Continuity track).

Official requirements at review: ENSv2 on Sepolia; ENSv2 must be central; functional demo rather than hardcoded values; a live demo link and accessible open-source repository. Official track pool: $6,000, awarded $3,000 / $2,000 / $1,000. Check the official event page again before submitting.

## Description draft

FlyNS is an identity and state-portability layer for experimental connectome agents. Each fly has an ENSv2 subname, its own namespace and an isolated Permissioned Resolver. A runtime receives only checkpoint-key rights. Another client can resolve the name, verify the model and state digest, and resume a fresh engine. The owner can revoke the writer without confusing identity ownership with ownership of a running process. Wildcard record aliases expose the same canonical record bundle. The demo uses a transparent, MaleCNS-derived circuit subset with engineered dynamics; it does not claim whole-brain intelligence or learned biological memory.

## Fill with actual evidence

| Item | Current state |
|---|---|
| Public live demo URL | NOT DEPLOYED — replace with tested HTTPS endpoint |
| Public GitHub repository | https://github.com/smarthug/flyns — public repository verified; desktop validation changes: https://github.com/smarthug/flyns/pull/1 |
| Demo video | NOT RECORDED |
| Team names and contact | ADD YOUR TEAM |
| ENSv2 parent name | Existing `flyns.eth`; registration not performed by this package |
| Colony UserRegistry / setup tx | NOT DEPLOYED |
| Ada namespace / resolver / registration tx | Existing `ada.flyns.eth` resolver `0xEC944748828366EE926C35bA8751BB3a59DDa508` verified; registration/namespace setup receipts not collected |
| Kibo resolver / registration tx | NOT DEPLOYED |
| Public snapshot object + model SHA-256 | Model: `60d8a7561f74e210f967d9856e969ef26e51d8fd86e2feb473af60f4d653ce63`; public snapshot still required |
| Checkpoint publish tx + resolver readback | NOT VERIFIED ON CHAIN |
| Runtime status-only grant tx | [Confirmed grant](https://sepolia.etherscan.io/tx/0x0ac9b59ddfa2a5ad5b8d8c924ff1af6cc3996842f10013ee719935d65f882491); grants `flyns.status`, not checkpoint |
| Runtime checkpoint grant tx | NOT VERIFIED ON CHAIN |
| Successful delegated status tx | [Confirmed exploring update](https://sepolia.etherscan.io/tx/0xb5e4ce094274717f9a1e41a6a3d2a41134f8a13df9b75d5d586dbd2eb86ff746) |
| Successful delegated checkpoint tx | NOT VERIFIED ON CHAIN |
| Protected model eth_call denial | `flyns.model` denial verified after status grant; matching EAC error, **not mined revert**. Checkpoint-flow `flyns.model.sha256` probe remains separate |
| Other-agent checkpoint denial | NOT VERIFIED ON CHAIN |
| Revoke tx + effective hasRoles=false | NOT VERIFIED ON CHAIN |
| Post-revocation write denial | NOT VERIFIED ON CHAIN |
| Wildcard alias tx + matching identity | NOT VERIFIED ON CHAIN |
| Native tests | 62 passing; see VALIDATION.md and evidence/ada-native-tests.txt |
| Separate-browser restoration | Must verify against live HTTPS storage and ENSv2 |

## Integration source pointers

- `src/ens/live.mjs`: setup, hatch, Universal Resolver records, role grant/revoke, aliasing.
- `src/ens/protocol.mjs`: role masks and exact signatures.
- `src/ens/rpc.mjs`: wallet guards, preflight vs receipt.
- `src/app.mjs`: immutable snapshot upload, ENS publish, resolution and new-engine restore.
- `tests/permissions.test.mjs`: local permission isolation and mocked RPC semantics, not chain tests.
- `data/ATTRIBUTION.md`: measured data origin and modifications.

## Feedback note to complete after live integration

Record time to first successful resolution and transaction, discrepancies between docs/ABI/deployed addresses, wallet friction, permission-scope surprises, and the most valuable improvement for ENS developers. Do not invent a successful integration debrief before running it.

Do not fabricate transaction hashes, test results, ownership, historical commits, deployment URLs or claims that a localhost rehearsal satisfies the live-chain requirement.

## Verified development evidence (not signed transaction evidence)

- Five configured addresses matched pinned official artifacts and had deployed Sepolia code: `evidence/sepolia-code-check.json`.
- Selected actual read-only contract calls with raw return data: `evidence/sepolia-read-check.json`.
- Official ABI sources and hashes: `evidence/ens-abi-manifest.json`.
- Real browser/HTTP/disk tests, Three.js, mobile width, server restart and independent checkpoint validation: `evidence/browser-http.json`.
- A clean browser verified snapshot bytes with explicit test metadata and resumed 100 identical steps. This is **not** the required independent ENS-name restoration; that row remains incomplete.
- HTTPS deployment configuration: `docs/DEPLOYMENT.md` (prepared, not deployed).

## Verified wallet evidence: status scope only

The [Ada integration report](ADA-SEPOLIA.md) and [receipt/readback JSON](evidence/ada-sepolia.json) record the user-approved status grant and update plus actual read-only model denial. These are stronger than the earlier read-only ABI checks, but do not establish checkpoint portability or the full prize demo. Ada’s model label is not a simulator hash, and the required UUID/checkpoint metadata is still empty.
