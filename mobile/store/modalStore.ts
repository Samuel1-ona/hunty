import { create } from 'zustand';

export type ModalType = 'confirmation' | 'filter' | 'custom';

export interface ModalConfig {
  id: string;
  type: ModalType;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
  data?: Record<string, any>;
}

interface ModalStore {
  modals: ModalConfig[];
  openModal: (config: Omit<ModalConfig, 'id'>) => string;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
}

export const useModalStore = create<ModalStore>((set, get) => ({
  modals: [],
  
  openModal: (config) => {
    const id = Date.now().toString();
    const newModal: ModalConfig = {
      id,
      ...config,
    };
    set((state) => ({
      modals: [...state.modals, newModal],
    }));
    return id;
  },
  
  closeModal: (id) => {
    set((state) => ({
      modals: state.modals.filter((modal) => modal.id !== id),
    }));
  },
  
  closeAllModals: () => {
    set({ modals: [] });
  },
}));
