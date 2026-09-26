import { createDefaultProfile, nativeCodec, type ChatboxProfile } from '@chatbox-converter/core';
import { logger } from '@/lib/logger';

const DRAFT_KEY = 'chatbox-converter:draft:v1';

/** Per-browser convenience only: the draft the user was last editing. */
export function loadDraft(): ChatboxProfile {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw !== null) {
      return nativeCodec.parse([{ path: 'chatbox-profile.json', content: raw }]).profile;
    }
  } catch (error) {
    logger.warn('Ignoring unreadable draft in localStorage.', error);
  }
  return createDefaultProfile();
}

export function saveDraft(profile: ChatboxProfile): void {
  try {
    const [file] = nativeCodec.serialize(profile).files;
    if (file !== undefined) {
      localStorage.setItem(DRAFT_KEY, file.content);
    }
  } catch (error) {
    logger.warn('Could not persist the draft profile.', error);
  }
}
