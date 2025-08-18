import { CommunicationsForm } from "@/components/communications-form";

export default function CommunicationsPage() {
  return (
    <div className="flex flex-col gap-6">
       <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">Communications</h1>
        <p className="text-muted-foreground">
          Generate and manage communications for your club.
        </p>
      </div>
      <CommunicationsForm />
    </div>
  );
}
