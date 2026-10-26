import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/investor/meetings")({
  component: () => <Navigate to="/app/investor/messages" replace />,
});
