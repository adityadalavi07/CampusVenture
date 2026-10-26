import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/student/meetings")({
  component: () => <Navigate to="/app/student/messages" replace />,
});
