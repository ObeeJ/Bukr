-- 999_seed_data.sql
-- Seed data for E2E testing

-- Create a test organizer (User ID: 00000000-0000-0000-0000-000000000001)
-- Supabase UID should ideally match a real one if we want to test JWT validation
-- For initial seeding, we use a placeholder that we might update during test setup
INSERT INTO users (id, supabase_uid, email, name, user_type, org_name)
VALUES (
    '00000000-0000-0000-0000-000000000001', 
    '00000000-0000-0000-0000-000000000001', 
    'organizer@test.com', 
    'Test Organizer', 
    'organizer', 
    'Test Productions'
) ON CONFLICT (id) DO NOTHING;

-- Create some events
INSERT INTO events (id, organizer_id, title, description, date, time, location, price, currency, category, emoji, event_key, total_tickets, available_tickets)
VALUES 
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Lagos Tech Summit 2026',
    'Join industry leaders for the biggest tech conference in West Africa.',
    '2026-06-15',
    '09:00:00',
    'Landmark Centre, Victoria Island, Lagos',
    5000.00,
    'NGN',
    'Technology',
    '💻',
    'lagos-tech-2026',
    500,
    500
),
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Afrobeats Night Live',
    'Experience the best of Afrobeats with top artists and performers.',
    '2026-07-20',
    '19:00:00',
    'Eko Hotel & Suites, Lagos',
    10000.00,
    'NGN',
    'Music',
    '🎵',
    'afrobeats-night',
    1000,
    1000
),
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Free Community Workshop',
    'A free workshop for local developers and creatives.',
    '2026-08-05',
    '10:00:00',
    'Co-creation Hub, Yaba',
    0.00,
    'NGN',
    'Workshop',
    '🛠️',
    'free-workshop',
    50,
    50
) ON CONFLICT (id) DO NOTHING;
