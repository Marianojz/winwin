import { FileText } from 'lucide-react';

const Terminos = () => {
  return (
    <div style={{ minHeight: '100vh', padding: '2rem 0' }}>
      <div className="container" style={{ maxWidth: '900px' }}>
        {/* Encabezado */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '3rem',
          background: 'var(--bg-secondary)',
          padding: '2rem',
          borderRadius: '1rem'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            marginBottom: '1rem',
            color: 'var(--primary)' 
          }}>
            <FileText size={48} />
          </div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            Términos y Condiciones
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            Última actualización: Noviembre 2025
          </p>
        </div>

        {/* Contenido */}
        <div style={{ 
          background: 'var(--bg-secondary)', 
          padding: '2.5rem', 
          borderRadius: '1rem',
          lineHeight: '1.8'
        }}>
          
          {/* Sección 1 */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ 
              color: 'var(--primary)', 
              fontSize: '1.75rem', 
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: '2px solid var(--primary)'
            }}>
              1. Aceptación de los Términos
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Al acceder y utilizar Clikio, aceptás estar sujeto a estos Términos y Condiciones, 
              todas las leyes y regulaciones aplicables, y aceptás que sos responsable del cumplimiento de 
              las leyes locales aplicables.
            </p>
            <p style={{ color: 'var(--text-secondary)' }}>
              Si no estás de acuerdo con alguno de estos términos, tenés prohibido usar o acceder a este sitio.
            </p>
          </section>

          {/* Sección 2 */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ 
              color: 'var(--primary)', 
              fontSize: '1.75rem', 
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: '2px solid var(--primary)'
            }}>
              2. Registro de Usuario y Publicación de Productos
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Para participar en las subastas y realizar compras, deberás crear una cuenta proporcionando 
              información precisa y completa. Sos responsable de:
            </p>
            <ul style={{ 
              color: 'var(--text-secondary)', 
              paddingLeft: '2rem',
              marginBottom: '1rem' 
            }}>
              <li style={{ marginBottom: '0.5rem' }}>
                Mantener la confidencialidad de tu contraseña
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Todas las actividades que ocurran bajo tu cuenta
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Notificarnos inmediatamente sobre cualquier uso no autorizado
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Proporcionar información veraz y actualizada, incluyendo DNI válido
              </li>
            </ul>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontWeight: 600 }}>
              <strong>Publicación de Productos y Subastas:</strong>
            </p>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Solo los administradores de la plataforma tienen la capacidad de publicar productos y crear 
              subastas. Los usuarios regulares pueden participar ofertando en subastas existentes y realizar 
              compras en la tienda, pero no pueden publicar contenido propio. Esta política asegura la calidad 
              y verificación de todos los productos disponibles en la plataforma.
            </p>
          </section>

          {/* Sección 3 */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ 
              color: 'var(--primary)', 
              fontSize: '1.75rem', 
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: '2px solid var(--primary)'
            }}>
              3. Reglas de las Subastas
            </h2>
            
            <h3 style={{ 
              fontSize: '1.25rem', 
              marginBottom: '0.75rem',
              marginTop: '1.5rem',
              color: 'var(--text-primary)'
            }}>
              3.1 Ofertas
            </h3>
            <ul style={{ 
              color: 'var(--text-secondary)', 
              paddingLeft: '2rem',
              marginBottom: '1rem' 
            }}>
              <li style={{ marginBottom: '0.5rem' }}>
                Cada oferta debe ser múltiplo de $500
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Todas las ofertas son vinculantes y no pueden retractarse
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Las ofertas realizadas en los últimos minutos pueden extender el tiempo de la subasta
              </li>
            </ul>

            <h3 style={{ 
              fontSize: '1.25rem', 
              marginBottom: '0.75rem',
              marginTop: '1.5rem',
              color: 'var(--text-primary)'
            }}>
              3.2 Ganador de la Subasta
            </h3>
            <ul style={{ 
              color: 'var(--text-secondary)', 
              paddingLeft: '2rem',
              marginBottom: '1rem' 
            }}>
              <li style={{ marginBottom: '0.5rem' }}>
                El ganador tiene 48 horas para completar el pago
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Si no se completa el pago en el plazo establecido, la subasta se republica
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                El ganador será notificado por email y en la plataforma
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                El incumplimiento reiterado puede resultar en la suspensión de la cuenta
              </li>
            </ul>

            <h3 style={{ 
              fontSize: '1.25rem', 
              marginBottom: '0.75rem',
              marginTop: '1.5rem',
              color: 'var(--text-primary)'
            }}>
              3.3 Compra Directa
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Algunos productos tienen la opción de "Compra Ya" que permite adquirir el artículo 
              inmediatamente sin participar en la subasta. Una vez realizada la compra directa, 
              la subasta finaliza automáticamente.
            </p>
          </section>

          {/* Sección 4 */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ 
              color: 'var(--primary)', 
              fontSize: '1.75rem', 
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: '2px solid var(--primary)'
            }}>
              4. Compras en la Tienda
            </h2>
            <ul style={{ 
              color: 'var(--text-secondary)', 
              paddingLeft: '2rem',
              marginBottom: '1rem' 
            }}>
              <li style={{ marginBottom: '0.5rem' }}>
                El stock mostrado es en tiempo real
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Los carritos no aseguran el stock del producto
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Los precios pueden cambiar sin previo aviso
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Todas las compras se procesan mediante MercadoPago
              </li>
            </ul>
          </section>

          {/* Sección 5 */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ 
              color: 'var(--primary)', 
              fontSize: '1.75rem', 
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: '2px solid var(--primary)'
            }}>
              5. Pagos y Facturación
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Todos los pagos se procesan a través de MercadoPago, una plataforma segura de pagos. 
              Clikio no almacena información de tarjetas de crédito.
            </p>
            <ul style={{ 
              color: 'var(--text-secondary)', 
              paddingLeft: '2rem',
              marginBottom: '1rem' 
            }}>
              <li style={{ marginBottom: '0.5rem' }}>
                Los precios están expresados en Pesos Argentinos (ARS)
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Los precios incluyen IVA cuando corresponda
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Los costos de envío se calculan al finalizar la compra
              </li>
            </ul>
          </section>

          {/* Sección 6 */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ 
              color: 'var(--primary)', 
              fontSize: '1.75rem', 
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: '2px solid var(--primary)'
            }}>
              6. Envíos y Entregas
            </h2>
            <ul style={{ 
              color: 'var(--text-secondary)', 
              paddingLeft: '2rem',
              marginBottom: '1rem' 
            }}>
              <li style={{ marginBottom: '0.5rem' }}>
                Los tiempos de entrega son estimados y pueden variar
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                El comprador es responsable de proporcionar una dirección válida y completa
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Clikio no se hace responsable por demoras causadas por el servicio de correo
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                En caso de productos dañados durante el envío, se debe notificar dentro de las 48 horas
              </li>
            </ul>
          </section>

          {/* Sección 7 */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ 
              color: 'var(--primary)', 
              fontSize: '1.75rem', 
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: '2px solid var(--primary)'
            }}>
              7. Devoluciones y Reembolsos
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Según la Ley de Defensa del Consumidor (Ley 24.240), tenés derecho a revocar la compra 
              dentro de los 10 días corridos desde la recepción del producto.
            </p>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Para ejercer este derecho:
            </p>
            <ul style={{ 
              color: 'var(--text-secondary)', 
              paddingLeft: '2rem',
              marginBottom: '1rem' 
            }}>
              <li style={{ marginBottom: '0.5rem' }}>
                El producto debe estar sin usar y en su empaque original
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Debés notificarnos a través de nuestro Centro de Ayuda
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Los gastos de devolución corren por cuenta del comprador
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                El reembolso se procesará dentro de los 10 días hábiles posteriores a la recepción del producto
              </li>
            </ul>
            <p style={{ color: 'var(--text-secondary)' }}>
              <strong>Excepciones:</strong> Los productos ganados en subasta no pueden devolverse, 
              salvo que presenten defectos de fabricación o no coincidan con la descripción.
            </p>
          </section>

          {/* Sección 8 */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ 
              color: 'var(--primary)', 
              fontSize: '1.75rem', 
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: '2px solid var(--primary)'
            }}>
              8. Propiedad Intelectual
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Todo el contenido de este sitio, incluyendo textos, gráficos, logotipos, imágenes, 
              videos y software, es propiedad de Clikio y está protegido por las leyes 
              de propiedad intelectual de Argentina. Queda prohibida la reproducción, distribución 
              o modificación sin autorización previa.
            </p>
          </section>

          {/* Sección 9 */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ 
              color: 'var(--primary)', 
              fontSize: '1.75rem', 
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: '2px solid var(--primary)'
            }}>
              9. Privacidad y Protección de Datos
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              En cumplimiento con la Ley 25.326 de Protección de Datos Personales, toda la información 
              proporcionada será tratada de manera confidencial y utilizada únicamente para los fines 
              de la plataforma.
            </p>
            <p style={{ color: 'var(--text-secondary)' }}>
              Los usuarios tienen derecho a acceder, rectificar y suprimir sus datos personales en 
              cualquier momento contactando a nuestro servicio de atención al cliente.
            </p>
          </section>

          {/* Sección 10 */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ 
              color: 'var(--primary)', 
              fontSize: '1.75rem', 
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: '2px solid var(--primary)'
            }}>
              10. Limitación de Responsabilidad
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Clikio actúa como intermediario entre compradores y vendedores. No nos hacemos 
              responsables por:
            </p>
            <ul style={{ 
              color: 'var(--text-secondary)', 
              paddingLeft: '2rem',
              marginBottom: '1rem' 
            }}>
              <li style={{ marginBottom: '0.5rem' }}>
                La calidad, seguridad o legalidad de los productos ofrecidos
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                La capacidad de los vendedores para cumplir con las transacciones
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Pérdidas o daños indirectos, incidentales o consecuentes
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Interrupciones del servicio por mantenimiento o causas de fuerza mayor
              </li>
            </ul>
          </section>

          {/* Sección 11 */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ 
              color: 'var(--primary)', 
              fontSize: '1.75rem', 
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: '2px solid var(--primary)'
            }}>
              11. Suspensión y Terminación de Cuenta
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Nos reservamos el derecho de suspender o terminar tu cuenta en caso de:
            </p>
            <ul style={{ 
              color: 'var(--text-secondary)', 
              paddingLeft: '2rem',
              marginBottom: '1rem' 
            }}>
              <li style={{ marginBottom: '0.5rem' }}>
                Violación de estos términos y condiciones
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Conducta fraudulenta o sospechosa
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Incumplimiento reiterado de pagos
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                Uso indebido de la plataforma
              </li>
            </ul>
          </section>

          {/* Sección 12 */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ 
              color: 'var(--primary)', 
              fontSize: '1.75rem', 
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: '2px solid var(--primary)'
            }}>
              12. Modificaciones a los Términos
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Clikio se reserva el derecho de modificar estos términos en cualquier momento. 
              Los cambios entrarán en vigor inmediatamente después de su publicación en el sitio. 
              Es tu responsabilidad revisar periódicamente estos términos.
            </p>
          </section>

          {/* Sección 13 */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ 
              color: 'var(--primary)', 
              fontSize: '1.75rem', 
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: '2px solid var(--primary)'
            }}>
              13. Ley Aplicable y Jurisdicción
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Estos términos se rigen por las leyes de la República Argentina. Cualquier disputa 
              será resuelta en los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires, 
              renunciando las partes a cualquier otro fuero o jurisdicción que pudiera corresponderles.
            </p>
          </section>

          {/* Sección 14 */}
          <section>
            <h2 style={{ 
              color: 'var(--primary)', 
              fontSize: '1.75rem', 
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: '2px solid var(--primary)'
            }}>
              14. Contacto
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Para cualquier consulta sobre estos términos y condiciones, podés contactarnos a través de:
            </p>
            <ul style={{ 
              color: 'var(--text-secondary)', 
              paddingLeft: '2rem',
              listStyle: 'none'
            }}>
              <li style={{ marginBottom: '0.5rem' }}>
                📧 Email: soporte@subastaargenta.com
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                📱 Centro de Ayuda en nuestro sitio web
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                📍 Dirección: Buenos Aires, Argentina
              </li>
            </ul>
          </section>
        </div>

        {/* Footer de la página */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '2rem',
          padding: '1.5rem',
          background: 'var(--bg-secondary)',
          borderRadius: '1rem'
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Al utilizar Clikio, aceptás estos términos y condiciones en su totalidad.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Terminos;
