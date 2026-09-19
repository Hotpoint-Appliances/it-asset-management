export interface Location {
  id: number;
  name: string;
  parentLocationId: number | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocationInput {
  name: string;
  parentLocationId: number | null;
  address: string | null;
}
