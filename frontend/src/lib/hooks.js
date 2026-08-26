import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";

export function usePlan(date) {
  return useQuery({ queryKey: ["plan", date], queryFn: () => api.getInductionPlan(date), enabled: !!date });
}

export function useDocuments() {
  return useQuery({ queryKey: ["documents"], queryFn: () => api.getDocuments() });
}
