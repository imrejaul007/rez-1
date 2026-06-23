import { useEffect, useState, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface UseDebouncedSearchOptions {
  delay?: number;
  minLength?: number;
}

export function useDebouncedSearch(
  initialValue: string = '',
  options: UseDebouncedSearchOptions = {}
) {
  const { delay = 350, minLength = 2 } = options;
  
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const [isDebouncing, setIsDebouncing] = useState(false);

  const updateDebouncedValue = useDebouncedCallback(
    (newValue: string) => {
      setDebouncedValue(newValue);
      setIsDebouncing(false);
    },
    delay
  );

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
    
    if (newValue.length >= minLength) {
      setIsDebouncing(true);
      updateDebouncedValue(newValue);
    } else {
      setDebouncedValue('');
      setIsDebouncing(false);
    }
  }, [minLength, updateDebouncedValue]);

  const reset = useCallback(() => {
    setValue('');
    setDebouncedValue('');
    setIsDebouncing(false);
  }, []);

  return {
    value,
    debouncedValue,
    isDebouncing,
    setValue: handleChange,
    reset,
  };
}

export default useDebouncedSearch;

