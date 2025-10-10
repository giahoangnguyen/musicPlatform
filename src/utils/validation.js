const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validationError(message, details) {
    const err = new Error(message);
    err.name = 'ValidationError';
    err.status = 400;
    err.code = 'validationError';
    if (details) err.details = details;
    return err;
}

function assertString(value, name, opts = {}) {
    if (typeof value !== 'string') {
      throw validationError(`${name} must be a string`);
    }
    const v = value.trim();
  
    if (typeof opts.min === 'number' && v.length < opts.min) {
      throw validationError(`${name} must be at least ${opts.min} characters`);
    }
    if (typeof opts.max === 'number' && v.length > opts.max) {
      throw validationError(`${name} must be at most ${opts.max} characters`);
    }
    return v;
}

function assertEmail(value, name = 'email') {
    const v = assertString(value, name, { min: 3, max: 255 });
    if (!EMAIL_REGEX.test(v)) {
      throw validationError(`${name} is not a valid email`);
    }
    return v.toLowerCase();
}

function assertPassword(value, name = 'password', opts = {}) {
    const min = Number.isInteger(opts.min) ? opts.min : 8;
    const v = assertString(value, name, { min, max: 1024 });
    return v;
}

function assertId(value, name = 'id', opts = {}) {
    const v = assertString(value, name, { min: 1, max: 255 });
    if (opts.uuid && !UUID_V4_REGEX.test(v)) {
      throw validationError(`${name} must be a valid UUID v4`);
    }
    return v;
}

function pickPagination(req, opts = {}) {
    const limitDefault = Number.isInteger(opts.defaultLimit) ? opts.defaultLimit : 20;
    const offsetDefault = Number.isInteger(opts.defaultOffset) ? opts.defaultOffset : 0;
  
    const limit =
      Number.isInteger(req?.pagination?.limit) ? req.pagination.limit : limitDefault;
    const offset =
      Number.isInteger(req?.pagination?.offset) ? req.pagination.offset : offsetDefault;
  
    return { limit, offset };
}

function requireFields(body, fields) {
    const missing = [];
    for (const f of fields) {
      if (
        body == null ||
        !(f in body) ||
        body[f] === undefined ||
        body[f] === null ||
        (typeof body[f] === 'string' && body[f].trim() === '')
      ) {
        missing.push(f);
      }
    }
    if (missing.length) {
      throw validationError(`Missing required field(s): ${missing.join(', ')}`, {
        missing,
      });
    }
}

function assertInt(value, name, opts = {}) {
  const n = Number(value);
  if (!Number.isInteger(n)) throw validationError(`${name} must be an integer`);
  if (opts.min != null && n < opts.min) throw validationError(`${name} must be >= ${opts.min}`);
  if (opts.max != null && n > opts.max) throw validationError(`${name} must be <= ${opts.max}`);
  return n;
}

function assertBoolean(value, name = 'value') {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  throw validationError(`${name} must be a boolean`);
}

function assertOneOf(value, allowed, name) {
    const v = assertString(value, name);
    if (!allowed.includes(v)) {
      throw validationError(`${name} must be one of: ${allowed.join(', ')}`);
    }
    return v;
}

module.exports = {
    validationError,
    assertString,
    assertEmail,
    assertPassword,
    assertId,
    pickPagination,
    requireFields,
    assertOneOf,
    assertInt,
    assertBoolean,
};