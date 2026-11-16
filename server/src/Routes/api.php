<?php
declare(strict_types=1);

use App\Controllers\AuthController;
use App\Controllers\CategoryController;
use App\Controllers\StatsController;
use App\Controllers\TaskController;
use App\Utils\Response;
use App\Utils\Router;

return function (Router $router): void {
    $router->get('/api/health', function (): void {
        Response::json([
            'status' => 'ok',
            'app'    => 'TaskFlow API',
            'time'   => gmdate('c'),
        ]);
    });

    // Auth
    $router->get('/api/auth/csrf',       fn () => AuthController::csrf());
    $router->post('/api/auth/register',  fn () => AuthController::register());
    $router->post('/api/auth/login',     fn () => AuthController::login());
    $router->post('/api/auth/logout',    fn () => AuthController::logout());
    $router->get('/api/auth/me',         fn () => AuthController::me());

    // Stats
    $router->get('/api/stats',           fn () => StatsController::index());

    // Tasks
    $router->get('/api/tasks',          fn () => TaskController::index());
    $router->post('/api/tasks',         fn () => TaskController::store());
    $router->get('/api/tasks/{id}',     fn (array $p) => TaskController::show($p['id']));
    $router->put('/api/tasks/{id}',     fn (array $p) => TaskController::update($p['id']));
    $router->patch('/api/tasks/{id}',   fn (array $p) => TaskController::update($p['id']));
    $router->delete('/api/tasks/{id}',  fn (array $p) => TaskController::destroy($p['id']));

    // Categories
    $router->get('/api/categories',         fn () => CategoryController::index());
    $router->post('/api/categories',        fn () => CategoryController::store());
    $router->put('/api/categories/{id}',    fn (array $p) => CategoryController::update($p['id']));
    $router->patch('/api/categories/{id}',  fn (array $p) => CategoryController::update($p['id']));
    $router->delete('/api/categories/{id}', fn (array $p) => CategoryController::destroy($p['id']));
};