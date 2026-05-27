-- Insert sample events for testing
-- Run this in Supabase SQL Editor AFTER the schema is set up

INSERT INTO events (title, description, start_time, end_time, category, required_ops, required_security, required_greeter, director_mandatory) VALUES
('Morning Prayer Service', 'Daily liturgical service', TIMESTAMPTZ '2026-04-08 09:00:00', TIMESTAMPTZ '2026-04-08 10:00:00', 'standard', 2, 0, 1, false),
('Midday Liturgy', 'Midday divine office', TIMESTAMPTZ '2026-04-08 12:00:00', TIMESTAMPTZ '2026-04-08 12:30:00', 'standard', 1, 0, 1, false),
('Evening Vespers', 'Evening prayer service', TIMESTAMPTZ '2026-04-08 18:00:00', TIMESTAMPTZ '2026-04-08 19:00:00', 'standard', 2, 1, 1, false),
('Morning Prayer Service', 'Daily liturgical service', TIMESTAMPTZ '2026-04-09 09:00:00', TIMESTAMPTZ '2026-04-09 10:00:00', 'standard', 2, 0, 1, false),
('Midday Liturgy', 'Midday divine office', TIMESTAMPTZ '2026-04-09 12:00:00', TIMESTAMPTZ '2026-04-09 12:30:00', 'standard', 1, 0, 1, false),
('Evening Vespers', 'Evening prayer service', TIMESTAMPTZ '2026-04-09 18:00:00', TIMESTAMPTZ '2026-04-09 19:00:00', 'standard', 2, 1, 1, false),
('Morning Prayer Service', 'Daily liturgical service', TIMESTAMPTZ '2026-04-10 09:00:00', TIMESTAMPTZ '2026-04-10 10:00:00', 'standard', 2, 0, 1, false),
('Midday Liturgy', 'Midday divine office', TIMESTAMPTZ '2026-04-10 12:00:00', TIMESTAMPTZ '2026-04-10 12:30:00', 'standard', 1, 0, 1, false),
('Evening Vespers', 'Evening prayer service', TIMESTAMPTZ '2026-04-10 18:00:00', TIMESTAMPTZ '2026-04-10 19:00:00', 'standard', 2, 1, 1, false),
('Great Feasts Day', 'Major feast day celebration', TIMESTAMPTZ '2026-04-12 09:00:00', TIMESTAMPTZ '2026-04-12 16:00:00', 'major_feast', 5, 2, 3, true),
('Morning Prayer Service', 'Daily liturgical service', TIMESTAMPTZ '2026-04-13 09:00:00', TIMESTAMPTZ '2026-04-13 10:00:00', 'standard', 2, 0, 1, false),
('Sunday Divine Liturgy', 'Sunday morning liturgy', TIMESTAMPTZ '2026-04-13 10:00:00', TIMESTAMPTZ '2026-04-13 12:00:00', 'standard', 4, 1, 2, true),
('Evening Vespers', 'Evening prayer service', TIMESTAMPTZ '2026-04-13 18:00:00', TIMESTAMPTZ '2026-04-13 19:00:00', 'standard', 2, 1, 1, false),
('Morning Prayer Service', 'Daily liturgical service', TIMESTAMPTZ '2026-04-14 09:00:00', TIMESTAMPTZ '2026-04-14 10:00:00', 'standard', 2, 0, 1, false),
('Midday Liturgy', 'Midday divine office', TIMESTAMPTZ '2026-04-14 12:00:00', TIMESTAMPTZ '2026-04-14 12:30:00', 'standard', 1, 0, 1, false),
('Special Event - Choir Concert', 'Guest choir performance', TIMESTAMPTZ '2026-04-15 19:00:00', TIMESTAMPTZ '2026-04-15 21:00:00', 'standard', 3, 2, 2, true),
('Morning Prayer Service', 'Daily liturgical service', TIMESTAMPTZ '2026-04-15 09:00:00', TIMESTAMPTZ '2026-04-15 10:00:00', 'standard', 2, 0, 1, false),
('Midday Liturgy', 'Midday divine office', TIMESTAMPTZ '2026-04-16 12:00:00', TIMESTAMPTZ '2026-04-16 12:30:00', 'standard', 1, 0, 1, false),
('Evening Vespers', 'Evening prayer service', TIMESTAMPTZ '2026-04-16 18:00:00', TIMESTAMPTZ '2026-04-16 19:00:00', 'standard', 2, 1, 1, false),
('Morning Prayer Service', 'Daily liturgical service', TIMESTAMPTZ '2026-04-17 09:00:00', TIMESTAMPTZ '2026-04-17 10:00:00', 'standard', 2, 0, 1, false);

SELECT 'Inserted ' || COUNT(*) || ' events' as status FROM events;
