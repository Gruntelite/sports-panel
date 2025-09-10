
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

const ColumnList = ({ columns }: { columns: ColumnInfo[] }) => {
    const { toast } = useToast();
    const { t } = useTranslation();

    const handleCopyHeaders = () => {
        const headerKeys = columns.map(c => c.key).join('\t');
        navigator.clipboard.writeText(headerKeys);
        toast({
            title: t('importer.guide.copySuccessTitle'),
            description: t('importer.guide.copySuccessDesc'),
        });
    };

    return (
        <div className="space-y-4">
            <Button onClick={handleCopyHeaders} variant="outline" size="sm" className="w-full sm:w-auto">
                <Copy className="mr-2 h-4 w-4" />
                <span className="sm:hidden">{t('importer.guide.copyHeaders')}</span>
                <span className="hidden sm:inline">{t('importer.guide.copyHeadersSpreadsheet')}</span>
            </Button>
            <ol className="list-decimal list-inside grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm text-muted-foreground">
                {Array.isArray(columns) && columns.map(col => (
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

    const playerColumns: ColumnInfo[] = [
        { key: 'name', label: t('importer.columns.players.name') },
        { key: 'lastName', label: t('importer.columns.players.lastName') },
        { key: 'sex', label: t('importer.columns.players.sex') },
        { key: 'birthDate', label: t('importer.columns.players.birthDate') },
        { key: 'dni', label: t('importer.columns.players.dni') },
        { key: 'nationality', label: t('importer.columns.players.nationality') },
        { key: 'healthCardNumber', label: t('importer.columns.players.healthCardNumber') },
        { key: 'address', label: t('importer.columns.players.address') },
        { key: 'city', label: t('importer.columns.players.city') },
        { key: 'postalCode', label: t('importer.columns.players.postalCode') },
        { key: 'tutorEmail', label: t('importer.columns.players.tutorEmail') },
        { key: 'tutorPhone', label: t('importer.columns.players.tutorPhone') },
        { key: 'iban', label: t('importer.columns.players.iban') },
        { key: 'teamName', label: t('importer.columns.players.teamName') },
        { key: 'jerseyNumber', label: t('importer.columns.players.jerseyNumber') },
        { key: 'monthlyFee', label: t('importer.columns.players.monthlyFee') },
        { key: 'isOwnTutor', label: t('importer.columns.players.isOwnTutor') },
        { key: 'tutorName', label: t('importer.columns.players.tutorName') },
        { key: 'tutorLastName', label: t('importer.columns.players.tutorLastName') },
        { key: 'tutorDni', label: t('importer.columns.players.tutorDni') },
        { key: 'kitSize', label: t('importer.columns.players.kitSize') },
        { key: 'startDate', label: t('importer.columns.players.startDate') },
        { key: 'endDate', label: t('importer.columns.players.endDate') },
        { key: 'hasInterruption', label: t('importer.columns.players.hasInterruption') },
        { key: 'medicalCheckCompleted', label: t('importer.columns.players.medicalCheckCompleted') }
    ];

    const coachColumns: ColumnInfo[] = [
        { key: 'name', label: t('importer.columns.coaches.name') },
        { key: 'lastName', label: t('importer.columns.coaches.lastName') },
        { key: 'sex', label: t('importer.columns.coaches.sex') },
        { key: 'role', label: t('importer.columns.coaches.role') },
        { key: 'email', label: t('importer.columns.coaches.email') },
        { key: 'phone', label: t('importer.columns.coaches.phone') },
        { key: 'teamName', label: t('importer.columns.coaches.teamName') },
        { key: 'birthDate', label: t('importer.columns.coaches.birthDate') },
        { key: 'dni', label: t('importer.columns.coaches.dni') },
        { key: 'nationality', label: t('importer.columns.coaches.nationality') },
        { key: 'healthCardNumber', label: t('importer.columns.coaches.healthCardNumber') },
        { key: 'address', label: t('importer.columns.coaches.address') },
        { key: 'city', label: t('importer.columns.coaches.city') },
        { key: 'postalCode', label: t('importer.columns.coaches.postalCode') },
        { key: 'iban', label: t('importer.columns.coaches.iban') },
        { key: 'isOwnTutor', label: t('importer.columns.coaches.isOwnTutor') },
        { key: 'tutorName', label: t('importer.columns.coaches.tutorName') },
        { key: 'tutorLastName', label: t('importer.columns.coaches.tutorLastName') },
        { key: 'tutorDni', label: t('importer.columns.coaches.tutorDni') },
        { key: 'monthlyPayment', label: t('importer.columns.coaches.monthlyPayment') },
        { key: 'kitSize', label: t('importer.columns.coaches.kitSize') },
        { key: 'startDate', label: t('importer.columns.coaches.startDate') },
        { key: 'endDate', label: t('importer.columns.coaches.endDate') },
        { key: 'hasInterruption', label: t('importer.columns.coaches.hasInterruption') }
    ];

    const staffColumns: ColumnInfo[] = [
        { key: 'name', label: t('importer.columns.staff.name') },
        { key: 'lastName', label: t('importer.columns.staff.lastName') },
        { key: 'sex', label: t('importer.columns.staff.sex') },
        { key: 'role', label: t('importer.columns.staff.role') },
        { key: 'email', label: t('importer.columns.staff.email') },
        { key: 'phone', label: t('importer.columns.staff.phone') }
    ];

    const socioColumns: ColumnInfo[] = [
        { key: 'name', label: t('importer.columns.socios.name') },
        { key: 'lastName', label: t('importer.columns.socios.lastName') },
        { key: 'email', label: t('importer.columns.socios.email') },
        { key: 'phone', label: t('importer.columns.socios.phone') },
        { key: 'dni', label: t('importer.columns.socios.dni') },
        { key: 'paymentType', label: t('importer.columns.socios.paymentType') },
        { key: 'fee', label: t('importer.columns.socios.fee') },
        { key: 'socioNumber', label: t('importer.columns.socios.socioNumber') }
    ];
    
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
            {t('importer.pageTitle')}
        </h1>
        <p className="text-muted-foreground">
          {t('importer.pageDescription')}
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
                            {t(`importer.types.${tab.id}`)}
                        </div>
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
       </div>
       
       <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full hidden sm:block">
        <TabsList className="grid w-full grid-cols-4">
            {tabs.map(tab => (
                 <TabsTrigger key={tab.id} value={tab.id}><tab.icon className="mr-2 h-4 w-4" />{t(`importer.types.${tab.id}`)}</TabsTrigger>
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
                            <CardTitle>{t('importer.guide.title', { type: t(`importer.types.${tab.id}`).toLowerCase() })}</CardTitle>
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

    