<?php
declare(strict_types=1);

namespace App\Validators;

final class TaskValidator
{
    private const PRIORITIES = ['low', 'medium', 'high'];
    private const STATUSES   = ['todo', 'in_progress', 'completed'];

    private static function validDate(mixed $v): bool
    {
        if (!is_string($v)) {
            return false;
        }
        $d = \DateTime::createFromFormat('!Y-m-d', $v);

        return $d !== false && $d->format('Y-m-d') === $v; // 2026-02-31 ধরা পড়ে
    }

    // ফেরত দেয় ['data' => পরিষ্কার ডেটা, 'errors' => ভুলের তালিকা]
    // $partial = true হলে শুধু পাঠানো ঘরগুলো যাচাই হয় (আপডেটের জন্য)
    public static function validate(array $input, bool $partial = false, ?array $existing = null): array
    {
        $clean = [];
        $errors = [];
        $has = static fn (string $k): bool => array_key_exists($k, $input);

        if ($has('title') || !$partial) {
            $v = $input['title'] ?? null;
            if (!is_string($v) || trim($v) === '') {
                $errors['title'] = 'Title is required.';
            } elseif (mb_strlen(trim($v)) > 100) {
                $errors['title'] = 'Title must be 100 characters or less.';
            } else {
                $clean['title'] = trim($v);
            }
        }

        if ($has('description')) {
            $v = $input['description'] ?? '';
            if (!is_string($v)) {
                $errors['description'] = 'Description must be text.';
            } elseif (mb_strlen($v) > 500) {
                $errors['description'] = 'Description must be 500 characters or less.';
            } else {
                $clean['description'] = trim($v);
            }
        }

        if ($has('priority')) {
            if (in_array($input['priority'], self::PRIORITIES, true)) {
                $clean['priority'] = $input['priority'];
            } else {
                $errors['priority'] = 'Priority must be low, medium or high.';
            }
        }

        if ($has('status')) {
            if (in_array($input['status'], self::STATUSES, true)) {
                $clean['status'] = $input['status'];
            } else {
                $errors['status'] = 'Status must be todo, in_progress or completed.';
            }
        }

        foreach (['startDate', 'dueDate'] as $key) {
            if (!$has($key)) {
                continue;
            }
            $v = $input[$key];
            if ($v === null || $v === '') {
                $clean[$key] = null;
            } elseif (self::validDate($v)) {
                $clean[$key] = $v;
            } else {
                $errors[$key] = 'Use a valid date in YYYY-MM-DD format.';
            }
        }

        // শুরুর তারিখ <= শেষ তারিখ (আপডেটে আগের তারিখের সাথে মিলিয়ে দেখি)
        if (!isset($errors['startDate']) && !isset($errors['dueDate'])) {
            $start = array_key_exists('startDate', $clean) ? $clean['startDate'] : ($existing['startDate'] ?? null);
            $due   = array_key_exists('dueDate', $clean) ? $clean['dueDate'] : ($existing['dueDate'] ?? null);
            if ($start !== null && $due !== null && $start > $due) {
                $errors['dueDate'] = 'Due date cannot be before the start date.';
            }
        }

        if ($has('tags')) {
            $v = $input['tags'];
            if (!is_array($v) || !array_is_list($v)) {
                $errors['tags'] = 'Tags must be a list.';
            } else {
                $tags = [];
                $tagError = null;
                foreach ($v as $tag) {
                    if (!is_string($tag)) {
                        $tagError = 'Each tag must be text.';
                        break;
                    }
                    $tag = trim($tag);
                    if ($tag === '') {
                        continue;
                    }
                    if (mb_strlen($tag) > 20) {
                        $tagError = 'Each tag must be 20 characters or less.';
                        break;
                    }
                    $tags[] = $tag;
                }
                $tags = array_values(array_unique($tags));
                if ($tagError === null && count($tags) > 5) {
                    $tagError = 'Use at most 5 tags.';
                }
                if ($tagError !== null) {
                    $errors['tags'] = $tagError;
                } else {
                    $clean['tags'] = $tags;
                }
            }
        }

        if ($has('categoryId')) {
            $v = $input['categoryId'];
            if ($v === null || $v === '') {
                $clean['categoryId'] = null;
            } elseif (is_int($v) && $v > 0) {
                $clean['categoryId'] = $v;
            } else {
                $errors['categoryId'] = 'Invalid category.';
            }
        }

        return ['data' => $clean, 'errors' => $errors];
    }
}