<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Utils\Response;

final class Security
{
    public static function headers(bool $isProduction): void
    {
        header_remove('X-Powered-By');
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('Referrer-Policy: no-referrer');
        header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
        header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
        header('X-Permitted-Cross-Domain-Policies: none');
        header('Cache-Control: no-store');

        if ($isProduction) {
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
        }
    }

    // শুধু আমাদের ফ্রন্টএন্ডকে অনুমতি দেয়, কখনো wildcard নয়
    public static function cors(string $allowedOrigin): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $originAllowed = $origin !== '' && hash_equals($allowedOrigin, $origin);

        if ($originAllowed) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Credentials: true');
            header('Vary: Origin');
        }

        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            if (!$originAllowed) {
                Response::error('Origin not allowed', 403);
            }
            header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
            header('Access-Control-Max-Age: 600');
            http_response_code(204);
            exit;
        }
    }
}