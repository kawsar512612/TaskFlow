import TaskList from "../components/TaskList";
import { isTodayOrOverdue } from "../utils/taskFilters";

export default function Today() {
  return (
    <TaskList
      title="Today"
      baseFilter={isTodayOrOverdue}
      emptyTitle="Nothing due today"
      emptyDescription="Tasks due today and any overdue tasks will show up here."
    />
  );
}