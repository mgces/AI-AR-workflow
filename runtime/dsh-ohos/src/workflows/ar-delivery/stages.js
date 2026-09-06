import { ProtocolError } from '../../core/errors.js';

export const DELIVERY_STAGES = Object.freeze([
  stage('P0', 0, 'environment-analyst', 'gate_env_init.py', {
    objective: 'Probe the configured OHOS source, build toolchain, test framework, and device connection.',
  }),
  stage('P1', 1, 'design-architect', 'gate_design.py', {
    consent: true,
    objective: 'Produce AR_design.md with the signed ar-contract and run the deterministic design gate.',
  }),
  stage('P2', 2, 'implementer', 'gate_develop.py', {
    objective: 'Implement the approved design inside its declared scope and run the development gate.',
  }),
  stage('P3', 3, 'test-author', 'gate_test_develop.py', {
    objective: 'Create or adopt contract-linked tests without changing frozen functional code, then run the test-development gate.',
  }),
  stage('P4', 4, 'build-runner', 'gate_build.py', {
    capabilities: ['build_execution'],
    objective: 'Build the configured target, capture logs and declared artifacts, and run the build gate.',
  }),
  stage('P5', 5, 'unit-test-runner', 'gate_test_ut.py', {
    capabilities: ['build_execution'],
    objective: 'Run the contract-selected unit-test target and suite and emit the signed unit-test evidence.',
  }),
  stage('P6', 6, 'device-test-runner', 'gate_device_func.py', {
    capabilities: ['device_access'],
    consent: true,
    objective: 'Deploy and exercise the real feature on a device, bind runtime evidence, and run the device-functional gate.',
  }),
  stage('P7', 7, 'quality-reviewer', 'gate_integration.py', {
    capabilities: ['build_execution', 'device_access'],
    consent: true,
    objective: 'Collect quality measurements and an issue-free review report, then run the integration gate.',
  }),
  stage('P8-precheck', 8, 'publisher', 'gate_upload_ci.py', {
    capabilities: ['network_publish'],
    consent: true,
    validation: 'upload-precheck',
    objective: 'Run the upload gate without --allow-push so it signs the exact diff and destination for human review.',
  }),
  stage('P8-publish', 8, 'publisher', 'gate_upload_ci.py', {
    capabilities: ['network_publish'],
    validation: 'advance',
    objective: 'After recorded consent, rerun the upload gate with --allow-push, reconcile the PR/CI result, and emit final PASS evidence.',
  }),
]);

const BY_KEY = new Map(DELIVERY_STAGES.map((item, index) => [item.key, { ...item, index }]));

export function deliveryStage(key) {
  const value = BY_KEY.get(key);
  if (!value) throw new ProtocolError('invalid_delivery_stage', `Unknown delivery stage: ${key}`);
  return value;
}

export function firstDeliveryStage() {
  return deliveryStage(DELIVERY_STAGES[0].key);
}

export function nextDeliveryStage(key) {
  const current = deliveryStage(key);
  const next = DELIVERY_STAGES[current.index + 1];
  return next ? deliveryStage(next.key) : null;
}

export function deliveryPosition(pythonState) {
  if (pythonState?.complete === true) return { complete: true, stage: null, status: 'completed' };
  const phase = pythonState?.current_phase;
  if (!Number.isInteger(phase) || phase < 0 || phase > 8) {
    throw new ProtocolError('invalid_python_result',
      `Python delivery state has invalid current_phase: ${phase}`);
  }

  if (phase === 8) {
    if (pythonState.gate?.ok === true && pythonState.consent?.ok === true) {
      return { complete: false, stage: deliveryStage('P8-publish'), status: 'ready_to_advance' };
    }
    if (pythonState.upload_precheck?.ok === true) {
      return pythonState.consent?.ok === true
        ? { complete: false, stage: deliveryStage('P8-publish'), status: 'queued' }
        : { complete: false, stage: deliveryStage('P8-precheck'), status: 'awaiting_consent' };
    }
    return { complete: false, stage: deliveryStage('P8-precheck'), status: 'queued' };
  }

  const stage = deliveryStage(`P${phase}`);
  if (pythonState.gate?.ok !== true) {
    return { complete: false, stage, status: 'queued' };
  }
  if (stage.consent && pythonState.consent?.ok !== true) {
    return { complete: false, stage, status: 'awaiting_consent' };
  }
  return { complete: false, stage, status: 'ready_to_advance' };
}

export function deliveryTaskInstructions(key, pipelineDir) {
  const current = deliveryStage(key);
  const p8Rule = key === 'P8-precheck'
    ? 'Do not pass --allow-push. This task must stop after producing the signed consent precheck.'
    : key === 'P8-publish'
      ? 'Consent is already recorded. Use --allow-push, then wait for the authoritative PR/CI result.'
      : '';
  return [
    current.objective,
    `The authoritative pipeline directory is ${pipelineDir}.`,
    `Follow the repository phase instructions and run ${current.gate} with --pipeline-dir set to that directory.`,
    'Submit only after the gate has written its signed evidence. Include the relevant evidence and report paths as artifact_refs.',
    'A DSH submission is not PASS. The parent validator will verify the Python evidence and advance the authoritative pipeline.',
    p8Rule,
  ].filter(Boolean);
}

function stage(key, phaseNumber, role, gate, options = {}) {
  return Object.freeze({
    key,
    phaseNumber,
    role,
    gate,
    validation: options.validation ?? 'advance',
    consent: options.consent ?? false,
    capabilities: Object.freeze([
      'mcp_tools', 'native_subagent', 'workspace_write', ...(options.capabilities ?? []),
    ]),
    objective: options.objective,
  });
}
