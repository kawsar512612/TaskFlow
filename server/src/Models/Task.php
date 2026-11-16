<?php
declare(strict_types=1);

namespace App\Models;

use App\Config\Database;

final class Task
{
    // শুধু এই তালিকার ঘরই বদলানো যায় (mass-assignment থেকে সুরক্ষা)
    private const COLUMNS = [
        'categoryId'  => 'category_id',
        'title'       => 'title',
        'description' => 'description',
        'priority'    => 'priority',
        'status'      => 'status',
        'startDate'   => 'start_date',
        'dueDate'     => 'due_date',
        'tags'        => 'tags',
    ];

    private const SELECT =
        'SELECT t.*, c.name AS category_name
         FROM tasks t
         LEFT JOIN categories c ON c.id = t.category_id';

    private static function hydrate(array $row): array
    {
        return [
            'id'          => (int) $row['id'],
            'title'       => $row['title'],
            'description' => $row['description'] ?? '',
            'categoryId'  => $row['category_id'] !== null ? (int) $row['category_id'] : null,
            'category'    => $row['category_name'],
            'priority'    => $row['priority'],
            'status'      => $row['status'],
            'startDate'   => $row['start_date'],
            'dueDate'     => $row['due_date'],
            'tags'        => json_decode($row['tags'] ?? '[]', true) ?: [],
            'createdAt'   => $row['created_at'],
            'updatedAt'   => $row['updated_at'],
        ];
    }

    private static function normalize(string $key, mixed $value): mixed
    {
        return match ($key) {
            'tags' => json_encode(array_values($value ?? []), JSON_UNESCAPED_UNICODE),
            'startDate', 'dueDate', 'categoryId' => ($value === '' || $value === null) ? null : $value,
            default => $value,
        };
    }

    public static function allForUser(int $userId): array
    {
        $stmt = Database::connection()->prepare(
            self::SELECT . ' WHERE t.user_id = :user_id ORDER BY t.created_at DESC, t.id DESC'
        );
        $stmt->execute(['user_id' => $userId]);

        return array_map([self::class, 'hydrate'], $stmt->fetchAll());
    }

    // id আর user_id দুটোই মিলতে হবে (IDOR বন্ধ)
    public static function find(int $id, int $userId): ?array
    {
        $stmt = Database::connection()->prepare(
            self::SELECT . ' WHERE t.id = :id AND t.user_id = :user_id'
        );
        $stmt->execute(['id' => $id, 'user_id' => $userId]);
        $row = $stmt->fetch();

        return $row ? self::hydrate($row) : null;
    }

    public static function create(int $userId, array $data): array
    {
        $pdo = Database::connection();
        $status = $data['status'] ?? 'todo';

        $stmt = $pdo->prepare(
            'INSERT INTO tasks (user_id, category_id, title, description, priority, status, start_date, due_date, tags, completed_at)
             VALUES (:user_id, :category_id, :title, :description, :priority, :status, :start_date, :due_date, :tags,
                     CASE WHEN :status_flag = \'completed\' THEN NOW() ELSE NULL END)'
        );
        $stmt->execute([
            'user_id'     => $userId,
            'category_id' => self::normalize('categoryId', $data['categoryId'] ?? null),
            'title'       => $data['title'],
            'description' => $data['description'] ?? null,
            'priority'    => $data['priority'] ?? 'medium',
            'status'      => $status,
            'start_date'  => self::normalize('startDate', $data['startDate'] ?? null),
            'due_date'    => self::normalize('dueDate', $data['dueDate'] ?? null),
            'tags'        => self::normalize('tags', $data['tags'] ?? []),
            'status_flag' => $status,
        ]);

        return self::find((int) $pdo->lastInsertId(), $userId);
    }

    public static function update(int $id, int $userId, array $data): ?array
    {
        $sets = [];
        $params = ['id' => $id, 'user_id' => $userId];

        // কলামের নাম আসে COLUMNS তালিকা থেকে, ইউজারের লেখা থেকে নয়। মান থাকে bind করা।
        foreach (self::COLUMNS as $key => $column) {
            if (!array_key_exists($key, $data)) {
                continue;
            }
            $sets[] = "$column = :$column";
            $params[$column] = self::normalize($key, $data[$key]);

            // status বদলালে completed_at-ও মেলাই: সম্পন্ন হলে (প্রথমবার) সময় বসে, নইলে খালি
            if ($column === 'status') {
                $sets[] = "completed_at = CASE WHEN :status_flag = 'completed'
                                               THEN COALESCE(completed_at, NOW()) ELSE NULL END";
                $params['status_flag'] = $data[$key];
            }
        }

        if ($sets !== []) {
            $stmt = Database::connection()->prepare(
                'UPDATE tasks SET ' . implode(', ', $sets) . ' WHERE id = :id AND user_id = :user_id'
            );
            $stmt->execute($params);
        }

        return self::find($id, $userId);
    }

    public static function delete(int $id, int $userId): bool
    {
        $stmt = Database::connection()->prepare(
            'DELETE FROM tasks WHERE id = :id AND user_id = :user_id'
        );
        $stmt->execute(['id' => $id, 'user_id' => $userId]);

        return $stmt->rowCount() > 0;
    }
}