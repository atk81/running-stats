export interface MeResponse {
  userId: string;
  name: string;
  handle: string;
  city: string;
  avatarFileId: string;
  accentColor: string;
  onboardingComplete: boolean;
  lastSyncAt: string | null;
}
