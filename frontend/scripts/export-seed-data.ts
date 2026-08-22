import { writeFileSync } from "fs";
import { documents, staff, trainsets, alerts, seedAudit } from "../src/lib/kmrl/data";

writeFileSync(
"seed-data.json",
JSON.stringify({ documents, staff, trainsets, alerts, seedAudit }, null, 2),
);
console.log("Wrote seed-data.json");
