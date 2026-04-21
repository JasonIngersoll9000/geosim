-- Add new turn_phase values for the full pipeline
-- Existing: 'planning', 'resolution', 'reaction', 'judging', 'complete'
-- Adding: 'submitted', 'resolving', 'narrating', 'finalizing', 'failed'

ALTER TYPE turn_phase ADD VALUE IF NOT EXISTS 'submitted' BEFORE 'planning';
ALTER TYPE turn_phase ADD VALUE IF NOT EXISTS 'resolving' AFTER 'planning';
ALTER TYPE turn_phase ADD VALUE IF NOT EXISTS 'narrating' AFTER 'judging';
ALTER TYPE turn_phase ADD VALUE IF NOT EXISTS 'finalizing' AFTER 'narrating';
ALTER TYPE turn_phase ADD VALUE IF NOT EXISTS 'failed' AFTER 'complete';
