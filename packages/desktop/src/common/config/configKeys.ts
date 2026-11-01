import type { Theme } from '@/common/theme/types';
import type { AircraftProject, ReviewAction } from '@/common/types/aircraftProject';

export type ConfigKeyMap = {
  language: string;
  'ui.zoomFactor': number | undefined;
  'ui.fontSize.app': number | undefined;
  'ui.fontSize.chat': number | undefined;
  'ui.fontSize.markdown': number | undefined;
  'ui.fontSize.code': number | undefined;
  'ui.fontFamily.app': string | undefined;
  'ui.fontFamily.chat': string | undefined;
  'ui.fontFamily.markdown': string | undefined;
  'ui.fontFamily.code': string | undefined;
  'ui.fontWeight.app': string | undefined;
  'ui.fontWeight.chat': string | undefined;
  'ui.fontWeight.markdown': string | undefined;
  'ui.fontWeight.code': string | undefined;
  /**
   * Aviation-engineer surface: hides developer controls (agent picker,
   * permission modes, skills/MCP, slash/@ hints, scheduled tasks, teams).
   * `undefined` means on.
   */
  'ui.engineerMode': boolean | undefined;
  /** Aircraft projects shown as cards in the engineer-mode sidebar. */
  'aviator.projects': AircraftProject[] | undefined;
  /** Append-only user judgements (correct / wrong / supplement) and readiness changes, all projects. */
  'aviator.reviewActions': ReviewAction[] | undefined;
  'window.bounds': { x?: number; y?: number; width: number; height: number } | undefined;
  'webui.desktop.enabled': boolean | undefined;
  'webui.desktop.allowRemote': boolean | undefined;
  'webui.desktop.port': number | undefined;
  'theme.activeId': string;
  'theme.userThemes': Theme[];
  'workspace.pasteConfirm': boolean | undefined;
  'guid.lastAssistantId': string | undefined;
  /** User-defined order for the enabled assistant picker surfaces. */
  'assistants.enabledOrder': string[] | undefined;
  'upload.saveToWorkspace': boolean | undefined;
  'system.closeToTray': boolean | undefined;
  'system.notificationEnabled': boolean | undefined;
  'system.cronNotificationEnabled': boolean | undefined;
  'system.keepAwake': boolean | undefined;
  'skillsMarket.enabled': boolean | undefined;
  'pet.enabled': boolean | undefined;
  'pet.size': number | undefined;
  'pet.dnd': boolean | undefined;
  'pet.confirmEnabled': boolean | undefined;
  // Removed: 'system.autoPreviewOfficeFiles'. It gated "auto-open a preview tab
  // when an Office file appears in the workspace", a behaviour that was dropped
  // along with its hook — leaving the toggle would have been a switch the user
  // can flip with nothing behind it. Existing values may still sit in older
  // installs' stored preferences; nothing reads them, and the migration ignores
  // unknown keys, so they are inert.
  // One-shot completion flags for legacy → backend migrations. Kept in the
  // local config file (not the backend client-preferences bag) so a downgrade
  // to a pre-flag build still re-reads the legacy data unchanged. See
  // `migrateProviders` / `migrateAssistantsToBackend` (ELECTRON-1KT).
  'migration.providersMigrated_v1': boolean | undefined;
  'migration.assistantsMigrated_v1': boolean | undefined;
};

export type ConfigKey = keyof ConfigKeyMap;
