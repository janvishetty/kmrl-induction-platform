import { createFileRoute } from "@tanstack/react-router";
import FareCalculator from "@/components/kmrl/FareCalculator";
import { AppShell } from "@/components/kmrl/AppShell";

export const Route = createFileRoute("/fares")({
component: () => (
    <AppShell>
    <FareCalculator />
    </AppShell>
),
});