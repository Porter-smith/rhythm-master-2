import { create } from 'zustand';
import { persist, PersistOptions } from 'zustand/middleware';
import { StateCreator } from 'zustand';

interface SettingsState {
  controlType: 'keyboard' | 'midi';
  audioOffset: number;
  selectedMidiDevice: string | null;
  setControlType: (type: 'keyboard' | 'midi') => void;
  setAudioOffset: (offset: number) => void;
  setSelectedMidiDevice: (deviceName: string | null) => void;
}

type SettingsStorePersist = (
  config: StateCreator<SettingsState>,
  options: PersistOptions<SettingsState>
) => StateCreator<SettingsState>;

export const useSettingsStore = create<SettingsState>()(
  (persist as SettingsStorePersist)(
    (set): SettingsState => ({
      controlType: 'keyboard',
      audioOffset: 0,
      selectedMidiDevice: null,
      setControlType: (type: 'keyboard' | 'midi') => set({ controlType: type }),
      setAudioOffset: (offset: number) => set({ audioOffset: offset }),
      setSelectedMidiDevice: (deviceName: string | null) => set({ selectedMidiDevice: deviceName }),
    }),
    {
      name: 'rhythm-master-settings',
    }
  )
); 