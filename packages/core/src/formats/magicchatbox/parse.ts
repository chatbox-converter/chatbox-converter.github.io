import type {
  AfkSettings,
  ChatboxProfile,
  OscSettings,
  OutputSettings,
  StatusCycle,
} from '../../model/profile';
import { createSegment, type Segment } from '../../model/segments';
import { clamp } from '../../util/json';
import { DiagnosticCollector, type ConfigFile, type ParseResult } from '../codec';
import {
  FILES,
  INTEGRATIONS,
  isSortKey,
  SORT_KEYS,
  type Integration,
  type SortKey,
} from './catalog';
import { expandNewlines, FileSet, Reader } from './files';
import { defaultStatuses, parseStatusList } from './statuses';
import { TEMPLATE_BUILDERS, type ParseContext } from './templates';

export const EXTRAS_KEY = 'magicchatbox';

/** Shape of `profile.extras.magicchatbox`. */
export interface MagicchatboxExtras {
  readonly files: Record<string, unknown>;
}

function parseCycle(app: Reader): StatusCycle {
  return {
    enabled: app.bool('CycleStatus', false),
    intervalSeconds: app.num('SwitchStatusInterval', 5),
    random: app.bool('IsRandomCycling', false),
  };
}

function parseAfk(files: FileSet): AfkSettings {
  const afk = new Reader(files.object(FILES.afk));
  const styleId = afk.str('ActiveStyleId', '');
  const custom = afk
    .objects('CustomStyles')
    .map((style) => new Reader(style))
    .find((style) => style.str('Id', '') === styleId && styleId !== '');
  const showPrefix = custom?.bool('ShowPrefix', true) ?? afk.bool('ShowPrefixIcon', true);
  const prefix = custom?.str('Prefix', '💤') ?? afk.str('AfkPrefix', '💤');
  const showTime = custom?.bool('ShowTime', true) ?? afk.bool('ShowAFKTime', true);
  const withTime =
    custom?.str('MessageWithTime', '') ?? afk.str('AfkMessageForTimeStamp', 'ᶜᵘʳʳᵉⁿᵗˡʸ AFK ᶠᵒʳ ');
  const withoutTime =
    custom?.str('MessageWithoutTime', '') ?? afk.str('AfkMessageWithoutTimeStamp', 'ᶜᵘʳʳᵉⁿᵗˡʸ AFK');
  const body = showTime ? `${withTime}{afk_duration}` : withoutTime;
  return {
    enabled: afk.bool('EnableAfkDetection', true),
    timeoutSeconds: afk.num('AfkTimeout', 120),
    template: showPrefix && prefix.trim() !== '' ? `${prefix} ${body}` : body,
    replaceEverything: false,
  };
}

function parseOutput(app: Reader): OutputSettings {
  const separator = app.str('OscMessageSeparator', ' ┆ ');
  return {
    separator: separator.trim() === '' ? ' ┆ ' : separator,
    separateWithNewlines: app.bool('SeperateWithENTERS', true),
    prefix: expandNewlines(app.str('OscMessagePrefix', '')),
    suffix: expandNewlines(app.str('OscMessageSuffix', '')),
    minimalBackground: app.bool('BlankEgg', false),
    sendIntervalSeconds: clamp(app.num('ScanningInterval', 1), 0.7, 10),
  };
}

function parseOsc(files: FileSet): OscSettings {
  const osc = new Reader(files.object(FILES.osc));
  return { host: osc.str('OscIP', '127.0.0.1'), port: osc.num('OscPortOut', 9000) };
}

/** The app's load rule: unknown keys dropped, missing keys appended in default order. */
export function normalizeSortOrder(saved: readonly string[] | undefined): SortKey[] {
  const order: SortKey[] = [];
  for (const key of saved ?? []) {
    if (isSortKey(key) && !order.includes(key)) {
      order.push(key);
    }
  }
  for (const key of SORT_KEYS) {
    if (!order.includes(key)) {
      order.push(key);
    }
  }
  return order;
}

function readToggle(integration: Integration, intgr: Reader, weather: Reader): boolean {
  return integration.sortKey === 'Weather'
    ? weather.bool(integration.toggle, integration.toggleDefault)
    : intgr.bool(integration.toggle, integration.toggleDefault);
}

function parseSegments(ctx: ParseContext): Segment[] {
  const intgr = new Reader(ctx.files.object(FILES.integration));
  const weather = new Reader(ctx.files.object(FILES.weather));
  return normalizeSortOrder(intgr.strings('SavedSortOrder')).map((sortKey) => {
    const integration = INTEGRATIONS.find((entry) => entry.sortKey === sortKey) ?? INTEGRATIONS[0];
    if (integration === undefined) {
      throw new Error('Integration table is empty.');
    }
    const built = TEMPLATE_BUILDERS[sortKey](ctx);
    const gate = integration.gate;
    return createSegment(integration.kind, {
      id: `mcb-${sortKey}`,
      enabled: readToggle(integration, intgr, weather),
      visibility: {
        desktop:
          gate === undefined ? false : intgr.bool(`${gate}_DESKTOP`, integration.desktopDefault),
        vr: gate === undefined ? true : intgr.bool(`${gate}_VR`, integration.vrDefault),
      },
      template: built.template,
      ...(built.options === undefined ? {} : { options: built.options }),
    });
  });
}

export function parseMagicchatbox(files: readonly ConfigFile[]): ParseResult {
  const collector = new DiagnosticCollector();
  const set = new FileSet(files);
  const app = new Reader(set.object(FILES.app));
  const ctx: ParseContext = { files: set, app, collector };
  const statuses = parseStatusList(set.raw(FILES.statusList)) ?? defaultStatuses();

  const missing = [FILES.integration, FILES.app, FILES.statusList].filter((name) => !set.has(name));
  if (missing.length > 0) {
    collector.info(
      'defaults-used',
      `${missing.join(', ')} not provided; MagicChatbox defaults were assumed.`,
    );
  }

  const extras: MagicchatboxExtras = { files: set.all() };
  const profile: ChatboxProfile = {
    version: 1,
    meta: { name: 'MagicChatbox import', source: 'magicchatbox', notes: [] },
    statuses,
    statusCycle: parseCycle(app),
    afk: parseAfk(set),
    output: parseOutput(app),
    osc: parseOsc(set),
    segments: parseSegments(ctx),
    extras: { [EXTRAS_KEY]: extras },
  };
  return { profile, diagnostics: collector.all() };
}
