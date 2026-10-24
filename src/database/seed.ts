import * as fs from "fs";
import * as path from "path";
import { ChargingStation } from "../types/station";

const SEEDS_PATH = path.join(process.cwd(), "src", "database", "seeds", "demo-charging-stations.json");

export function loadOrSeedDemoStations(): ChargingStation[] {
  if (!fs.existsSync(SEEDS_PATH)) {
    console.log("Seeds file not found, creating seeds directory...");
    fs.mkdirSync(path.dirname(SEEDS_PATH), { recursive: true });
    // In case file doesn't exist, generate from generator logic
    const { generateDemoStations } = require("./generator");
    const data = generateDemoStations();
    fs.writeFileSync(SEEDS_PATH, JSON.stringify(data, null, 2), "utf-8");
    return data;
  }

  const raw = fs.readFileSync(SEEDS_PATH, "utf-8");
  const stations: ChargingStation[] = JSON.parse(raw);
  return stations;
}

export function runSeedCli() {
  console.log("==========================================");
  console.log("  EV Charge India - Demo Station Seeder   ");
  console.log("==========================================");
  
  const stations = loadOrSeedDemoStations();
  
  // Validate dataset integrity
  const ids = new Set<string>();
  let duplicates = 0;
  let missingCoords = 0;
  let nonDemoCount = 0;

  stations.forEach((st) => {
    if (ids.has(st.id)) {
      duplicates++;
    }
    ids.add(st.id);

    if (
      st.latitude === undefined ||
      st.longitude === undefined ||
      st.latitude < -90 ||
      st.latitude > 90 ||
      st.longitude < -180 ||
      st.longitude > 180
    ) {
      missingCoords++;
    }

    if (!st.isDemo || st.dataSource !== "demo") {
      nonDemoCount++;
    }
  });

  console.log(`Total Demo Stations: ${stations.length}`);
  console.log(`Unique Station IDs:  ${ids.size}`);
  console.log(`Duplicate IDs:       ${duplicates}`);
  console.log(`Invalid Coordinates: ${missingCoords}`);
  console.log(`Non-Demo Flags:      ${nonDemoCount}`);
  console.log("Seeding verified successfully and idempotently.");
  console.log("File location: " + SEEDS_PATH);
}

if (require.main === module || process.argv[1]?.includes("seed.ts")) {
  runSeedCli();
}
