import type { MediaOptions, ProgressBarStyle } from '@chatbox-converter/core';
import { Checkbox } from '@/components/Checkbox';
import { Help, NumberField, OptionCard, Row, SubHeading, TextField } from './controls';
import { renderProgressBar } from './progress-bar';
import { SegmentPreview } from './SegmentPreview';

export interface PanelProps<T> {
  readonly options: T;
  readonly onChange: (options: T) => void;
}

export function MediaPanel({ options, onChange }: PanelProps<MediaOptions>): React.JSX.Element {
  return (
    <>
      <OptionCard>
        <SubHeading>Paused and stopped</SubHeading>
        <Help>Leave a box empty to hide the music line in that state.</Help>
        <TextField
          label="While paused"
          value={options.pausedTemplate}
          onChange={(pausedTemplate) => {
            onChange({ ...options, pausedTemplate });
          }}
        />
        <TextField
          label="When nothing is playing"
          value={options.stoppedTemplate}
          onChange={(stoppedTemplate) => {
            onChange({ ...options, stoppedTemplate });
          }}
        />
        <NumberField
          label="Shorten titles longer than"
          unit="characters (0 = never)"
          min={0}
          step={1}
          value={options.titleMaxLength}
          onChange={(titleMaxLength) => {
            onChange({ ...options, titleMaxLength: Math.max(0, Math.trunc(titleMaxLength)) });
          }}
        />
      </OptionCard>
      <OptionCard>
        <SubHeading>Show it briefly, then hide it</SubHeading>
        <Help>
          Announce each new song for a few seconds and then give the room back to your other
          integrations, instead of showing the song the whole time it plays.
        </Help>
        <Checkbox
          label="Only show the song when it changes"
          checked={options.transient}
          onChange={(transient) => {
            onChange({ ...options, transient });
          }}
        />
        {options.transient ? (
          <NumberField
            label="Hide it again after"
            unit="seconds"
            min={1}
            step={1}
            value={options.transientSeconds}
            onChange={(transientSeconds) => {
              onChange({ ...options, transientSeconds: Math.max(1, transientSeconds) });
            }}
          />
        ) : null}
      </OptionCard>
      <ProgressBarCard
        style={options.progressBar}
        onChange={(progressBar) => {
          onChange({ ...options, progressBar });
        }}
      />
    </>
  );
}

interface ProgressBarCardProps {
  readonly style: ProgressBarStyle;
  readonly onChange: (style: ProgressBarStyle) => void;
}

function ProgressBarCard({ style, onChange }: ProgressBarCardProps): React.JSX.Element {
  function set<K extends keyof ProgressBarStyle>(key: K, value: ProgressBarStyle[K]): void {
    onChange({ ...style, [key]: value });
  }
  return (
    <OptionCard>
      <SubHeading>The progress bar</SubHeading>
      <Help>
        What <code>{'{progress_bar}'}</code> is drawn with. Leave &quot;Where you are&quot; empty
        for a bar without a marker.
      </Help>
      <Row>
        <TextField
          label="Played"
          width="tiny"
          inline
          value={style.filled}
          onChange={(filled) => {
            set('filled', filled);
          }}
        />
        <TextField
          label="Where you are"
          width="tiny"
          inline
          value={style.position}
          onChange={(position) => {
            set('position', position);
          }}
        />
        <TextField
          label="Still to go"
          width="tiny"
          inline
          value={style.empty}
          onChange={(empty) => {
            set('empty', empty);
          }}
        />
      </Row>
      <Row>
        <TextField
          label="Mark before"
          width="tiny"
          inline
          value={style.start}
          onChange={(start) => {
            set('start', start);
          }}
        />
        <TextField
          label="Mark after"
          width="tiny"
          inline
          value={style.end}
          onChange={(end) => {
            set('end', end);
          }}
        />
        <NumberField
          label="How many characters wide"
          min={1}
          max={60}
          step={1}
          value={style.length}
          onChange={(length) => {
            set('length', Math.max(1, Math.min(60, Math.trunc(length))));
          }}
        />
      </Row>
      <SegmentPreview text={renderProgressBar(style, 0.35)} caption="A third of the way through" />
    </OptionCard>
  );
}
