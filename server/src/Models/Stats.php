<?php
declare(strict_types=1);

namespace App\Models;

use App\Config\Database;
use DateTimeImmutable;

final class Stats
{
    // ফলাফল: কলাম k (কী) আর c (সংখ্যা) থেকে ['কী' => সংখ্যা]
    private static function counts(string $sql, int $userId): array
    {
        $stmt = Database::connection()->prepare($sql);
        $stmt->execute(['u' => $userId]);

        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $out[(string) $row['k']] = (int) $row['c'];
        }

        return $out;
    }

    public static function forUser(int $userId): array
    {
        $pdo = Database::connection();

        // সব হিসাব একটা প্রশ্নে। প্রতিটায় WHERE user_id = ? আছে।
        $stmt = $pdo->prepare(
            "SELECT COUNT(*) AS total,
                    SUM(status = 'completed')   AS completed,
                    SUM(status = 'in_progress') AS in_progress,
                    SUM(status = 'todo')        AS todo,
                    SUM(status <> 'completed' AND due_date IS NOT NULL AND due_date < CURDATE()) AS overdue,
                    SUM(priority = 'low')    AS p_low,
                    SUM(priority = 'medium') AS p_medium,
                    SUM(priority = 'high')   AS p_high
             FROM tasks WHERE user_id = :u"
        );
        $stmt->execute(['u' => $userId]);
        $t = $stmt->fetch();

        // টাস্ক না থাকলে SUM() null দেয়, (int) তাকে 0 করে
        $total = (int) $t['total'];
        $completed = (int) $t['completed'];

        // তারিখ MySQL থেকেই নিই, যাতে PHP-র টাইমজোনের সাথে গরমিল না হয়
        $today = new DateTimeImmutable((string) $pdo->query('SELECT CURDATE() AS d')->fetch()['d']);

        // ---- শেষ ৭ দিন ----
        $createdByDay = self::counts(
            'SELECT DATE(created_at) AS k, COUNT(*) AS c FROM tasks
             WHERE user_id = :u AND created_at >= CURDATE() - INTERVAL 6 DAY
             GROUP BY DATE(created_at)',
            $userId
        );
        $completedByDay = self::counts(
            'SELECT DATE(completed_at) AS k, COUNT(*) AS c FROM tasks
             WHERE user_id = :u AND completed_at IS NOT NULL
               AND completed_at >= CURDATE() - INTERVAL 6 DAY
             GROUP BY DATE(completed_at)',
            $userId
        );

        $weekly = [];
        for ($i = 6; $i >= 0; $i--) {
            $d = $today->modify("-$i days")->format('Y-m-d');
            $weekly[] = [
                'date'      => $d,
                'created'   => $createdByDay[$d] ?? 0,
                'completed' => $completedByDay[$d] ?? 0,
            ];
        }

        // ---- শেষ ৬ মাস ----
        $createdByMonth = self::counts(
            "SELECT DATE_FORMAT(created_at, '%Y-%m') AS k, COUNT(*) AS c FROM tasks
             WHERE user_id = :u
               AND created_at >= DATE_FORMAT(CURDATE() - INTERVAL 5 MONTH, '%Y-%m-01')
             GROUP BY DATE_FORMAT(created_at, '%Y-%m')",
            $userId
        );
        $completedByMonth = self::counts(
            "SELECT DATE_FORMAT(completed_at, '%Y-%m') AS k, COUNT(*) AS c FROM tasks
             WHERE user_id = :u AND completed_at IS NOT NULL
               AND completed_at >= DATE_FORMAT(CURDATE() - INTERVAL 5 MONTH, '%Y-%m-01')
             GROUP BY DATE_FORMAT(completed_at, '%Y-%m')",
            $userId
        );

        $firstOfMonth = $today->modify('first day of this month');
        $monthly = [];
        for ($i = 5; $i >= 0; $i--) {
            $m = $firstOfMonth->modify("-$i months")->format('Y-m');
            $monthly[] = [
                'month'     => $m,
                'created'   => $createdByMonth[$m] ?? 0,
                'completed' => $completedByMonth[$m] ?? 0,
            ];
        }

        return [
            'totals' => [
                'total'          => $total,
                'completed'      => $completed,
                'inProgress'     => (int) $t['in_progress'],
                'todo'           => (int) $t['todo'],
                'overdue'        => (int) $t['overdue'],
                'completionRate' => $total > 0 ? (int) round($completed / $total * 100) : 0,
            ],
            'priority' => [
                'low'    => (int) $t['p_low'],
                'medium' => (int) $t['p_medium'],
                'high'   => (int) $t['p_high'],
            ],
            'weekly'  => $weekly,
            'monthly' => $monthly,
        ];
    }
}