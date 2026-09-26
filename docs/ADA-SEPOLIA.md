# Existing Ada: status-only Sepolia integration

Verified on 2026-09-27 JST. The live evidence was collected from Ethereum Sepolia, chain ID **11155111**, using user-approved MetaMask transactions. The repository independently rechecks their calldata, receipts, events and current permissions.

| Item | Value |
|---|---|
| Name | `ada.flyns.eth` |
| Permissioned Resolver | `0xEC944748828366EE926C35bA8751BB3a59DDa508` |
| Owner | `0xfa6Cc5134a2e81a2F19113992Ef61F9BE81cafdE` |
| Delegated runtime | `0x353824959E9E4993FCF42eB26FA214E2439a08f1` |
| Granted key / role | `flyns.status` / `ROLE_SET_TEXT` = 16 |
| Resource | `0x960270cb038efba2e9fd6db514067e5e6ae59f58bf9d0b598b3fb07bff11b618` |
| Readback | `flyns.status = exploring`, `flyns.model = male-cns-v1`, `agent.type = drosophila` |

## Completed onchain evidence

- [Owner grant, block 11788928](https://sepolia.etherscan.io/tx/0x0ac9b59ddfa2a5ad5b8d8c924ff1af6cc3996842f10013ee719935d65f882491): `grantSetterRoles` with the ABI-encoded `setText` setter for `flyns.status`. The role event changes the runtime's bitmap on that resource from **0 to 16**. No administrator bit is granted.
- [Runtime status write, block 11788970](https://sepolia.etherscan.io/tx/0xb5e4ce094274717f9a1e41a6a3d2a41134f8a13df9b75d5d586dbd2eb86ff746): the runtime calls `setText(dns("ada.flyns.eth"), "flyns.status", "exploring")`. Successful receipt, matching `TextUpdated` event, and subsequent Universal Resolver readback agree.
- A `flyns.model` write from that runtime reverts with **EACUnauthorizedAccountRoles**, matching the model resource, TEXT role and runtime. This is an **eth_call simulation**, not a mined revert. No model transaction was submitted.
- The runtime has no root roles or status-admin bit. Model, agent-type, model-hash and checkpoint TEXT permissions are false at the recorded block.
- The Universal Resolver returns the expected Ada resolver. Factory verification returns the configured official Permissioned Resolver implementation.

Full receipts and current readbacks: [evidence/ada-sepolia.json](evidence/ada-sepolia.json). The transactions were approved on the temporary delegation page before repository integration. The new in-app panel has been exercised for actual chain reads and permission probes; no extra wallet transaction was sent to test this integration.

## Use in FlyNS

1. Run `npm run dev` and open the **Ada on Sepolia** panel.
2. **Read live Ada** resolves the current records and effective permissions. It does not request a wallet or change the rehearsal.
3. **Verify status / model permissions** simulates the two setters from the configured runtime. It never sends the forbidden model write.
4. To change the status, select **Connect Ada runtime**, choose only the configured runtime in MetaMask, enter a different lowercase status and choose **Update status via wallet**. Review and approve on Sepolia yourself.
5. The optional owner section grants only the status key if missing. It is disabled when the grant is already active. Repeating the current status also skips a transaction.

No private key or seed phrase is requested. Network/account changes invalidate the connection. Every write rechecks the canonical resolver and effective permission scope before using the wallet's guarded send path.

Reproduce the public evidence without signing:

```sh
npm ci
npm run verify:ada
# Optional: SEPOLIA_RPC_URL=https://YOUR-SEPOLIA-RPC npm run verify:ada
# Current output: artifacts/ada-sepolia.json
```

The verifier asserts this recorded `exploring` scenario. If a later authorized status update changes it, the old transactions remain valid historical evidence, but that exact current-readback assertion will fail. The app always displays fresh reads rather than using the evidence file as live state.

## Boundary with Save & Resume

The existing Ada has a model **label**, not the simulator's model SHA-256. At the recorded block its `flyns.agentId`, `flyns.name`, `flyns.model.sha256`, `flyns.engine`, `flyns.namespace` and `flyns.checkpoint` records are empty. Therefore the integration does not fabricate a UUID, relabel `.demo` agents, overwrite the protected model, hatch another Ada, or claim to resume a checkpoint for this name.

The next live portability step needs explicit owner-authorized identity/model initialization and a separate checkpoint capability, followed by public checkpoint storage and a fresh-client restore. Status permission alone does not authorize that migration. Checkpoint delegation, revocation, post-revocation denial, other-agent isolation, aliases and public hosting remain separate validation work.

Resolver grants apply to a key across the entire resolver instance, not just the name encoded in a setter. Keep independent agents on their own resolvers. See the [official Permissioned Resolver documentation](https://docs.ens.domains/ensv2/permissioned-resolver/).
