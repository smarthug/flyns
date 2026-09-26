# ENSv2 integration map

## Deployment assumptions

Target: Sepolia 11155111, current ENSv2 beta. Default addresses are isolated in `public/config.json` with their reviewed date and source. Beta ABI compatibility must be checked before live submission. Only Universal Resolver onchain reads are implemented, not arbitrary CCIP-Read continuations.

Parent setup attaches an official UserRegistry proxy under an **existing second-level `.eth` name**. Registering a top-level parent and legacy migration are handled externally. `setSubregistry(parentLabelHash, colonyRegistry)` is essential; deploying an isolated registry does not by itself make subnames resolvable.

## Onchain call sequence

### Setup

- Read `ETHRegistry.getState(labelhash)` and require `REGISTERED` (2).
- Read the existing child registry. Reuse it only when factory verification identifies the expected UserRegistry implementation and the caller has registrar root rights. Never overwrite an unmanageable registry.
- Otherwise use `VerifiableFactory.deployProxy(implementation,salt,initializeData)` with a cryptographically random salt and explicit owner root grants.
- Set the UserRegistry backward parent with `setParent(ethRegistry,label)` and the forward pointer with `ETHRegistry.setSubregistry`.
- `verifyContract(proxy)` must match the configured expected implementation.

### Hatch

- Deploy the fly's own UserRegistry and Permissioned Resolver through the same factory.
- Resolver initializer grants the custodian ADDRESS, TEXT and LINK roles and their admin counterparts, then initializes protected identity/model/namespace records. No root upgrade role is granted by this app.
- Register the fly in the colony registry: `register(label, owner, subregistry, resolver, roleBitmap, expiry)`.
- Name roles allow SET_SUBREGISTRY and SET_RESOLVER plus their admin counterparts. No CAN_TRANSFER_ADMIN: names are intentionally non-transferable.
- Expiry is the lesser of 30 days and parent expiry, derived from the latest chain block timestamp. The app has no renewal UI; renewal/expiry management is outside this MVP.
- Set the child registry's backward parent, then resolve `flyns.agentId` through the Universal Resolver.

A mutable ENSv2 token ID is not the fly's identity. We use a separate UUID in the record and checkpoint. The registry still controls whether that name remains a valid route to the record.

### Records

Protected: `flyns.agentId`, `flyns.name`, `flyns.model.sha256`, `flyns.engine`, `flyns.namespace`, `flyns.source` and description. They are initialized by the owner. The standard ETH address points to the custodian, not a generated agent account.

Mutable by a delegated runtime: **only `flyns.checkpoint`**. The single JSON pointer carries URI, digest and sequence atomically. No private data is uploaded by default; snapshots are public.

ENSv2 writes use `setText(bytes dnsEncodedName,string key,string value)`, not ENSv1's node-based setter. Universal reads encode `text(bytes32 namehash,string key)` as profile calldata inside `resolve(bytes dnsEncodedName,bytes profileCalldata)`.

### Delegate

Encode the permitted setter and let the resolver derive the capability:

```solidity
// Descriptive Solidity notation; the shipped app encodes this in JavaScript.
resolver.grantSetterRoles(
    abi.encodeCall(resolver.setText, (hex"", "flyns.checkpoint", "")),
    runtime
);
```

The empty name and value are ignored for capability derivation. Role = TEXT (`1 << 4`); resource = `uint256(keccak256(bytes("flyns.checkpoint")))`. Names do **not** scope this grant. One independent fly per resolver therefore is a security boundary, not just a deployment preference.

### Revoke

Call `revokeRoles(checkpointKeyResource, ROLE_SET_TEXT, runtime)`. Then `hasRoles` must be false. A runtime retaining a resolver-wide root TEXT grant remains authorized despite key revocation; this is why the runtime must be a distinct, unprivileged wallet.

### Alias

`linkToNode(dns("live.ada.parent.eth"), namehash("ada.parent.eth"))` links the full record bundle inside Ada's resolver. Wildcard fallback serves the unregistered descendant. It is **not** a separately minted token, owned child name or independent snapshot. An alias record update follows the canonical linked bundle.

## Proof vs rehearsal

`src/ens/local.mjs` intentionally simulates the policy without contracts. `src/ens/live.mjs` calls official deployments. Live sends preflight `eth_call`, ask the wallet for a transaction, and only report success after a status-1 receipt. A forbidden model-write probe is deliberately `eth_call` only, never a submitted destructive write.

ABI encoding and Keccak now use pinned viem primitives with standard-vector and nested-layout tests. `official-abis.mjs` is generated from the official deployment artifacts at commit `71a3b7339dbc55ab47667abdfe8303bac4f4c24e`; `evidence/ens-abi-manifest.json` records the sources and checksums. Twenty-one contract-function entries and two standard resolver profiles are available. The wallet transport remains custom and unaudited. Native RPC tests use a mocked provider and do not prove chain execution.

The desktop follow-up verified code presence at all five configured addresses and actual read-only `getState`, `decodeSetter`, and `ROOT_REGISTRY` calls. See `evidence/sepolia-read-check.json` for raw bytes and block number. This does not prove registration, delegated writes, effective revocation, aliases, or fresh-client ENS restoration.

## Sources

See `SOURCES.md`: Permissioned Registry, Permissioned Resolver, EAC, Verifiable Factory, contract/app tutorials and deployment table. The name lifecycle and role types above follow those interfaces; check them again before production or mainnet use.

## Integrated existing Ada status workflow

`src/ens/status.mjs` manages the configured `ada.flyns.eth` instance using the same official ABIs and wallet transport. It resolves live records through the Universal Resolver, verifies the canonical resolver and official proxy implementation, and checks status, model, agent type, checkpoint and model-hash write permissions at one block. `roles(0, runtime)` and the status resource bitmap reject broader root/admin authority.

`flyns.status` is independent from `flyns.checkpoint`. The new panel never calls colony setup/hatch, changes protected metadata, deploys another resolver, or imports the model label as a simulator hash. It does not revoke any existing grant. Existing checkpoint methods remain unchanged. `StatusENS.grant` only encodes the status setter; `StatusENS.update` only sends status from the configured runtime. Unchanged status and active grants are no-ops.

Actual user-approved status transactions and the model-denial probe are documented in [ADA-SEPOLIA.md](ADA-SEPOLIA.md). These prove that narrower status lifecycle; they do not prove the checkpoint flow described above.
