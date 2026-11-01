/**
 * NoSQL Injection Protection Middleware
 * Recursively strips any keys that start with '$' or contain '.' from req.body, req.query, and req.params
 */
function sanitize(payload) {
  if (payload === null || typeof payload !== 'object') {
    return payload;
  }

  if (Array.isArray(payload)) {
    for (let i = 0; i < payload.length; i++) {
      payload[i] = sanitize(payload[i]);
    }
    return payload;
  }

  for (const key of Object.keys(payload)) {
    // Prohibit keys starting with '$' or containing '.' in object keys (used in MongoDB operator injection)
    if (key.startsWith('$') || key.includes('.')) {
      delete payload[key];
    } else {
      payload[key] = sanitize(payload[key]);
    }
  }

  return payload;
}

const noSqlSanitize = (req, res, next) => {
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  next();
};

module.exports = {
  noSqlSanitize,
  sanitize
};
