USE taskflow;

ALTER TABLE tasks
  ADD COLUMN completed_at TIMESTAMP NULL DEFAULT NULL AFTER due_date;

-- পুরোনো সম্পন্ন টাস্ক: শেষ আপডেটের সময়কে আনুমানিক সম্পন্নের সময় ধরি।
-- updated_at = updated_at দিয়ে ওটাকে বদলাতে দিচ্ছি না।
UPDATE tasks
SET completed_at = updated_at, updated_at = updated_at
WHERE status = 'completed' AND completed_at IS NULL;