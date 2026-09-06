export class ProtocolError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = 'ProtocolError';
    this.code = code;
    this.details = details;
  }
}

export function invariant(condition, code, message, details = undefined) {
  if (!condition) throw new ProtocolError(code, message, details);
}

export function errorPayload(error) {
  if (error instanceof ProtocolError) {
    return {
      error: {
        code: error.code,
        retryable: isRetryable(error.code),
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    };
  }
  return {
    error: {
      code: 'internal_error',
      retryable: false,
      message: 'The OHOS workflow service failed unexpectedly.',
    },
  };
}

function isRetryable(code) {
  return new Set([
    'lease_lost',
    'external_state_unknown',
    'quota_blocked',
    'awaiting_host',
  ]).has(code);
}
