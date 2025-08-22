
import * as React from 'react';
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, CircleDollarSign, Mail, Calendar, Home, FolderArchive, CheckCircle, Clock, Wallet, MessageCircle, BarChart3, Menu, Star } from "lucide-react";
import { Logo } from "@/components/logo";
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: <Users className="h-8 w-8" />,
    title: "Gestión Centralizada de Miembros",
    description: "Administra fichas de jugadores, entrenadores y staff en un único lugar. Accede a toda la información al instante.",
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
    icon: <Calendar className="h-8 w-8" />,
    title: "Calendario y Horarios",
    description: "Organiza entrenamientos, partidos y eventos con un calendario interactivo que todos pueden consultar.",
  },
   {
    icon: <Home className="h-8 w-8" />,
    title: "Portal para Familias y Miembros",
    description: "Ofrece un acceso privado para que cada miembro pueda consultar y actualizar sus datos de forma segura.",
  },
  {
    icon: <FolderArchive className="h-8 w-8" />,
    title: "Almacén de Documentos",
    description: "Guarda y comparte documentos importantes como normativas o autorizaciones de forma segura en la nube.",
  },
];

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
            "Envía comunicados a equipos específicos o a todo el club.",
            "Notifica cambios de horario o cancelaciones al instante.",
            "Simplifica el proceso de actualización de información.",
        ],
        image: {
            src: "https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/Dise%C3%B1o%20sin%20t%C3%ADtulo%20(14).png?alt=media&token=dd1084fa-8dcb-479c-a014-55dad3a26415",
            alt: "Comunicación Centralizada",
            hint: "notificación móvil"
        }
    },
     {
        title: "Una App para Todos",
        subtitle: "Un portal único para directivos, entrenadores y familias.",
        points: [
            "Las familias pueden consultar horarios y actualizar sus datos.",
            "Los entrenadores gestionan sus equipos y la asistencia.",
            "La directiva tiene una visión global de todo el club.",
        ],
        image: {
            src: "https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/Dise%C3%B1o%20sin%20t%C3%ADtulo%20(15).png?alt=media&token=0984a6c9-c0ff-4e96-9612-72dd2726eaa4",
            alt: "Portal Unificado",
            hint: "personas conectadas"
        }
    }
]

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
       <header className="px-4 lg:px-6 h-16 flex items-center bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <Link href="#" className="flex items-center justify-center gap-2" prefetch={false}>
          <Logo width={32} height={32}/>
          <span className="text-xl font-bold font-headline">SportsPanel</span>
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
          <Link href="/login" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
            Iniciar Sesión
          </Link>
          <Button asChild>
            <Link href="/" prefetch={false}>Crear Cuenta</Link>
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
                    <div className="grid gap-4 p-4">
                        <Link href="#features" className="text-lg font-medium hover:underline underline-offset-4" prefetch={false}>
                            Características
                        </Link>
                        <Link href="#benefits" className="text-lg font-medium hover:underline underline-offset-4" prefetch={false}>
                            Beneficios
                        </Link>
                        <Link href="#pricing" className="text-lg font-medium hover:underline underline-offset-4" prefetch={false}>
                            Planes
                        </Link>
                        <Link href="/login" className="text-lg font-medium hover:underline underline-offset-4" prefetch={false}>
                            Iniciar Sesión
                        </Link>
                        <Button asChild size="lg">
                            <Link href="/" prefetch={false}>Crear Cuenta</Link>
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-16 lg:py-20">
          <div className="container px-4 md:px-6">
            <div className="mx-auto flex max-w-4xl flex-col items-center space-y-6 text-center">
              <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
                  La Gestión de tu Club, <br /> Simplificada al Máximo
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Simplifica y digitaliza las operaciones de tu club con una plataforma centralizada, moderna e intuitiva.
                </p>
              </div>
              <div className="space-y-2">
                <Button asChild size="lg">
                  <Link href="#" prefetch={false}>
                    Empieza tu prueba gratuita
                  </Link>
                </Button>
              </div>
               <div className="mt-8">
                <Image
                  src="https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/Dise%C3%B1o%20sin%20t%C3%ADtulo%20(12).png?alt=media&token=ff0dd03b-8392-4822-a434-0760a6a776cc"
                  alt="SportsPanel App Screenshot"
                  width={1890}
                  height={1063}
                />
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-10 md:py-12">
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
                    <div className="absolute inset-0 bg-turquesa -translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-in-out"></div>
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
          </div>
        </section>

        <section id="benefits" className="w-full py-10 md:py-12">
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
                <div className="mx-auto grid max-w-6xl gap-12">
                    {benefits.map((benefit, index) => (
                        <div key={index} className={`grid gap-10 lg:grid-cols-2 lg:gap-16 items-center ${index % 2 !== 0 ? "lg:grid-flow-row-dense" : ""}`}>
                            <div className={index % 2 !== 0 ? "lg:col-start-2" : ""}>
                                <div className="space-y-4">
                                    <h3 className="text-2xl font-bold font-headline tracking-tight">{benefit.title}</h3>
                                    <p className="text-muted-foreground text-lg">{benefit.subtitle}</p>
                                </div>
                                <ul className="mt-6 space-y-4">
                                    {benefit.points.map((point, pIndex) => (
                                        <li key={pIndex} className="flex items-start gap-3">
                                            <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                                            <span>{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex items-center justify-center p-6 bg-muted/40 rounded-lg">
                                <Image
                                    src={benefit.image.src}
                                    alt={benefit.image.alt}
                                    width={500}
                                    height={400}
                                    className="rounded-lg shadow-lg"
                                    data-ai-hint={benefit.image.hint}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        <section id="pricing" className="w-full py-10 md:py-12 bg-muted/30">
          <div className="container px-4 md:px-6">
             <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                       Planes y Precios
                    </h2>
                    <p className="max-w-[900px] text-center text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                        Elige el plan que mejor se adapte a las necesidades de tu club.
                    </p>
                </div>
            </div>
             <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                <div className="flex flex-col rounded-lg border bg-card shadow-sm p-6">
                    <h3 className="text-2xl font-bold font-headline">Básico</h3>
                    <p className="text-muted-foreground mt-1">Ideal para clubs pequeños.</p>
                    <div className="mt-4">
                        <span className="text-4xl font-bold">24,99€</span>
                        <span className="text-muted-foreground">/mes</span>
                    </div>
                    <ul className="mt-6 space-y-3 flex-grow">
                        <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Hasta <b>80</b> jugadores</span></li>
                        <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Funcionalidades básicas</span></li>
                    </ul>
                    <Button variant="outline" className="mt-6 w-full">Empezar ahora</Button>
                </div>

                <div className="relative flex flex-col rounded-lg border-2 border-primary bg-card shadow-lg p-6">
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-semibold flex items-center gap-1.5"><Star className="h-3 w-3"/>El más popular</div>
                    <h3 className="text-2xl font-bold font-headline">Pro</h3>
                    <p className="text-muted-foreground mt-1">Perfecto para clubs en crecimiento.</p>
                     <div className="mt-4">
                        <span className="text-4xl font-bold">34,99€</span>
                        <span className="text-muted-foreground">/mes</span>
                    </div>
                     <ul className="mt-6 space-y-3 flex-grow">
                        <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Hasta <b>150</b> jugadores</span></li>
                        <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Soporte prioritario</span></li>
                    </ul>
                    <Button className="mt-6 w-full">Empezar ahora</Button>
                </div>

                <div className="flex flex-col rounded-lg border bg-card shadow-sm p-6">
                    <h3 className="text-2xl font-bold font-headline">Élite</h3>
                    <p className="text-muted-foreground mt-1">Para clubs grandes y academias.</p>
                     <div className="mt-4">
                        <span className="text-4xl font-bold">54,99€</span>
                        <span className="text-muted-foreground">/mes</span>
                    </div>
                    <ul className="mt-6 space-y-3 flex-grow">
                        <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Hasta <b>300</b> jugadores</span></li>
                        <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Funciones avanzadas</span></li>
                    </ul>
                    <Button variant="outline" className="mt-6 w-full">Empezar ahora</Button>
                </div>
            </div>
          </div>
        </section>

      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; 2024 SportsPanel. Todos los derechos reservados.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Términos de Servicio
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Política de Privacidad
          </Link>
        </nav>
      </footer>
    </div>
  );
}
