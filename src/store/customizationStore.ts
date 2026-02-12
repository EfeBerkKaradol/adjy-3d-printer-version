import { create } from "zustand";

interface CustomizationStore {
  parameters: Record<string, number | string>;
  setParameter: (name: string, value: number | string) => void;
  resetParameters: () => void;
  setAllParameters: (params: Record<string, number | string>) => void;
}

export const useCustomizationStore = create<CustomizationStore>()((set) => ({
  parameters: {},

  setParameter: (name, value) => {
    set((state) => ({
      parameters: { ...state.parameters, [name]: value },
    }));
  },

  resetParameters: () => set({ parameters: {} }),

  setAllParameters: (params) => set({ parameters: params }),
}));
