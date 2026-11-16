import TaskList from "../components/TaskList";
import { isUpcoming } from "../utils/taskFilters";

export default function Upcoming() {
  return (
    <TaskList
      title="Upcoming"
      baseFilter={isUpcoming}
      emptyTitle="No upcoming tasks"
      emptyDescription="Unfinished tasks with a future due date will show up here."
    />
  );
}