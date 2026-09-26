import { createDefaultProfile, sampleValues } from '@chatbox-converter/core';
import { Checkbox } from '@/components/Checkbox';
import { useProfile } from '@/state/profile-context';
import { Help, NumberField, OptionCard, SubHeading } from './controls';
import { OptionSection } from './OptionSection';
import { TemplateEditor } from './TemplateEditor';

interface StatusOptionsSectionProps {
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly scrollTo: boolean;
}

/** "Status options": cycling through statuses and the away message. */
export function StatusOptionsSection({
  expanded,
  onToggle,
  scrollTo,
}: StatusOptionsSectionProps): React.JSX.Element {
  const { profile, dispatch } = useProfile();
  const { statusCycle, afk } = profile;
  const values = sampleValues(profile);

  function reset(): void {
    const defaults = createDefaultProfile();
    dispatch({ type: 'statusCycle/update', patch: defaults.statusCycle });
    dispatch({ type: 'afk/update', patch: defaults.afk });
  }

  return (
    <OptionSection
      title="Status options"
      expanded={expanded}
      onToggle={onToggle}
      onReset={reset}
      scrollTo={scrollTo}
    >
      <OptionCard>
        <SubHeading>Showing more than one status</SubHeading>
        <Checkbox
          label="Take turns showing every status marked 💛"
          checked={statusCycle.enabled}
          onChange={(enabled) => {
            dispatch({ type: 'statusCycle/update', patch: { enabled } });
          }}
        />
        <Help>Without this, only the one status you picked is shown.</Help>
        {statusCycle.enabled ? (
          <Checkbox
            label="Pick them in a random order rather than top to bottom"
            checked={statusCycle.random}
            onChange={(random) => {
              dispatch({ type: 'statusCycle/update', patch: { random } });
            }}
          />
        ) : null}
        <NumberField
          label="Move to the next one every"
          unit="seconds"
          min={1}
          step={1}
          value={statusCycle.intervalSeconds}
          disabled={!statusCycle.enabled}
          onChange={(intervalSeconds) => {
            dispatch({ type: 'statusCycle/update', patch: { intervalSeconds } });
          }}
        />
      </OptionCard>

      <OptionCard>
        <SubHeading>When you go quiet</SubHeading>
        <Help>
          Stop moving for long enough and the app swaps your status for an away message, so nobody
          has to guess whether you are there.
        </Help>
        <Checkbox
          label="Show an away message when I stop moving"
          checked={afk.enabled}
          onChange={(enabled) => {
            dispatch({ type: 'afk/update', patch: { enabled } });
          }}
        />
        <NumberField
          label="Count me as away after"
          unit="seconds"
          min={0}
          step={10}
          value={afk.timeoutSeconds}
          onChange={(timeoutSeconds) => {
            dispatch({
              type: 'afk/update',
              patch: { timeoutSeconds: Math.max(0, timeoutSeconds) },
            });
          }}
        />
      </OptionCard>

      <OptionCard>
        <SubHeading>Ways of saying you are away</SubHeading>
        <TemplateEditor
          label="Away message"
          category="afk"
          value={afk.template}
          values={values}
          previewCaption="What people will see"
          onChange={(template) => {
            dispatch({ type: 'afk/update', patch: { template } });
          }}
        />
        <Checkbox
          label="Replace the whole line while I am away"
          checked={afk.replaceEverything}
          hint="Otherwise only your status swaps out and the other integrations keep going."
          onChange={(replaceEverything) => {
            dispatch({ type: 'afk/update', patch: { replaceEverything } });
          }}
        />
      </OptionCard>
    </OptionSection>
  );
}
