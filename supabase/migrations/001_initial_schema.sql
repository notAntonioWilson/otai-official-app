-- OTAI App Full Schema Migration
-- Run this in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 1. PROFILES
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  username TEXT UNIQUE,
  display_name TEXT,
  role TEXT DEFAULT 'client',
  status TEXT DEFAULT 'active',
  avatar_url TEXT,
  last_route TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. ROLES
-- ============================================
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE,
  display_name TEXT,
  permissions JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. CLIENTS
-- ============================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  company_name TEXT NOT NULL,
  phone TEXT,
  preferred_contact TEXT DEFAULT 'email',
  contract_type TEXT,
  deal_value_upfront DECIMAL DEFAULT 0,
  deal_value_monthly DECIMAL DEFAULT 0,
  renewal_date_day INTEGER,
  contract_start_date DATE,
  potential_value DECIMAL DEFAULT 0,
  upsell_notes TEXT,
  lead_source TEXT,
  industry TEXT,
  timezone TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 4. CLIENT_SERVICES
-- ============================================
CREATE TABLE client_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  custom_service_name TEXT,
  status TEXT DEFAULT 'active',
  config JSONB,
  objective_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. SERVICE_DATA_BLOCKS
-- ============================================
CREATE TABLE service_data_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_service_id UUID REFERENCES client_services(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL,
  label TEXT NOT NULL,
  value TEXT DEFAULT '0',
  display_order INTEGER DEFAULT 0,
  show_on_dashboard BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 6. FINANCE_TRANSACTIONS
-- ============================================
CREATE TABLE finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  type TEXT NOT NULL,
  category TEXT,
  amount DECIMAL DEFAULT 0,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  auto_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 7. AUTOMATIONS
-- ============================================
CREATE TABLE automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'client',
  status TEXT DEFAULT 'running',
  vendor_tool TEXT,
  last_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 8. AUTOMATION_ACTIVITY
-- ============================================
CREATE TABLE automation_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES automations(id) ON DELETE CASCADE,
  activity_type TEXT,
  agent_name TEXT,
  status TEXT,
  duration_seconds INTEGER,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 9. AUTOMATION_QUEUE
-- ============================================
CREATE TABLE automation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES automations(id) ON DELETE CASCADE,
  lead_name TEXT,
  lead_email TEXT,
  lead_phone TEXT,
  stage TEXT DEFAULT 'new',
  last_touched_by UUID REFERENCES profiles(id),
  last_touched_at TIMESTAMPTZ,
  next_action TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 10. AUTOMATION_ERRORS
-- ============================================
CREATE TABLE automation_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES automations(id) ON DELETE CASCADE,
  error_text TEXT,
  reason TEXT,
  resolution TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 11. AUDIT_TRAIL
-- ============================================
CREATE TABLE audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT,
  target_table TEXT,
  target_id UUID,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 12. CRM_LEADS
-- ============================================
CREATE TABLE crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  services_interested TEXT[],
  status TEXT DEFAULT 'Hot NOT Contacted',
  notes TEXT,
  additional_info JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 13. CRM_ACTIVITY_LOG
-- ============================================
CREATE TABLE crm_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  note TEXT,
  file_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 14. CRM_FILES
-- ============================================
CREATE TABLE crm_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  file_name TEXT,
  file_url TEXT,
  file_type TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 15. MARKETING_CALENDAR
-- ============================================
CREATE TABLE marketing_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  marketer_id UUID REFERENCES profiles(id),
  platform TEXT,
  post_type TEXT,
  description TEXT,
  scheduled_date DATE,
  status TEXT DEFAULT 'planned',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 16. MARKETING_CLIENT_ASSIGNMENTS
-- ============================================
CREATE TABLE marketing_client_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketer_id UUID REFERENCES profiles(id),
  client_id UUID REFERENCES clients(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 17. MARKETING_CONTENT_FOLDERS
-- ============================================
CREATE TABLE marketing_content_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  parent_folder_id UUID REFERENCES marketing_content_folders(id),
  name TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 18. MARKETING_CONTENT_ITEMS
-- ============================================
CREATE TABLE marketing_content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES marketing_content_folders(id),
  client_id UUID REFERENCES clients(id),
  title TEXT,
  content TEXT,
  file_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 19. SOCIAL_MEDIA_METRICS
-- ============================================
CREATE TABLE social_media_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  platform TEXT,
  week_start DATE,
  posts_count INTEGER DEFAULT 0,
  engagement_total INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  followers_change INTEGER DEFAULT 0,
  data_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 20. SALES_DAILY_REPORTS
-- ============================================
CREATE TABLE sales_daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_rep_id UUID REFERENCES profiles(id),
  report_date DATE,
  total_calls INTEGER DEFAULT 0,
  total_answers INTEGER DEFAULT 0,
  callbacks INTEGER DEFAULT 0,
  send_info INTEGER DEFAULT 0,
  bookings INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 21. SALES_COMMISSION_PAGE
-- ============================================
CREATE TABLE sales_commission_page (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 22. COURSES
-- ============================================
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  description TEXT,
  target_role TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 23. COURSE_MODULES
-- ============================================
CREATE TABLE course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT,
  display_order INTEGER DEFAULT 0
);

-- ============================================
-- 24. COURSE_LESSONS
-- ============================================
CREATE TABLE course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,
  title TEXT,
  content_type TEXT DEFAULT 'text',
  text_content TEXT,
  video_url TEXT,
  display_order INTEGER DEFAULT 0
);

-- ============================================
-- 25. COURSE_PROGRESS
-- ============================================
CREATE TABLE course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  lesson_id UUID REFERENCES course_lessons(id),
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ
);

-- ============================================
-- 26. CLIENT_UPDATES
-- ============================================
CREATE TABLE client_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  title TEXT,
  content TEXT,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 27. WEBHOOKS
-- ============================================
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag TEXT UNIQUE,
  url TEXT,
  method TEXT DEFAULT 'POST',
  description TEXT,
  source TEXT,
  target_table TEXT,
  status TEXT DEFAULT 'inactive',
  last_triggered TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TRIGGER: Auto-create profile on user signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, display_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    'active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- RLS: Disabled for now, will be enabled in production hardening phase
-- ============================================
-- Note: RLS is intentionally left disabled during initial development.
-- It will be properly configured with JWT custom claims during the Cursor
-- hardening phase (Phase 3 of development roadmap).
