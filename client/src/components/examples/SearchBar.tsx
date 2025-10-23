import { useState } from "react";
import SearchBar from "../SearchBar";

export default function SearchBarExample() {
  const [search, setSearch] = useState("");

  return (
    <div className="max-w-2xl">
      <SearchBar value={search} onChange={setSearch} />
      {search && <p className="mt-2 text-sm text-muted-foreground">Recherche: {search}</p>}
    </div>
  );
}
