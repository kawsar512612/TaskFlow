<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Middleware\Auth;
use App\Models\User;
use App\Utils\RateLimiter;
use App\Utils\Request;
use App\Utils\Response;
use App\Validators\AuthValidator;
use PDOException;

final class AuthController
{
    private const BCRYPT_OPTIONS = ['cost' => 12];

    private static function ip(): string
    {
        return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }

    public static function csrf(): void
    {
        Response::json(['csrfToken' => Auth::csrfToken()]);
    }

    public static function register(): void
    {
        RateLimiter::hit('register', self::ip(), 10, 3600);

        $result = AuthValidator::register(Request::json());
        if ($result['errors'] !== []) {
            Response::error('Validation failed', 422, $result['errors']);
        }
        $d = $result['data'];

        $hash = password_hash($d['password'], PASSWORD_BCRYPT, self::BCRYPT_OPTIONS);

        try {
            $user = User::create($d['name'], $d['email'], $hash);
        } catch (PDOException $e) {
            if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
                Response::error('Could not create the account. If you already have one, please log in.', 409);
            }
            throw $e;
        }

        Auth::login((int) $user['id']);
        Response::json(['user' => $user, 'csrfToken' => Auth::csrfToken()], 201);
    }

    public static function login(): void
    {
        $ip = self::ip();
        RateLimiter::hit('login-ip', $ip, 30, 900);

        $result = AuthValidator::login(Request::json());
        if ($result['errors'] !== []) {
            Response::error('Validation failed', 422, $result['errors']);
        }
        $email = $result['data']['email'];
        $password = $result['data']['password'];

        // একই IP থেকে একই ইমেইলে ১৫ মিনিটে ৫ বারের বেশি নয়
        RateLimiter::hit('login-account', $ip . '|' . $email, 5, 900);

        $row = User::findByEmail($email);

        if ($row === null) {
            // ইমেইল না থাকলেও একই সময় খরচ করি (সময় মেপে ইমেইল চেনা ঠেকাতে)
            password_hash($password, PASSWORD_BCRYPT, self::BCRYPT_OPTIONS);
            Response::error('Invalid email or password', 401);
        }
        if (!password_verify($password, $row['password_hash'])) {
            Response::error('Invalid email or password', 401);
        }

        RateLimiter::clear('login-account', $ip . '|' . $email);
        Auth::login((int) $row['id']);

        Response::json([
            'user'      => User::findById((int) $row['id']),
            'csrfToken' => Auth::csrfToken(),
        ]);
    }

    public static function logout(): void
    {
        Auth::logout();
        Response::json(['message' => 'Logged out']);
    }

    public static function me(): void
    {
        $user = Auth::currentUser() ?? Response::error('Unauthorized', 401);
        Response::json(['user' => $user, 'csrfToken' => Auth::csrfToken()]);
    }
}