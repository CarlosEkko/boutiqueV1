import { api } from './client';

export interface SumsubLinkResponse {
  success: boolean;
  url: string;
  applicant_id: string;
  ttl_seconds: number;
  fallback?: boolean;
}

export interface SumsubStatusResponse {
  status: string;          // 'init' | 'pending' | 'completed' | 'rejected' | 'on_hold'
  review_status?: string;  // 'init' | 'pending' | 'completed'
  review_result?: {
    reviewAnswer?: 'GREEN' | 'RED' | 'YELLOW';
    rejectLabels?: string[];
  };
  applicant_id?: string;
  inspection_id?: string;
}

export const generateSumsubLink = async (): Promise<SumsubLinkResponse> => {
  const { data } = await api.post<SumsubLinkResponse>('/sumsub/generate-link');
  return data;
};

export const fetchSumsubStatus = async (): Promise<SumsubStatusResponse | null> => {
  try {
    const { data } = await api.get<SumsubStatusResponse>('/sumsub/status');
    return data;
  } catch {
    return null;
  }
};
