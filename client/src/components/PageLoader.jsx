import { Loader2 } from "lucide-react";

export default function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
      <Loader2 size={32} className="animate-spin text-indigo-500" />
    </div>
  );
}