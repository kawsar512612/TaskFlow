<?php
declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Config\Env;
use App\Middleware\Csrf;
use App\Middleware\Security;
use App\Utils\RateLimiter;
use App\Utils\Response;
use App\Utils\Router;

Env::load(__DIR__ . '/../.env');

$isProduction = Env::get('APP_ENV', 'production') !== 'development';

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

set_exception_handler(function (Throwable $e) use ($isProduction): void {
    error_log($e::class . ': ' . $e->getMessage());
    Response::error($isProduction ? 'Something went wrong' : $e->getMessage(), 500);
});

Security::headers($isProduction);
Security::cors(Env::get('CLIENT_URL', 'http://localhost:5173'));

// সব API অনুরোধে সাধারণ সীমা (IP প্রতি ১৫ মিনিটে)। CSRF যাচাইয়ের আগে, যাতে বন্যা আগেই থামে।
$apiLimit = max(1, (int) Env::get('API_RATE_LIMIT', '1000'));
RateLimiter::hit(
    'api',
    ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . ':' . ($_SERVER['SERVER_PORT'] ?? ''),
    $apiLimit,
    900
);

Csrf::enforce();

$router = new Router();
(require __DIR__ . '/../src/Routes/api.php')($router);

$router->dispatch($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI']);