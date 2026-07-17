# Knowledge Architecture

## Contents

1. Hierarchy
2. Mapping rules
3. Machine indexes
4. Generated and manual ownership

## Hierarchy

Keep two linked views:

```text
source domain -> repository/component/target indexes
subsystem -> component or process -> capability -> feature -> evidence
```

A source directory is a physical view. A subsystem is an architecture and product ownership boundary. A component is a packaging/build boundary. A process is a runtime host. These are not interchangeable.

## Mapping Rules

Map components from explicit metadata first. Map targets with the longest component-directory prefix. Fall back to a single component in one repository only when unambiguous. Mark other targets as unmapped.

For a repository without component metadata, a physical top-level directory may supply the subsystem only when every declared sibling component under that directory names the same subsystem. Keep the component empty and the target mapping method unmapped; this rule prevents directory spelling such as `CastEngine` from creating a false subsystem beside `castplus`.

Map processes in this order:

1. Production init/service configuration establishes the host process and primary subsystem.
2. A matching production executable establishes executable ownership.
3. SA profile establishes the SA provider, not necessarily the process owner.
4. Application manifest establishes application ownership.
5. Directory or target-name inference is lower confidence.

Preserve cross-subsystem hosting. Example shape:

```text
host subsystem A / process P
  <- init owner component A1
  <- executable owner component A2
  <- SA provider component B1 from subsystem B
```

## Machine Indexes

Use stable, queryable TSV files for repositories, components, modules, processes, runtime evidence, subsystems, and unmapped modules. Use JSON for aggregate summary, changes, generated-document manifest, and verification results.

Required target categories:

- production
- test
- build-support
- aggregate-codegen

Required runtime roles:

- init-owner
- executable-owner
- sa-provider
- plugin-provider
- app-owner

## Generated And Manual Ownership

Domain-specific generated pages may be overwritten. Shared `README.md` and manual capability/feature pages must be preserved.

Use domain-qualified names such as `<domain>-functional-overview.md` when more than one physical source domain can contribute to the same subsystem or component.

Never place a small feature beside architecture, product, source-domain, or subsystem nodes.
