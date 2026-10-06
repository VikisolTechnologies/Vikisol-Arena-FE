"use client";

import { useEffect, useState } from "react";
import { loadQueue, readAutomations, readJobSearch, subscribeJenny, type QueueItem } from "@/lib/data/jenny";

/** A device-stored Jenny value, re-read whenever any Jenny choice changes (this tab or another). */
function useJennyStore<T>(read: () => T): T | null {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    const load = () => setValue(read());
    load();
    return subscribeJenny(load);
  }, [read]);
  return value;
}

export const useJennyQueue = (): QueueItem[] | null => useJennyStore(loadQueue);
export const useAutomations = () => useJennyStore(readAutomations);
export const useJobSearch = () => useJennyStore(readJobSearch);
