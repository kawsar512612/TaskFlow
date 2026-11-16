<?php
declare(strict_types=1);

namespace App\Models;

use App\Config\Database;

final class Category
{
    private static function hydrate(array $row): array
    {
        return [
            'id'        => (int) $row['id'],
            'name'      => $row['name'],
            'color'     => $row['color'],
            'createdAt' => $row['created_at'],
        ];
    }

    public static function allForUser(int $userId): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT * FROM categories WHERE user_id = :user_id ORDER BY name'
        );
        $stmt->execute(['user_id' => $userId]);

        return array_map([self::class, 'hydrate'], $stmt->fetchAll());
    }

    // id আর user_id দুটোই মিলতে হবে, নইলে null (অন্যের জিনিস দেখা যাবে না)
    public static function find(int $id, int $userId): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT * FROM categories WHERE id = :id AND user_id = :user_id'
        );
        $stmt->execute(['id' => $id, 'user_id' => $userId]);
        $row = $stmt->fetch();

        return $row ? self::hydrate($row) : null;
    }

    public static function belongsToUser(int $id, int $userId): bool
    {
        return self::find($id, $userId) !== null;
    }

    public static function create(int $userId, string $name, string $color): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'INSERT INTO categories (user_id, name, color) VALUES (:user_id, :name, :color)'
        );
        $stmt->execute(['user_id' => $userId, 'name' => $name, 'color' => $color]);

        return self::find((int) $pdo->lastInsertId(), $userId);
    }

    public static function update(int $id, int $userId, string $name, string $color): ?array
    {
        $stmt = Database::connection()->prepare(
            'UPDATE categories SET name = :name, color = :color WHERE id = :id AND user_id = :user_id'
        );
        $stmt->execute(['name' => $name, 'color' => $color, 'id' => $id, 'user_id' => $userId]);

        return self::find($id, $userId);
    }

    public static function delete(int $id, int $userId): bool
    {
        $stmt = Database::connection()->prepare(
            'DELETE FROM categories WHERE id = :id AND user_id = :user_id'
        );
        $stmt->execute(['id' => $id, 'user_id' => $userId]);

        return $stmt->rowCount() > 0;
    }
}