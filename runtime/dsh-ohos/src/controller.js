import { TaskController } from './core/task-controller.js';
import { RequirementWorkflow } from './workflows/requirement/workflow.js';
import { DeliveryWorkflow } from './workflows/ar-delivery/workflow.js';

// Compatibility façade and domain registration. All business transitions live
// in workflows/*; shared task/lease behavior lives in core/task-controller.js.
export class OhosController extends TaskController {
  constructor(options) {
    super(options);
    this.requirement = new RequirementWorkflow({
      store: this.store, clock: this.clock,
      insertTask: (args) => this.insertTask(args),
      preflight: options.requirementPreflight,
      skillsRoot: options.requirementSkillsRoot, pythonCommand: options.pythonCommand,
    });
    this.delivery = new DeliveryWorkflow({
      store: this.store, taskController: this, clock: this.clock, adapter: options.deliveryAdapter,
    });
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
  set deliveryAdapter(adapter) { this.delivery.adapter = adapter; }
}
