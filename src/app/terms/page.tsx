
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="text-2xl font-bold text-gray-800">
            SportsPanel
          </Link>
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose lg:prose-xl max-w-4xl mx-auto bg-white p-8 rounded-lg shadow">
          <h1>Términos de Servicio</h1>
          <p>Última actualización: 24 de Julio de 2024</p>

          <h2>1. Aceptación de los Términos</h2>
          <p>
            Al acceder y utilizar SportsPanel (en adelante, "el Servicio"), usted acepta y se compromete a cumplir con
            estos Términos de Servicio. Si no está de acuerdo con alguna parte de los términos, no podrá acceder al
            Servicio.
          </p>

          <h2>2. Descripción del Servicio</h2>
          <p>
            SportsPanel es una plataforma de software como servicio (SaaS) diseñada para ayudar a los clubes deportivos
            a gestionar sus operaciones, incluyendo la gestión de miembros, equipos, finanzas, comunicaciones y
            calendarios.
          </p>

          <h2>3. Cuentas y Suscripción</h2>
          <p>
            Para acceder a la mayoría de las funcionalidades del Servicio, debe registrarse y mantener una cuenta activa y
            una suscripción de pago. Usted es responsable de mantener la confidencialidad de su cuenta y contraseña.
          </p>

          <h2>4. Contenido del Usuario</h2>
          <p>
            Usted es el único responsable de toda la información, datos, texto u otros materiales ("Contenido del
            Usuario") que cargue o introduzca en el Servicio. Usted retiene la propiedad de su Contenido de Usuario.
          </p>

          <h2>5. Uso Aceptable</h2>
          <p>
            Usted se compromete a no utilizar el Servicio para ningún propósito ilegal o prohibido por estos términos. No
            puede utilizar el Servicio de ninguna manera que pueda dañar, deshabilitar, sobrecargar o perjudicar el
            Servicio.
          </p>

          <h2>6. Modificaciones del Servicio y Precios</h2>
          <p>
            Nos reservamos el derecho de modificar o discontinuar, temporal o permanentemente, el Servicio (o cualquier
            parte del mismo) con o sin previo aviso. Los precios de todos los Servicios están sujetos a cambios con 30
            días de preaviso.
          </p>

          <h2>7. Limitación de Responsabilidad</h2>
          <p>
            En ningún caso SportsPanel, ni sus directores, empleados, socios, agentes, proveedores o afiliados, serán
            responsables de ningún daño indirecto, incidental, especial, consecuente o punitivo.
          </p>

          <h2>8. Ley Aplicable</h2>
          <p>
            Estos Términos se regirán e interpretarán de acuerdo con las leyes de España, sin tener en cuenta sus
            disposiciones sobre conflicto de leyes.
          </p>

          <h2>9. Contacto</h2>
          <p>
            Si tiene alguna pregunta sobre estos Términos, por favor contáctenos en info.sportspanel@gmail.com.
          </p>
        </div>
      </main>
      <footer className="bg-white mt-12">
         <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-gray-500">
            &copy; 2024 SportsPanel. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
