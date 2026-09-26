# Three-minute judging demo

## Do this before recording

Complete the live chain checklist in `SUBMISSION.md`. Use real Sepolia accounts, an ENSv2 parent, funded testnet wallets and a public HTTPS checkpoint origin. Create two names with separate resolver addresses, prepare both accounts, and retain transaction hashes. Wallet prompts and confirmations take variable time: have setup already finished and never replace waiting with a fake confirmation.

The app's Arena A and Arena B are separate engine instances within one page. For a stronger portability demonstration, open the deployed app in a second browser, connect the authorized wallet, and **Resolve & resume** the same name. This is a second client, not migration to an already-hosted separate game engine.

## 0:00–0:25 — The problem

“These flies are small experimental controllers. The important question is not whether they are intelligent. It is whether an agent can keep a discoverable identity when we change the runtime that hosts it.”

Show Ada and Kibo. Select each and show distinct resolver and child-registry addresses. Explain that their neural states and random generators are independent.

## 0:25–1:10 — Name-based state portability

Publish Ada's snapshot. Show the **actual transaction receipt** and the `flyns.checkpoint` pointer.

In the second client, enter Ada's name. Resolve the record, fetch the snapshot, verify SHA-256 / agent ID / model / sequence and restore. Show the displayed restoration tick and PRNG value. Do not compare current animated ticks after several seconds; compare the saved tick with the restoration proof.

“The name discovers the state; the hash verifies the bytes; the model ID determines which engine can load it.”

## 1:10–2:20 — The ENSv2 moment

As custodian, delegate only the checkpoint key to the distinct runtime account. Reconnect the runtime wallet and publish once successfully. Use the forbidden-model-write probe and explain that this is a reverted `eth_call`, not a mined revert transaction. The delegate should also fail a checkpoint write to Kibo, which has a different resolver.

Reconnect custodian, revoke the runtime key, and show the confirmed receipt. Reconnect runtime and retry the update; it must be denied. Keep the fly visibly moving.

“The fly can keep running. But this runtime no longer has the right to define its canonical state.”

This sentence states the real security property. Do not say that revocation killed the process or deleted its memory.

## 2:20–2:45 — Namespace composition

Create/resolve `live.ada.YOUR-PARENT.eth`. Show that it returns the same canonical identity and latest pointer. It is a resolver-level bundle alias served by wildcard fallback; it is not a newly minted ERC1155 name. The fly's UserRegistry exists for further registered child names but this demonstration intentionally does not mint unnecessary records.

## 2:45–3:00 — Close

“ENSv2 is not a label on this demo. It defines where the agent is found and which runtime may update its canonical state. We started with a small, inspectable fly controller; the portable identity pattern is not tied to that controller.”

Show the public repository, source attribution and verification artifacts. The 12-neuron fixture is a narrow prototype; do not call it a whole-brain emulation or learned biological memory.

## Local-only rehearsal

The shipped local actor toggle rehearses the same story without wallets. The screen must remain labeled LOCAL REHEARSAL. Local journal entries and preflight results must never be submitted as blockchain receipts.
