<?php
declare(strict_types=1);

namespace App\Config;

final class Env
{
    private static array $values = [];

    public static function load(string $path): void
    {
        if (!is_file($path)) {
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];

        foreach ($lines as $line) {
            $line = trim($line);

            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            $pos = strpos($line, '=');
            if ($pos === false) {
                continue;
            }

            $key = trim(substr($line, 0, $pos));
            $value = trim(substr($line, $pos + 1));
            $value = trim($value, "\"'");

            self::$values[$key] = $value;
        }
    }

    // আসল environment variable আগে, না থাকলে .env, না থাকলে ডিফল্ট।
    // লাইভ হোস্টে গোপন তথ্য সাধারণত environment variable হিসেবেই দেওয়া হয়।
    public static function get(string $key, ?string $default = null): ?string
    {
        $fromProcess = getenv($key);
        if ($fromProcess !== false && $fromProcess !== '') {
            return $fromProcess;
        }

        return self::$values[$key] ?? $default;
    }
}