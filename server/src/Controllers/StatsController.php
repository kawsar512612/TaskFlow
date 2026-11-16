<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Middleware\Auth;
use App\Models\Stats;
use App\Utils\Response;

final class StatsController
{
    public static function index(): void
    {
        $userId = Auth::userId(); // সবসময় session থেকে
        Response::json(['stats' => Stats::forUser($userId)]);
    }
}