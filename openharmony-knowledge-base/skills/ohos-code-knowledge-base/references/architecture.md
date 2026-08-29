# Navigation Architecture

## Stable Navigation Layer

The committed knowledge base stores only durable ownership and navigation:

```text
subsystem
  -> component or process
    -> capability
      -> feature
        -> current-source lookup
```

Physical source domains, products, targets, processes, and files are not parallel knowledge layers. They are current-source facts discovered after navigation.

Navigation nodes may contain names, parent/child relationships, aliases, and commands for locating the current source. They must not claim that a repository, target, process, interface, configuration, or behavior still exists.

## Dynamic Source Layer

Resolve dynamic facts from the active OpenHarmony checkout:

```text
repo manifest and Git HEAD
  -> bundle/component metadata
    -> BUILD.gn/.gni and interfaces
      -> product/init/SA/runtime configuration
        -> build, test, device, and CI evidence
```

Store the verified repository path and HEAD with any implementation decision. A navigation node can be stale without invalidating the source; a source mismatch invalidates the navigation hint.

## Excluded Persistent Content

Do not commit workspace state, generated repository/component/module tables, source-domain scans, product selection snapshots, generated runtime maps, or copied pipeline evidence. These are regenerated or inspected in the source workspace when needed.
