// Utility to normalize legacy entity names to new codes
const LEGACY_MAP: Record<string, string> = {
  CCMS: "CCMS",
  AMMS: "AMMS",
};

export function normalizeEntity(value: string): string {
  return LEGACY_MAP[value] || value;
}
