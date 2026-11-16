<?php
declare(strict_types=1);

namespace App\Utils;

final class Request
{
    private const MAX_BODY = 10240; // ১০ KB

    // JSON body নিরাপদে পড়ে। ভুল হলে সাথে সাথে error উত্তর দিয়ে থামে।
    public static function json(): array
    {
        $type = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
        if (!str_starts_with($type, 'application/json')) {
            Response::error('Content-Type must be application/json', 415);
        }

        // সীমার চেয়ে ১ বাইট বেশি পড়ি, যাতে বড় কিনা বোঝা যায় কিন্তু পুরোটা মেমোরিতে না ঢোকে
        $raw = file_get_contents('php://input', false, null, 0, self::MAX_BODY + 1);
        $raw = $raw === false ? '' : $raw;

        if (strlen($raw) > self::MAX_BODY) {
            Response::error('Request body is too large', 413);
        }
        if (trim($raw) === '') {
            Response::error('Request body is required', 400);
        }

        try {
            $data = json_decode($raw, true, 8, JSON_THROW_ON_ERROR); // সর্বোচ্চ ৮ স্তর গভীর
        } catch (\JsonException) {
            Response::error('Invalid JSON', 400);
        }

        // শুধু object ({...}) চাই, তালিকা ([...]) বা সংখ্যা নয়
        if (!is_array($data) || ($data !== [] && array_is_list($data))) {
            Response::error('JSON body must be an object', 400);
        }

        return $data;
    }

    // URL-এর {id} শুধু ধনাত্মক পূর্ণসংখ্যা হতে পারে। নইলে "না পাওয়া গেছে"।
    public static function id(string $raw): int
    {
        if (!ctype_digit($raw) || strlen($raw) > 10 || (int) $raw < 1) {
            Response::error('Not found', 404);
        }

        return (int) $raw;
    }
}