import { api } from './client';

export interface OtcDealSummary {
  id: string;
  deal_number?: string;
  deal_type?: string;
  asset?: string;
  quantity?: number;
  total_value?: number;
  stage?: string;
  status?: string;
  client_name?: string;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  unread_count: number;
}

export interface OtcChatMessage {
  id: string;
  deal_id: string;
  sender_id: string;
  sender_role: 'client' | 'desk';
  sender_name: string;
  body: string;
  created_at: string;
  is_self: boolean;
  read_by: string[];
}

export const fetchMyOtcDeals = async (): Promise<OtcDealSummary[]> => {
  const { data } = await api.get<OtcDealSummary[]>('/otc-chat/deals');
  return Array.isArray(data) ? data : [];
};

export const fetchDealMessages = async (dealId: string): Promise<OtcChatMessage[]> => {
  const { data } = await api.get<OtcChatMessage[]>(`/otc-chat/deals/${dealId}/messages`);
  return Array.isArray(data) ? data : [];
};

export const sendDealMessage = async (dealId: string, body: string): Promise<OtcChatMessage> => {
  const { data } = await api.post<OtcChatMessage>(`/otc-chat/deals/${dealId}/messages`, { body });
  return data;
};

export const markDealMessagesRead = async (dealId: string): Promise<void> => {
  await api.post(`/otc-chat/deals/${dealId}/messages/read`);
};
