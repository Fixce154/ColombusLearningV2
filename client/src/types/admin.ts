import type { FormationInterest } from "@shared/schema";

export interface AdminInterestsAggregatedStats {
  formationId: string;
  pending: number;
  approved: number;
  converted: number;
  withdrawn: number;
  p1Count: number;
  p2Count: number;
  p3Count: number;
  coachPending: number;
  coachApproved: number;
  coachRejected: number;
}

export interface AdminInterestsResponse {
  interests: FormationInterest[];
  aggregated: AdminInterestsAggregatedStats[];
}
