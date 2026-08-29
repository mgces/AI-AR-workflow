# Current-Source Verification

## Evidence Priority

1. Current source at a recorded repository HEAD.
2. Current `bundle.json`, `BUILD.gn`/`.gni`, interfaces, and production configuration.
3. Current tests and callers.
4. Current build, device, and CI evidence.
5. Stable navigation labels.

The knowledge base is never evidence for levels 1-4.

## Required Checks

Before using a candidate in a design or patch:

- resolve the repository through the active repo manifest;
- record its current HEAD;
- prove the file or symbol exists with current-source search;
- inspect the owning build and component metadata;
- inspect representative callers and tests;
- verify product/runtime claims from the current configuration or runtime evidence.

Mark a conclusion `unverified` when the active checkout or required evidence is unavailable. Do not fill gaps from historical navigation text.
