<?php
declare(strict_types=1);

namespace App\Models;

use App\Config\Database;
use App\Config\Env;

// একজন ইউজার কতটা ডেটা বানাতে পারবে। ডাটাবেস ভরে ফেলা (abuse) ঠেকাতে।
final class Limits
{
    public static function maxTasks(): int
    {
        return max(1, (int) Env::get('MAX_TASKS_PER_USER', '2000'));
    }

    public static function maxCategories(): int
    {
        return max(1, (int) Env::get('MAX_CATEGORIES_PER_USER', '50'));
    }

    public static function tasksUsed(int $userId): int
    {
        $stmt = Database::connection()->prepare('SELECT COUNT(*) FROM tasks WHERE user_id = :u');
        $stmt->execute(['u' => $userId]);

        return (int) $stmt->fetchColumn();
    }

    public static function categoriesUsed(int $userId): int
    {
        $stmt = Database::connection()->prepare('SELECT COUNT(*) FROM categories WHERE user_id = :u');
        $stmt->execute(['u' => $userId]);

        return (int) $stmt->fetchColumn();
    }
}