import { useState } from "react";
import RoleSwitcher from "../RoleSwitcher";
import { mockUsers } from "@/lib/mockData";

export default function RoleSwitcherExample() {
  const [currentUser, setCurrentUser] = useState(mockUsers[0]);

  return (
    <div className="flex justify-center">
      <RoleSwitcher currentUser={currentUser} onUserChange={setCurrentUser} />
    </div>
  );
}
