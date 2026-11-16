// classNames("a", false, "b") → "a b"
export default function classNames(...parts) {
  return parts.filter(Boolean).join(" ");
}