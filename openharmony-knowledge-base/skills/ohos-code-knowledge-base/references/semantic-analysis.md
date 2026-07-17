# Semantic Analysis Quality

## Contents

1. Evidence priority
2. Component questions
3. Process questions
4. Deep-dive selection

## Evidence Priority

1. Current source and public/internal interfaces.
2. Component metadata: description, syscap, feature, Inner Kit.
3. Source README architecture, constraints, and usage.
4. Init, SA, application, service, and plugin configuration.
5. Production targets and source responsibility areas.
6. Tests and observed runtime evidence.

## Component Questions

Answer what problem the component solves, who calls it, its stable capabilities, its API and data/control entry points, its process membership, major source regions, feature behavior, dependencies, tests, and risks.

Do not use target lists as the functional explanation. Do not translate identifiers mechanically and call that analysis.

## Process Questions

Answer who creates the process, its executable and identity, boot/ondemand/condition behavior, hosted SAs/plugins, provider components, IPC/files/devices, failure and restart behavior, security boundary, and runtime verification method.

For generic SA hosts, explain the hosted capability set and cross-component fault domain.

## Deep-Dive Selection

Create capability/feature pages when at least two apply:

- independent build target or plugin;
- independent configuration/protocol/state machine;
- independent test suite;
- independent runtime or failure domain;
- security/performance/resource boundary;
- continued expected evolution.

Prioritize high-dependency APIs, privileged processes, cross-subsystem hosts, lifecycle code, IPC Stubs, parsers, persistence, and concurrency-sensitive paths.
