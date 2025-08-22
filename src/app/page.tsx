
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, CircleDollarSign, Mail, Calendar, Home, FolderArchive } from "lucide-react";
import { Logo } from "@/components/logo";

const features = [
  {
    icon: <Users className="h-8 w-8 text-primary" />,
    title: "Gestión Centralizada de Miembros",
    description: "Administra fichas de jugadores, entrenadores y staff en un único lugar. Accede a toda la información al instante.",
  },
  {
    icon: <CircleDollarSign className="h-8 w-8 text-primary" />,
    title: "Tesorería y Cuotas",
    description: "Lleva un control claro de los ingresos por cuotas, gastos y la salud financiera de tu club sin complicaciones.",
  },
   {
    icon: <Mail className="h-8 w-8 text-primary" />,
    title: "Comunicación Integrada",
    description: "Envía correos electrónicos a equipos, grupos o a todo el club directamente desde la plataforma.",
  },
  {
    icon: <Calendar className="h-8 w-8 text-primary" />,
    title: "Calendario y Horarios",
    description: "Organiza entrenamientos, partidos y eventos con un calendario interactivo que todos pueden consultar.",
  },
   {
    icon: <Home className="h-8 w-8 text-primary" />,
    title: "Portal para Familias y Miembros",
    description: "Ofrece un acceso privado para que cada miembro pueda consultar y actualizar sus datos de forma segura.",
  },
  {
    icon: <FolderArchive className="h-8 w-8 text-primary" />,
    title: "Almacén de Documentos",
    description: "Guarda y comparte documentos importantes como normativas o autorizaciones de forma segura en la nube.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <header className="px-4 lg:px-6 h-16 flex items-center bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <Link href="#" className="flex items-center justify-center gap-2" prefetch={false}>
          <Logo width={32} height={32}/>
          <span className="text-xl font-bold font-headline">SportsPanel</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link href="/login" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
            Iniciar Sesión
          </Link>
          <Button asChild>
            <Link href="/" prefetch={false}>Crear Cuenta</Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-20 md:py-32 lg:py-40 bg-card/50">
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
               <div className="mt-12">
                <Image
                  src="https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/Dise%C3%B1o%20sin%20t%C3%ADtulo%20(8).png?alt=media&token=bad8a437-33b6-447d-8a02-a545266e7ba4"
                  alt="SportsPanel App Screenshot"
                  width={1890}
                  height={1063}
                  className="rounded-lg shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">
                  Características Principales
                </div>
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
                <div key={index} className="flex flex-col items-center text-center p-6 rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-3 rounded-full bg-primary/10 mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
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
