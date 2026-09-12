export interface AIProvider {
  extractPlacementData(cleanedText: string): Promise<AIExtractedPlacement>;
}

export interface AIExtractedPlacement {
  companyName: string;
  role: string;
  location?: string;
  package?: number;
  deadline?: string;
  applicationLink?: string;
  description?: string;
  eligibility?: string;
  skills?: string[];
  employmentType?: string;
  driveType?: string;
  confidenceScore: number;
}
