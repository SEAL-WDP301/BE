UPDATE teams SET status = 'rejected' WHERE status IN ('eliminated', 'finalist', 'winner', 'runner_up');
UPDATE teams SET status = 'approved' WHERE status = 'advancing';
