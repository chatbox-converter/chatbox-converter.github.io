import {
  TEMPERATURE_UNITS,
  WEATHER_LOCATION_MODES,
  type HardwareOptions,
  type TimeOptions,
  type WeatherOptions,
} from '@chatbox-converter/core';
import { useId, useMemo } from 'react';
import { Checkbox } from '@/components/Checkbox';
import {
  Help,
  NumberField,
  OptionCard,
  Row,
  SegmentedField,
  SubHeading,
  TextField,
} from './controls';
import type { PanelProps } from './panels-media';

const UNIT_OPTIONS = TEMPERATURE_UNITS.map((unit) => ({ value: unit, label: `°${unit}` }));

export function HardwarePanel({
  options,
  onChange,
}: PanelProps<HardwareOptions>): React.JSX.Element {
  return (
    <OptionCard>
      <SubHeading>Units and layout</SubHeading>
      <SegmentedField
        label="Temperatures in"
        value={options.temperatureUnit}
        options={UNIT_OPTIONS}
        onChange={(temperatureUnit) => {
          onChange({ ...options, temperatureUnit });
        }}
      />
      <TextField
        label="Between CPU, GPU, RAM and VRAM"
        width="short"
        inline
        value={options.separator}
        onChange={(separator) => {
          onChange({ ...options, separator });
        }}
      />
      <Help>Used by apps that lay the stats out for you instead of following your template.</Help>
    </OptionCard>
  );
}

function supportedTimeZones(): readonly string[] {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return [];
  }
}

export function TimePanel({ options, onChange }: PanelProps<TimeOptions>): React.JSX.Element {
  const listId = useId();
  const zones = useMemo(() => supportedTimeZones(), []);
  return (
    <OptionCard>
      <SubHeading>How the time is written</SubHeading>
      <Checkbox
        label="Use the 24-hour clock"
        checked={options.use24Hour}
        onChange={(use24Hour) => {
          onChange({ ...options, use24Hour });
        }}
      />
      <Checkbox
        label="Show seconds"
        checked={options.showSeconds}
        onChange={(showSeconds) => {
          onChange({ ...options, showSeconds });
        }}
      />
      <Checkbox
        label="Show the time zone after the time"
        checked={options.showTimezone}
        onChange={(showTimezone) => {
          onChange({ ...options, showTimezone });
        }}
      />
      <TextField
        label="Time zone"
        width="auto"
        inline
        placeholder="Your PC's own zone"
        {...(zones.length > 0 ? { list: listId } : {})}
        value={options.timezone}
        onChange={(timezone) => {
          onChange({ ...options, timezone });
        }}
      />
      {zones.length > 0 ? (
        <datalist id={listId}>
          {zones.map((zone) => (
            <option key={zone} value={zone} />
          ))}
        </datalist>
      ) : null}
      <Help>An IANA name such as Europe/Berlin. Leave it empty to follow the PC&apos;s clock.</Help>
    </OptionCard>
  );
}

const LOCATION_OPTIONS = WEATHER_LOCATION_MODES.map((mode) => ({
  value: mode,
  label: mode === 'city' ? 'City' : mode === 'coordinates' ? 'Coordinates' : 'My IP address',
}));

export function WeatherPanel({ options, onChange }: PanelProps<WeatherOptions>): React.JSX.Element {
  return (
    <OptionCard>
      <SubHeading>Where and how often</SubHeading>
      <SegmentedField
        label="Temperatures in"
        value={options.temperatureUnit}
        options={UNIT_OPTIONS}
        onChange={(temperatureUnit) => {
          onChange({ ...options, temperatureUnit });
        }}
      />
      <SegmentedField
        label="Find my location by"
        value={options.locationMode}
        options={LOCATION_OPTIONS}
        onChange={(locationMode) => {
          onChange({ ...options, locationMode });
        }}
      />
      {options.locationMode === 'city' ? (
        <TextField
          label="City"
          width="auto"
          inline
          placeholder="Amsterdam"
          value={options.city}
          onChange={(city) => {
            onChange({ ...options, city });
          }}
        />
      ) : null}
      {options.locationMode === 'coordinates' ? (
        <Row>
          <NumberField
            label="Latitude"
            min={-90}
            max={90}
            step={0.0001}
            value={options.latitude}
            onChange={(latitude) => {
              onChange({ ...options, latitude });
            }}
          />
          <NumberField
            label="Longitude"
            min={-180}
            max={180}
            step={0.0001}
            value={options.longitude}
            onChange={(longitude) => {
              onChange({ ...options, longitude });
            }}
          />
        </Row>
      ) : null}
      <NumberField
        label="Check the weather every"
        unit="minutes"
        min={1}
        step={1}
        value={options.updateIntervalMinutes}
        onChange={(updateIntervalMinutes) => {
          onChange({ ...options, updateIntervalMinutes: Math.max(1, updateIntervalMinutes) });
        }}
      />
    </OptionCard>
  );
}
