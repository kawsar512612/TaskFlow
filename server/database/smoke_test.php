<?php
declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Config\Env;
use App\Models\Category;
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

$suffix = bin2hex(random_bytes(4));
$emailA = "a_$suffix@example.test";
$hash = password_hash('Test1234!', PASSWORD_DEFAULT);
$userA = $userB = null;
$task = null;

try {
    $userA = User::create('Test A', $emailA, $hash);
    $userB = User::create('Test B', "b_$suffix@example.test", $hash);
    check('Two users created', isset($userA['id'], $userB['id']));
    check('Public user data has no password hash', !array_key_exists('password_hash', $userA));

    $login = User::findByEmail($emailA);
    check('Login lookup works with the hash', is_array($login) && password_verify('Test1234!', $login['password_hash']));

    $cat = Category::create($userA['id'], 'Work', '#6366f1');
    $task = Task::create($userA['id'], [
        'title' => 'Smoke test task',
        'priority' => 'high',
        'categoryId' => $cat['id'],
        'tags' => ['a', 'b'],
        'dueDate' => '2026-12-01',
    ]);
    check('Task saved with tags and category', $task['tags'] === ['a', 'b'] && $task['category'] === 'Work');

    check('Owner can read own task', Task::find($task['id'], $userA['id']) !== null);
    check('Other user CANNOT read it (IDOR blocked)', Task::find($task['id'], $userB['id']) === null);
    check('Other user CANNOT update it', Task::update($task['id'], $userB['id'], ['title' => 'hacked']) === null);
    check('Other user CANNOT delete it', Task::delete($task['id'], $userB['id']) === false);
    check('Other user CANNOT use my category', !Category::belongsToUser($cat['id'], $userB['id']));

    $updated = Task::update($task['id'], $userA['id'], ['status' => 'completed']);
    check('Owner can update status', $updated !== null && $updated['status'] === 'completed');
    check('Title untouched after the blocked attacks', $updated['title'] === 'Smoke test task');
    check('Lists show only own tasks',
        count(Task::allForUser($userA['id'])) === 1 && count(Task::allForUser($userB['id'])) === 0);

    try {
        User::create('Dup', $emailA, $hash);
        check('Duplicate email rejected', false);
    } catch (PDOException $e) {
        check('Duplicate email rejected', true);
    }

    $evilTitle = "x'; DROP TABLE tasks; --";
    $evil = Task::create($userA['id'], ['title' => $evilTitle]);
    check('SQL-looking title stored as plain text', $evil['title'] === $evilTitle);

    try {
        Task::create($userA['id'], ['title' => str_repeat('a', 101)]);
        check('Too-long title rejected by the database', false);
    } catch (PDOException $e) {
        check('Too-long title rejected by the database', true);
    }
} finally {
    // পরিষ্কার: ইউজার মুছলে তার সব টাস্ক ও category নিজে মুছে যায়
    foreach ([$userA, $userB] as $u) {
        if ($u) {
            User::delete($u['id']);
        }
    }
}

check('Deleting a user also deleted their tasks', $task !== null && Task::find($task['id'], $userA['id']) === null);

echo PHP_EOL . ($failed === 0 ? 'All checks passed.' : "$failed check(s) FAILED.") . PHP_EOL;
exit($failed === 0 ? 0 : 1);