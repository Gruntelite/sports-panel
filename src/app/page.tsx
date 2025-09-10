
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
import { useTranslation } from '@/components/i18n-provider';
import { LanguageSwitcher } from '@/components/language-switcher';

function ContactForm() {
    const { toast } = useToast();
    const { t } = useTranslation();
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
            toast({ title: t('contact.successTitle'), description: t('contact.successDescription')});
            setName("");
            setEmail("");
            setMessage("");
        } else {
            toast({ variant: "destructive", title: t('contact.errorTitle'), description: result.error});
        }
        
        setIsSending(false);
    }
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <div className="space-y-2">
                <Label htmlFor="name">{t('contact.yourName')}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required/>
            </div>
             <div className="space-y-2">
                <Label htmlFor="email">{t('contact.yourEmail')}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required/>
            </div>
             <div className="space-y-2">
                <Label htmlFor="message">{t('contact.message')}</Label>
                <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} required className="min-h-[120px]"/>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="ghost">{t('common.cancel')}</Button>
                </DialogClose>
                <Button type="submit" disabled={isSending}>
                    {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    <Send className="mr-2 h-4 w-4"/>
                    {t('common.send')}
                </Button>
            </DialogFooter>
        </form>
    )
}

export default function LandingPage() {
  const [isYearly, setIsYearly] = React.useState(false);
  const { t } = useTranslation();

  const features = [
    {
      icon: <Users className="h-8 w-8" />,
      title: t('landing.features.0.title'),
      description: t('landing.features.0.description'),
    },
    {
      icon: <CircleDollarSign className="h-8 w-8" />,
      title: t('landing.features.1.title'),
      description: t('landing.features.1.description'),
    },
     {
      icon: <Mail className="h-8 w-8" />,
      title: t('landing.features.2.title'),
      description: t('landing.features.2.description'),
    },
    {
      icon: <Database className="h-8 w-8" />,
      title: t('landing.features.3.title'),
      description: t('landing.features.3.description'),
    },
    {
      icon: <UserCheck className="h-8 w-8" />,
      title: t('landing.features.4.title'),
      description: t('landing.features.4.description'),
    },
    {
      icon: <ClipboardList className="h-8 w-8" />,
      title: t('landing.features.5.title'),
      description: t('landing.features.5.description'),
    },
    {
      icon: <Calendar className="h-8 w-8" />,
      title: t('landing.features.6.title'),
      description: t('landing.features.6.description'),
    },
    {
      icon: <AlertTriangle className="h-8 w-8" />,
      title: t('landing.features.7.title'),
      description: t('landing.features.7.description'),
    },
    {
      icon: <FolderArchive className="h-8 w-8" />,
      title: t('landing.features.8.title'),
      description: t('landing.features.8.description'),
    },
  ];

  const testimonials = [
      { name: "Javier García", role: "Presidente, C.D. Móstoles", quote: t('landing.testimonials.0.quote') },
      { name: "Elena Ruiz", role: "Coordinadora, A.D. Alcorcón F.S.", quote: t('landing.testimonials.1.quote') },
      { name: "Marcos Herrero", role: "Tesorero, Club Baloncesto Fuenlabrada", quote: t('landing.testimonials.2.quote') },
      { name: "Sofía Moreno", role: "Secretaria, C.V. Leganés", quote: t('landing.testimonials.3.quote') },
      { name: "David Alonso", role: "Director Deportivo, U.D. San Sebastián de los Reyes", quote: t('landing.testimonials.4.quote') },
      { name: "Isabel Jiménez", role: "Administrativa, Club Patinaje Getafe", quote: t('landing.testimonials.5.quote') }
  ];

  const benefits = [
      {
          title: t('landing.benefits.0.title'),
          subtitle: t('landing.benefits.0.subtitle'),
          points: [t('landing.benefits.0.points.0'), t('landing.benefits.0.points.1'), t('landing.benefits.0.points.2')],
          image: { src: "https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/Dise%C3%B1o%20sin%20t%C3%ADtulo%20(13).png?alt=media&token=3ce9a165-0142-4bc0-97f7-8900a2245e97", alt: "Administración Eficiente", hint: "organización escritorio" }
      },
      {
          title: t('landing.benefits.1.title'),
          subtitle: t('landing.benefits.1.subtitle'),
          points: [t('landing.benefits.1.points.0'), t('landing.benefits.1.points.1'), t('landing.benefits.1.points.2')],
          image: { src: "https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/Dise%C3%B1o%20sin%20t%C3%ADtulo%20(14).png?alt=media&token=dd1084fa-8dcb-479c-a014-55dad3a26415", alt: "Comunicación Centralizada", hint: "notificación móvil" }
      },
       {
          title: t('landing.benefits.2.title'),
          subtitle: t('landing.benefits.2.subtitle'),
          points: [t('landing.benefits.2.points.0'), t('landing.benefits.2.points.1'), t('landing.benefits.2.points.2')],
          image: { src: "https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/Dise%C3%B1o%20sin%20t%C3%ADtulo%20(15).png?alt=media&token=0984a6c9-c0ff-4e96-9612-72dd2726eaa4", alt: "Portal Unificado", hint: "personas conectadas" }
      }
  ];
  
  const faqs = [
    { question: t('landing.faq.0.question'), answer: t('landing.faq.0.answer') },
    { question: t('landing.faq.1.question'), answer: t('landing.faq.1.answer') },
    { question: t('landing.faq.2.question'), answer: t('landing.faq.2.answer') },
    { question: t('landing.faq.3.question'), answer: t('landing.faq.3.answer') },
    { question: t('landing.faq.4.question'), answer: t('landing.faq.4.answer') },
    { question: t('landing.faq.5.question'), answer: t('landing.faq.5.answer') },
  ];

  const stats = [
    { value: "9h+", title: t('landing.stats.0.title'), description: t('landing.stats.0.description') },
    { value: "95%", title: t('landing.stats.1.title'), description: t('landing.stats.1.description') },
    { value: "+130", title: t('landing.stats.2.title'), description: t('landing.stats.2.description') },
    { value: "98%", title: t('landing.stats.3.title'), description: t('landing.stats.3.description') },
];

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
            <LanguageSwitcher />
            <Link href="#features" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
              {t('landing.nav.features')}
            </Link>
            <Link href="#benefits" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
              {t('landing.nav.benefits')}
            </Link>
            <Link href="#pricing" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
              {t('landing.nav.pricing')}
            </Link>
            <DialogTrigger asChild>
              <Button variant="ghost" className="text-sm font-medium hover:underline underline-offset-4" >
                {t('landing.nav.contact')}
              </Button>
            </DialogTrigger>
            <Link href="/login" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
              {t('landing.nav.login')}
            </Link>
            <Button asChild>
              <Link href="/register" prefetch={false}>{t('landing.nav.register')}</Link>
            </Button>
          </nav>
          <div className="ml-auto md:hidden">
              <Sheet>
                  <SheetTrigger asChild>
                      <Button variant="outline" size="icon">
                          <Menu className="h-6 w-6" />
                          <span className="sr-only">{t('header.openMenu')}</span>
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
                                {t('landing.nav.features')}
                            </Link>
                        </DialogClose>
                        <DialogClose asChild>
                        <Link href="#benefits" className="text-lg font-medium hover:underline underline-offset-4" prefetch={false}>
                            {t('landing.nav.benefits')}
                        </Link>
                        </DialogClose>
                         <DialogClose asChild>
                        <Link href="#pricing" className="text-lg font-medium hover:underline underline-offset-4" prefetch={false}>
                            {t('landing.nav.pricing')}
                        </Link>
                        </DialogClose>
                        <DialogTrigger asChild>
                         <DialogClose asChild>
                            <Button variant="ghost" className="text-lg font-medium hover:underline underline-offset-4 justify-start p-0">
                                {t('landing.nav.contact')}
                            </Button>
                          </DialogClose>
                        </DialogTrigger>
                        <Separator />
                        <DialogClose asChild>
                        <Link href="/login" className="text-lg font-medium hover:underline underline-offset-4" prefetch={false}>
                             {t('landing.nav.login')}
                        </Link>
                        </DialogClose>
                        <DialogClose asChild>
                        <Button asChild size="lg">
                            <Link href="/register" prefetch={false}>{t('landing.nav.register')}</Link>
                        </Button>
                        </DialogClose>
                    </div>
                  </SheetContent>
              </Sheet>
          </div>
        </header>
        <main className="flex-1">
          <section className="w-full pt-8 md:pt-12 pb-8 md:pb-10">
            <div className="container px-4 md:px-6">
              <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr] lg:gap-12 xl:gap-16 items-center">
                  <div className="flex flex-col justify-center space-y-4 text-center lg:text-left">
                    <div className="space-y-4">
                      <h1 className="text-3xl font-bold tracking-tighter md:text-5xl xl:text-6xl/none font-headline">
                        {t('landing.title')}
                      </h1>
                      <p className="mx-auto max-w-[700px] text-base text-muted-foreground md:text-lg lg:mx-0">
                        {t('landing.subtitle')}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 min-[400px]:flex-row lg:justify-start justify-center">
                      <Button asChild size="lg">
                        <Link href="/register" prefetch={false}>
                          {t('landing.cta')}
                        </Link>
                      </Button>
                    </div>
                     <p className="text-xs text-muted-foreground mt-2 text-center lg:text-left">{t('landing.ctaNote')}</p>
                  </div>
                   <div className="space-y-4">
                        <Image
                            src="https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/%C2%A1Archivo%20Recibido!%20(10).png?alt=media&token=1ac52a21-54aa-451d-b538-d159bd475484"
                            alt="SportsPanel App Screenshot"
                            width={1890}
                            height={1063}
                            priority
                            className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full"
                        />
                    </div>
                </div>
            </div>
          </section>

          <section id="stats-banner" className="w-full py-8 md:py-10 bg-landing-dark text-white">
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
                            {t('landing.testimonials.title')}
                          </h2>
                          <p className="max-w-[900px] text-center text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                              {t('landing.testimonials.subtitle')}
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
                    {t('landing.featuresTitle')}
                  </h2>
                  <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    {t('landing.featuresSubtitle')}
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
                <h3 className="text-2xl font-bold font-headline tracking-tight">{t('landing.bottomCta.title')}</h3>
                <p className="text-muted-foreground mt-2 mb-6">{t('landing.bottomCta.subtitle')}</p>
                <Button asChild size="lg">
                    <Link href="/register" prefetch={false}>
                    {t('landing.bottomCta.button')} <ArrowRight className="ml-2 h-5 w-5" />
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
                            {t('landing.benefits.title')}
                          </h2>
                          <p className="max-w-[900px] text-center text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                              {t('landing.benefits.subtitle')}
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
                        {t('landing.pricing.title')}
                      </h2>
                      <p className="max-w-[900px] text-center text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                          {t('landing.pricing.subtitle')}
                      </p>
                  </div>
              </div>
              <div className="mx-auto flex justify-center">
                  <div className="relative flex flex-col rounded-lg border-2 border-primary bg-card shadow-lg p-6 sm:p-8 text-center max-w-md w-full">
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-semibold flex items-center gap-1.5"><Star className="h-3 w-3"/>{t('landing.pricing.planName')}</div>
                      <h3 className="text-2xl font-bold font-headline">{t('landing.pricing.planTitle')}</h3>
                      <p className="text-muted-foreground mt-1">{t('landing.pricing.planSubtitle')}</p>
                      <div className="mt-4 flex flex-col items-center justify-center gap-2">
                        <div className="flex items-baseline">
                          <span className="text-5xl font-bold">{pricing.pro.monthly}€</span>
                          <span className="text-muted-foreground self-end">/{t('landing.pricing.perMonth')}</span>
                        </div>
                          <span className="text-xs text-muted-foreground">{t('landing.pricing.vatNote')}</span>
                      </div>
                      <ul className="mt-6 space-y-3 flex-grow text-left w-fit mx-auto">
                           {t('landing.pricing.features', { returnObjects: true }).map((feature, index) => (
                                <li key={index} className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                      </ul>
                      <Button className="mt-8 w-full" size="lg" asChild><Link href="/register">{t('landing.pricing.cta')}</Link></Button>
                  </div>
              </div>
            </div>
          </section>
          
          <section id="faq" className="w-full py-12 md:py-16">
              <div className="container px-4 md:px-6">
                  <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                      <div className="space-y-2">
                          <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                            {t('landing.faq.title')}
                          </h2>
                          <p className="max-w-[900px] text-center text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                              {t('landing.faq.subtitle')}
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
          <p className="text-xs text-muted-foreground">&copy; 2024 SportsPanel. {t('landing.footer.rights')}</p>
          <nav className="sm:ml-auto flex gap-4 sm:gap-6">
            <Link href="/terms" className="text-xs hover:underline underline-offset-4" prefetch={false}>
              {t('landing.footer.terms')}
            </Link>
            <Link href="/privacy" className="text-xs hover:underline underline-offset-4" prefetch={false}>
              {t('landing.footer.privacy')}
            </Link>
          </nav>
        </footer>
        <DialogContent>
          <DialogHeader>
              <DialogTitle>{t('contact.title')}</DialogTitle>
              <DialogDescription>
                  {t('contact.description')}
              </DialogDescription>
          </DialogHeader>
          <ContactForm />
        </DialogContent>
      </div>
    </Dialog>
  );
}
