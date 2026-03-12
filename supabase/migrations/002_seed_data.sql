-- ============================================
-- OTAI App Seed Data
-- Run AFTER the schema migration AND after creating users in Supabase Auth
-- ============================================

-- ============================================
-- STEP 1: Update profiles with metadata
-- (Trigger should have auto-created profiles, this ensures correct data)
-- ============================================
INSERT INTO profiles (id, email, username, display_name, role, status)
SELECT 
  id, email,
  raw_user_meta_data->>'username',
  raw_user_meta_data->>'display_name',
  raw_user_meta_data->>'role',
  'active'
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  status = 'active';

-- ============================================
-- STEP 2: Seed clients
-- ============================================
INSERT INTO clients (id, user_id, company_name, industry, status)
SELECT gen_random_uuid(), id, 'Next Level Carpentry', 'Carpentry / Construction', 'active'
FROM profiles WHERE username = 'N3xtlvl';

INSERT INTO clients (id, user_id, company_name, industry, status)
SELECT gen_random_uuid(), id, 'JAZ Home', 'Real Estate / Home Services', 'active'
FROM profiles WHERE username = 'Jzar';

INSERT INTO clients (id, user_id, company_name, industry, status)
SELECT gen_random_uuid(), id, 'Queen of Peace', 'Religious / Non-profit', 'active'
FROM profiles WHERE username = 'TonyB';

INSERT INTO clients (id, user_id, company_name, industry, status)
SELECT gen_random_uuid(), id, 'DG Ventures', 'Business Services', 'active'
FROM profiles WHERE username = 'DarrickG';

INSERT INTO clients (id, user_id, company_name, industry, status)
SELECT gen_random_uuid(), id, 'Mokhan Capital', 'Finance / Capital', 'active'
FROM profiles WHERE username = 'MohkhanC$';

-- ============================================
-- STEP 3: Seed client services
-- ============================================

-- Joshua: website_seo, chatbot, social_media
INSERT INTO client_services (id, client_id, service_type, config)
SELECT gen_random_uuid(), c.id, 'website_seo', '{}'::jsonb
FROM clients c JOIN profiles p ON c.user_id = p.id WHERE p.username = 'N3xtlvl';

INSERT INTO client_services (id, client_id, service_type, config)
SELECT gen_random_uuid(), c.id, 'chatbot', '{}'::jsonb
FROM clients c JOIN profiles p ON c.user_id = p.id WHERE p.username = 'N3xtlvl';

INSERT INTO client_services (id, client_id, service_type, config)
SELECT gen_random_uuid(), c.id, 'social_media', '{"platforms": ["facebook_page", "instagram", "linkedin_business", "linkedin_personal"]}'::jsonb
FROM clients c JOIN profiles p ON c.user_id = p.id WHERE p.username = 'N3xtlvl';

-- Jennifer: website_seo, social_media
INSERT INTO client_services (id, client_id, service_type, config)
SELECT gen_random_uuid(), c.id, 'website_seo', '{}'::jsonb
FROM clients c JOIN profiles p ON c.user_id = p.id WHERE p.username = 'Jzar';

INSERT INTO client_services (id, client_id, service_type, config)
SELECT gen_random_uuid(), c.id, 'social_media', '{"platforms": ["facebook_personal", "instagram", "linkedin_personal"]}'::jsonb
FROM clients c JOIN profiles p ON c.user_id = p.id WHERE p.username = 'Jzar';

-- Tony B: website_seo, social_media
INSERT INTO client_services (id, client_id, service_type, config)
SELECT gen_random_uuid(), c.id, 'website_seo', '{}'::jsonb
FROM clients c JOIN profiles p ON c.user_id = p.id WHERE p.username = 'TonyB';

INSERT INTO client_services (id, client_id, service_type, config)
SELECT gen_random_uuid(), c.id, 'social_media', '{"platforms": ["facebook_page", "instagram"]}'::jsonb
FROM clients c JOIN profiles p ON c.user_id = p.id WHERE p.username = 'TonyB';

-- Darrick: email_outreach, website_seo
INSERT INTO client_services (id, client_id, service_type, config)
SELECT gen_random_uuid(), c.id, 'email_outreach', '{}'::jsonb
FROM clients c JOIN profiles p ON c.user_id = p.id WHERE p.username = 'DarrickG';

INSERT INTO client_services (id, client_id, service_type, config)
SELECT gen_random_uuid(), c.id, 'website_seo', '{}'::jsonb
FROM clients c JOIN profiles p ON c.user_id = p.id WHERE p.username = 'DarrickG';

-- Mohammad: email_outreach
INSERT INTO client_services (id, client_id, service_type, config)
SELECT gen_random_uuid(), c.id, 'email_outreach', '{}'::jsonb
FROM clients c JOIN profiles p ON c.user_id = p.id WHERE p.username = 'MohkhanC$';

-- ============================================
-- STEP 4: Seed data blocks
-- ============================================

-- Website & SEO
INSERT INTO service_data_blocks (client_service_id, block_type, label, value, display_order, show_on_dashboard)
SELECT cs.id, 'stat_number', 'Total Clicks', '0', 1, true FROM client_services cs WHERE cs.service_type = 'website_seo';
INSERT INTO service_data_blocks (client_service_id, block_type, label, value, display_order, show_on_dashboard)
SELECT cs.id, 'stat_number', 'Total Users', '0', 2, true FROM client_services cs WHERE cs.service_type = 'website_seo';
INSERT INTO service_data_blocks (client_service_id, block_type, label, value, display_order, show_on_dashboard)
SELECT cs.id, 'link', 'Site Link', '', 3, false FROM client_services cs WHERE cs.service_type = 'website_seo';
INSERT INTO service_data_blocks (client_service_id, block_type, label, value, display_order, show_on_dashboard)
SELECT cs.id, 'text_block', 'Top Keywords', 'No data yet', 4, false FROM client_services cs WHERE cs.service_type = 'website_seo';

-- Chatbot
INSERT INTO service_data_blocks (client_service_id, block_type, label, value, display_order, show_on_dashboard)
SELECT cs.id, 'stat_number', 'Leads Captured', '0', 1, true FROM client_services cs WHERE cs.service_type = 'chatbot';
INSERT INTO service_data_blocks (client_service_id, block_type, label, value, display_order, show_on_dashboard)
SELECT cs.id, 'text_block', 'Chatbot Focus', '', 2, false FROM client_services cs WHERE cs.service_type = 'chatbot';
INSERT INTO service_data_blocks (client_service_id, block_type, label, value, display_order, show_on_dashboard)
SELECT cs.id, 'text_block', 'Important Conversations', 'No flagged conversations yet', 3, false FROM client_services cs WHERE cs.service_type = 'chatbot';

-- Social Media
INSERT INTO service_data_blocks (client_service_id, block_type, label, value, display_order, show_on_dashboard)
SELECT cs.id, 'stat_number', 'Total Posts', '0', 1, true FROM client_services cs WHERE cs.service_type = 'social_media';
INSERT INTO service_data_blocks (client_service_id, block_type, label, value, display_order, show_on_dashboard)
SELECT cs.id, 'stat_number', 'Engagement Rate', '0', 2, true FROM client_services cs WHERE cs.service_type = 'social_media';

-- Email Outreach
INSERT INTO service_data_blocks (client_service_id, block_type, label, value, display_order, show_on_dashboard)
SELECT cs.id, 'stat_number', 'Leads Generated', '0', 1, true FROM client_services cs WHERE cs.service_type = 'email_outreach';
INSERT INTO service_data_blocks (client_service_id, block_type, label, value, display_order, show_on_dashboard)
SELECT cs.id, 'stat_number', 'Emails Sent', '0', 2, true FROM client_services cs WHERE cs.service_type = 'email_outreach';
INSERT INTO service_data_blocks (client_service_id, block_type, label, value, display_order, show_on_dashboard)
SELECT cs.id, 'stat_number', 'Open Rate', '0%', 3, false FROM client_services cs WHERE cs.service_type = 'email_outreach';
INSERT INTO service_data_blocks (client_service_id, block_type, label, value, display_order, show_on_dashboard)
SELECT cs.id, 'status_indicator', 'Campaign Status', 'active', 4, true FROM client_services cs WHERE cs.service_type = 'email_outreach';

-- ============================================
-- STEP 5: Assign Chad to social media clients
-- ============================================
INSERT INTO marketing_client_assignments (marketer_id, client_id)
SELECT p.id, c.id
FROM profiles p, clients c
JOIN profiles cp ON c.user_id = cp.id
JOIN client_services cs ON cs.client_id = c.id
WHERE p.username = 'Chad'
AND cs.service_type = 'social_media';

-- ============================================
-- STEP 6: Insert default roles
-- ============================================
INSERT INTO roles (name, display_name, permissions) VALUES
('owner', 'Owner', '{"all": true}'::jsonb),
('marketing', 'Marketing Team', '{"calendar": true, "clients": true, "courses": true}'::jsonb),
('sales_rep', 'Sales Rep', '{"leaderboard": true, "courses": true, "commission": true}'::jsonb),
('client', 'Client', '{"dashboard": true, "updates": true, "services": true, "settings": true}'::jsonb);
