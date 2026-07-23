import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getUserPolicies } from "@/api";
import type { Policy } from "@/types";
import { resolveDefaultPolicy } from "@/lib/resolveDefaultPolicy";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "cid_connect_selected_policy_id";

type PolicySelectionContextValue = {
  policies: Policy[];
  selectedPolicy: Policy | null;
  selectedPolicyId: string | null;
  setSelectedPolicyId: (id: string) => void;
  loading: boolean;
  refreshPolicies: () => Promise<void>;
};

const PolicySelectionContext = createContext<PolicySelectionContextValue>({
  policies: [],
  selectedPolicy: null,
  selectedPolicyId: null,
  setSelectedPolicyId: () => {},
  loading: true,
  refreshPolicies: async () => {},
});

export function usePolicySelection() {
  return useContext(PolicySelectionContext);
}

export const PolicySelectionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicyId, setSelectedPolicyIdState] = useState<string | null>(
    () => {
      try {
        return localStorage.getItem(STORAGE_KEY);
      } catch {
        return null;
      }
    },
  );
  const [loading, setLoading] = useState(true);

  const refreshPolicies = useCallback(async () => {
    if (!user?.id) {
      setPolicies([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await getUserPolicies(user.id);
      setPolicies(rows);
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(STORAGE_KEY);
      } catch {
        stored = null;
      }
      setSelectedPolicyIdState((prev) => {
        const pick = resolveDefaultPolicy(rows, stored || prev);
        const nextId = pick?.id ?? null;
        if (nextId) {
          try {
            localStorage.setItem(STORAGE_KEY, nextId);
          } catch {
            /* ignore */
          }
        }
        return nextId;
      });
    } catch (err) {
      console.error("[PolicySelection] load failed:", err);
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshPolicies();
  }, [user?.id]);

  const setSelectedPolicyId = useCallback((id: string) => {
    setSelectedPolicyIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const selectedPolicy = useMemo(
    () => resolveDefaultPolicy(policies, selectedPolicyId),
    [policies, selectedPolicyId],
  );

  const value = useMemo(
    () => ({
      policies,
      selectedPolicy,
      selectedPolicyId: selectedPolicy?.id ?? selectedPolicyId,
      setSelectedPolicyId,
      loading,
      refreshPolicies,
    }),
    [
      policies,
      selectedPolicy,
      selectedPolicyId,
      setSelectedPolicyId,
      loading,
      refreshPolicies,
    ],
  );

  return (
    <PolicySelectionContext.Provider value={value}>
      {children}
    </PolicySelectionContext.Provider>
  );
};
