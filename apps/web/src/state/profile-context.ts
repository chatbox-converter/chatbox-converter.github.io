import type { ChatboxProfile } from '@chatbox-converter/core';
import { createContext, useContext, type Dispatch } from 'react';
import type { ProfileAction } from '@/state/profile-reducer';

export interface ProfileStore {
  readonly profile: ChatboxProfile;
  readonly dispatch: Dispatch<ProfileAction>;
}

export const ProfileContext = createContext<ProfileStore | null>(null);

export function useProfile(): ProfileStore {
  const store = useContext(ProfileContext);
  if (store === null) {
    throw new Error('useProfile must be used inside a ProfileProvider.');
  }
  return store;
}
