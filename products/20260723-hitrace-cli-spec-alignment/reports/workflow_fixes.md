# AR Workflow Runtime Fix Audit

## Scope and authorization

During this run, deterministic gate defects in the newly installed workflow blocked evidence that was otherwise valid.
The user explicitly authorized correcting the workflow. These changes are outside the HiTrace component repository and
did not alter PR #1053 or source commit `974e75c012d0779476f789fa1b46546be0891cc6`.

## Fixes

### 1. Recursive developer_test XML discovery

- File: `ohos-ar-dev-phases/scripts/gate_test_ut.py`
- Problem: the gate searched only the report directory root, while developer_test placed XML below nested directories.
- Resolution: discover XML recursively while retaining the same fresh-report and result checks.
- Final SHA-256: `1315f478278eac3547229b06085f07bbaace7119821aca0e82bb27645989001a`

### 2. P6 consent bound to signed DRY evidence

- Files: `advance.py`, `gate_upload_ci.py`, `lib/gatelib.py`
- Problem: P6 required consent before push, but consent could only bind to a closing PASS that cannot exist before push.
- Resolution: record a signed INFO-level DRY diff/stat entry, bind one-time P6 consent to that exact entry, and revalidate
  the evidence HMAC plus artifact SHA-256 before upload and close.
- Final SHA-256:
  - `advance.py`: `acbb79cac7108da1de41b7d6b7bb81d9ccb375e29ad4bf978bbe1cb7c7b72d37`
  - `gate_upload_ci.py`: `7c1988e8539f15da6859ce478e544ddd407843f1c0c501763b6e376c138368ff`
  - `lib/gatelib.py`: `fcccea80253a4cf033f982381beddf09006e3021db203abdd2f393d5da2eb838`

### 3. Shell-free PR creation

- File: `ohos-ar-dev-phases/scripts/gate_upload_ci.py`
- Problem: a multiline PR body was passed through a shell command and shell metacharacters caused parsing failure after
  the commit and push had already succeeded.
- Resolution: invoke `oh-gc pr create` with a subprocess argument vector and no shell interpolation.
- Recovery: the existing pushed SHA was used to create PR #1053; no duplicate commit or PR was produced.

## Verification

- Workflow regression suite: `68` tests, `0` failures, completed in `3.340 s`.
- Python syntax checks passed for all modified scripts.
- P4 and P5 semantics were unchanged.
- P6 DRY evidence hash prefix: `765d24cc8e35`.
- Reviewed component diff SHA-256: `0d2ab68421142e9510d6c7f93a8597a51f4bff9dfd9defde66384b468795daec`.
- Reviewed component stat SHA-256: `f8d097208669a0a2d7cf2030143bb7501174ccec9c219d0043c1051836ea5d53`.
