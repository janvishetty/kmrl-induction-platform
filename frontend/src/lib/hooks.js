import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";

export function usePlan(date) {
  return useQuery({ queryKey: ["plan", date], queryFn: () => api.getInductionPlan(date), enabled: !!date });
}

export function useDocuments() {
  return useQuery({ queryKey: ["documents"], queryFn: () => api.getDocuments() });
}

// Hook for fetching live explanations
export function useExplanation(trainsetId, date) {
  return useQuery({
    queryKey: ["explanation", trainsetId, date],
    queryFn: () => api.getExplanation(trainsetId, date),
    enabled: !!trainsetId && !!date
  });
}