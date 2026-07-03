-- Safe performance indexes (idempotent). Run against production/staging without schema drift.
-- Usage: psql $DATABASE_URL -f prisma/scripts/apply-performance-indexes.sql

CREATE INDEX IF NOT EXISTS events_status_created_at_idx ON events (status, created_at DESC);

CREATE INDEX IF NOT EXISTS rounds_event_id_idx ON rounds (event_id);
CREATE INDEX IF NOT EXISTS rounds_status_idx ON rounds (status);

CREATE INDEX IF NOT EXISTS teams_event_id_idx ON teams (event_id);
CREATE INDEX IF NOT EXISTS teams_event_id_status_idx ON teams (event_id, status);
CREATE INDEX IF NOT EXISTS teams_track_id_idx ON teams (track_id);
CREATE INDEX IF NOT EXISTS teams_leader_id_idx ON teams (leader_id);

CREATE INDEX IF NOT EXISTS team_rounds_round_id_idx ON team_rounds (round_id);
CREATE INDEX IF NOT EXISTS team_rounds_team_id_idx ON team_rounds (team_id);

CREATE INDEX IF NOT EXISTS team_members_user_id_status_idx ON team_members (user_id, status);
CREATE INDEX IF NOT EXISTS team_members_team_id_status_idx ON team_members (team_id, status);

CREATE INDEX IF NOT EXISTS submissions_team_id_idx ON submissions (team_id);
CREATE INDEX IF NOT EXISTS submissions_round_id_idx ON submissions (round_id);
CREATE INDEX IF NOT EXISTS submissions_round_id_team_id_idx ON submissions (round_id, team_id);

CREATE INDEX IF NOT EXISTS scores_submission_id_judge_id_idx ON scores (submission_id, judge_id);
CREATE INDEX IF NOT EXISTS scores_judge_id_idx ON scores (judge_id);

CREATE INDEX IF NOT EXISTS judge_assignments_judge_id_idx ON judge_assignments (judge_id);
CREATE INDEX IF NOT EXISTS judge_assignments_round_id_idx ON judge_assignments (round_id);

CREATE INDEX IF NOT EXISTS mentor_assignments_mentor_id_idx ON mentor_assignments (mentor_id);
CREATE INDEX IF NOT EXISTS mentor_assignments_team_id_idx ON mentor_assignments (team_id);

CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_id_is_read_idx ON notifications (user_id, is_read);

CREATE INDEX IF NOT EXISTS team_messages_team_id_created_at_idx ON team_messages (team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS team_messages_sender_id_idx ON team_messages (sender_id);

CREATE INDEX IF NOT EXISTS criteria_round_id_idx ON criteria (round_id);
CREATE INDEX IF NOT EXISTS criteria_round_id_track_id_idx ON criteria (round_id, track_id);
