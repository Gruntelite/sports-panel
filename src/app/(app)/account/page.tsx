
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AccountPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">
          Ajustes de Cuenta
        </h1>
        <p className="text-muted-foreground">
          Gestiona la información de tu perfil y la configuración de tu cuenta.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>
              Esta información es privada y no se compartirá con otros usuarios.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" defaultValue="Usuario Admin" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input id="email" type="email" defaultValue="admin@sportspanel.com" readOnly/>
            </div>
            <Button>Guardar Cambios</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Contraseña</CardTitle>
            <CardDescription>
              Para cambiar tu contraseña, introduce tu contraseña actual y la nueva.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Contraseña Actual</Label>
              <Input id="current-password" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva Contraseña</Label>
              <Input id="new-password" type="password" />
            </div>
            <Button>Cambiar Contraseña</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
