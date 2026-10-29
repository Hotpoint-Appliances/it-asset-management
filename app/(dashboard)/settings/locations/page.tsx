import type { Metadata } from "next";
import { listLocations } from "@/lib/db/locations";
import { LocationsManager } from "./LocationsManager";

export const metadata: Metadata = {
  title: "Locations",
  description:
    "Manage sites, buildings, floors and rooms where assets are kept.",
};

export default async function LocationsPage() {
  const locations = await listLocations();
  return <LocationsManager initialLocations={locations} />;
}
