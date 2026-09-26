import { createDefaultProfile, effectiveCharLimit, renderPreview } from '@chatbox-converter/core';
import { Checkbox } from '@/components/Checkbox';
import { useProfile } from '@/state/profile-context';
import { Help, NumberField, OptionCard, Row, SliderField, SubHeading, TextField } from './controls';
import { OptionSection } from './OptionSection';
import { SegmentPreview } from './SegmentPreview';

interface SectionProps {
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly scrollTo: boolean;
}

/** "Line options": how the segments are joined into the one chatbox line. */
export function LineOptionsSection({
  expanded,
  onToggle,
  scrollTo,
}: SectionProps): React.JSX.Element {
  const { profile, dispatch } = useProfile();
  const { output } = profile;
  const preview = renderPreview(profile, 'desktop');

  return (
    <OptionSection
      title="Line options"
      expanded={expanded}
      onToggle={onToggle}
      scrollTo={scrollTo}
      onReset={() => {
        dispatch({ type: 'output/update', patch: createDefaultProfile().output });
      }}
    >
      <OptionCard>
        <SubHeading>How the line is put together</SubHeading>
        <SegmentPreview
          text={preview.text}
          limit={effectiveCharLimit(output)}
          caption="Your line will look like this"
        />
        <Checkbox
          label="Put every integration on its own line"
          checked={output.separateWithNewlines}
          onChange={(separateWithNewlines) => {
            dispatch({ type: 'output/update', patch: { separateWithNewlines } });
          }}
        />
        <Row>
          <TextField
            label="Between integrations"
            width="short"
            inline
            value={output.separator}
            disabled={output.separateWithNewlines}
            onChange={(separator) => {
              dispatch({ type: 'output/update', patch: { separator } });
            }}
          />
          <TextField
            label="Before the line"
            width="short"
            inline
            value={output.prefix}
            onChange={(prefix) => {
              dispatch({ type: 'output/update', patch: { prefix } });
            }}
          />
          <TextField
            label="After the line"
            width="short"
            inline
            value={output.suffix}
            onChange={(suffix) => {
              dispatch({ type: 'output/update', patch: { suffix } });
            }}
          />
        </Row>
        {output.separateWithNewlines ? (
          <Help>The separator is not used while every integration has its own line.</Help>
        ) : null}
      </OptionCard>

      <OptionCard>
        <SubHeading>Background and timing</SubHeading>
        <Checkbox
          label="Use the minimal background trick (142 characters)"
          checked={output.minimalBackground}
          onChange={(minimalBackground) => {
            dispatch({ type: 'output/update', patch: { minimalBackground } });
          }}
        />
        <Help>
          Two invisible control characters at the end make VRChat hide the bubble background behind
          your text, so it floats over your head. They count towards the 144, leaving 142 for you.
        </Help>
        <SliderField
          label="Send every"
          unit="seconds"
          min={0.7}
          max={10}
          step={0.1}
          value={output.sendIntervalSeconds}
          onChange={(sendIntervalSeconds) => {
            dispatch({
              type: 'output/update',
              patch: { sendIntervalSeconds: Math.round(sendIntervalSeconds * 10) / 10 },
            });
          }}
        />
        <Help>
          VRChat throws away chatbox messages that arrive too quickly. Lower is snappier; raise it
          if your line stops appearing.
        </Help>
      </OptionCard>
    </OptionSection>
  );
}

/** "OSC": where the line is sent. */
export function OscSection({ expanded, onToggle, scrollTo }: SectionProps): React.JSX.Element {
  const { profile, dispatch } = useProfile();
  const { osc } = profile;

  return (
    <OptionSection
      title="OSC"
      expanded={expanded}
      onToggle={onToggle}
      scrollTo={scrollTo}
      onReset={() => {
        dispatch({ type: 'osc/update', patch: createDefaultProfile().osc });
      }}
    >
      <OptionCard>
        <SubHeading>Where VRChat is listening</SubHeading>
        <Help>
          Leave these alone unless VRChat runs on another machine or you changed its OSC port.
        </Help>
        <Row>
          <TextField
            label="Host"
            width="auto"
            inline
            value={osc.host}
            onChange={(host) => {
              dispatch({ type: 'osc/update', patch: { host } });
            }}
          />
          <NumberField
            label="Port"
            min={1}
            max={65535}
            step={1}
            value={osc.port}
            onChange={(port) => {
              dispatch({ type: 'osc/update', patch: { port: Math.trunc(port) } });
            }}
          />
        </Row>
      </OptionCard>
    </OptionSection>
  );
}
