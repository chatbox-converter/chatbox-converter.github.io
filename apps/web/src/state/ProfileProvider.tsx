import type { ChatboxProfile } from '@chatbox-converter/core';
import { useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { loadDraft, saveDraft } from '@/state/draft';
import { ProfileContext } from '@/state/profile-context';
import { profileReducer } from '@/state/profile-reducer';

interface ProfileProviderProps {
  readonly children: ReactNode;
  readonly initial?: ChatboxProfile;
}

export function ProfileProvider({ children, initial }: ProfileProviderProps): React.JSX.Element {
  const [profile, dispatch] = useReducer(profileReducer, initial, (seed) => seed ?? loadDraft());
  useEffect(() => {
    saveDraft(profile);
  }, [profile]);
  const value = useMemo(() => ({ profile, dispatch }), [profile]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
