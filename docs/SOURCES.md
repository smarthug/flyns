# Sources, review and attribution

Reviewed for this project on 2026-09-26. Beta documentation and live addresses may change. Original application code is independently written. Reading an upstream repository is not independent scientific replication.

## Brief and prize

- cobanov/awesome-fly: https://github.com/cobanov/awesome-fly — project discovery; distinguishes measured wiring, model assumptions and demonstrated behavior. The list's CC0 license does not relicense linked code or data.
- ETHGlobal Tokyo 2026 ENS: https://ethglobal.com/events/tokyo2026/prizes/ens — track requirements and suggested ENSv2 primitives. The all-prizes page also contains the ENS track: https://ethglobal.com/events/tokyo2026/prizes

## Official ENS references

- Overview: https://docs.ens.domains/ensv2/overview/
- Permissioned Registry: https://docs.ens.domains/ensv2/permissioned-registry/
- Permissioned Resolver: https://docs.ens.domains/ensv2/permissioned-resolver/
- Enhanced Access Control: https://docs.ens.domains/ensv2/enhanced-access-control/
- Verifiable Factory: https://docs.ens.domains/ensv2/verifiable-factory/
- Contract developer guide: https://docs.ens.domains/ensv2/tutorial-contract-developers/
- App developer guide: https://docs.ens.domains/ensv2/tutorial-app-developers/
- Deployment addresses: https://docs.ens.domains/learn/deployments/
- Indexing, links and mutable IDs: https://docs.ens.domains/ensv2/indexing/
- Official explanation of scope and separate resolvers: https://ens.domains/blog/post/exploring-subnames-ensv2

Search/open caches can expose different revisions of the deployment page, including older ENSv1 tables. Confirm the section is **Sepolia (ENSv2 Beta)**, verify code onchain and use current official ABI artifacts before transactions. The configured addresses were sourced from the beta table, not the obsolete v1 addresses.

## Measured data and modeling boundary

- MaleCNS project: https://male-cns.janelia.org/
- Data: https://male-cns.janelia.org/download/
- Upstream extraction: https://github.com/cobanov/flyjump
- Pinned upstream commit: `c08c86bc18efd8125964b1d2ca4fc1df59700f30`
- Pinned data file: https://github.com/cobanov/flyjump/blob/c08c86bc18efd8125964b1d2ca4fc1df59700f30/src/data/connectome.json
- Source data notice: https://github.com/cobanov/flyjump/blob/c08c86bc18efd8125964b1d2ca4fc1df59700f30/THIRD_PARTY_NOTICES.md
- License: https://creativecommons.org/licenses/by/4.0/

The shipped 12-neuron / 26-edge fixture is a manually selected subset of entries in that measured-data extraction. IDs, positions and selected edge counts are retained; this is **not** the complete induced graph among these cells. Selection is a delivery-size fixture, not a validated sensory pathway. Stimulus is injected directly into selected nodes as an engineered input. Source transmitter signs, the original FlyNS rate dynamics, target-sum normalization and motor decoding are modeling assumptions.

Data creators: FlyEM / HHMI Janelia, University of Cambridge, MRC Laboratory of Molecular Biology and Google Research. Upstream circuit extraction: Mert Cobanov / flyjump. No endorsement is implied.

The larger `data:fetch` script downloads measured circuit JSON only. It does not copy Chromium game code, template application code, Three.js scenes, Flybody meshes or trained readout checkpoints. The fly-connectome-template and flyjump application licenses impose conditions distinct from the CC BY data; we did not adopt their application code.

## Application dependencies

Core code: original MIT-licensed JavaScript using browser and Node APIs. Optional Three.js 0.180.0 is MIT; its vendoring script preserves its license. No font files are included. System fonts are used by the app. No official ENS frontend branding, fly-body artwork or game ROM is redistributed.
