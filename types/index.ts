export type UserRole = "owner" | "marketing" | "sales_rep" | "client";

export interface Profile {
  id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  role: UserRole;
  status: string;
  avatar_url: string | null;
  last_route: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  company_name: string;
  phone: string | null;
  preferred_contact: string;
  contract_type: string | null;
  deal_value_upfront: number;
  deal_value_monthly: number;
  renewal_date_day: number | null;
  contract_start_date: string | null;
  potential_value: number;
  upsell_notes: string | null;
  lead_source: string | null;
  industry: string | null;
  timezone: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export type ServiceType =
  | "website_seo"
  | "chatbot"
  | "phone_agent"
  | "automations"
  | "social_media"
  | "email_outreach"
  | "app"
  | "custom";

export interface ClientService {
  id: string;
  client_id: string;
  service_type: ServiceType;
  custom_service_name: string | null;
  status: string;
  config: Record<string, unknown> | null;
  objective_text: string | null;
  created_at: string;
}

export interface ServiceDataBlock {
  id: string;
  client_service_id: string;
  block_type: string;
  label: string;
  value: string;
  display_order: number;
  show_on_dashboard: boolean;
  updated_at: string;
}

export interface ClientUpdate {
  id: string;
  client_id: string;
  title: string | null;
  content: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface Automation {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  category: string;
  status: string;
  vendor_tool: string | null;
  last_run: string | null;
  created_at: string;
}

export const SERVICE_DISPLAY: Record<
  ServiceType,
  { name: string; icon: string }
> = {
  website_seo: { name: "Website & SEO", icon: "Globe" },
  chatbot: { name: "Chatbot", icon: "MessageSquare" },
  phone_agent: { name: "Phone Agent", icon: "Phone" },
  automations: { name: "Automations", icon: "Zap" },
  social_media: { name: "Social Media", icon: "Share2" },
  email_outreach: { name: "Email Outreach", icon: "Mail" },
  app: { name: "App", icon: "Smartphone" },
  custom: { name: "Custom", icon: "Puzzle" },
};
