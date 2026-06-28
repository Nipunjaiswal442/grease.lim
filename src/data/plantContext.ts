import { createContext, useContext } from "react";
import type { PlantStore } from "./localPlantStore";

export const StoreContext = createContext<PlantStore | null>(null);

export function usePlantStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("PlantDataProvider is missing.");
  return store;
}
