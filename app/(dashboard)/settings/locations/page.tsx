import { listLocations } from "@/lib/db/locations";
import { LocationsManager } from "./LocationsManager";

export default async function LocationsPage() {
  const locations = await listLocations();
  return <LocationsManager initialLocations={locations} />;
}
