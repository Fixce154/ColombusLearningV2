import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "../AppSidebar";
import { mockUsers } from "@/lib/mockData";

export default function AppSidebarExample() {
  const style = {
    "--sidebar-width": "20rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar currentUser={mockUsers[0]} />
        <main className="flex-1 p-6">
          <h1 className="text-2xl font-bold">Main Content Area</h1>
          <p className="text-muted-foreground mt-2">The sidebar navigation is on the left</p>
        </main>
      </div>
    </SidebarProvider>
  );
}
