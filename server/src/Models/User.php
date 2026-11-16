<?php
declare(strict_types=1);

namespace App\Models;

use App\Config\Database;

final class User
{
    // বাইরে পাঠানোর ঘর। password_hash এখানে কখনো নেই।
    private static function toPublic(array $row): array
    {
        return [
            'id'        => (int) $row['id'],
            'name'      => $row['name'],
            'email'     => $row['email'],
            'avatar'    => $row['avatar'],
            'createdAt' => $row['created_at'],
        ];
    }

    // $passwordHash আগেই password_hash() দিয়ে বানানো থাকতে হবে (Phase 9)
    public static function create(string $name, string $email, string $passwordHash): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'INSERT INTO users (name, email, password_hash) VALUES (:name, :email, :hash)'
        );
        // একই ইমেইল দ্বিতীয়বার দিলে UNIQUE নিয়মে PDOException আসে
        $stmt->execute([
            'name'  => $name,
            'email' => strtolower($email),
            'hash'  => $passwordHash,
        ]);

        return self::findById((int) $pdo->lastInsertId());
    }

    public static function findById(int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, name, email, avatar, created_at FROM users WHERE id = :id'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        return $row ? self::toPublic($row) : null;
    }

    // শুধু লগইনের জন্য: এটাই একমাত্র জায়গা যেখানে hash ফেরত আসে
    public static function findByEmail(string $email): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, name, email, password_hash FROM users WHERE email = :email'
        );
        $stmt->execute(['email' => strtolower($email)]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    public static function delete(int $id): bool
    {
        $stmt = Database::connection()->prepare('DELETE FROM users WHERE id = :id');
        $stmt->execute(['id' => $id]);

        return $stmt->rowCount() > 0; // ইউজার মুছলে তার টাস্ক ও category নিজে মুছে যায় (CASCADE)
    }
}