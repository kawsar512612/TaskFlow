import { useMemo } from "react";
import toast from "react-hot-toast";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { CalendarDays, CloudOff } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Badge from "../components/Badge";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import Skeleton from "../components/Skeleton";
import { useTasks } from "../context/TaskContext";
import { getErrorMessage } from "../utils/apiError";
import { STATUSES } from "../utils/constants";
import { formatDate, isOverdue } from "../utils/dates";
import { sortTasks } from "../utils/taskFilters";
import classNames from "../utils/classNames";

const ACCENTS = {
  todo: "bg-slate-400",
  in_progress: "bg-blue-500",
  completed: "bg-emerald-500",
};

export default function Board() {
  const { tasks, status, moveTask, reload } = useTasks();

  const columns = useMemo(
    () =>
      STATUSES.map((s) => ({
        ...s,
        tasks: sortTasks(
          tasks.filter((t) => t.status === s.value),
          "priority"
        ),
      })),
    [tasks]
  );

  const handleMove = async (task, newStatus) => {
    if (task.status === newStatus) return;
    try {
      await moveTask(task, newStatus);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const task = tasks.find((t) => String(t.id) === draggableId);
    if (task) handleMove(task, destination.droppableId);
  };

  const loading = status === "idle" || status === "loading";

  return (
    <>
      <PageHeader
        title="Board"
        description="Drag a card to another column to change its status."
      />

      {loading && (
        <div className="grid gap-4 lg:grid-cols-3" aria-busy="true">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="mt-4 h-16 w-full" />
              <Skeleton className="mt-3 h-16 w-full" />
            </div>
          ))}
        </div>
      )}

      {status === "error" && (
        <EmptyState
          icon={CloudOff}
          title="Could not load your tasks"
          description="Check that the server is running, then try again."
          action={<Button size="sm" onClick={reload}>Try again</Button>}
        />
      )}

      {status === "ready" && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid items-start gap-4 lg:grid-cols-3">
            {columns.map((col) => (
              <section
                key={col.value}
                aria-label={col.label}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50"
              >
                <header className="mb-3 flex items-center gap-2 px-1">
                  <span className={classNames("h-2.5 w-2.5 rounded-full", ACCENTS[col.value])} aria-hidden="true" />
                  <h2 className="font-semibold">{col.label}</h2>
                  <span className="ml-auto rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {col.tasks.length}
                  </span>
                </header>

                <Droppable droppableId={col.value}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={classNames(
                        "min-h-24 space-y-2 rounded-lg p-1 transition-colors",
                        snapshot.isDraggingOver && "bg-indigo-50 dark:bg-indigo-500/10"
                      )}
                    >
                      {col.tasks.length === 0 && !snapshot.isDraggingOver && (
                        <p className="px-2 py-6 text-center text-sm text-slate-400">
                          No tasks here
                        </p>
                      )}

                      {col.tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                          {(p, s) => (
                            <div
                              ref={p.innerRef}
                              {...p.draggableProps}
                              {...p.dragHandleProps}
                              className={classNames(
                                "rounded-lg border bg-white p-3 text-sm dark:bg-slate-900",
                                s.isDragging
                                  ? "border-indigo-400 shadow-lg"
                                  : "border-slate-200 shadow-sm dark:border-slate-800"
                              )}
                            >
                              <p className={classNames("break-words font-medium", task.status === "completed" && "text-slate-400 line-through")}>
                                {task.title}
                              </p>

                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <Badge type="priority" value={task.priority} />
                                {task.category && (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    {task.category}
                                  </span>
                                )}
                              </div>

                              {task.dueDate && (
                                <p className={classNames(
                                  "mt-2 inline-flex items-center gap-1 text-xs",
                                  isOverdue(task) ? "font-semibold text-red-500" : "text-slate-500"
                                )}>
                                  <CalendarDays size={13} />
                                  {isOverdue(task) ? "Overdue: " : "Due "}
                                  {formatDate(task.dueDate)}
                                </p>
                              )}

                              <select
                                aria-label={`Move ${task.title} to another column`}
                                value={task.status}
                                onChange={(e) => handleMove(task, e.target.value)}
                                className="mt-3 h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                              >
                                {STATUSES.map((st) => (
                                  <option key={st.value} value={st.value}>{st.label}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </section>
            ))}
          </div>
        </DragDropContext>
      )}
    </>
  );
}