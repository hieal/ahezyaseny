export interface User {
  id: string;
  name?: string;
  full_name: string;
  username?: string;
  email: string;
  role: 'super_admin' | 'admin' | 'team_leader' | 'viewer' | 'candidate';
  status: 'active' | 'inactive';
  category: string | null;
  secondary_category?: string | null;
  gender: 'male' | 'female' | null;
  phone: string | null;
  google_login_allowed?: 'true' | 'false';
  avatar_url: string | null;
  deleted_at?: string | null;
  daily_message_template?: string | null;
  is_from_file?: number;
  is_approved?: number;
  is_shaham_manager?: number;
  password_updated_at?: string;
  password_plain?: string;
  assigned_group_id?: string;
  created_by?: string;
  creator_name?: string;
  created_at?: string;
  last_seen?: string;
  is_online?: boolean;
  last_login?: string | null;
}

export interface GameScore {
  id: string;
  candidate_id: string;
  candidate_name: string;
  game_type: 'memory' | 'this_or_that' | 'speed_date';
  score: number;
  created_at: string;
}

export interface PortalSettings {
  id: string;
  memory_game_images: string; // JSON array of URLs
  is_speed_date_active: boolean;
  created_at: string;
}

export interface SpeedDateSession {
  id: string;
  male_id: string;
  female_id: string;
  status: 'active' | 'completed' | 'expired';
  created_at: string;
  expires_at: string;
  share_details_male?: boolean;
  share_details_female?: boolean;
}

export interface WhatsAppGroup {
  id: string;
  category: string;
  type: 'male' | 'female';
  name: string;
  link: string;
  whapi_id: string | null;
  last_initial_sent: string | null;
  last_initial_sent_method?: 'auto' | 'manual' | null;
}

export interface Match {
  id: string;
  type: 'male' | 'female';
  name: string;
  age: number;
  height: string;
  ethnicity: string;
  marital_status: string;
  city: string;
  religious_level: string;
  service: string;
  occupation: string;
  about: string;
  looking_for: string;
  smoking: string;
  negiah: string;
  age_range: string;
  image_url: string | null;
  additional_images: string | null; // JSON string of array
  created_by: string;
  creator_name?: string;
  creator_category?: string;
  creator_gender?: 'male' | 'female' | null;
  creator_phone?: string | null;
  category?: string | null;
  created_at: string;
  last_published_at: string | null;
  manual_published_at?: string | null;
  publish_count: number;
  deleted_at: string | null;
  phone: string | null;
  is_published_confirmed: number;
  is_available?: boolean;
  crop_config: string | null; // JSON string of { x, y, zoom }
  creation_source: 'manual' | 'ai' | 'csv' | null;
  viewer_group_ids: string | null; // JSON string of array of WhatsAppGroup IDs
}

export interface Stats {
  males: number;
  females: number;
  malesGroup?: number;
  femalesGroup?: number;
  totalMatchesSite?: number;
  publishedToday: number;
  publishedThisMonth?: number;
  publishedThisMonthMe?: number;
  publishedThisMonthGroup?: number;
  neverPublished: number;
  totalAdmins?: number;
  adminMales?: number;
  adminFemales?: number;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  details: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

export interface PublishLog {
  id: string;
  match_id: string;
  match_name: string;
  user_id: string;
  user_name: string;
  group_id?: string;
  group_name: string;
  created_at: string;
}

export interface MatchNote {
  id: string;
  match_id: string;
  user_id: string;
  user_name: string;
  text: string;
  is_available: boolean;
  created_at: string;
}
