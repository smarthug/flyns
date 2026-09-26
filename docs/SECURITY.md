# Security and trust boundaries

This prototype is not audited. Use Sepolia test assets only. Its live contract integration has not been validated end to end in the delivery environment.

## Identity and authority

ENS provides the canonical route to a record, subject to its registry hierarchy, ownership and expiry. A parent owner can still redirect an ancestor's subregistry. Strong leaf ownership is not proof of independence from all ancestors. FlyNS deliberately does not keep dangerous root record-override roles inside the newly created colony, but the upper parent is still managed.

Each fly gets a separate resolver. Resolver key permissions are instance-wide: sharing a resolver across unrelated independent agents would make checkpoint grants leak between them. Aliases deliberately share a bundle and therefore are not independently permissioned flies.

The custodian has root text privileges in the fly resolver; the runtime gets only a key-scoped non-admin grant. Revoking the latter does not cancel a separate root grant. Check effective permissions, not merely the existence of a revoke receipt. Never choose the custodian/admin wallet as the supposedly restricted runtime.

Agent UUIDs are stable application identifiers, not transferable assets or mutable ENS token IDs. The app gives names no transfer-admin role. A future transfer feature must transfer resolver management and child-registry management as well, or carefully replace them with new permissions.

## Checkpoint correctness

The digest commits to the exact stored bytes. A checkpoint signature or digest alone cannot prove faithful simulation, biological authenticity or correct experiment results. This MVP accepts checkpoints written by authorized accounts; it does not add zk proofs or trusted-execution attestation.

A snapshot includes neural vector, PRNG state, tick, pose, energy, motor state and stimulus environment. Import checks size, schema, model hash, agent ID, basic numeric ranges and sequence. The engine is deterministic within the tested JavaScript environment; tiny cross-engine floating-point deviations remain possible, so no cross-platform bit-identity claim is made.

The model digest includes circuit data and engine configuration/version. Any behavior-changing engine change must bump ENGINE_VERSION even when its configuration stays the same. The digest is not currently an automatic source-code hash.

A single JSON ENS text value atomically groups URI, digest and sequence. Multiple writers still race: the chain is last-writer-wins and the resolver does not enforce monotonic sequence numbers or compare-and-swap. The app detects a replaced digest after its transaction and rejects a sequence older than the locally known restored state. A fresh client has no independent history and trusts the current canonical head. Durable append-only history would require additional design.

Revocation prevents subsequent authorized canonical updates. It does not terminate an offchain process, erase public snapshots, prevent forks, guarantee one active agent or undo an earlier transaction.

## Transport and storage

No private keys, signing secrets or authenticated user content are bundled. Signing stays in the injected wallet. The app re-checks chain and selected account before live transactions and preflights writes before asking the wallet to send. Receipts are observed with one inclusion confirmation; stronger finality/reorg handling is future work. Timeout is not equivalent to transaction failure; inspect the journal before retrying.

Checkpoint objects are public and immutable by content address, with bounded uploads and a small total quota. Uploading does not grant an ENS writer role. The store has no login, payment or per-user quota: unauthenticated users can exhaust its capacity. Protect a real public deployment with authentication and operational limits. Per-IP rate limiting behind a proxy may group all users; the server intentionally does not blindly trust X-Forwarded-For.

The Node server does not fetch checkpoint URLs, avoiding server-side arbitrary-URL fetching. The browser permits HTTPS reads and same-origin loopback HTTP for local rehearsal; it disallows URL credentials, non-web schemes, redirects and objects over 128 KiB. HTTPS URLs may still target a service chosen by the authorized writer. Production clients can add an explicit storage-origin allowlist.

PUBLIC_ORIGIN is mandatory when the server binds beyond loopback. Set it to the external HTTPS origin, persist the data volume and terminate TLS at a trusted proxy. Static-only hosting is insufficient. A digest protects integrity, not availability; the filesystem is centralized and unreplicated. IPFS/S3 support is planned, not bundled or deployed.

## Beta contracts and codec

Addresses and ABIs are explicit in config and protocol source. Check the official current ENSv2 deployment table and source ABIs. Factory proxy verification identifies the expected implementation, not a security audit or a guarantee that it will never upgrade. This app does not grant an upgrade role for its newly created instances.

The previous hand-written Keccak/ABI implementation has been replaced with pinned viem primitives. Live function definitions are generated from official ENS deployment artifacts; source hashes and the commit are recorded in `evidence/ens-abi-manifest.json`. Standard-vector and structural tests still run against the maintained implementation. This replacement is not a security audit. ASCII-only names are a deliberate supported subset, not full ENS normalization. External CCIP-Read resolution, contract-wallet batch flows, reorg recovery, renewal UX and broad wallet compatibility remain unimplemented.

Live failure probes must be reviewed with actual contract errors. A network failure, nonexistent selector or arbitrary revert must not be presented as proof of correct authorization. The shipped probe labels it preflight and native RPC tests distinguish preflight failures from submitted transactions.

A protected-model denial is reported only when the wallet supplies a decodable official `EACUnauthorizedAccountRoles` error matching the model key, TEXT role, and connected account. Generic reverts, JSON-RPC code 3, network failures, and errors for other resources are inconclusive. Confirmed transaction events retain the wallet receipt for journal export; the original desktop verification generated no signed receipts. The later user-approved Ada status grant and update receipts are recorded separately in `evidence/ada-sepolia.json`.

## Existing Ada integration

The Ada panel reads public Sepolia data only when requested, using the public RPC configured in `public/ada-sepolia.json`. It verifies the name-to-resolver route, official implementation and Sepolia chain before checking or preparing writes. Status grants use only `flyns.status`; they are resolver-wide for that key, not name-scoped. A status writer does not automatically gain checkpoint rights.

The configured owner and runtime are required for their respective actions, with explicit wallet account selection and fresh guards before submission. No private keys are requested. Duplicate grants and identical status values skip signing. Model-denial evidence is accepted only with the matching EAC resource, TEXT role and runtime address. Model probes never submit transactions. Historical transaction links are evidence, not a cached assertion of current permission. Live reads and verification fail closed when the name redirects or broader roles are detected.

The existing Ada model label does not satisfy the simulator's UUID/model-hash/checkpoint schema. An explicit owner-authorized migration and separately authorized checkpoint grant are required before claiming state portability for this name. No migration is performed by this integration.
