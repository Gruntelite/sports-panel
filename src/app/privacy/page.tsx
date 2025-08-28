
import Link from 'next/link';

export default function PrivacyPage() {
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
          <h1>Política de Privacidad</h1>
          <p>Última actualización: 24 de Julio de 2024</p>

          <h2>1. Información que Recopilamos</h2>
          <p>
            Recopilamos información que usted nos proporciona directamente cuando se registra en el Servicio, como su
            nombre, dirección de correo electrónico y la información de su club. También recopilamos el contenido que
            usted introduce en la plataforma (Contenido de Usuario), como datos de jugadores, finanzas, etc.
          </p>

          <h2>2. Cómo Usamos su Información</h2>
          <p>
            Utilizamos la información que recopilamos para operar, mantener y proporcionar las características y
            funcionalidades del Servicio, así como para comunicarnos con usted, por ejemplo, para enviarle correos
            electrónicos relacionados con el servicio.
          </p>

          <h2>3. Cómo Compartimos su Información</h2>
          <p>
            No compartiremos su información personal con terceros, excepto en las siguientes circunstancias:
          </p>
          <ul>
            <li>Con su consentimiento.</li>
            <li>
              Para cumplir con la ley, una orden judicial u otro proceso legal.
            </li>
            <li>
              Para proteger nuestros derechos, propiedad o seguridad, o los de otros.
            </li>
          </ul>

          <h2>4. Seguridad de los Datos</h2>
          <p>
            Utilizamos medidas de seguridad comercialmente razonables para proteger la información que recopilamos. Sin
            embargo, ningún sistema de seguridad es impenetrable y no podemos garantizar la seguridad de nuestros
            sistemas al 100%.
          </p>
          
          <h2>5. Retención de Datos</h2>
           <p>
            Retendremos su información mientras su cuenta esté activa o según sea necesario para proporcionarle
            servicios. Puede solicitar la eliminación de su cuenta y de sus datos en cualquier momento.
          </p>

          <h2>6. Sus Derechos</h2>
          <p>
            Usted tiene derecho a acceder, corregir o eliminar su información personal. Puede actualizar la información
            de su cuenta directamente a través del Servicio o contactándonos.
          </p>

          <h2>7. Cambios en Nuestra Política de Privacidad</h2>
          <p>
            Podemos modificar o actualizar esta Política de Privacidad de vez en cuando. Le notificaremos de cualquier
            cambio publicando la nueva Política de Privacidad en esta página.
          </p>

          <h2>8. Contacto</h2>
          <p>
            Si tiene alguna pregunta sobre esta Política de Privacidad, por favor contáctenos en info.sportspanel@gmail.com.
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
