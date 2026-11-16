<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Middleware\Auth;
use App\Models\Category;
use App\Models\Limits;
use App\Utils\Request;
use App\Utils\Response;
use App\Validators\CategoryValidator;
use PDOException;

final class CategoryController
{
    private static function validated(array $input, bool $partial): array
    {
        $result = CategoryValidator::validate($input, $partial);
        if ($result['errors'] !== []) {
            Response::error('Validation failed', 422, $result['errors']);
        }

        return $result['data'];
    }

    // MySQL-এর "ডুপ্লিকেট" error (1062) হলে 409, বাকি error সাধারণ হ্যান্ডলারে যাবে
    private static function rethrowUnlessDuplicate(PDOException $e): never
    {
        if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
            Response::error('You already have a category with this name', 409);
        }
        throw $e;
    }

    public static function index(): void
    {
        Response::json(['categories' => Category::allForUser(Auth::userId())]);
    }

    public static function store(): void
    {
        $userId = Auth::userId();
        $data = self::validated(Request::json(), false);

        if (Limits::categoriesUsed($userId) >= Limits::maxCategories()) {
            Response::error('Category limit reached (' . Limits::maxCategories() . ').', 403);
        }

        try {
            $category = Category::create($userId, $data['name'], $data['color'] ?? '#6366f1');
        } catch (PDOException $e) {
            self::rethrowUnlessDuplicate($e);
        }

        Response::json(['category' => $category], 201);
    }

    public static function update(string $rawId): void
    {
        $userId = Auth::userId();
        $id = Request::id($rawId);
        $existing = Category::find($id, $userId) ?? Response::error('Category not found', 404);

        $data = self::validated(Request::json(), true);
        if ($data === []) {
            Response::error('No valid fields to update', 422);
        }

        try {
            $category = Category::update(
                $id,
                $userId,
                $data['name'] ?? $existing['name'],
                $data['color'] ?? $existing['color']
            );
        } catch (PDOException $e) {
            self::rethrowUnlessDuplicate($e);
        }

        Response::json(['category' => $category]);
    }

    public static function destroy(string $rawId): void
    {
        $userId = Auth::userId();
        if (!Category::delete(Request::id($rawId), $userId)) {
            Response::error('Category not found', 404);
        }
        Response::json(['message' => 'Category deleted']);
    }
}