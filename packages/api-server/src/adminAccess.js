'use strict';

const DEFAULT_ADMIN_USERNAME = 'set-admin-username';
const DEFAULT_ADMIN_EMAIL = 'admin@example.com';
const DEFAULT_ADMIN_PASSWORD = 'set-admin-password';
const DEFAULT_TIME_ZONE = 'Africa/Johannesburg';
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 17;

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase() || null;
}

function getAdminBootstrapConfig(env = process.env) {
  return {
    username: normalizeUsername(env.TFX_ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME),
    email: String(env.TFX_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim(),
    password: String(env.TFX_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD).trim()
  };
}

function validateAdminBootstrapEnv(env = process.env) {
  const requiredKeys = ['TFX_ADMIN_USERNAME', 'TFX_ADMIN_EMAIL', 'TFX_ADMIN_PASSWORD'];
  const missing = requiredKeys.filter((key) => !String(env[key] || '').trim());
  if (missing.length > 0) {
    throw new Error(`Missing required admin environment variables: ${missing.join(', ')}`);
  }

  return getAdminBootstrapConfig(env);
}

function getAdminAccessPolicy(overrides = {}) {
  const startHour = Number.isFinite(overrides.startHour) ? overrides.startHour : DEFAULT_START_HOUR;
  const endHour = Number.isFinite(overrides.endHour) ? overrides.endHour : DEFAULT_END_HOUR;

  return {
    timeZone: overrides.timeZone || DEFAULT_TIME_ZONE,
    startHour,
    endHour,
    startMinutes: (startHour * 60),
    endMinutes: (endHour * 60)
  };
}

function getClockMinutes(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });

  const parts = formatter.formatToParts(date instanceof Date ? date : new Date(date));
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || '0');
  return (hour * 60) + minute;
}

function isAdminWithinAccessWindow(date = new Date(), policy = getAdminAccessPolicy()) {
  const minutes = getClockMinutes(date, policy.timeZone);
  return minutes >= policy.startMinutes && minutes < policy.endMinutes;
}

function formatAdminAccessWindow(policy = getAdminAccessPolicy()) {
  return `${String(policy.startHour).padStart(2, '0')}:00-${String(policy.endHour).padStart(2, '0')}:00 ${policy.timeZone}`;
}

function createAdminAccessClosedMessage(policy = getAdminAccessPolicy()) {
  return `Admin access is available only during business hours (${formatAdminAccessWindow(policy)}).`;
}

module.exports = {
  createAdminAccessClosedMessage,
  formatAdminAccessWindow,
  getAdminAccessPolicy,
  getAdminBootstrapConfig,
  isAdminWithinAccessWindow,
  normalizeUsername,
  validateAdminBootstrapEnv
};