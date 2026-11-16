
CREATE DATABASE IF NOT EXISTS taskflow
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'taskflow_user'@'localhost'
IDENTIFIED BY 'kawsar512';

CREATE USER IF NOT EXISTS 'taskflow_user'@'127.0.0.1'
IDENTIFIED BY 'kawsar512';

ALTER USER 'taskflow_user'@'localhost'
IDENTIFIED BY 'kawsar512';

ALTER USER 'taskflow_user'@'127.0.0.1'
IDENTIFIED BY 'kawsar512';

GRANT SELECT, INSERT, UPDATE, DELETE
ON taskflow.* TO 'taskflow_user'@'localhost';

GRANT SELECT, INSERT, UPDATE, DELETE
ON taskflow.* TO 'taskflow_user'@'127.0.0.1';

FLUSH PRIVILEGES;
