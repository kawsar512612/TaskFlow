<?php

declare(strict_types=1);
require_once dirname(__DIR__) . '/vendor/autoload.php';

use Dotenv\Dotenv;

// Project root directory
$rootPath = dirname(__DIR__);

// Load environment variables
$dotenv = Dotenv::createImmutable($rootPath);
$dotenv->safeLoad();

// Set timezone
date_default_timezone_set('Asia/Dhaka');

// Set default response headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
