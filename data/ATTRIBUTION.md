# MaleCNS-derived circuit fixture — CC BY 4.0

Dataset: MaleCNS v1.0. Creators: FlyEM / HHMI Janelia, University of Cambridge, MRC Laboratory of Molecular Biology and Google Research.

Official source: https://male-cns.janelia.org/download/
License: Creative Commons Attribution 4.0 International, https://creativecommons.org/licenses/by/4.0/

Upstream selected-circuit extraction: Mert Cobanov / cobanov/flyjump, commit `c08c86bc18efd8125964b1d2ca4fc1df59700f30`, `src/data/connectome.json`. Source notice in that repository distinguishes CC BY measured data from separately licensed application code.

FlyNS changes: manually selected 12 original neuron records and 26 observed directed edges, remapped retained node indices, and added provenance and engineered inputTargets. IDs, coordinates and selected synaptic counts are retained. This is not a complete induced subgraph, a full brain, a pretrained controller or a scientifically validated circuit. Signs, rate dynamics, stimulation and readout are assumptions described in the source. No endorsement is implied.

The optional import script retains the source's 80-neuron selected graph and adds provenance; it copies no application code or pretrained policy. File-level provenance identifies the currently active version. Original FlyNS code is under MIT; this file and circuit data retain the attribution obligations above.
