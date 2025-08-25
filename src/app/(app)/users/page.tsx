
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UsersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Página Desactivada</CardTitle>
        <CardDescription>
          Esta sección ha sido desactivada. La gestión de usuarios ahora se realiza
          directamente al crear o editar jugadores, entrenadores o staff.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>No es necesario realizar ninguna acción aquí.</p>
      </CardContent>
    </Card>
  );
}
