export const objectSchema = (properties, required = []) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});
export const id = { type: 'string', minLength: 1, maxLength: 128 };
export const ref = { type: 'string', minLength: 1, maxLength: 4096 };
export const integer = { type: 'integer', minimum: 0 };
