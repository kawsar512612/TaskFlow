<?php
declare(strict_types=1);

namespace App\Validators;

final class AuthValidator
{
    public static function register(array $in): array
    {
        $clean = [];
        $errors = [];

        $name = $in['name'] ?? null;
        if (!is_string($name) || mb_strlen(trim($name)) < 2) {
            $errors['name'] = 'Name must be at least 2 characters.';
        } elseif (mb_strlen(trim($name)) > 100) {
            $errors['name'] = 'Name must be 100 characters or less.';
        } else {
            $clean['name'] = trim($name);
        }

        $email = $in['email'] ?? null;
        if (!is_string($email) || strlen(trim($email)) > 190
            || filter_var(trim($email), FILTER_VALIDATE_EMAIL) === false) {
            $errors['email'] = 'Enter a valid email address.';
        } else {
            $clean['email'] = strtolower(trim($email));
        }

        // strlen = বাইট গণনা। bcrypt ৭২ বাইটের পরে কেটে ফেলে, তাই সীমা বাধ্যতামূলক।
        $pw = $in['password'] ?? null;
        if (!is_string($pw) || strlen($pw) < 8) {
            $errors['password'] = 'Password must be at least 8 characters.';
        } elseif (strlen($pw) > 72) {
            $errors['password'] = 'Password must be 72 bytes or fewer.';
        } elseif (isset($clean['email']) && strtolower($pw) === $clean['email']) {
            $errors['password'] = 'Password must not be your email.';
        } else {
            $clean['password'] = $pw;
        }

        return ['data' => $clean, 'errors' => $errors];
    }

    // লগইনে শুধু ধরন যাচাই। পাসওয়ার্ডের নিয়ম এখানে দেখাই না।
    public static function login(array $in): array
    {
        $email = $in['email'] ?? null;
        $pw = $in['password'] ?? null;

        if (!is_string($email) || !is_string($pw) || trim($email) === '' || $pw === ''
            || strlen($email) > 190 || strlen($pw) > 1024) {
            return ['data' => [], 'errors' => ['credentials' => 'Email and password are required.']];
        }

        return ['data' => ['email' => strtolower(trim($email)), 'password' => $pw], 'errors' => []];
    }
}