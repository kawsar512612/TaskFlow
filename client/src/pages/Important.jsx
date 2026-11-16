import TaskList from "../components/TaskList";
import { isImportant } from "../utils/taskFilters";

export default function Important() {
  return (
    <TaskList
      title="Important"
      baseFilter={isImportant}
      emptyTitle="No important tasks"
      emptyDescription="Unfinished tasks with high priority will show up here."
    />
  );
}