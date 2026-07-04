export interface Room {
  id: string;
  host_id: string;
  host_ip: string;
  status: 'active' | 'matched' | 'expired';
  final_result: string | null; // JSON string representing the matched Venue
  created_at: string;
  consent_date?: string | null;
  terms_version?: string | null;
}

export interface Participant {
  id: string;
  room_id: string;
  nickname: string;
  ip_address: string;
  availability: '9AM-1PM' | '1PM-5PM' | '5PM-8PM' | '8PM-11PM' | 'AfterMidnight';
  budget: number; // 1 to 4 representing $, $$, $$$, $$$$
  vibe_text: string;
  has_submitted: boolean;
  created_at: string;
  consent_date?: string | null;
  terms_version?: string | null;
}

export interface Venue {
  name: string;
  category: 'Casual Dining' | 'Fine Dining' | 'Cafes' | 'Bars' | 'Activity Lounges' | 'Parks';
  budget_tier: number; // 1 to 4
  vibe_keywords: string[];
  time_slots: ('9AM-1PM' | '1PM-5PM' | '5PM-8PM' | '8PM-11PM' | 'AfterMidnight')[];
  maps_url: string;
  description?: string;
}

export interface MatchingResult {
  venue: Venue;
  time_slot: '9AM-1PM' | '1PM-5PM' | '5PM-8PM' | '8PM-11PM' | 'AfterMidnight';
  budget_tier: number;
  alternative_venues?: Venue[];
}
