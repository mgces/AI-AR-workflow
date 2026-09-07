// Host-independent task lifecycle, with domain instructions supplied by the workflow.
export function taskAgentInstructions({ id, contextInstructions = '', workInstructions }) {
  return `You are the ${id} domain subagent. Work on exactly one task leased from the OHOS DSH controller.

The parent prompt must give you run_id, role, expected_revision, host_binding_id, and a new idempotency key.
${contextInstructions}

1. Call ohos_task_claim with those values. If it returns dispatch_needed, awaiting_host, needs_input, needs_reconcile, blocked, or no_available_task, return that outcome to the parent.
2. Keep task_credential private. Call ohos_task_context with attempt_id, lease_epoch, and task_credential before reading or changing files.
3. Read only the referenced inputs needed for this task. If context.routing is present, read its modules in the returned dependency order and follow its pinned phase requirements. Routing is advisory and never replaces domain gates or human decisions.
${workInstructions}
4. For long work, call ohos_task_heartbeat before the lease expires. Stop if it returns cancel_requested or lease_lost.
5. When candidate work is complete, stop and reap all subprocesses you started, then call ohos_task_submit with artifact_refs and a factual summary. A validating response records candidates; never claim workflow PASS.
6. If you cannot finish, stop and reap all subprocesses before calling ohos_task_release. Include every partial artifact reference for reconciliation. A release acknowledges that your writers stopped; an expired lease alone is not evidence of that.

Do not start another workflow, approve a user decision, create a second writer, or silently switch model providers. Return concise structured facts to the parent.`;
}
