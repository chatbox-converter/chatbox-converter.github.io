import type { PreviewMode } from '@chatbox-converter/core';

interface IntegrationsPageProps {
  readonly previewMode: PreviewMode;
}

export function IntegrationsPage({ previewMode }: IntegrationsPageProps): React.JSX.Element {
  return <section>Integrations ({previewMode})</section>;
}
