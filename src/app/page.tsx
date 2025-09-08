
"use client";

import * as React from 'react';
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, CircleDollarSign, Mail, Calendar, Home, FolderArchive, CheckCircle, Clock, Wallet, MessageCircle, BarChart3, Menu, Star, HelpCircle, UserCheck, Database, ClipboardList, AlertTriangle, Download, Send } from "lucide-react";
import { Logo } from "@/components/logo";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { sendEmailWithSmtpAction } from '@/lib/email';
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';


const features = [
  {
    icon: <Users className="h-8 w-8" />,
    title: "Gestión Centralizada de Miembros y Equipos",
    description: "Administra fichas de jugadores, entrenadores, staff y equipos en un único lugar. Accede a toda la información al instante.",
  },
  {
    icon: <CircleDollarSign className="h-8 w-8" />,
    title: "Tesorería y Cuotas",
    description: "Lleva un control claro de los ingresos por cuotas, gastos y la salud financiera de tu club sin complicaciones.",
  },
   {
    icon: <Mail className="h-8 w-8" />,
    title: "Comunicación Integrada",
    description: "Envía correos electrónicos a equipos, grupos o a todo el club directamente desde la plataforma.",
  },
  {
    icon: <Database className="h-8 w-8" />,
    title: "Importador de BBDD",
    description: "Importa fácilmente tu base de datos de miembros (jugadores, técnicos, etc.) mediante archivos CSV para una puesta en marcha rápida.",
  },
  {
    icon: <UserCheck className="h-8 w-8" />,
    title: "Actualización de Datos Digitalizada",
    description: "Envía solicitudes automáticas a tus miembros para que actualicen sus datos. La información se sincroniza al instante.",
  },
  {
    icon: <ClipboardList className="h-8 w-8" />,
    title: "Formularios de Inscripción",
    description: "Crea y publica formularios para eventos, campus o captaciones. Gestiona inscritos y pagos de forma centralizada.",
  },
  {
    icon: <Calendar className="h-8 w-8" />,
    title: "Calendario y Horarios",
    description: "Organiza entrenamientos, partidos y eventos con un calendario interactivo que todos pueden consultar.",
  },
  {
    icon: <AlertTriangle className="h-8 w-8" />,
    title: "Incidencias y Protocolos",
    description: "Registra incidencias, lesiones o sanciones y ten a mano los protocolos de actuación del club para una gestión rápida y eficaz.",
  },
  {
    icon: <FolderArchive className="h-8 w-8" />,
    title: "Almacén de Documentos",
    description: "Guarda y organiza tus documentos importantes como normativas o autorizaciones de forma segura en la nube.",
  },
];

const testimonials = [
    {
        name: "Javier García",
        role: "Presidente, C.D. Móstoles",
        quote: "Desde que usamos SportsPanel, la administración del club es otra. La función de solicitar actualización de datos a las familias nos ahorra semanas de trabajo al inicio de cada temporada. Es un cambio brutal.",
    },
    {
        name: "Elena Ruiz",
        role: "Coordinadora, A.D. Alcorcón F.S.",
        quote: "Organizar los horarios de los 15 equipos era una locura. Ahora, con el calendario de horarios, todo el mundo sabe dónde y cuándo entrena. Y si hay un cambio, se enteran al momento.",
    },
    {
        name: "Marcos Herrero",
        role: "Tesorero, Club Baloncesto Fuenlabrada",
        quote: "La sección de tesorería nos da una visión clara de la salud financiera del club. Controlar las cuotas, los gastos recurrentes y los patrocinios nunca había sido tan sencillo y visual.",
    },
     {
        name: "Sofía Moreno",
        role: "Secretaria, C.V. Leganés",
        quote: "Los formularios de inscripción online son una maravilla. Gestionamos el campus de verano y las captaciones sin papeleo, recogiendo los datos y los pagos de forma automática. ¡Profesionaliza mucho al club!",
    },
    {
        name: "David Alonso",
        role: "Director Deportivo, U.D. San Sebastián de los Reyes",
        quote: "La comunicación con los entrenadores es mucho más fluida. Podemos enviarles comunicados específicos o a todo el cuerpo técnico con un par de clics. Se acabó el caos de los grupos de WhatsApp.",
    },
    {
        name: "Isabel Jiménez",
        role: "Administrativa, Club Patinaje Getafe",
        quote: "El importador de CSV nos salvó la vida. Pudimos cargar los datos de más de 300 socios en una tarde, sin tener que introducirlos uno a uno. La puesta en marcha fue increíblemente rápida gracias a eso."
    }
]

const benefits = [
    {
        title: "Ahorra Tiempo en Administración",
        subtitle: "Digitaliza las fichas y centraliza la información.",
        points: [
            "Reduce el papeleo y los errores manuales.",
            "Accede a la información de cualquier miembro en segundos.",
            "Simplifica el proceso de actualización de información.",
        ],
        image: {
            src: "https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/Dise%C3%B1o%20sin%20t%C3%ADtulo%20(13).png?alt=media&token=3ce9a165-0142-4bc0-97f7-8900a2245e97",
            alt: "Administración Eficiente",
            hint: "organización escritorio"
        }
    },
    {
        title: "Comunicación Directa y Eficaz",
        subtitle: "Mantén a todos informados sin esfuerzo.",
        points: [
            "Envía comunicados a equipos específicos o a toda la administración.",
            "Notifica cambios de horario o cancelaciones al instante.",
            "Solicita la subida de documentos con un solo clic.",
        ],
        image: {
            src: "https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/Dise%C3%B1o%20sin%20t%C3%ADtulo%20(14).png?alt=media&token=dd1084fa-8dcb-479c-a014-55dad3a26415",
            alt: "Comunicación Centralizada",
            hint: "notificación móvil"
        }
    },
     {
        title: "Un Portal para tu Club",
        subtitle: "Un portal único para la administración del club.",
        points: [
            "Las familias reciben enlaces para actualizar sus datos o subir archivos.",
            "Los entrenadores reciben la información que necesitan por email.",
            "La administración tiene una visión global de todo el club.",
        ],
        image: {
            src: "https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/Dise%C3%B1o%20sin%20t%C3%ADtulo%20(15).png?alt=media&token=0984a6c9-c0ff-4e96-9612-72dd2726eaa4",
            alt: "Portal Unificado",
            hint: "personas conectadas"
        }
    }
]

const faqs = [
  {
    question: "¿Ofrecen un periodo de prueba?",
    answer: "¡Sí! Ofrecemos una prueba de 20 días para que explores todas las funcionalidades de SportsPanel. Puedes cancelar tu suscripción en cualquier momento. Además, nuestro plan mensual no tiene ningún tipo de permanencia."
  },
  {
    question: "¿Puedo importar mis datos existentes de otro programa?",
    answer: "Sí. Contamos con un importador de datos mediante archivos CSV. Puedes preparar una hoja de cálculo con tus jugadores, entrenadores o socios y subirlos a la plataforma de forma masiva, ahorrándote horas de trabajo manual."
  },
  {
    question: "¿Mis datos están seguros en la plataforma?",
    answer: "La seguridad es nuestra máxima prioridad. Utilizamos la infraestructura de Google Cloud, una de las más seguras del mundo, para proteger tus datos. Todas las conexiones están encriptadas y realizamos copias de seguridad periódicas."
  },
  {
    question: "¿Cómo funciona la comunicación con las familias?",
    answer: "Puedes enviar correos electrónicos directamente desde la plataforma. Tienes la opción de segmentar tus envíos por equipos, por tipo de miembro (jugadores, entrenadores...) o a todo el club. Las familias recibirán las notificaciones en su email."
  },
  {
    question: "¿Puedo solicitar a mis miembros que actualicen sus datos?",
    answer: "Sí, y es una de nuestras funcionalidades estrella. Puedes seleccionar qué campos necesitas que se actualicen (DNI, dirección, teléfono...) y enviar una solicitud masiva. Los miembros recibirán un enlace único y seguro para rellenar la información, que se actualizará automáticamente en su ficha."
  },
  {
    question: "¿SportsPanel se puede personalizar con el logo y los colores de mi club?",
    answer: "¡Sí! Puedes personalizar la plataforma con el nombre, el logo y el color principal de tu club para que tanto los miembros del staff como las familias se sientan como en casa."
  }
];

const stats = [
    { value: "9h+", title: "AHORRO SEMANAL", description: "Tiempo medio que nuestros clubs ahorran en tareas administrativas." },
    { value: "95%", title: "TASA DE RETENCIÓN", description: "De los clubs que prueban SportsPanel, la gran mayoría se queda." },
    { value: "+130", title: "CLUBS DEPORTIVOS", description: "Que ya confían en nuestra plataforma para su gestión diaria." },
    { value: "98%", title: "DIGITALIZACIÓN", description: "De los procesos internos del club que se pueden gestionar con nosotros." },
];

function ContactForm() {
    const { toast } = useToast();
    const [name, setName] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [message, setMessage] = React.useState("");
    const [isSending, setIsSending] = React.useState(false);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSending(true);
        
        const payload = new FormData();
        payload.append('clubId', "VWxHRR6HzumBnSdLfTtP"); // SportsPanel's own clubId for SMTP config
        payload.append('recipients', JSON.stringify([{ email: 'info.sportspanel@gmail.com', name: 'Contacto Web SportsPanel' }]));
        payload.append('subject', `Nuevo Mensaje de Contacto de: ${name}`);
        payload.append('htmlContent', `
            <p><strong>Nombre:</strong> ${name}</p>
            <p><strong>Email de Contacto:</strong> ${email}</p>
            <hr>
            <p><strong>Mensaje:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
        `);

        const result = await sendEmailWithSmtpAction(payload);

        if (result.success) {
            toast({ title: "Mensaje Enviado", description: "Hemos recibido tu consulta. Te responderemos lo antes posible."});
            setName("");
            setEmail("");
            setMessage("");
        } else {
            toast({ variant: "destructive", title: "Error al enviar", description: result.error});
        }
        
        setIsSending(false);
    }
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <div className="space-y-2">
                <Label htmlFor="name">Tu Nombre</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required/>
            </div>
             <div className="space-y-2">
                <Label htmlFor="email">Tu Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required/>
            </div>
             <div className="space-y-2">
                <Label htmlFor="message">Mensaje</Label>
                <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} required className="min-h-[120px]"/>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="ghost">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={isSending}>
                    {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    <Send className="mr-2 h-4 w-4"/>
                    Enviar
                </Button>
            </DialogFooter>
        </form>
    )
}

export default function LandingPage() {
  const [isYearly, setIsYearly] = React.useState(false);

  const pricing = {
    pro: { monthly: 33, yearly: Math.round(33 * 12 * 0.9) }
  };

  return (
    <Dialog>
      <div className="flex flex-col min-h-dvh bg-background text-foreground">
        <header className="px-4 lg:px-6 h-16 flex items-center bg-background/95 backdrop-blur-sm sticky top-0 z-50">
          <Link href="#" className="flex items-center justify-center" prefetch={false}>
             <div className="flex items-center gap-2">
                <Image
                src="https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/SportsPanel_logo_no_fondo.png?alt=media&token=d692cb56-60b1-4f00-a886-dd1cf340d043"
                alt="SportsPanel Logo"
                width={42}
                height={42}
                className="rounded-lg"
                />
                <span className="text-xl font-bold font-headline">SportsPanel</span>
            </div>
          </Link>
          <nav className="ml-auto hidden md:flex items-center gap-4 sm:gap-6">
            <Link href="#features" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
              Características
            </Link>
            <Link href="#benefits" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
              Beneficios
            </Link>
            <Link href="#pricing" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
              Planes
            </Link>
            <DialogTrigger asChild>
              <Button variant="ghost" className="text-sm font-medium hover:underline underline-offset-4" >
                Contacto
              </Button>
            </DialogTrigger>
            <Link href="/login" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
              Iniciar Sesión
            </Link>
            <Button asChild>
              <Link href="/register" prefetch={false}>Crea tu club</Link>
            </Button>
          </nav>
          <div className="ml-auto md:hidden">
              <Sheet>
                  <SheetTrigger asChild>
                      <Button variant="outline" size="icon">
                          <Menu className="h-6 w-6" />
                          <span className="sr-only">Abrir menú</span>
                      </Button>
                  </SheetTrigger>
                  <SheetContent side="right">
                    <SheetHeader>
                         <Link href="#" className="flex items-center" prefetch={false}>
                            <Logo withText={true}/>
                         </Link>
                    </SheetHeader>
                    <div className="grid gap-4 py-6">
                        <DialogClose asChild>
                            <Link href="#features" className="text-lg font-medium hover:underline underline-offset-4" prefetch={false}>
                                Características
                            </Link>
                        </DialogClose>
                        <DialogClose asChild>
                        <Link href="#benefits" className="text-lg font-medium hover:underline underline-offset-4" prefetch={false}>
                            Beneficios
                        </Link>
                        </DialogClose>
                         <DialogClose asChild>
                        <Link href="#pricing" className="text-lg font-medium hover:underline underline-offset-4" prefetch={false}>
                            Planes
                        </Link>
                        </DialogClose>
                        <DialogTrigger asChild>
                         <DialogClose asChild>
                            <Button variant="ghost" className="text-lg font-medium hover:underline underline-offset-4 justify-start p-0">
                                Contacto
                            </Button>
                          </DialogClose>
                        </DialogTrigger>
                        <Separator />
                        <DialogClose asChild>
                        <Link href="/login" className="text-lg font-medium hover:underline underline-offset-4" prefetch={false}>
                            Iniciar Sesión
                        </Link>
                        </DialogClose>
                        <DialogClose asChild>
                        <Button asChild size="lg">
                            <Link href="/register" prefetch={false}>Crea tu club</Link>
                        </Button>
                        </DialogClose>
                    </div>
                  </SheetContent>
              </Sheet>
          </div>
        </header>
        <main className="flex-1">
          <section className="w-full py-12 md:py-16 lg:py-20">
            <div className="container px-4 md:px-6">
              <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:gap-16 items-center">
                  <div className="flex flex-col justify-center space-y-4 text-center lg:text-left">
                    <div className="space-y-4">
                      <h1 className="text-3xl font-bold tracking-tighter md:text-5xl xl:text-6xl/none font-headline">
                        El Software que Automatiza tu Club y Ahorra Horas de Gestión
                      </h1>
                      <p className="mx-auto max-w-[700px] text-base text-muted-foreground md:text-lg lg:mx-0">
                        Centraliza la Base de Datos, tesorería, almacenamiento de archivos y comunicación con familias en un único panel.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 min-[400px]:flex-row lg:justify-start justify-center">
                      <Button asChild size="lg">
                        <Link href="/register" prefetch={false}>
                          Pruébalo gratis
                        </Link>
                      </Button>
                       <Button asChild size="lg" variant="outline">
                            <Link href="https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/SportsPanel%20-%20Gu%C3%ADa%20de%20Uso.pdf?alt=media&token=9a5224e2-caed-42a7-b733-b343e284ce40" target="_blank" rel="noopener noreferrer">
                            <Download className="mr-2 h-4 w-4" />
                            Descargar Guía de Uso
                            </Link>
                        </Button>
                    </div>
                     <p className="text-xs text-muted-foreground mt-2 text-center lg:text-left">No se necesita tarjeta de crédito · Cancela cuando quieras</p>
                  </div>
                   <Image
                      src="https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/%C2%A1Archivo%20Recibido!%20(10).png?alt=media&token=1ac52a21-54aa-451d-b538-d159bd475484"
                      alt="SportsPanel App Screenshot"
                      width={1890}
                      height={1063}
                      className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
                    />
                </div>
            </div>
          </section>

          <section id="stats-banner" className="w-full py-12 md:py-16 bg-landing-dark text-white">
              <div className="container px-4 md:px-6">
                  <div className="mx-auto grid max-w-6xl grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 md:grid-cols-4 text-center">
                    {stats.map((stat, index) => (
                      <div key={index} className="flex flex-col items-center text-center">
                          <h3 className="text-4xl lg:text-5xl font-bold text-turquesa">{stat.value}</h3>
                          <p className="mt-4 text-sm font-bold tracking-wider uppercase text-white">{stat.title}</p>
                          <p className="mt-2 text-sm text-gray-400 max-w-[200px]">{stat.description}</p>
                      </div>
                    ))}
                  </div>
              </div>
          </section>

          <section id="testimonials" className="w-full py-12 md:py-16 bg-muted/30">
            <div className="container px-4 md:px-6">
                 <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                      <div className="space-y-2">
                          <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                            La Confianza de los que Gestionan
                          </h2>
                          <p className="max-w-[900px] text-center text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                              Clubs como el tuyo ya están ahorrando tiempo y mejorando su organización con SportsPanel.
                          </p>
                      </div>
                  </div>
                 <Carousel
                    opts={{
                        align: "start",
                        loop: true,
                    }}
                    className="w-full max-w-6xl mx-auto"
                    >
                    <CarouselContent>
                        {testimonials.map((testimonial, index) => (
                        <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                            <div className="p-1 h-full">
                            <Card className="flex flex-col h-full">
                                <CardContent className="p-6 flex flex-col justify-between flex-grow">
                                <div>
                                    <div className="flex items-center gap-4 mb-4">
                                        <Avatar>
                                            <AvatarImage src={`https://i.pravatar.cc/150?u=${testimonial.name}`} />
                                            <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{testimonial.name}</p>
                                            <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                                        </div>
                                    </div>
                                    <p className="text-muted-foreground">"{testimonial.quote}"</p>
                                </div>
                                </CardContent>
                            </Card>
                            </div>
                        </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                    </Carousel>
            </div>
          </section>

          <section id="features" className="w-full py-12 md:py-16 lg:py-24">
            <div className="container px-4 md:px-6">
              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                    Todo lo que tu club necesita
                  </h2>
                  <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    Una plataforma completa pensada para optimizar cada aspecto de la gestión de tu club, ahorrándote tiempo y esfuerzo.
                  </p>
                </div>
              </div>
              <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 py-12 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((feature, index) => (
                  <div key={index} className="relative group flex flex-col items-center text-center p-6 rounded-lg border bg-card shadow-sm overflow-hidden">
                    <div className="absolute inset-0 bg-primary -translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-in-out"></div>
                      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
                        <div className="mb-4 text-primary group-hover:text-white transition-colors duration-300 ease-in-out">
                          {React.cloneElement(feature.icon, { className: "h-8 w-8" })}
                        </div>
                        <h3 className="text-xl font-bold mb-2 group-hover:text-white transition-colors duration-300 ease-in-out">{feature.title}</h3>
                        <p className="text-muted-foreground group-hover:text-white/90 transition-colors duration-300 ease-in-out">{feature.description}</p>
                      </div>
                  </div>
                ))}
              </div>
               <div className="text-center mt-8">
                <h3 className="text-2xl font-bold font-headline tracking-tight">Digitaliza tu club. Ahorra tiempo.</h3>
                <p className="text-muted-foreground mt-2 mb-6">Únete a los clubs que ya han optimizado su gestión.</p>
                <Button asChild size="lg">
                    <Link href="/register" prefetch={false}>
                    Empieza a optimizar tu club <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                </Button>
            </div>
            </div>
          </section>

          <section id="benefits" className="w-full py-6 md:py-8 bg-turquesa/20">
              <div className="container px-4 md:px-6">
                  <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                      <div className="space-y-2">
                          <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                            Ahorra tiempo, reduce errores <br /> y mejora la comunicación
                          </h2>
                          <p className="max-w-[900px] text-center text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                              SportsPanel automatiza las tareas repetitivas para que puedas centrarte en lo que de verdad importa: el deporte.
                          </p>
                      </div>
                  </div>
                  <div className="mx-auto grid max-w-6xl gap-8">
                      {benefits.map((benefit, index) => (
                          <div key={index} className={cn(
                              "grid gap-10 md:grid-cols-2 md:gap-12 items-center p-6 md:p-8 rounded-2xl",
                              index % 2 === 0 ? "bg-gray-800 text-white" : "bg-white",
                          )}>
                              <div className={cn("space-y-4", index % 2 !== 0 && "md:order-last")}>
                                  <h3 className="text-2xl font-bold font-headline tracking-tight">{benefit.title}</h3>
                                  <p className={cn(index % 2 === 0 ? "text-gray-300" : "text-muted-foreground")}>{benefit.subtitle}</p>
                                  <ul className="mt-6 space-y-4">
                                      {benefit.points.map((point, pIndex) => (
                                          <li key={pIndex} className="flex items-start gap-3">
                                              <CheckCircle className="h-6 w-6 text-turquesa mt-0.5 flex-shrink-0" />
                                              <span>{point}</span>
                                          </li>
                                      ))}
                                  </ul>
                              </div>
                              <div className="flex items-center justify-center">
                                  <div className={cn("p-6 rounded-xl", index % 2 === 0 ? "bg-gray-700/50" : "bg-turquesa/10")}>
                                      <Image
                                          src={benefit.image.src}
                                          alt={benefit.image.alt}
                                          width={450}
                                          height={350}
                                          className="rounded-lg shadow-lg"
                                          data-ai-hint={benefit.image.hint}
                                      />
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </section>

          <section id="pricing" className="w-full py-12 md:py-16 bg-muted/30">
            <div className="container px-4 md:px-6">
              <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                  <div className="space-y-2">
                      <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                        Un Plan Simple y Transparente
                      </h2>
                      <p className="max-w-[900px] text-center text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                          Todo lo que necesitas, sin complicaciones. Un único plan con todas las funcionalidades y sin límite de miembros.
                      </p>
                  </div>
              </div>
              <div className="mx-auto flex justify-center">
                  <div className="relative flex flex-col rounded-lg border-2 border-primary bg-card shadow-lg p-6 sm:p-8 text-center max-w-md w-full">
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-semibold flex items-center gap-1.5"><Star className="h-3 w-3"/>Plan Único</div>
                      <h3 className="text-2xl font-bold font-headline">SportsPanel Completo</h3>
                      <p className="text-muted-foreground mt-1">Fichas <b>ilimitadas</b></p>
                      <div className="mt-4 flex flex-col items-center justify-center gap-2">
                        <div className="flex items-baseline">
                          <span className="text-4xl font-bold">{pricing.pro.monthly}€</span>
                          <span className="text-muted-foreground self-end">/mes</span>
                        </div>
                          <span className="text-xs text-muted-foreground">+ IVA</span>
                      </div>
                      <ul className="mt-6 space-y-3 flex-grow text-left w-fit mx-auto">
                          <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Gestión de miembros y equipos</span></li>
                          <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Tesorería y control de cuotas</span></li>
                          <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Comunicación integrada</span></li>
                          <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Importador de datos</span></li>
                          <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Solicitud de datos a familias</span></li>
                          <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Formularios de inscripción</span></li>
                          <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Calendario y horarios</span></li>
                          <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Registro de incidencias</span></li>
                          <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Almacén de documentos</span></li>
                      </ul>
                      <Button className="mt-8 w-full" size="lg" asChild><Link href="/register">Empieza tu prueba gratuita de 20 días</Link></Button>
                  </div>
              </div>
            </div>
          </section>
          
          <section id="faq" className="w-full py-12 md:py-16">
              <div className="container px-4 md:px-6">
                  <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                      <div className="space-y-2">
                          <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                            Preguntas Frecuentes
                          </h2>
                          <p className="max-w-[900px] text-center text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                              ¿Tienes dudas? Aquí tienes las respuestas a las preguntas más comunes.
                          </p>
                      </div>
                  </div>
                  <div className="mx-auto max-w-3xl">
                      <Accordion type="single" collapsible className="w-full">
                          {faqs.map((faq, index) => (
                              <AccordionItem key={index} value={`item-${index}`}>
                                  <AccordionTrigger className="text-lg text-left">{faq.question}</AccordionTrigger>
                                  <AccordionContent className="text-base text-muted-foreground">
                                      {faq.answer}
                                  </AccordionContent>
                              </AccordionItem>
                          ))}
                      </Accordion>
                  </div>
              </div>
          </section>


        </main>
        <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
          <p className="text-xs text-muted-foreground">&copy; 2024 SportsPanel. Todos los derechos reservados.</p>
          <nav className="sm:ml-auto flex gap-4 sm:gap-6">
            <Link href="/terms" className="text-xs hover:underline underline-offset-4" prefetch={false}>
              Términos de Servicio
            </Link>
            <Link href="/privacy" className="text-xs hover:underline underline-offset-4" prefetch={false}>
              Política de Privacidad
            </Link>
          </nav>
        </footer>
        <DialogContent>
          <DialogHeader>
              <DialogTitle>Contacta con Nosotros</DialogTitle>
              <DialogDescription>
                  ¿Tienes alguna pregunta? Rellena el formulario y te responderemos lo antes posible.
              </DialogDescription>
          </DialogHeader>
          <ContactForm />
        </DialogContent>
      </div>
    </Dialog>
  );
}
