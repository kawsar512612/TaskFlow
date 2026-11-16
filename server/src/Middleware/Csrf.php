<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Config\Env;
use App\Utils\Response;

// অন্য সাইট থেকে ইউজারের ব্রাউজারকে দিয়ে আমাদের API-তে লুকিয়ে অনুরোধ পাঠানো ঠেকায়
final class Csrf
{
    private const UNSAFE = ['POST', 'PUT', 'PATCH', 'DELETE'];

    public static function enforce(): void
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        if (!in_array($method, self::UNSAFE, true)) {
            return;
        }

        // স্তর ১: Origin থাকলে অবশ্যই আমাদের ফ্রন্টএন্ড হতে হবে
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowed = Env::get('CLIENT_URL', 'http://localhost:5173');
        if ($origin !== '' && !hash_equals($allowed, $origin)) {
            Response::error('Forbidden', 403);
        }

        // স্তর ২: session-এর token header-এ মিলতে হবে
        $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        $expected = Auth::csrfToken();
        if ($sent === '' || !hash_equals($expected, $sent)) {
            Response::error('Invalid CSRF token', 403);
        }
    }
}