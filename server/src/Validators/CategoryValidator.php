<?php
declare(strict_types=1);

namespace App\Validators;

final class CategoryValidator
{
    public static function validate(array $input, bool $partial = false): array
    {
        $clean = [];
        $errors = [];

        if (array_key_exists('name', $input) || !$partial) {
            $v = $input['name'] ?? null;
            if (!is_string($v) || trim($v) === '') {
                $errors['name'] = 'Name is required.';
            } elseif (mb_strlen(trim($v)) > 50) {
                $errors['name'] = 'Name must be 50 characters or less.';
            } else {
                $clean['name'] = trim($v);
            }
        }

        if (array_key_exists('color', $input)) {
            $v = $input['color'];
            if (is_string($v) && preg_match('/^#[0-9a-fA-F]{6}$/', $v) === 1) {
                $clean['color'] = strtolower($v);
            } else {
                $errors['color'] = 'Color must look like #6366f1.';
            }
        }

        return ['data' => $clean, 'errors' => $errors];
    }
}