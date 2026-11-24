import { API_BASE_URL } from '../services/api'

/**
 * The RentEquip blog: practical guides for the people who rent and rent out machinery. Articles live here
 * as data (there is no CMS); the body is written in Spanish, the language of the market, and the screens
 * around it follow the visitor's language.
 */

export type BlogBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'tip'; text: string }

export interface BlogArticle {
  slug: string
  title: string
  excerpt: string
  /** ISO date of publication. */
  date: string
  readMinutes: number
  /** File in the backend's demo-images folder; its author is credited through photoCredit(). */
  image: string
  imageAlt: string
  /** Where the closing call to action sends the reader, and what it says. */
  cta: { label: string; to: string }
  body: BlogBlock[]
}

/** The demo photos are served by the backend, next to the API. */
export function blogImageUrl(file: string) {
  return `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}/demo-images/${file}`
}

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: 'alquilar-o-comprar-maquinaria',
    title: '¿Alquilar o comprar maquinaria? Cómo decidir sin adivinar',
    excerpt:
      'Comprar una excavadora parece una inversión, pero si pasa la mitad del año parada es un gasto. Estas son las preguntas que deciden cuál te conviene.',
    date: '2026-11-18',
    readMinutes: 6,
    image: 'excavadora-caterpillar-320.jpg',
    imageAlt: 'Excavadora Caterpillar 320 trabajando en un movimiento de tierras',
    cta: { label: 'Ver excavadoras en el catálogo', to: '/catalog?q=excavadora' },
    body: [
      {
        type: 'p',
        text: 'Toda empresa constructora llega a la misma pregunta cuando gana una obra grande: ¿compramos la máquina o la alquilamos? No hay una respuesta única, pero sí hay una forma ordenada de responderla con los números de tu propia empresa.',
      },
      { type: 'h2', text: 'La pregunta que lo decide: ¿cuántos días al año la vas a usar?' },
      {
        type: 'p',
        text: 'Una máquina propia cuesta aunque esté quieta: la cuota o el capital inmovilizado, el seguro, el mantenimiento preventivo, el almacenaje y la depreciación corren todos los meses. El alquiler, en cambio, solo cuesta los días que la máquina trabaja para ti.',
      },
      {
        type: 'p',
        text: 'Por eso el primer paso es contar los días reales de uso que tendrías en los próximos 12 a 24 meses, con las obras que ya tienes firmadas, no con las que esperas ganar.',
      },
      { type: 'h2', text: 'Haz la cuenta con tus números' },
      {
        type: 'list',
        items: [
          'Costo anual de tener la máquina: cuota o costo de oportunidad del capital, seguro, mantenimiento, operador fijo, almacén y depreciación.',
          'Costo anual de alquilarla: tarifa por día (o por semana, que suele salir más barata) por los días de uso, más el traslado a obra.',
          'Divide el costo anual de tenerla entre la tarifa diaria de alquiler: el resultado son los días de uso a partir de los cuales comprar empieza a convenir.',
        ],
      },
      {
        type: 'tip',
        text: 'Si los días que vas a usarla están por debajo de ese punto, alquilar te deja el capital libre para lo que sí produce: personal, materiales o la siguiente licitación.',
      },
      { type: 'h2', text: 'Lo que no sale en la cuenta' },
      {
        type: 'list',
        items: [
          'Flexibilidad: con el alquiler puedes pedir una excavadora de 20 t este mes y un minicargador el siguiente, según lo que pida la obra.',
          'Riesgo de avería: si una máquina propia se malogra, la reparas tú y la obra espera; en un alquiler, la empresa dueña responde por el equipo.',
          'Operador: muchas máquinas pesadas se alquilan con operador incluido, con su SCTR y su experiencia, y te ahorras contratarlo por planilla.',
          'Tecnología: alquilando trabajas con equipos más nuevos sin cargar con su depreciación.',
        ],
      },
      { type: 'h2', text: 'Cuándo sí conviene comprar' },
      {
        type: 'p',
        text: 'Si una máquina trabaja casi todo el año, tienes operador propio y taller para mantenerla, comprarla tiene sentido. Y aún así, alquilarla durante las primeras obras te deja ver cuántos días la usas de verdad antes de comprometer el capital. En RentEquip, algunos equipos incluso tienen opción de compra: parte de lo que pagaste en alquiler se descuenta del precio.',
      },
    ],
  },
  {
    slug: 'como-elegir-excavadora',
    title: 'Cómo elegir el tamaño de excavadora para tu obra',
    excerpt:
      'Una máquina demasiado grande no entra al terreno; una demasiado chica tarda el doble. Te explicamos cómo leer el tonelaje, el alcance y la cuchara antes de reservar.',
    date: '2026-11-11',
    readMinutes: 5,
    image: 'excavadora-komatsu-pc200.jpg',
    imageAlt: 'Excavadora Komatsu PC200 sobre orugas en obra',
    cta: { label: 'Buscar excavadoras cerca de tu obra', to: '/catalog?q=excavadora' },
    body: [
      {
        type: 'p',
        text: 'Qué excavadora pedir es de las primeras dudas al alquilar maquinaria. La respuesta depende de tres cosas: cuánto material vas a mover, qué tan profundo tienes que llegar y cuánto espacio hay para que la máquina trabaje y gire.',
      },
      { type: 'h2', text: 'Miniexcavadoras: espacios reducidos y trabajos finos' },
      {
        type: 'p',
        text: 'Las miniexcavadoras (de 1.5 a 6 t) entran por una puerta de garaje, trabajan dentro de una casa en remodelación y no maltratan las veredas. Son la opción para zanjas de agua y desagüe, instalaciones eléctricas, jardines y demoliciones interiores.',
      },
      { type: 'h2', text: 'Excavadoras medianas: la máquina de la obra civil' },
      {
        type: 'p',
        text: 'Entre 13 y 25 t está el caballo de batalla de la construcción: la Caterpillar 320 o la Komatsu PC200. Excavan sótanos, cargan volquetes y hacen movimientos de tierra de urbanizaciones con buen rendimiento y un traslado que todavía cabe en una cama baja estándar.',
      },
      { type: 'h2', text: 'Antes de reservar, revisa esto' },
      {
        type: 'list',
        items: [
          'Profundidad máxima de excavación: debe superar la de tu zanja o sótano con margen.',
          'Ancho de la cuchara: elige el que corresponde al ancho de la zanja, no el más grande.',
          'Acceso: mide el ancho de la entrada al terreno y la altura de cables o techos.',
          'Tipo de suelo: en roca o terreno duro vas a necesitar más peso o un martillo hidráulico.',
          'Operador: si nadie de tu equipo está certificado, busca equipos con operador incluido.',
        ],
      },
      {
        type: 'tip',
        text: '¿No estás seguro? Describe tu obra al asesor IA del catálogo, por ejemplo "zanjas de 1.5 m en Lima, 5 días", y te sugiere el equipo y te lleva a los disponibles en tu ciudad.',
      },
    ],
  },
  {
    slug: 'checklist-entrega-devolucion',
    title: 'Checklist de entrega y devolución: así recuperas toda tu garantía',
    excerpt:
      'La mayoría de discusiones por la garantía empiezan con una entrega sin fotos. Esta lista de diez minutos protege a quien alquila y a quien pone la máquina.',
    date: '2026-11-04',
    readMinutes: 4,
    image: 'retroexcavadora-jcb-3cx.jpg',
    imageAlt: 'Retroexcavadora JCB 3CX estacionada lista para entrega',
    cta: { label: 'Reservar con garantía protegida', to: '/catalog' },
    body: [
      {
        type: 'p',
        text: 'En RentEquip la garantía se retiene en tu tarjeta al reservar y se libera cuando devuelves el equipo en el estado en que lo recibiste. Para que eso sea fácil de demostrar, la entrega tiene que quedar registrada.',
      },
      { type: 'h2', text: 'Al recibir la máquina' },
      {
        type: 'list',
        items: [
          'Toma fotos de los cuatro lados, la cabina, las orugas o llantas y la cuchara o accesorio.',
          'Anota el horómetro y el nivel de combustible, y fotografíalos.',
          'Enciende el equipo y prueba todos los movimientos antes de que se vaya el transportista.',
          'Revisa fugas de aceite o hidráulico debajo de la máquina.',
          'Sube las fotos en la reserva: quedan con fecha y hora para ambas partes.',
        ],
      },
      { type: 'h2', text: 'Al devolverla' },
      {
        type: 'list',
        items: [
          'Límpiala de barro y concreto: la limpieza es la observación más común.',
          'Devuélvela con el combustible que tenía al recibirla.',
          'Repite las mismas fotos y el horómetro, con el dueño presente si es posible.',
          'Si hubo un golpe o una falla, avísalo en la reserva antes de la devolución, no después.',
        ],
      },
      {
        type: 'tip',
        text: 'Las fotos de entrega y devolución lado a lado resuelven casi cualquier duda en minutos. Sin ellas, es tu palabra contra la del otro.',
      },
    ],
  },
  {
    slug: 'herramientas-electricas-por-dias',
    title: 'Remodelaciones: por qué alquilar herramientas eléctricas por días',
    excerpt:
      'Un rotomartillo profesional se usa tres días en una remodelación y luego se queda en el almacén. Alquilarlo sale más a cuenta y llega con sus accesorios.',
    date: '2026-10-28',
    readMinutes: 3,
    image: 'rotomartillo-makita-hr3210.jpg',
    imageAlt: 'Rotomartillo Makita perforando concreto',
    cta: { label: 'Ver herramientas eléctricas', to: '/catalog?q=rotomartillo' },
    body: [
      {
        type: 'p',
        text: 'En una remodelación hay trabajos que duran pocos días pero exigen una herramienta profesional: abrir pases en losa, picar un contrapiso, compactar la base de una losa nueva o vibrar el concreto de una columna.',
      },
      { type: 'h2', text: 'Lo que ganas alquilando' },
      {
        type: 'list',
        items: [
          'Equipo profesional por el costo de los días que lo usas.',
          'Accesorios completos: brocas, cinceles, baterías y cargador.',
          'Nada que guardar ni mantener cuando termina el trabajo.',
          'La herramienta justa para cada etapa: rotomartillo, demoledor, plancha compactadora o vibrador.',
        ],
      },
      { type: 'h2', text: 'Cómo elegir' },
      {
        type: 'p',
        text: 'Para perforar concreto, un rotomartillo SDS-Plus basta hasta brocas de unos 30 mm; para picar pisos y muros, un martillo demoledor de 10 a 15 kg avanza mucho más rápido. Si vas a vaciar concreto, suma un vibrador de inmersión: evita cangrejeras en columnas y vigas.',
      },
      {
        type: 'tip',
        text: 'Pide la herramienta cerca de tu obra: en el catálogo, "Cerca de mí" ordena los equipos por distancia y puedes recogerlos el mismo día.',
      },
    ],
  },
]

export function findArticle(slug: string | undefined) {
  return BLOG_ARTICLES.find((article) => article.slug === slug)
}
