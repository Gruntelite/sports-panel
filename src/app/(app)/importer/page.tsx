
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserSquare, Briefcase, Handshake, Database } from "lucide-react";

const playerColumns = [
    'name', 'lastName', 'sex', 'birthDate', 'dni', 'nationality', 'healthCardNumber',
    'address', 'city', 'postalCode', 'tutorEmail', 'tutorPhone', 'iban',
    'teamName', 'jerseyNumber', 'monthlyFee', 'isOwnTutor', 'tutorName',
    'tutorLastName', 'tutorDni', 'kitSize', 'startDate', 'endDate',
    'hasInterruption', 'medicalCheckCompleted'
];

const coachColumns = [
    'name', 'lastName', 'sex', 'role', 'email', 'phone', 'teamName',
    'birthDate', 'dni', 'nationality', 'healthCardNumber', 'address', 'city',
    'postalCode', 'iban', 'isOwnTutor', 'tutorName', 'tutorLastName',
    'tutorDni', 'monthlyPayment', 'kitSize', 'startDate', 'endDate',
    'hasInterruption'
];

const staffColumns = [
    'name', 'lastName', 'sex', 'role', 'email', 'phone'
];

const socioColumns = [
    'name', 'lastName', 'email', 'phone', 'dni',
    'paymentType', 'fee', 'socioNumber'
];

const ColumnList = ({ columns }: { columns: string[] }) => (
    <ol className="list-decimal list-inside grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm text-muted-foreground">
        {columns.map(col => (
            <li key={col}>
                <span className="font-semibold text-foreground">{col}</span>
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
                        La primera fila debe ser la cabecera con estos nombres. Los campos como fechas deben estar en formato AAAA-MM-DD.
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
                        La primera fila debe ser la cabecera con estos nombres.
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
                        La primera fila debe ser la cabecera con estos nombres.
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
                        La primera fila debe ser la cabecera con estos nombres. Para 'paymentType', los valores deben ser 'monthly' o 'annual'.
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
