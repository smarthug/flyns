# FlyNS
### Small brains. Independent identities.

**Portable connectome-structured agents with ENSv2 namespaces and revocable checkpoint writers.** Built as a new project for ETHGlobal Tokyo 2026, Best Use of ENSv2.

An agent's simulated body is temporary; its canonical name identifies the model, checkpoint and authority that another runtime must verify. Hatch separate agents, observe real computed state, publish a checkpoint, resolve it by name, start a fresh engine and revoke its writer.

**Delivery status:** the dependency-free local rehearsal, native tests and isolated browser interactions have been exercised. The ENSv2 Sepolia adapter is implemented against the documented beta interfaces but has **not** been exercised against deployed contracts with funded wallets. No public deployment or GitHub repository is included. Optional Three.js rendering and the larger data import require network installation and remain unverified here. This is a working local prototype plus an unverified live integration, not an already-qualified competition submission.

## Run

Node.js **22.16 or newer**. No npm installation is required for the core application.

```sh
npm run dev
# Open http://localhost:4173
npm test
npm run check
npm run build
```

The default mode is prominently marked **LOCAL REHEARSAL**. `.demo` names and its owner/runtime actor selector are local simulations, not ENS registrations or wallets. Rehearsal stores identity metadata in browser localStorage; snapshots use a real content-addressed Node file store. Reloading restarts observation from a seed until you explicitly Resolve & resume a published checkpoint.

A small selected-edge fixture ships with **12 measured MaleCNS-derived neurons and 26 selected directed edges**. It is not the full fly brain, not an induced subgraph, and not a trained biological controller. Numeric dynamics, sensory injection, motor decoding and procedural body animation are our modeling assumptions. There is no learning or LLM.

### Optional Three.js view

```sh
npm run setup:3d
# Reload, then enable "Three.js 3D".
```

The default renderer is Canvas 2D. The optional Three.js 0.180.0 renderer uses original procedural meshes and the same simulation state. It does not replace the neural simulation. Installing it copies the package's local ES modules and MIT license, not external fonts or body assets.

### Optional larger measured circuit

```sh
npm run data:fetch
npm test
```

Fetches the pinned **80-neuron** circuit data from cobanov/flyjump, not that project's application code or pretrained readout. See `docs/SOURCES.md`. The original microfixture is preserved. The model digest changes; old snapshots require the identical old graph and engine. Use new names after changing the active graph. This still is not a whole-brain model.

## The ENSv2 contribution

| Primitive | What FlyNS uses it for |
|---|---|
| Hierarchical UserRegistry | Each fly is a registered name with its own child namespace |
| Per-agent Permissioned Resolver | Isolate one fly's record permissions from all other flies |
| Enhanced Access Control | Delegate only the `flyns.checkpoint` text-key setter |
| Universal Resolver | Discover canonical identity and checkpoint from an input name |
| Record aliasing + wildcard resolution | `live.ada.parent.eth` resolves the canonical agent bundle without minting another name |
| Verifiable Factory | Deploy official registry/resolver proxies and check their implementation |

**Why one resolver per fly?** Resolver rights apply to a record argument across that entire resolver instance. A checkpoint-key grant on a shared resolver would let the writer edit that key for every fly sharing it. A name appearing in setter calldata does not make the permission name-specific.

The onchain checkpoint is **one atomic text value**, not separate URI and digest writes:

```json
{
  "schema": "flyns.pointer.v1",
  "uri": "https://YOUR-HOST/checkpoints/SHA256.json",
  "sha256": "64-lowercase-hex-characters",
  "sequence": 1
}
```

Full neural state, PRNG, body pose, environment and tick remain offchain. Restore verifies their bytes, model, stable agent ID and sequence before constructing a new engine. A content hash proves byte integrity, **not** scientifically correct computation or biological memory.

## Sepolia setup — required before prize submission

Read `docs/ENS-INTEGRATION.md` and `docs/DEMO.md` first. Re-check the official beta addresses and interfaces in `public/config.json` / `src/ens/protocol.mjs` before using a wallet.

1. Have an ENSv2 parent name you control on Sepolia and two separate testnet accounts: custodian and runtime. Register/migrate the parent using the official ENS interface linked in the application. The core app does not purchase a parent name.
2. Connect the custodian, enter the parent, and set up its colony registry. Inspect each transaction in the wallet. Setup will not overwrite a registry the account cannot manage.
3. Hatch `ada`; this deploys separate namespace and resolver proxies, registers the subname, attaches parent metadata, and verifies Universal Resolver identity. Several transactions are required. Partial deployments are journaled in localStorage; inspect receipts before retries.
4. Publish a checkpoint, enter the separate runtime account and delegate the checkpoint key. Switch the wallet's selected account, then click Reconnect. The app retains the loaded live agents, but checks chain/account again before writes.
5. As runtime, publish successfully and probe a model change. As custodian, revoke. Reconnect as runtime and verify canonical writes fail. An `eth_call` denial is a preflight, not a mined revert.

An optional **read-only** code-presence check:

```sh
SEPOLIA_RPC_URL='https://YOUR-RPC' npm run verify:sepolia
```

It neither deploys contracts nor proves ABI compatibility. No private keys are stored in the application. The live RPC transport relies on an injected EIP-1193 wallet. Its small ABI/Keccak implementation is locally vector-tested, not a replacement for a production audited web3 SDK. Only ASCII ENS labels and onchain FlyNS records are supported; external CCIP-Read gateways are out of scope.

## Public hosting

Use a Node host with a durable writable volume behind HTTPS. **Static `dist/` alone cannot accept checkpoint uploads.** The filesystem store is content-addressed, but not decentralized or replicated.

```sh
HOST=0.0.0.0 PUBLIC_ORIGIN=https://YOUR-HOST PORT=4173 npm start
```

Or use the included Dockerfile with `PUBLIC_ORIGIN` and a volume mounted at `/app/.storage`. Do not point a submitted ENS record at localhost: judges and other devices cannot fetch it. The server uses a 128 KiB object limit, 20 uploads/minute/IP and a 32 MiB quota. Add authenticated uploads, replication and an object-store/IPFS adapter before broader public use. No Pinata credentials or account are assumed.

## Structure

```
src/app.mjs                 UI orchestration; publish/resolve/fresh-engine restore
src/ens/live.mjs            Official ENSv2 calls, factory proxies, roles, aliases
src/ens/local.mjs           Explicitly labeled local rehearsal adapter
src/ens/protocol.mjs        ABI signatures, role bitmaps, DNS encoding
src/ens/rpc.mjs             Chain/account guards, preflight and receipt polling
src/sim/                    Measured graph, original engine, checkpoint validation
src/ui/                     Canvas and optional Three.js observatories
server.mjs                  Static assets + bounded content-addressed storage
scripts/                    Build, syntax check, pinned data import, Sepolia check
tests/                      Native tests + isolated browser smoke harness
docs/                       Strategy, trust boundaries, judging script, submission
AGENTS.md                   Instructions to continue this project in Codex
```

## Scope and trust

The MVP deliberately uses expiring, **non-transferable** names to avoid pretending a registry-token transfer also transfers a separately controlled resolver. Parent namespace operators still matter; this is not a claim of permanent independence from every ancestor. Revoking a writer blocks future canonical ENS updates. It cannot kill a process, delete downloaded snapshots or enforce one living copy. Concurrent legitimate writers are last-writer-wins, not consensus or compare-and-swap.

See `docs/SECURITY.md`, `docs/VALIDATION.md`, `docs/SUBMISSION.md` and the Korean plan `docs/PROJECT.ko.md`.

Original application code: MIT. MaleCNS-derived data: CC BY 4.0 with attribution in `data/ATTRIBUTION.md`. No upstream template application, body mesh or pretrained checkpoint is redistributed.
