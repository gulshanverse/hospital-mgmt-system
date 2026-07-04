export const FEATURE_FLAGS = {
  ENABLE_COMMAND_PALETTE: true,
  ENABLE_NOTIFICATION_CENTER: true,
  ENABLE_DESIGN_SYSTEM: true,
  ENABLE_EXPERIMENTAL_COMPONENTS: false,
};

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(key: FeatureFlagKey): boolean {
  // Safe environment query fallback
  return FEATURE_FLAGS[key];
}
