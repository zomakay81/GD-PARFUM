
import React, { useReducer, useCallback, useState } from 'react';
import type { AppState, AppAction } from '../types';

const MAX_HISTORY_LENGTH = 20;

export const useUndoableState = (
  reducer: React.Reducer<AppState, AppAction>,
  initialState: AppState
) => {
  const [history, setHistory] = useState<AppState[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const state = history[currentIndex];

  const dispatch = useCallback((action: AppAction) => {
    const newState = reducer(state, action);
    const newHistory = history.slice(0, currentIndex + 1);
    
    if (newHistory.length >= MAX_HISTORY_LENGTH) {
        newHistory.shift();
    }

    setHistory([...newHistory, newState]);
    setCurrentIndex(newHistory.length);
  }, [currentIndex, history, reducer, state]);
  
  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, history.length]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return { state, dispatch, undo, redo, canUndo, canRedo };
};