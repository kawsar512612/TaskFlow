import TaskList from "../components/TaskList";
import { allTasks } from "../utils/taskFilters";

export default function AllTasks() {
  return (
    <TaskList
      title="All Tasks"
      baseFilter={allTasks}
      emptyTitle="No tasks yet"
      emptyDescription="Create your first task to get started."
    />
  );
}