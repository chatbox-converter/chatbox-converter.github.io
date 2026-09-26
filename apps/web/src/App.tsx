import { createDefaultProfile, renderPreview } from '@chatbox-converter/core';

export function App(): React.JSX.Element {
  const preview = renderPreview(createDefaultProfile(), 'desktop');
  return (
    <main>
      <pre>{preview.text}</pre>
    </main>
  );
}
