export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: 'super_admin' | 'admin' | 'team_leader' | 'viewer';
  status: 'active' | 'inactive';
  category: string | null;
  secondary_category: string | null;
  gender: 'male' | 'female' | null;
  phone: string | null;
  google_login_allowed: 'true' | 'false';
  avatar_url: string | null;
  deleted_at: string | null;
  daily_message_template: string | null;
  daily_message_template_male: string | null;
  daily_message_template_female: string | null;
  is_from_file: number;
  is_approved: number;
  is_shaham_manager?: number;
  password_updated_at?: string;
  password_plain?: string;
  assigned_group_id?: string;
  created_by?: number;
  creator_name?: string;
  created_at: string;
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
  created_at: string;
  last_published_at: string | null;
  publish_count: number;
  deleted_at: string | null;
  phone: string | null;
  is_published_confirmed: number;
  crop_config: string | null; // JSON string of { x, y, zoom }
  creation_source: 'manual' | 'ai' | 'csv' | null;
}

export interface Stats {
  males: number;
  females: number;
  publishedToday: number;
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
  group_name: string;
  created_at: string;
}
