import { useCallback, useState } from "react";

export type EpisodesBrowserUiState = {
  schemeId: string;
  groupEnabled: boolean;
};

export function createInitialEpisodesBrowserUiState(
  defaultSchemeId: string,
): EpisodesBrowserUiState {
  return {
    schemeId: defaultSchemeId,
    groupEnabled: false,
  };
}

export function useEpisodesBrowserUiState(defaultSchemeId: string) {
  const [schemeId, setSchemeIdState] = useState(defaultSchemeId);
  const [groupEnabled, setGroupEnabled] = useState(false);

  const setSchemeId = useCallback((id: string) => {
    setSchemeIdState(id);
  }, []);

  return {
    schemeId,
    groupEnabled,
    setSchemeId,
    setGroupEnabled,
  };
}
