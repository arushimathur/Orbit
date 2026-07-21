import { useCallback, useEffect, useState } from "react";
import * as api from "../api/endpoints";

// Nicknames are private to the viewer -- fetched once per mount (not live-updated via SSE,
// they never change from someone else's action) and exposed as a displayName() helper so
// callers don't have to think about the fallback-to-real-name case themselves.
export function useNicknames() {
  const [nicknames, setNicknames] = useState<Record<string, string>>({});

  const reload = useCallback(() => {
    api
      .listNicknames()
      .then((list) => setNicknames(Object.fromEntries(list.map((n) => [n.targetUserId, n.nickname]))))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const displayName = useCallback((userId: string, fallbackName: string) => nicknames[userId] ?? fallbackName, [nicknames]);

  return { nicknames, displayName, reload };
}
