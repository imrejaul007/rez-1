import { useState, useCallback } from 'react';

export interface CashbackModalState {
  isVisible: boolean;
  cashbackAmount: number;
}

export const useCashbackModal = () => {
  const [modalState, setModalState] = useState<CashbackModalState>({
    isVisible: false,
    cashbackAmount: 0,
  });

  const showModal = useCallback((amount: number) => {
    setModalState({
      isVisible: true,
      cashbackAmount: amount,
    });
  }, []);

  const hideModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      isVisible: false,
    }));
  }, []);

  const resetModal = useCallback(() => {
    setModalState({
      isVisible: false,
      cashbackAmount: 0,
    });
  }, []);

  return {
    isVisible: modalState.isVisible,
    cashbackAmount: modalState.cashbackAmount,
    showModal,
    hideModal,
    resetModal,
  };
};