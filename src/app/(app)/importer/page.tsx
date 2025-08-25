
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserSquare, Briefcase, Handshake, Database } from "lucide-react";

type ColumnInfo = {
    key: string;
    label: string;
};

const playerColumns: ColumnInfo[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'lastName', label: 'Apellidos' },
    { key: 'sex', label: 'Sexo' },
    { key: 'birthDate', label: 'Fecha de Nacimiento' },
    { key: 'dni', label: 'NIF' },
    { key: 'nationality', label: 'Nacionalidad' },
    { key: 'healthCardNumber', label: 'Nº Tarjeta Sanitaria' },
    { key: 'address', label: 'Dirección' },
    { key: 'city', label: 'Ciudad' },
    { key: 'postalCode', label: 'Código Postal' },
    { key: 'tutorEmail', label: 'Email de Contacto' },
    { key: 'tutorPhone', label: 'Teléfono de Contacto' },
    { key: 'iban', label: 'IBAN' },
    { key: 'teamName', label: 'Nombre del Equipo' },
    { key: 'jerseyNumber', label: 'Dorsal' },
    { key: 'monthlyFee', label: 'Cuota Mensual (€)' },
    { key: 'isOwnTutor', label: 'Es su propio tutor/a' },
    { key: 'tutorName', label: 'Nombre del Tutor/a' },
    { key: 'tutorLastName', label: 'Apellidos del Tutor/a' },
    { key: 'tutorDni', label: 'NIF del Tutor/a' },
    { key: 'kitSize', label: 'Talla de Equipación' },
    { key: 'startDate', label: 'Fecha de Alta' },
    { key: 'endDate', label: 'Fecha de Baja' },
    { key: 'hasInterruption', label: 'Ha tenido interrupciones' },
    { key: 'medicalCheckCompleted', label: 'Revisión médica completada' }
];


const coachColumns: ColumnInfo[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'lastName', label: 'Apellidos' },
    { key: 'sex', label: 'Sexo' },
    { key: 'role', label: 'Cargo' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Teléfono' },
    { key: 'teamName', label: 'Equipo Asignado' },
    { key: 'birthDate', label: 'Fecha de Nacimiento' },
    { key: 'dni', label: 'NIF' },
    { key: 'nationality', label: 'Nacionalidad' },
    { key: 'healthCardNumber', label: 'Nº Tarjeta Sanitaria' },
    { key: 'address', label: 'Dirección' },
    { key: 'city', label: 'Ciudad' },
    { key: 'postalCode', label: 'Código Postal' },
    { key: 'iban', label: 'IBAN' },
    { key: 'isOwnTutor', label: 'Es su propio tutor/a' },
    { key: 'tutorName', label: 'Nombre del Tutor/a' },
    { key: 'tutorLastName', label: 'Apellidos del Tutor/a' },
    { key: 'tutorDni', label: 'NIF del Tutor/a' },
    { key: 'monthlyPayment', label: 'Pago Mensual (€)' },
    { key: 'kitSize', label: 'Talla de Equipación' },
    { key: 'startDate', label: 'Fecha de Alta' },
    { key: 'endDate', label: 'Fecha de Baja' },
    { key: 'hasInterruption', label: 'Ha tenido interrupciones' }
];

const staffColumns: ColumnInfo[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'lastName', label: 'Apellidos' },
    { key: 'sex', label: 'Sexo' },
    { key: 'role', label: 'Cargo' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Teléfono' }
];

const socioColumns: ColumnInfo[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'lastName', label: 'Apellidos' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Teléfono' },
    { key: 'dni', label: 'NIF' },
    { key: 'paymentType', label: 'Tipo de Cuota' },
    { key: 'fee', label: 'Importe Cuota (€)' },
    { key: 'socioNumber', label: 'Número de Socio' }
];


const ColumnList = ({ columns }: { columns: ColumnInfo[] }) => (
    <ol className="list-decimal list-inside grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm text-muted-foreground">
        {columns.map(col => (
            <li key={col.key}>
                <span className="font-semibold text-foreground">{col.label}</span>
                <span className="text-xs ml-1">({col.key})</span>
            </li>
        ))}
    </ol>
);

export default function ImporterPage() {
  return (
    <div className="flex flex-col gap-6">
       <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight flex items-center gap-2">
            <Database className="h-6 w-6"/>
            Importador de BBDD
        </h1>
        <p className="text-muted-foreground">
          Guía para importar tus bases de datos mediante archivos CSV.
        </p>
      </div>
      
       <Tabs defaultValue="players" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="players"><Users className="mr-2 h-4 w-4" />Jugadores</TabsTrigger>
          <TabsTrigger value="coaches"><UserSquare className="mr-2 h-4 w-4" />Entrenadores</TabsTrigger>
          <TabsTrigger value="staff"><Briefcase className="mr-2 h-4 w-4" />Staff y Directiva</TabsTrigger>
          <TabsTrigger value="socios"><Handshake className="mr-2 h-4 w-4" />Socios</TabsTrigger>
        </TabsList>
        
        <TabsContent value="players" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Orden de Columnas para Jugadores</CardTitle>
                    <CardDescription>
                        Para importar jugadores, tu archivo CSV debe tener las siguientes columnas en este orden exacto.
                        La primera fila debe ser la cabecera con estos nombres (el nombre técnico entre paréntesis). Los campos como fechas deben estar en formato AAAA-MM-DD.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ColumnList columns={playerColumns} />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="coaches" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Orden de Columnas para Entrenadores</CardTitle>
                     <CardDescription>
                        Para importar entrenadores, tu archivo CSV debe tener las siguientes columnas en este orden exacto.
                        La primera fila debe ser la cabecera con estos nombres (el nombre técnico entre paréntesis).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                   <ColumnList columns={coachColumns} />
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="staff" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Orden de Columnas para Staff y Directiva</CardTitle>
                     <CardDescription>
                        Para importar staff y directiva, tu archivo CSV debe tener las siguientes columnas en este orden exacto.
                        La primera fila debe ser la cabecera con estos nombres (el nombre técnico entre paréntesis).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ColumnList columns={staffColumns} />
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="socios" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Orden de Columnas para Socios</CardTitle>
                     <CardDescription>
                        Para importar socios, tu archivo CSV debe tener las siguientes columnas en este orden exacto.
                        La primera fila debe ser la cabecera con estos nombres (el nombre técnico entre paréntesis). Para 'paymentType', los valores deben ser 'monthly' o 'annual'.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                   <ColumnList columns={socioColumns} />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
