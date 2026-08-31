# OpenHarmony security review lens

Use this reference for system-component and IPC-facing changes.

- Trace trust boundaries across IPC, N-API, files, sockets, system parameters and device data.
- Verify caller identity, permission checks and token scope before privileged work; check TOCTOU between validation and use.
- Bound all external lengths, counts, offsets, enum values and parcel fields before allocation or indexing.
- Review sensitive-data lifetime, log exposure, dump output, persistence, crash artifacts and cross-user leakage.
- Check service registration, exported interfaces, SA startup paths and denial-of-service costs.
- Inspect concurrency and teardown for use-after-free, double completion, stale callbacks and resource exhaustion.
- Distinguish a code-level mitigation from platform policy; identify the configuration or manifest evidence when security depends on it.

Do not mark a control present merely because a helper has a security-related name. Follow the actual success and failure paths.
