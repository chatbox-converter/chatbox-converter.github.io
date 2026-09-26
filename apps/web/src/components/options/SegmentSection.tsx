import {
  DEFAULT_SEGMENT_TEMPLATES,
  defaultSegmentOptions,
  sampleValues,
  type Segment,
  type SegmentOptions,
} from '@chatbox-converter/core';
import { integrationInfo } from '@/lib/integration-catalog';
import { useProfile } from '@/state/profile-context';
import { Help, OptionCard, SubHeading } from './controls';
import { OptionSection } from './OptionSection';
import { HardwarePanel, TimePanel, WeatherPanel } from './panels-environment';
import { MediaPanel } from './panels-media';
import { CustomPanel, HeartratePanel, VrBatteryPanel, WindowPanel } from './panels-personal';
import { renderProgressBar } from './progress-bar';
import { TemplateEditor } from './TemplateEditor';

interface SegmentSectionProps {
  readonly segment: Segment;
  /** Shown after the title when several segments share a kind. */
  readonly subtitle?: string;
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly scrollTo: boolean;
}

/** "<Integration> options": the template editor plus whatever the kind's options expose. */
export function SegmentSection({
  segment,
  subtitle,
  expanded,
  onToggle,
  scrollTo,
}: SegmentSectionProps): React.JSX.Element {
  const { profile, dispatch } = useProfile();
  const info = integrationInfo(segment.kind);
  const values = sampleValues(profile);
  if (segment.options.kind === 'media') {
    values.progress_bar = renderProgressBar(segment.options.progressBar, 0.35);
  }

  function setOptions(options: SegmentOptions): void {
    dispatch({ type: 'segment/update', id: segment.id, patch: { options } });
  }

  return (
    <OptionSection
      title={`${info.title} options`}
      {...(subtitle === undefined ? {} : { subtitle })}
      expanded={expanded}
      onToggle={onToggle}
      scrollTo={scrollTo}
      onReset={() => {
        dispatch({
          type: 'segment/update',
          id: segment.id,
          patch: {
            template: DEFAULT_SEGMENT_TEMPLATES[segment.kind],
            options: defaultSegmentOptions(segment.kind),
          },
        });
      }}
    >
      <OptionCard>
        <SubHeading>What the line says</SubHeading>
        <Help>
          Write the line however you like. Anything in curly brackets is swapped for the real thing;
          everything else is printed as you typed it. Click a placeholder to drop it in at the
          cursor.
        </Help>
        <TemplateEditor
          label="Template"
          category={segment.kind}
          value={segment.template}
          values={values}
          previewCaption="With sample values"
          onChange={(template) => {
            dispatch({ type: 'segment/update', id: segment.id, patch: { template } });
          }}
        />
      </OptionCard>
      <KindPanel options={segment.options} onChange={setOptions} />
    </OptionSection>
  );
}

interface KindPanelProps {
  readonly options: SegmentOptions;
  readonly onChange: (options: SegmentOptions) => void;
}

function KindPanel({ options, onChange }: KindPanelProps): React.JSX.Element | null {
  switch (options.kind) {
    case 'media':
      return <MediaPanel options={options} onChange={onChange} />;
    case 'hardware':
      return <HardwarePanel options={options} onChange={onChange} />;
    case 'time':
      return <TimePanel options={options} onChange={onChange} />;
    case 'weather':
      return <WeatherPanel options={options} onChange={onChange} />;
    case 'heartrate':
      return <HeartratePanel options={options} onChange={onChange} />;
    case 'window':
      return <WindowPanel options={options} onChange={onChange} />;
    case 'vr_battery':
      return <VrBatteryPanel options={options} onChange={onChange} />;
    case 'custom':
      return <CustomPanel options={options} onChange={onChange} />;
    case 'status':
    case 'lyrics':
    case 'vrchat':
    case 'vr_performance':
    case 'network':
    case 'twitch':
    case 'tiktok':
    case 'discord':
    case 'soundpad':
    case 'voicemod':
    case 'speech':
      return null;
  }
}
