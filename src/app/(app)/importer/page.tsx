
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserSquare, Briefcase, Handshake, Database, Copy } from "lucide-react";
import { CsvImporter } from "@/components/csv-importer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/components/i18n-provider";


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


const ColumnList = ({ columns }: { columns: ColumnInfo[] }) => {
    const { toast } = useToast();

    const handleCopyHeaders = () => {
        const headerKeys = columns.map(c => c.key).join('\t');
        navigator.clipboard.writeText(headerKeys);
        toast({
            title: "Cabeceras Copiadas",
            description: "Los nombres técnicos de las columnas se han copiado al portapapeles.",
        });
    };

    return (
        <div className="space-y-4">
            <Button onClick={handleCopyHeaders} variant="outline" size="sm" className="w-full sm:w-auto">
                <Copy className="mr-2 h-4 w-4" />
                <span className="sm:hidden">Copiar Cabeceras</span>
                <span className="hidden sm:inline">Copiar Cabeceras para Hoja de Cálculo</span>
            </Button>
            <ol className="list-decimal list-inside grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm text-muted-foreground">
                {columns.map(col => (
                    <li key={col.key}>
                        <span className="font-semibold text-foreground">{col.label}</span>
                        <span className="text-xs ml-1">({col.key})</span>
                    </li>
                ))}
            </ol>
        </div>
    );
};


export default function ImporterPage() {
    const [activeTab, setActiveTab] = useState("players");
    const { t } = useTranslation();
    
    const tabs = [
        { id: "players", label: "Jugadores", icon: Users, columns: playerColumns },
        { id: "coaches", label: "Entrenadores", icon: UserSquare, columns: coachColumns },
        { id: "staff", label: "Staff y Directiva", icon: Briefcase, columns: staffColumns },
        { id: "socios", label: "Socios", icon: Handshake, columns: socioColumns },
    ]

  return (
    <div className="flex flex-col gap-6">
       <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight flex items-center gap-2">
            <Database className="h-6 w-6"/>
            Importador de BBDD
        </h1>
        <p className="text-muted-foreground">
          Sube tus bases de datos mediante archivos CSV para una carga rápida.
        </p>
      </div>
      
       <div className="sm:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo de importación..." />
                </SelectTrigger>
                <SelectContent>
                {tabs.map((tab) => (
                    <SelectItem key={tab.id} value={tab.id}>
                        <div className="flex items-center gap-2">
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </div>
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
       </div>
       
       <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full hidden sm:block">
        <TabsList className="grid w-full grid-cols-4">
            {tabs.map(tab => (
                 <TabsTrigger key={tab.id} value={tab.id}><tab.icon className="mr-2 h-4 w-4" />{tab.label}</TabsTrigger>
            ))}
        </TabsList>
      </Tabs>

        {tabs.map(tab => (
            <div key={tab.id} className={activeTab === tab.id ? 'block' : 'hidden'}>
                <div className="mt-6 space-y-6">
                    <CsvImporter 
                        importerType={tab.id as any}
                        requiredColumns={tab.columns}
                        onImportSuccess={() => console.log(`${tab.label} imported!`)}
                    />
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('importer.guide.title', { type: tab.label.toLowerCase() })}</CardTitle>
                            <CardDescription>
                                {t('importer.guide.description')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ColumnList columns={tab.columns} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        ))}
    </div>
  );
}
