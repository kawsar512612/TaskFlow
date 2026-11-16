USE taskflow;

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key   CHAR(64) NOT NULL,
  hits         INT UNSIGNED NOT NULL DEFAULT 1,
  window_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (bucket_key),
  KEY idx_rate_limits_window (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;