export const PAGES = ['integrations', 'status', 'options', 'convert'] as const;
export type PageId = (typeof PAGES)[number];

export const PAGE_LABELS: Readonly<Record<PageId, string>> = {
  integrations: 'Integrations',
  status: 'Status',
  options: 'Options',
  convert: 'Convert',
};

export function isPageId(value: string): value is PageId {
  return (PAGES as readonly string[]).includes(value);
}
