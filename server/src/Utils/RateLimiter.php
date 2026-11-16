<?php
declare(strict_types=1);

namespace App\Utils;

use App\Config\Database;
use PDO;

final class RateLimiter
{
    private static function key(string $name, string $identity): string
    {
        return hash('sha256', $name . '|' . $identity); // ইমেইল বা IP সরাসরি জমা হয় না
    }

    // একটা চেষ্টা গোনে। সীমা পেরোলে 429 দিয়ে থামে।
    public static function hit(string $name, string $identity, int $max, int $windowSeconds): void
    {
        $pdo = Database::connection();
        $key = self::key($name, $identity);

        $stmt = $pdo->prepare(
            'INSERT INTO rate_limits (bucket_key, hits, window_start) VALUES (:key, 1, NOW())
             ON DUPLICATE KEY UPDATE
               hits = IF(window_start < NOW() - INTERVAL :w1 SECOND, 1, hits + 1),
               window_start = IF(window_start < NOW() - INTERVAL :w2 SECOND, NOW(), window_start)'
        );
        $stmt->bindValue(':key', $key);
        $stmt->bindValue(':w1', $windowSeconds, PDO::PARAM_INT);
        $stmt->bindValue(':w2', $windowSeconds, PDO::PARAM_INT);
        $stmt->execute();

        $stmt = $pdo->prepare(
            'SELECT hits, :w - TIMESTAMPDIFF(SECOND, window_start, NOW()) AS retry
             FROM rate_limits WHERE bucket_key = :key'
        );
        $stmt->bindValue(':w', $windowSeconds, PDO::PARAM_INT);
        $stmt->bindValue(':key', $key);
        $stmt->execute();
        $row = $stmt->fetch();

        // মাঝে মাঝে পুরোনো সারি পরিষ্কার
        if (random_int(1, 100) === 1) {
            $pdo->exec('DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL 1 DAY');
        }

        if ($row && (int) $row['hits'] > $max) {
            header('Retry-After: ' . max(1, (int) $row['retry']));
            Response::error('Too many attempts. Please try again later.', 429);
        }
    }

    // সফল লগইনে ওই অ্যাকাউন্টের গণনা মুছে দেয়
    public static function clear(string $name, string $identity): void
    {
        $stmt = Database::connection()->prepare('DELETE FROM rate_limits WHERE bucket_key = :key');
        $stmt->execute(['key' => self::key($name, $identity)]);
    }
}