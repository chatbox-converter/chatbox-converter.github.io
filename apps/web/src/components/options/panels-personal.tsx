import {
  HEARTRATE_PROVIDERS,
  type CustomOptions,
  type HeartrateOptions,
  type VrBatteryOptions,
  type WindowOptions,
} from '@chatbox-converter/core';
import { Checkbox } from '@/components/Checkbox';
import { Help, NumberField, OptionCard, SelectField, SubHeading, TextField } from './controls';
import type { PanelProps } from './panels-media';

const PROVIDER_LABELS: Readonly<Record<HeartrateOptions['provider'], string>> = {
  pulsoid: 'Pulsoid',
  hyperate: 'HypeRate',
  bluetooth: 'Bluetooth strap',
  unknown: 'Whatever the app supports',
};

const PROVIDER_OPTIONS = HEARTRATE_PROVIDERS.map((provider) => ({
  value: provider,
  label: PROVIDER_LABELS[provider],
}));

export function HeartratePanel({
  options,
  onChange,
}: PanelProps<HeartrateOptions>): React.JSX.Element {
  return (
    <OptionCard>
      <SubHeading>Where the pulse comes from</SubHeading>
      <SelectField
        label="Provider"
        value={options.provider}
        options={PROVIDER_OPTIONS}
        onChange={(provider) => {
          onChange({ ...options, provider });
        }}
      />
      <Checkbox
        label="Smooth out sudden jumps"
        checked={options.smoothing}
        onChange={(smoothing) => {
          onChange({ ...options, smoothing });
        }}
      />
      <TextField
        label="While disconnected"
        placeholder="Leave empty to hide the line"
        value={options.disconnectedTemplate}
        onChange={(disconnectedTemplate) => {
          onChange({ ...options, disconnectedTemplate });
        }}
      />
    </OptionCard>
  );
}

export function WindowPanel({ options, onChange }: PanelProps<WindowOptions>): React.JSX.Element {
  return (
    <OptionCard>
      <SubHeading>Window titles</SubHeading>
      <NumberField
        label="Cut titles after"
        unit="characters"
        min={0}
        step={1}
        value={options.maxTitleLength}
        onChange={(maxTitleLength) => {
          onChange({ ...options, maxTitleLength: Math.max(0, Math.trunc(maxTitleLength)) });
        }}
      />
      <TextField
        label="Show private apps as"
        width="auto"
        inline
        value={options.privateAppLabel}
        onChange={(privateAppLabel) => {
          onChange({ ...options, privateAppLabel });
        }}
      />
      <Help>Apps you mark private show this label instead of their window title.</Help>
    </OptionCard>
  );
}

export function VrBatteryPanel({
  options,
  onChange,
}: PanelProps<VrBatteryOptions>): React.JSX.Element {
  return (
    <OptionCard>
      <SubHeading>Which devices to watch</SubHeading>
      <Checkbox
        label="Headset"
        checked={options.showHeadset}
        onChange={(showHeadset) => {
          onChange({ ...options, showHeadset });
        }}
      />
      <Checkbox
        label="Controllers"
        checked={options.showControllers}
        onChange={(showControllers) => {
          onChange({ ...options, showControllers });
        }}
      />
      <Checkbox
        label="Trackers"
        checked={options.showTrackers}
        onChange={(showTrackers) => {
          onChange({ ...options, showTrackers });
        }}
      />
      <NumberField
        label="Warn me below"
        unit="%"
        min={0}
        max={100}
        step={1}
        value={options.lowThresholdPercent}
        onChange={(lowThresholdPercent) => {
          onChange({
            ...options,
            lowThresholdPercent: Math.max(0, Math.min(100, Math.trunc(lowThresholdPercent))),
          });
        }}
      />
    </OptionCard>
  );
}

export function CustomPanel({ options, onChange }: PanelProps<CustomOptions>): React.JSX.Element {
  return (
    <OptionCard>
      <SubHeading>Extras for this line</SubHeading>
      <TextField
        label="Count down to"
        type="datetime-local"
        width="auto"
        inline
        value={options.timerTarget}
        onChange={(timerTarget) => {
          onChange({ ...options, timerTarget });
        }}
      />
      <Help>
        Fills <code>{'{timer}'}</code>. Leave it empty if you do not use a countdown.
      </Help>
      <TextField
        label="Read text from this file"
        placeholder="C:\\Users\\you\\now-playing.txt"
        value={options.filePath}
        onChange={(filePath) => {
          onChange({ ...options, filePath });
        }}
      />
      <Help>
        Fills <code>{'{file_text}'}</code> with the file&apos;s contents on the PC running the app.
      </Help>
    </OptionCard>
  );
}
