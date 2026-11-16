import TaskList from "../components/TaskList";
import { isCompleted } from "../utils/taskFilters";

export default function Completed() {
  return (
    <TaskList
      title="Completed"
      baseFilter={isCompleted}
      hideStatus
      hideCreate
      emptyTitle="No completed tasks yet"
      emptyDescription="Tasks you finish will show up here."
    />
  );
}