/** Helpers for .NET-flavoured values that show up in VRCOSC and MagicChatbox files. */

/** 100-nanosecond intervals between 0001-01-01T00:00:00Z and the Unix epoch. */
export const DOTNET_EPOCH_TICKS = 621_355_968_000_000_000n;

export function dateToDotnetTicks(date: Date): bigint {
  return BigInt(date.getTime()) * 10_000n + DOTNET_EPOCH_TICKS;
}

export function dotnetTicksToDate(ticks: bigint): Date {
  return new Date(Number((ticks - DOTNET_EPOCH_TICKS) / 10_000n));
}

/** Newtonsoft round-trip format for a local DateTime, e.g. `2025-05-01T14:03:22.1234567+02:00`. */
export function formatDotnetDateTime(date: Date): string {
  const pad = (n: number, width = 2): string => String(n).padStart(width, '0');
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  return (
    `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `.${pad(date.getMilliseconds(), 3)}0000${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

/** `DateTime.MinValue` as Newtonsoft writes it. */
export const DOTNET_MIN_DATE = '0001-01-01T00:00:00';

/** Lower-case hyphenated GUID, as `Guid.ToString()` produces. */
export function newGuid(): string {
  return crypto.randomUUID();
}
