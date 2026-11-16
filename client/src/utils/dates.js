// আজকের তারিখ "YYYY-MM-DD" আকারে (নিজের টাইমজোনে)
export function todayString() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function formatDate(value) {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// মেয়াদ পেরিয়েছে এবং এখনো শেষ হয়নি
export function isOverdue(task) {
  return (
    Boolean(task.dueDate) &&
    task.status !== "completed" &&
    task.dueDate < todayString()
  );
}