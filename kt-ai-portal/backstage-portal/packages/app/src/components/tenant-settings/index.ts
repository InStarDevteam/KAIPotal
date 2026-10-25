export {
  TenantSettingsProvider,
  useTenantSettings,
} from './TenantSettingsContext';
export { TenantSettingsPage } from './TenantSettingsPage';
export {
  defaultTenantSettings,
  type TenantSettings,
  type TenantBranding,
  type TenantMenuSetting,
} from './settingsModel';

export {
  usePlatformAccess,
  PlatformAccessProvider,
} from './PlatformAccessContext';
export {
  PLATFORM_IDS,
  PLATFORM_DETAILS,
  type PlatformId,
  type PlatformPreferences,
} from './platformAccessModel';
