<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Middleware\Auth;
use App\Models\Category;
use App\Models\Limits;
use App\Models\Task;
use App\Utils\Request;
use App\Utils\Response;
use App\Validators\TaskValidator;

final class TaskController
{
    // যাচাই করে পরিষ্কার ডেটা দেয়। ভুল থাকলে 422 দিয়ে থামে।
    private static function validated(array $input, int $userId, bool $partial, ?array $existing = null): array
    {
        $result = TaskValidator::validate($input, $partial, $existing);
        $errors = $result['errors'];
        $data = $result['data'];

        // category সত্যিই এই ইউজারের কিনা (অন্যের category ব্যবহার ঠেকানো)
        if (!isset($errors['categoryId']) && !empty($data['categoryId'])
            && !Category::belongsToUser($data['categoryId'], $userId)) {
            $errors['categoryId'] = 'Invalid category.';
        }

        if ($errors !== []) {
            Response::error('Validation failed', 422, $errors);
        }

        return $data;
    }

    public static function index(): void
    {
        $userId = Auth::userId();
        Response::json(['tasks' => Task::allForUser($userId)]);
    }

    public static function show(string $rawId): void
    {
        $userId = Auth::userId();
        $task = Task::find(Request::id($rawId), $userId) ?? Response::error('Task not found', 404);
        Response::json(['task' => $task]);
    }

    public static function store(): void
    {
        $userId = Auth::userId();
        $data = self::validated(Request::json(), $userId, false);

        if (Limits::tasksUsed($userId) >= Limits::maxTasks()) {
            Response::error('Task limit reached (' . Limits::maxTasks() . '). Delete some tasks first.', 403);
        }

        Response::json(['task' => Task::create($userId, $data)], 201);
    }

    public static function update(string $rawId): void
    {
        $userId = Auth::userId();
        $id = Request::id($rawId);
        $existing = Task::find($id, $userId) ?? Response::error('Task not found', 404);

        $data = self::validated(Request::json(), $userId, true, $existing);
        if ($data === []) {
            Response::error('No valid fields to update', 422);
        }

        $task = Task::update($id, $userId, $data) ?? Response::error('Task not found', 404);
        Response::json(['task' => $task]);
    }

    public static function destroy(string $rawId): void
    {
        $userId = Auth::userId();
        if (!Task::delete(Request::id($rawId), $userId)) {
            Response::error('Task not found', 404);
        }
        Response::json(['message' => 'Task deleted']);
    }
}