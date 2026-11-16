<?php
declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Config\Env;
use App\Models\Stats;
use App\Models\Task;
use App\Models\User;

Env::load(__DIR__ . '/../.env');

$failed = 0;
function check(string $label, bool $ok): void
{
    global $failed;
    echo ($ok ? '[PASS] ' : '[FAIL] ') . $label . PHP_EOL;
    if (!$ok) {
        $failed++;
    }
}

$sfx = bin2hex(random_bytes(4));
$hash = password_hash('Test1234!', PASSWORD_DEFAULT);
$a = $b = null;

try {
    $a = User::create('Stats A', "stats_a_$sfx@example.test", $hash);
    $b = User::create('Stats B', "stats_b_$sfx@example.test", $hash);

    $empty = Stats::forUser($a['id']);
    check('Empty account: all zeros, rate 0',
        $empty['totals']['total'] === 0 && $empty['totals']['completionRate'] === 0
        && $empty['priority']['high'] === 0);
    check('Weekly has 7 days, monthly has 6 months',
        count($empty['weekly']) === 7 && count($empty['monthly']) === 6);

    $past = date('Y-m-d', strtotime('-3 days'));
    $future = date('Y-m-d', strtotime('+10 days'));

    Task::create($a['id'], ['title' => 't1', 'priority' => 'high', 'status' => 'todo', 'dueDate' => $past]);
    Task::create($a['id'], ['title' => 't2', 'priority' => 'medium', 'status' => 'in_progress', 'dueDate' => $future]);
    $t3 = Task::create($a['id'], ['title' => 't3', 'priority' => 'low', 'status' => 'completed', 'dueDate' => $past]);
    Task::create($a['id'], ['title' => 't4', 'priority' => 'high', 'status' => 'completed']);
    Task::create($a['id'], ['title' => 't5', 'priority' => 'low', 'status' => 'todo']);

    $s = Stats::forUser($a['id']);
    $t = $s['totals'];
    check('Total is 5', $t['total'] === 5);
    check('Completed is 2', $t['completed'] === 2);
    check('In progress is 1', $t['inProgress'] === 1);
    check('Todo (pending) is 2', $t['todo'] === 2);
    check('Overdue is 1 (completed overdue task not counted)', $t['overdue'] === 1);
    check('Completion rate is 40', $t['completionRate'] === 40);
    check('Priority split low 2, medium 1, high 2',
        $s['priority'] === ['low' => 2, 'medium' => 1, 'high' => 2]);

    $todayRow = end($s['weekly']);
    check('Today: 5 created, 2 completed', $todayRow['created'] === 5 && $todayRow['completed'] === 2);
    $thisMonth = end($s['monthly']);
    check('This month: 5 created, 2 completed', $thisMonth['created'] === 5 && $thisMonth['completed'] === 2);

    Task::update($t3['id'], $a['id'], ['status' => 'todo']);
    $s = Stats::forUser($a['id']);
    check('Reopening a task removes it from completed counts',
        $s['totals']['completed'] === 1 && end($s['weekly'])['completed'] === 1);

    Task::update($t3['id'], $a['id'], ['status' => 'completed']);
    $s = Stats::forUser($a['id']);
    check('Completing it again counts it again', $s['totals']['completed'] === 2);

    Task::update($t3['id'], $a['id'], ['title' => 'renamed']);
    $s = Stats::forUser($a['id']);
    check('Editing a completed task keeps it completed', $s['totals']['completed'] === 2);

    $other = Stats::forUser($b['id']);
    check('Other user sees none of these numbers',
        $other['totals']['total'] === 0 && end($other['weekly'])['created'] === 0);
} finally {
    foreach ([$a, $b] as $u) {
        if ($u) {
            User::delete($u['id']);
        }
    }
}

echo PHP_EOL . ($failed === 0 ? 'All checks passed.' : "$failed check(s) FAILED.") . PHP_EOL;
exit($failed === 0 ? 0 : 1);