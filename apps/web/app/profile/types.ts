export type RegistrationStatus = "Registered" | "In Progress" | "Completed";

export interface RegisteredHunt {
  huntId: number;
  title: string;
  startTime: number;
  status: RegistrationStatus;
}

export type HuntProgressStatus = "Completed" | "In-Progress";

export interface PlayerHuntProgress {
  id: number;
  title: string;
  description: string;
  totalClues: number;
  status: HuntProgressStatus;
  pointsEarned: number;
  startedAt: string;
  completedAt?: string;
}
