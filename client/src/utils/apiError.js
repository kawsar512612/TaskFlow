export function getErrorMessage(err, fallback = "Something went wrong. Please try again.") {
  if (!err?.response) return "Cannot reach the server. Check your connection.";
  return err.response.data?.message || fallback;
}

export function getFieldErrors(err) {
  const errors = err?.response?.data?.errors;
  return errors && typeof errors === "object" ? errors : {};
}