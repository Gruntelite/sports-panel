import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { teams } from "@/lib/data"
import { PlusCircle, Users, Shield, MoreVertical } from "lucide-react"
import Image from "next/image"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

export default function TeamsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight">Teams</h1>
          <p className="text-muted-foreground">
            Create and manage your club's teams.
          </p>
        </div>
        <Button className="gap-1">
          <PlusCircle className="h-3.5 w-3.5" />
          Create Team
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {teams.map(team => (
          <Card key={team.id} className="overflow-hidden">
            <CardHeader className="p-0">
                <Image
                    alt={team.name}
                    className="aspect-video w-full rounded-t-lg object-cover"
                    height="400"
                    src={team.image}
                    width="600"
                    data-ai-hint={team.hint}
                />
            </CardHeader>
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div>
                        <Badge variant="secondary" className="mb-2">{team.category}</Badge>
                        <CardTitle className="text-xl font-bold">{team.name}</CardTitle>
                        <CardDescription>{team.sport}</CardDescription>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                        >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Manage Roster</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardContent>
            <CardFooter className="bg-muted/40 p-4 flex justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{team.players} Players</span>
                </div>
                <div className="flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    <span>{team.coaches} Coaches</span>
                </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
