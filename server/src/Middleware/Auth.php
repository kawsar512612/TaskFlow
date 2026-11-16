<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Config\Env;
use App\Models\User;
use App\Utils\Response;

final class Auth
{
    private const COOKIE_NAME = 'taskflow_sid';

    // নিষ্ক্রিয় থাকার সীমা (সেকেন্ড), ডিফল্ট ৩০ মিনিট
    private static function idleTimeout(): int
    {
        return min(86400, max(1, (int) Env::get('SESSION_IDLE_TIMEOUT', '1800')));
    }

    // লগইনের পর সর্বোচ্চ আয়ু (সেকেন্ড), ডিফল্ট ৮ ঘণ্টা
    private static function absoluteTimeout(): int
    {
        return min(604800, max(1, (int) Env::get('SESSION_ABSOLUTE_TIMEOUT', '28800')));
    }

    // development ছাড়া সব পরিবেশে Secure কুকি (শুধু HTTPS-এ যায়)
    private static function secureCookies(): bool
    {
        return Env::get('APP_ENV', 'production') !== 'development';
    }

    private static function sameSite(): string
    {
        $v = Env::get('COOKIE_SAMESITE', 'Lax');

        return in_array($v, ['Lax', 'Strict', 'None'], true) ? $v : 'Lax';
    }

    public static function start(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.use_trans_sid', '0');
        // ফাইল পরিষ্কারের (gc) সীমা আমাদের নিজস্ব timeout-এর চেয়ে কম হতে দেওয়া যাবে না
        ini_set('session.gc_maxlifetime', (string) max(self::absoluteTimeout(), 28800));

        session_name(self::COOKIE_NAME);
        session_set_cookie_params([
            'lifetime' => 0,
            'path'     => '/',
            'domain'   => '',
            'secure'   => self::secureCookies(),
            'httponly' => true,
            'samesite' => self::sameSite(),
        ]);
        session_start();
    }

    // লগইন সফল হলে: session ID বদলাও (fixation বন্ধ) ও CSRF token নতুন করো
    public static function login(int $userId): void
    {
        self::start();
        session_regenerate_id(true);
        $_SESSION = [
            'user_id'       => $userId,
            'created_at'    => time(),
            'last_activity' => time(),
            'csrf'          => bin2hex(random_bytes(32)),
        ];
    }

    public static function logout(): void
    {
        self::start();
        $_SESSION = [];

        setcookie(self::COOKIE_NAME, '', [
            'expires'  => time() - 3600,
            'path'     => '/',
            'domain'   => '',
            'secure'   => self::secureCookies(),
            'httponly' => true,
            'samesite' => self::sameSite(),
        ]);

        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
    }

    public static function csrfToken(): string
    {
        self::start();
        if (!isset($_SESSION['csrf']) || !is_string($_SESSION['csrf'])) {
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
        }

        return $_SESSION['csrf'];
    }

    public static function currentUser(): ?array
    {
        self::start();

        $id = $_SESSION['user_id'] ?? null;
        if (!is_int($id)) {
            return null;
        }

        $now = time();
        $expired = ($now - (int) ($_SESSION['created_at'] ?? 0)) > self::absoluteTimeout()
            || ($now - (int) ($_SESSION['last_activity'] ?? 0)) > self::idleTimeout();
        if ($expired) {
            self::logout();
            return null;
        }

        $user = User::findById($id);
        if ($user === null) {
            self::logout();
            return null;
        }

        $_SESSION['last_activity'] = $now;

        return $user;
    }

    // userId সবসময় সার্ভারের session থেকে, অনুরোধ থেকে কখনো নয়
    public static function userId(): int
    {
        $user = self::currentUser();
        if ($user === null) {
            Response::error('Unauthorized', 401);
        }

        return (int) $user['id'];
    }
}