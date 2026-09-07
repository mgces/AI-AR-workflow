import { TaskController } from './core/task-controller.js';
import { RequirementWorkflow } from './workflows/requirement/workflow.js';
import { DeliveryWorkflow } from './workflows/ar-delivery/workflow.js';
import { PolicyRegistry } from './policy/policy-registry.js';
import { BudgetLedger } from './policy/budget-ledger.js';
import { RepairPlanner } from './policy/repair-planner.js';
import { normalizeFailure } from './policy/failure-normalizer.js';

// Compatibility façade and domain registration. All business transitions live
// in workflows/*; shared task/lease behavior lives in core/task-controller.js.
export class OhosController extends TaskController {
  constructor(options) {
    super(options);
    this.policy = options.policy ?? new PolicyRegistry({ store: this.store,
      skillsRoot: options.policySkillsRoot, clock: this.clock });
    this.initializeRun = (runId) => this.policy.bind(runId);
    this.contextExtension = (row) => ({ routing: this.policy.context(row) });
    this.budgets = new BudgetLedger({ store: this.store, policy: this.policy, clock: this.clock });
    this.requirement = new RequirementWorkflow({
      store: this.store, clock: this.clock,
      insertTask: (args) => this.insertTask(args),
      preflight: options.requirementPreflight,
      skillsRoot: options.requirementSkillsRoot, pythonCommand: options.pythonCommand,
    });
    this.delivery = new DeliveryWorkflow({
      store: this.store, taskController: this, clock: this.clock, adapter: options.deliveryAdapter,
      failureHints: (runId, phase, error) => normalizeFailure({ phase, message: error.message },
        this.policy.read(this.policy.binding(runId).policy_id).strategies),
    });
    this.repairs = new RepairPlanner({ store: this.store, policy: this.policy,
      budgets: this.budgets, adapter: options.deliveryAdapter, clock: this.clock });
    this.registerWorkflow('requirement', this.requirement);
    this.registerWorkflow('delivery', this.delivery);
  }

  // Keep the existing exported controller API and persisted workflow IDs.
  startRun(args, principal) { return this.createRun(args, principal); }
  startDelivery(args, principal) { return this.delivery.start(args, principal); }
  validateDeliveryTask(args, principal) { return this.delivery.validate(args, principal); }
  consentDelivery(args, principal) { return this.delivery.consent(args, principal); }
  syncDelivery(args, principal) { return this.delivery.sync(args, principal); }
  get deliveryAdapter() { return this.delivery.adapter; }
  set deliveryAdapter(adapter) { this.delivery.adapter = adapter; this.repairs.adapter = adapter; }
}
