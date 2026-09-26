import {
  activeStatus,
  createStatusItem,
  type ChatboxProfile,
  type StatusCycle,
  type StatusItem,
} from '../../model/profile';
import { placeholdersIn } from '../../model/template';
import type { DiagnosticCollector } from '../codec';
import { findModule } from './catalog';
import { bluscreamModuleId } from './modules-bluscream';
import { isVObject, vArray, vBoolean, vNumber, vString, type VJson, type VObject } from './vjson';

/**
 * The Bluscream Status module (`statusmodule`) holds a status list with
 * cycling and groups, exactly what the neutral model's `statuses` +
 * `statusCycle` describe. Serialize uses it whenever the built-in `text`
 * variable would lose something; parse reads the list back from
 * `modules/bluscream.vrcosc.modules.statusmodule.json`.
 */
export const STATUS_MODULE_ID = bluscreamModuleId('statusmodule');

const DEFAULT_INTERVAL = 30;

/** More than one status, cycling, or groups: the built-in text variable cannot hold that. */
export function needsStatusModule(profile: ChatboxProfile): boolean {
  const usesStatus = profile.segments.some(
    (segment) => segment.enabled && placeholdersIn(segment.template).includes('status'),
  );
  if (!usesStatus) {
    return false;
  }
  return (
    profile.statuses.length > 1 ||
    profile.statusCycle.enabled ||
    profile.statuses.some((item) => item.group !== '')
  );
}

/** Non-default `settings` of the Status module for this profile (active status first). */
export function statusModuleSettings(profile: ChatboxProfile): VObject {
  const active = activeStatus(profile);
  const ordered =
    active === undefined
      ? profile.statuses
      : [active, ...profile.statuses.filter((item) => item !== active)];
  const settings: VObject = {
    statuses: ordered.map((item) => ({
      text: item.text,
      group: item.group,
      cycle: item.useInCycle,
    })),
  };
  if (profile.statusCycle.enabled) {
    settings['cycle'] = true;
  }
  const interval = Math.max(1, Math.round(profile.statusCycle.intervalSeconds));
  if (interval !== DEFAULT_INTERVAL) {
    settings['interval'] = interval;
  }
  if (profile.statusCycle.random) {
    settings['random'] = true;
  }
  // The neutral model's status is plain text; the icon prefix would add a "💬 ".
  settings['prefixicon'] = false;
  return settings;
}

export interface StatusModuleImport {
  readonly statuses: StatusItem[];
  readonly statusCycle: StatusCycle;
}

function readEntry(json: VJson, index: number): StatusItem | undefined {
  if (!isVObject(json)) {
    return undefined;
  }
  const text = vString(json['text'], '');
  if (text.trim() === '') {
    return undefined;
  }
  return createStatusItem(text, {
    id: `vrcosc-status-${index}`,
    useInCycle: vBoolean(json['cycle'], true),
    group: vString(json['group'], ''),
  });
}

/**
 * Statuses and cycling from the module's settings. Without the module file the
 * list is unknown: one placeholder status is created and a warning raised.
 */
export function readStatusModule(
  settings: VObject | undefined,
  collector: DiagnosticCollector,
): StatusModuleImport {
  const module = findModule(STATUS_MODULE_ID);
  if (settings === undefined) {
    collector.warn(
      'status-module-missing',
      `The ChatBox uses the ${module?.title ?? 'Status'} module but modules/${STATUS_MODULE_ID}.json was not provided; the status list could not be recovered.`,
    );
    return {
      statuses: [
        createStatusItem('Status', { id: 'vrcosc-status-0', active: true, useInCycle: true }),
      ],
      statusCycle: { enabled: false, intervalSeconds: 10, random: false },
    };
  }
  const statuses = vArray(settings['statuses'])
    .map((entry, index) => readEntry(entry, index))
    .filter((item): item is StatusItem => item !== undefined)
    .map((item, index) => (index === 0 ? { ...item, active: true } : item));
  const cycle = vBoolean(settings['cycle'], false);
  return {
    statuses,
    statusCycle: {
      enabled: cycle,
      intervalSeconds: Math.max(1, vNumber(settings['interval'], DEFAULT_INTERVAL)),
      random: vBoolean(settings['random'], false),
    },
  };
}
