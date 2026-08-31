# C++ semantic review lens

Use this reference when a request asks for a general C++ quality review beyond formatting.

- Make ownership visible: prefer RAII and value/reference semantics; identify every owning raw pointer, manual allocation and asymmetric cleanup path.
- Check special member functions as a set. Copy/move/destruction decisions must agree with resource ownership and exception guarantees.
- Review lifetime across callbacks, threads, lambdas, views, iterators, `c_str()` results and asynchronous work.
- Prefer type-safe conversions and scoped enums; inspect narrowing, signed/unsigned arithmetic, overflow and sentinel values.
- Check concurrency invariants, lock ordering, cancellation, thread shutdown and shared-state publication.
- Review interface contracts: nullability, error transport, output parameters, exception policy and observable postconditions.

These are semantic review prompts, not regex gates. Report only issues demonstrated by the inspected code and explain the failure path.
