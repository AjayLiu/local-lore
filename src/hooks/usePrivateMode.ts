"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "locallore:private-mode";

function readPrivateMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writePrivateMode(value: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "true" : "false");
  } catch {
    // Ignore quota / private browsing errors.
  }
}

export function usePrivateMode() {
  const [privateMode, setPrivateModeState] = useState(false);

  useEffect(() => {
    setPrivateModeState(readPrivateMode());
  }, []);

  const setPrivateMode = useCallback((value: boolean) => {
    writePrivateMode(value);
    setPrivateModeState(value);
  }, []);

  const togglePrivateMode = useCallback(() => {
    setPrivateModeState((current) => {
      const next = !current;
      writePrivateMode(next);
      return next;
    });
  }, []);

  return { privateMode, setPrivateMode, togglePrivateMode };
}
