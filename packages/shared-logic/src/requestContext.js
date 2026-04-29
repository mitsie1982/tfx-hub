/*
 packages/shared-logic/src/requestContext.js
 Helpers for propagating association and client metadata across requests.
*/
function buildAssociationHeaders(context = {}) {
  const headers = {};

  if (context.associationId) headers['x-association-id'] = context.associationId;
  if (context.userId) headers['x-user-id'] = context.userId;
  if (context.correlationId) headers['x-correlation-id'] = context.correlationId;
  if (context.deviceId) headers['x-device-id'] = context.deviceId;
  if (context.platform) headers['x-client-platform'] = context.platform;
  if (context.appVersion) headers['x-client-version'] = context.appVersion;

  return headers;
}

function mergeHeaders(...headerSets) {
  return headerSets.reduce((merged, current) => ({
    ...merged,
    ...(current || {})
  }), {});
}

module.exports = {
  buildAssociationHeaders,
  mergeHeaders
};
