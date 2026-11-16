import { CheckCheck } from "lucide-react";

export default function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
        <CheckCheck size={20} />
      </span>
      <span className="text-xl font-bold tracking-tight">
        Task<span className="text-indigo-500">Flow</span>
      </span>
    </div>
  );
}