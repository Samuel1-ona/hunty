import { useModalStore, type ModalConfig } from '@store/modalStore';

export function useModal() {
  const { openModal, closeModal, closeAllModals, modals } = useModalStore();

  const openConfirmationModal = (config: Omit<ModalConfig, 'id' | 'type'>) => {
    return openModal({
      ...config,
      type: 'confirmation',
    });
  };

  return {
    modals,
    openModal,
    closeModal,
    closeAllModals,
    openConfirmationModal,
  };
}
