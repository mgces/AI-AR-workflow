# Navigation Update Policy

Update a navigation node only when a durable ownership term or hierarchy changed.

1. Verify the change in the current source checkout and record the repository HEAD during the work.
2. Add, rename, or remove the affected `subsystems/**/README.md` navigation node.
3. Do not copy the source diff, target list, current branch, product selection, or runtime state into the node.
4. Run `tools/rebuild_navigation.py` to normalize parent/child links and current-source lookup instructions.
5. Rebuild the ignored BM25 index and verify the node can be found.

Removing manual implementation analysis is allowed when it duplicates dynamic source facts. Preserve only durable ownership vocabulary that still helps locate the current repository.
