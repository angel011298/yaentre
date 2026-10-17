/**
 * G101 — CATÁLOGO OFICIAL DE CARRERAS (UNAM e IPN, licenciatura).
 *
 * Hasta G100 la base tenía 26 carreras de la UNAM (de 128) y 21 del IPN (de
 * 72): solo las «carreras ancla» con aciertos mínimos documentados. Un
 * aspirante a Actuaría, Ciencia de Datos o Ingeniería en Inteligencia
 * Artificial no encontraba su carrera en el onboarding. Peor: 8 de las 21 del
 * IPN no existían con ese nombre en la oferta oficial —«Administración
 * (CIMA)», «Turismo (CIMA)»… el IPN no tiene ningún plantel CIMA—, y dos no
 * existían en absoluto («Bioquímica Clínica (ENCB)», «Gestión y Dirección de
 * Empresas»).
 *
 * Este archivo es DATA, no lógica (CLAUDE.md: la taxonomía es seed): lo leen
 * los seeds (`prisma/seed/unam.ts`, `prisma/seed/ipn.ts`), la sincronización
 * contra la base ya existente (`pnpm content:careers`) y la interfaz, que
 * muestra los planteles junto al nombre para que el aspirante reconozca su
 * carrera. Los aciertos mínimos NO viven aquí: siguen en las carreras ancla
 * de los seeds, con su fuente; una carrera sin dato muestra «sin dato» en vez
 * de un número inventado (`formatEntrometroTarget`).
 *
 * ── FUENTES (consultadas el 2026-10-17) ────────────────────────────────────
 *  · UNAM: catálogo de oferta académica de la DGAE (CASE UNAM,
 *    https://case.unam.mx/oferta-academica) — 128 licenciaturas por área,
 *    con su clave oficial, planteles y sistemas. Los nombres llegan
 *    abreviados («Ing. Civil»); aquí van completos. La clave 109 se conserva
 *    como «Ingeniería Eléctrica Electrónica», el nombre del plan de la
 *    Facultad de Ingeniería y de los resultados del concurso (DGAE).
 *  · IPN: oferta educativa de nivel superior
 *    (https://www.ipn.mx/oferta-educativa/educacion-superior/) — 72 carreras
 *    por rama, con unidades académicas y modalidad. «Licenciatura en
 *    Turismo» aparece sin unidad académica en la tabla oficial: se imparte
 *    en la Escuela Superior de Turismo (EST).
 *
 * Al actualizar: cada carrera nueva entra aquí; un nombre que cambia se
 * cambia aquí y el anterior pasa a `formerNames` (la sincronización renombra
 * la fila conservando su id, así no se pierde la meta de ningún alumno); una
 * carrera que deja de ofrecerse va a `RETIRED_CAREER_NAMES`.
 */

export type UnamAreaCode = 'AREA_1' | 'AREA_2' | 'AREA_3' | 'AREA_4';
export type IpnAreaCode = 'IPN_FISMAT' | 'IPN_MEDBIO' | 'IPN_SOCADM';
export type CatalogAreaCode = UnamAreaCode | IpnAreaCode;

export interface CatalogCareer {
  /** Nombre oficial completo: es el que se guarda en `careers.name`. */
  readonly name: string;
  /** Clave de la DGAE (solo UNAM). */
  readonly officialCode?: string;
  /** Planteles (UNAM) o unidades académicas (IPN) donde se imparte. */
  readonly campuses: readonly string[];
  /** Sistemas en los que se ofrece. */
  readonly modalities: readonly string[];
  /** Nombres con los que esta carrera existía antes en la base. */
  readonly formerNames?: readonly string[];
}

export const CATALOG_SOURCES = {
  UNAM: {
    url: 'https://case.unam.mx/oferta-academica',
    label: 'DGAE UNAM — oferta académica de licenciatura (CASE UNAM)',
    retrievedAt: '2026-10-17',
  },
  IPN: {
    url: 'https://www.ipn.mx/oferta-educativa/educacion-superior/',
    label: 'IPN — oferta educativa de nivel superior',
    retrievedAt: '2026-10-17',
  },
} as const;

/**
 * Filas que existían en la base y NO están en la oferta oficial con ningún
 * nombre. Se retiran solo si ningún alumno las tiene como meta; si alguno la
 * tiene, la sincronización la deja y lo reporta (la FK pondría su meta en
 * null en silencio, y eso le borraría el Entrómetro sin avisarle).
 */
export const RETIRED_CAREER_NAMES: Partial<Record<CatalogAreaCode, readonly string[]>> = {
  IPN_MEDBIO: ['Bioquímica Clínica (ENCB)'],
  IPN_SOCADM: ['Gestión y Dirección de Empresas'],
};

export const UNAM_CAREERS: Record<UnamAreaCode, readonly CatalogCareer[]> = {
  AREA_1: [
    { name: 'Actuaría', officialCode: '101', campuses: ['Facultad de Ciencias', 'FES Acatlán'], modalities: ['Escolarizado'] },
    { name: 'Arquitectura', officialCode: '102', campuses: ['Facultad de Arquitectura', 'FES Acatlán', 'FES Aragón'], modalities: ['Escolarizado'] },
    { name: 'Arquitectura de Paisaje', officialCode: '103', campuses: ['Facultad de Arquitectura'], modalities: ['Escolarizado'] },
    { name: 'Ciencia de Datos', officialCode: '138', campuses: ['FES Acatlán', 'Instituto de Investigaciones en Matemáticas Aplicadas y en Sistemas'], modalities: ['Escolarizado'] },
    { name: 'Ciencia de Materiales Sustentables', officialCode: '133', campuses: ['ENES Morelia'], modalities: ['Escolarizado'] },
    { name: 'Ciencias de la Computación', officialCode: '104', campuses: ['Facultad de Ciencias'], modalities: ['Escolarizado'] },
    { name: 'Ciencias de la Tierra', officialCode: '127', campuses: ['ENES Juriquilla', 'ENES Mérida', 'Esc. Nacional de Ciencias de la Tierra'], modalities: ['Escolarizado'] },
    { name: 'Diseño Industrial', officialCode: '105', campuses: ['Facultad de Arquitectura', 'FES Aragón'], modalities: ['Escolarizado'] },
    { name: 'Física', officialCode: '106', campuses: ['Facultad de Ciencias'], modalities: ['Escolarizado'] },
    { name: 'Física Biomédica', officialCode: '134', campuses: ['Facultad de Ciencias'], modalities: ['Escolarizado'] },
    { name: 'Geociencias', officialCode: '131', campuses: ['ENES Morelia'], modalities: ['Escolarizado'] },
    { name: 'Ingeniería Aeroespacial', officialCode: '139', campuses: ['ENES Juriquilla', 'Facultad de Ingeniería'], modalities: ['Escolarizado'] },
    { name: 'Ingeniería Ambiental', officialCode: '137', campuses: ['Facultad de Ingeniería'], modalities: ['Escolarizado'] },
    { name: 'Ingeniería Civil', officialCode: '107', campuses: ['Facultad de Ingeniería', 'FES Acatlán', 'FES Aragón'], modalities: ['Escolarizado'] },
    { name: 'Ingeniería Eléctrica Electrónica', officialCode: '109', campuses: ['Facultad de Ingeniería', 'FES Aragón'], modalities: ['Escolarizado'] },
    { name: 'Ingeniería Geofísica', officialCode: '112', campuses: ['Facultad de Ingeniería'], modalities: ['Escolarizado'] },
    { name: 'Ingeniería Geológica', officialCode: '113', campuses: ['Facultad de Ingeniería'], modalities: ['Escolarizado'] },
    { name: 'Ingeniería Geomática', officialCode: '120', campuses: ['Facultad de Ingeniería'], modalities: ['Escolarizado'] },
    { name: 'Ingeniería Industrial', officialCode: '114', campuses: ['Facultad de Ingeniería', 'FES Aragón', 'FES Cuautitlán'], modalities: ['Escolarizado'] },
    { name: 'Ingeniería Mecatrónica', officialCode: '124', campuses: ['Facultad de Ingeniería'], modalities: ['Escolarizado'] },
    { name: 'Ingeniería Mecánica', officialCode: '115', campuses: ['Facultad de Ingeniería', 'FES Aragón'], modalities: ['Escolarizado'] },
    { name: 'Ingeniería Mecánica Eléctrica', officialCode: '116', campuses: ['FES Cuautitlán'], modalities: ['Escolarizado'] },
    { name: 'Ingeniería Petrolera', officialCode: '117', campuses: ['Facultad de Ingeniería'], modalities: ['Escolarizado'] },
    { name: 'Ingeniería Química', officialCode: '118', campuses: ['Facultad de Química', 'FES Cuautitlán', 'FES Zaragoza'], modalities: ['Escolarizado'] },
    { name: 'Ingeniería Química Metalúrgica', officialCode: '119', campuses: ['Facultad de Química'], modalities: ['Escolarizado'] },
    { name: 'Ingeniería de Minas y Metalurgia', officialCode: '108', campuses: ['Facultad de Ingeniería'], modalities: ['Escolarizado'] },
    { name: 'Ingeniería en Computación', officialCode: '110', campuses: ['ENES Juriquilla', 'ENES Mérida', 'Facultad de Ingeniería', 'FES Aragón'], modalities: ['Escolarizado'] },
    { name: 'Ingeniería en Energías Renovables', officialCode: '128', campuses: ['ENES Juriquilla', 'Instituto de Energías Renovables'], modalities: ['Escolarizado'] },
    { name: 'Ingeniería en Sistemas Biomédicos', officialCode: '135', campuses: ['Facultad de Ingeniería'], modalities: ['Escolarizado'] },
    { name: 'Ingeniería en Telecomunicaciones', officialCode: '111', campuses: ['Facultad de Ingeniería'], modalities: ['Escolarizado'] },
    { name: 'Ingeniería en Telecomunicaciones, Sistemas y Electrónica', officialCode: '130', campuses: ['FES Cuautitlán'], modalities: ['Escolarizado'] },
    { name: 'Matemáticas', officialCode: '122', campuses: ['Facultad de Ciencias'], modalities: ['Escolarizado'] },
    { name: 'Matemáticas Aplicadas', officialCode: '136', campuses: ['Facultad de Ciencias'], modalities: ['Escolarizado'] },
    { name: 'Matemáticas Aplicadas y Computación', officialCode: '121', campuses: ['FES Acatlán'], modalities: ['Escolarizado'] },
    { name: 'Matemáticas para el Desarrollo', officialCode: '140', campuses: ['ENES Juriquilla'], modalities: ['Escolarizado'] },
    { name: 'Nanotecnología', officialCode: '129', campuses: ['Centro de Nanociencias y Nanotecnología. Ensenada, B. C.'], modalities: ['Escolarizado'] },
    { name: 'Tecnología', officialCode: '126', campuses: ['ENES Juriquilla', 'FES Cuautitlán'], modalities: ['Escolarizado'] },
    { name: 'Tecnologías para la Información en Ciencias', officialCode: '132', campuses: ['ENES Morelia'], modalities: ['Escolarizado'] },
    { name: 'Urbanismo', officialCode: '123', campuses: ['Facultad de Arquitectura'], modalities: ['Escolarizado'] },
  ],
  AREA_2: [
    { name: 'Biología', officialCode: '201', campuses: ['ENES Mérida', 'Facultad de Ciencias', 'FES Iztacala', 'FES Zaragoza', 'FES Zaragoza Campus 3 Tlaxcala'], modalities: ['Escolarizado'] },
    { name: 'Bioquímica Diagnóstica', officialCode: '218', campuses: ['FES Cuautitlán'], modalities: ['Escolarizado'] },
    { name: 'Ciencia Forense', officialCode: '224', campuses: ['Esc. Nacional de Ciencias Forenses'], modalities: ['Escolarizado'] },
    { name: 'Ciencia de la Nutrición Humana', officialCode: '231', campuses: ['Facultad de Medicina'], modalities: ['Escolarizado'] },
    { name: 'Ciencias Agroforestales', officialCode: '230', campuses: ['ENES Morelia'], modalities: ['Escolarizado'] },
    { name: 'Ciencias Agrogenómicas', officialCode: '223', campuses: ['ENES León'], modalities: ['Escolarizado'] },
    { name: 'Ciencias Ambientales', officialCode: '216', campuses: ['ENES Mérida', 'ENES Morelia'], modalities: ['Escolarizado'] },
    { name: 'Ciencias Genómicas', officialCode: '215', campuses: ['Centro de Ciencias Genómicas', 'ENES Juriquilla'], modalities: ['Escolarizado'] },
    { name: 'Cirujano Dentista', officialCode: '202', campuses: ['Facultad de Odontología', 'FES Iztacala', 'FES Zaragoza'], modalities: ['Escolarizado'] },
    { name: 'Ecología', officialCode: '225', campuses: ['ENES Mérida', 'ENES Morelia', 'FES Iztacala'], modalities: ['Escolarizado'] },
    { name: 'Enfermería', officialCode: '220', campuses: ['Escuela Nacional de Enfermería y Obstetricia', 'FES Iztacala', 'FES Zaragoza', 'FES Zaragoza Campus 3 Tlaxcala'], modalities: ['Escolarizado', 'Abierto'] },
    { name: 'Enfermería y Obstetricia', officialCode: '203', campuses: ['Escuela Nacional de Enfermería y Obstetricia'], modalities: ['Escolarizado', 'Abierto'] },
    { name: 'Farmacia', officialCode: '219', campuses: ['FES Cuautitlán'], modalities: ['Escolarizado'] },
    { name: 'Fisioterapia', officialCode: '221', campuses: ['ENES León', 'Facultad de Medicina'], modalities: ['Escolarizado'] },
    { name: 'Ingeniería Agrícola', officialCode: '204', campuses: ['FES Cuautitlán'], modalities: ['Escolarizado'] },
    { name: 'Ingeniería en Alimentos', officialCode: '205', campuses: ['FES Cuautitlán'], modalities: ['Escolarizado'] },
    { name: 'Investigación Biomédica Básica', officialCode: '206', campuses: ['Facultad de Medicina'], modalities: ['Escolarizado'] },
    { name: 'Manejo Sustentable de Zonas Costeras', officialCode: '217', campuses: ['ENES Mérida'], modalities: ['Escolarizado'] },
    { name: 'Medicina Veterinaria y Zootecnia', officialCode: '207', campuses: ['Facultad de Medicina Veterinaria y Zootecnia', 'FES Cuautitlán'], modalities: ['Escolarizado'] },
    { name: 'Médico Cirujano', officialCode: '208', campuses: ['Facultad de Medicina', 'FES Iztacala', 'FES Zaragoza'], modalities: ['Escolarizado'] },
    { name: 'Neurociencias', officialCode: '226', campuses: ['ENES Juriquilla', 'Facultad de Medicina'], modalities: ['Escolarizado'] },
    { name: 'Nutriología', officialCode: '227', campuses: ['FES Zaragoza'], modalities: ['Escolarizado'] },
    { name: 'Odontología', officialCode: '222', campuses: ['ENES León'], modalities: ['Escolarizado'] },
    { name: 'Optometría', officialCode: '209', campuses: ['ENES León', 'FES Iztacala'], modalities: ['Escolarizado'] },
    { name: 'Psicología', officialCode: '210', campuses: ['ENES Juriquilla', 'Facultad de Psicología', 'FES Iztacala', 'FES Zaragoza', 'FES Zaragoza Campus 3 Tlaxcala'], modalities: ['Escolarizado', 'Abierto', 'A distancia'] },
    { name: 'Química', officialCode: '211', campuses: ['Facultad de Química', 'FES Cuautitlán'], modalities: ['Escolarizado'] },
    { name: 'Química Farmacéutico Biológica', officialCode: '213', campuses: ['Facultad de Química', 'FES Zaragoza'], modalities: ['Escolarizado'] },
    { name: 'Química Industrial', officialCode: '214', campuses: ['FES Cuautitlán'], modalities: ['Escolarizado'] },
    { name: 'Química de Alimentos', officialCode: '212', campuses: ['Facultad de Química'], modalities: ['Escolarizado'] },
    { name: 'Química e Ingeniería en Materiales', officialCode: '229', campuses: ['Facultad de Química'], modalities: ['Escolarizado'] },
    { name: 'Órtesis y Prótesis', officialCode: '228', campuses: ['ENES Juriquilla'], modalities: ['Escolarizado'] },
  ],
  AREA_3: [
    { name: 'Administración', officialCode: '301', campuses: ['ENES Morelia', 'ENES Unidad Oaxaca', 'Facultad de Contaduría y Administración', 'FES Cuautitlán'], modalities: ['Escolarizado', 'Abierto', 'A distancia'] },
    { name: 'Administración Agropecuaria', officialCode: '314', campuses: ['ENES León'], modalities: ['Escolarizado'] },
    { name: 'Antropología', officialCode: '319', campuses: ['Facultad de Ciencias Políticas y Sociales'], modalities: ['Escolarizado'] },
    { name: 'Ciencias Políticas y Administración Pública', officialCode: '303', campuses: ['Facultad de Ciencias Políticas y Sociales', 'FES Acatlán'], modalities: ['Escolarizado', 'Abierto', 'A distancia'] },
    { name: 'Ciencias de la Comunicación', officialCode: '302', campuses: ['Facultad de Ciencias Políticas y Sociales'], modalities: ['Escolarizado', 'Abierto', 'A distancia'] },
    { name: 'Comunicación', officialCode: '315', campuses: ['ENES León', 'FES Acatlán'], modalities: ['Escolarizado'] },
    { name: 'Comunicación y Periodismo', officialCode: '316', campuses: ['FES Aragón'], modalities: ['Escolarizado'] },
    { name: 'Contaduría', officialCode: '304', campuses: ['ENES Unidad Oaxaca', 'Facultad de Contaduría y Administración', 'FES Cuautitlán'], modalities: ['Escolarizado', 'Abierto', 'A distancia'] },
    { name: 'Derecho', officialCode: '305', campuses: ['ENES Morelia', 'Facultad de Derecho', 'FES Acatlán', 'FES Aragón'], modalities: ['Escolarizado', 'Abierto', 'A distancia'] },
    { name: 'Desarrollo Comunitario para el Envejecimiento', officialCode: '318', campuses: ['FES Zaragoza', 'FES Zaragoza Campus 3 Tlaxcala'], modalities: ['Escolarizado'] },
    { name: 'Desarrollo Territorial', officialCode: '320', campuses: ['ENES León'], modalities: ['Escolarizado'] },
    { name: 'Economía', officialCode: '306', campuses: ['Facultad de Economía', 'FES Acatlán', 'FES Aragón'], modalities: ['Escolarizado', 'Abierto', 'A distancia'] },
    { name: 'Economía Industrial', officialCode: '313', campuses: ['ENES León'], modalities: ['Escolarizado'] },
    { name: 'Estudios Sociales y Gestión Local', officialCode: '317', campuses: ['ENES Morelia'], modalities: ['Escolarizado'] },
    { name: 'Geografía', officialCode: '307', campuses: ['Facultad de Filosofía y Letras'], modalities: ['Escolarizado', 'Abierto'] },
    { name: 'Geografía Aplicada', officialCode: '322', campuses: ['ENES Mérida', 'Esc. Nacional de Ciencias de la Tierra'], modalities: ['Escolarizado'] },
    { name: 'Informática', officialCode: '308', campuses: ['ENES Unidad Oaxaca', 'Facultad de Contaduría y Administración', 'FES Cuautitlán'], modalities: ['Escolarizado', 'Abierto', 'A distancia'] },
    { name: 'Negocios Internacionales', officialCode: '321', campuses: ['ENES Juriquilla', 'ENES Unidad Oaxaca', 'Facultad de Contaduría y Administración'], modalities: ['Escolarizado'] },
    { name: 'Planificación para el Desarrollo Agropecuario', officialCode: '309', campuses: ['FES Aragón'], modalities: ['Escolarizado'] },
    { name: 'Relaciones Internacionales', officialCode: '310', campuses: ['ENES León', 'Facultad de Ciencias Políticas y Sociales', 'FES Acatlán', 'FES Aragón'], modalities: ['Escolarizado', 'Abierto', 'A distancia'] },
    { name: 'Sociología', officialCode: '311', campuses: ['Facultad de Ciencias Políticas y Sociales', 'FES Acatlán', 'FES Aragón'], modalities: ['Escolarizado', 'Abierto', 'A distancia'] },
    { name: 'Sociología Aplicada', officialCode: '324', campuses: ['ENES Mérida'], modalities: ['Escolarizado'] },
    { name: 'Trabajo Social', officialCode: '312', campuses: ['Facultad de Trabajo Social'], modalities: ['Escolarizado', 'Abierto', 'A distancia'] },
    { name: 'Turismo y Desarrollo Sostenible', officialCode: '323', campuses: ['ENES León'], modalities: ['Escolarizado'] },
  ],
  AREA_4: [
    { name: 'Administración de Archivos y Gestión Documental', officialCode: '437', campuses: ['ENES Morelia', 'Facultad de Filosofía y Letras'], modalities: ['Escolarizado', 'A distancia'] },
    { name: 'Arte y Diseño', officialCode: '434', campuses: ['ENES Morelia', 'Facultad de Artes y Diseño', 'Facultad de Artes y Diseño, Taxco, Gro.'], modalities: ['Escolarizado'] },
    { name: 'Artes Visuales', officialCode: '401', campuses: ['Facultad de Artes y Diseño', 'Facultad de Artes y Diseño, Taxco, Gro.'], modalities: ['Escolarizado'] },
    { name: 'Bibliotecología y Estudios de la Información', officialCode: '402', campuses: ['Facultad de Filosofía y Letras'], modalities: ['Escolarizado', 'A distancia'] },
    { name: 'Canto', officialCode: '403', campuses: ['Facultad de Música'], modalities: ['Escolarizado'] },
    { name: 'Cinematografía', officialCode: '435', campuses: ['Esc. Nacional de Artes Cinematográficas'], modalities: ['Escolarizado'] },
    { name: 'Composición', officialCode: '404', campuses: ['Facultad de Música'], modalities: ['Escolarizado'] },
    { name: 'Desarrollo y Gestión Interculturales', officialCode: '429', campuses: ['ENES León', 'ENES Mérida', 'Facultad de Filosofía y Letras'], modalities: ['Escolarizado'] },
    { name: 'Diseño Gráfico', officialCode: '406', campuses: ['FES Acatlán'], modalities: ['Escolarizado'] },
    { name: 'Diseño y Comunicación Visual', officialCode: '405', campuses: ['Facultad de Artes y Diseño', 'FES Cuautitlán'], modalities: ['Escolarizado', 'A distancia'] },
    { name: 'Educación Musical', officialCode: '407', campuses: ['Facultad de Música'], modalities: ['Escolarizado'] },
    { name: 'Enseñanza de Inglés', officialCode: '408', campuses: ['FES Acatlán'], modalities: ['Escolarizado'] },
    { name: 'Estudios Latinoamericanos', officialCode: '409', campuses: ['Facultad de Filosofía y Letras'], modalities: ['Escolarizado'] },
    { name: 'Etnomusicología', officialCode: '410', campuses: ['Facultad de Música'], modalities: ['Escolarizado'] },
    { name: 'Filosofía', officialCode: '411', campuses: ['Facultad de Filosofía y Letras', 'FES Acatlán'], modalities: ['Escolarizado', 'Abierto'] },
    { name: 'Geohistoria', officialCode: '431', campuses: ['ENES Morelia'], modalities: ['Escolarizado'] },
    { name: 'Historia', officialCode: '412', campuses: ['ENES Unidad Oaxaca', 'Facultad de Filosofía y Letras', 'FES Acatlán'], modalities: ['Escolarizado', 'Abierto'] },
    { name: 'Historia del Arte', officialCode: '433', campuses: ['ENES Morelia'], modalities: ['Escolarizado'] },
    { name: 'Instrumentista', officialCode: '413', campuses: ['Facultad de Música'], modalities: ['Escolarizado'] },
    { name: 'Lengua y Literaturas Hispánicas', officialCode: '414', campuses: ['Facultad de Filosofía y Letras', 'FES Acatlán'], modalities: ['Escolarizado', 'Abierto'] },
    { name: 'Lengua y Literaturas Modernas Alemanas', officialCode: '415', campuses: ['Facultad de Filosofía y Letras'], modalities: ['Escolarizado'] },
    { name: 'Lengua y Literaturas Modernas Francesas', officialCode: '416', campuses: ['Facultad de Filosofía y Letras'], modalities: ['Escolarizado'] },
    { name: 'Lengua y Literaturas Modernas Inglesas', officialCode: '417', campuses: ['Facultad de Filosofía y Letras'], modalities: ['Escolarizado', 'Abierto'] },
    { name: 'Lengua y Literaturas Modernas Italianas', officialCode: '418', campuses: ['Facultad de Filosofía y Letras'], modalities: ['Escolarizado'] },
    { name: 'Lengua y Literaturas Modernas Portuguesas', officialCode: '430', campuses: ['Facultad de Filosofía y Letras'], modalities: ['Escolarizado'] },
    { name: 'Letras Clásicas', officialCode: '419', campuses: ['Facultad de Filosofía y Letras'], modalities: ['Escolarizado'] },
    { name: 'Lingüística Aplicada', officialCode: '439', campuses: ['Escuela Nacional de Lenguas, Lingüística y Traducción'], modalities: ['Escolarizado'] },
    { name: 'Literatura Dramática y Teatro', officialCode: '420', campuses: ['Facultad de Filosofía y Letras'], modalities: ['Escolarizado'] },
    { name: 'Literatura Intercultural', officialCode: '432', campuses: ['ENES Morelia'], modalities: ['Escolarizado'] },
    { name: 'Música y Tecnología Artística', officialCode: '438', campuses: ['ENES Morelia'], modalities: ['Escolarizado'] },
    { name: 'Pedagogía', officialCode: '421', campuses: ['Facultad de Filosofía y Letras', 'FES Acatlán', 'FES Aragón'], modalities: ['Escolarizado', 'Abierto', 'A distancia'] },
    { name: 'Piano', officialCode: '422', campuses: ['Facultad de Música'], modalities: ['Escolarizado'] },
    { name: 'Teatro y Actuación', officialCode: '436', campuses: ['Centro Universitario de Teatro'], modalities: ['Escolarizado'] },
    { name: 'Traducción', officialCode: '440', campuses: ['ENES León', 'Escuela Nacional de Lenguas, Lingüística y Traducción'], modalities: ['Escolarizado'] },
  ],
};

export const IPN_CAREERS: Record<IpnAreaCode, readonly CatalogCareer[]> = {
  IPN_FISMAT: [
    { name: 'Ingeniero Arquitecto', campuses: ['ESIA Unidad Tecamachalco'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería Aeronáutica', campuses: ['ESIME Unidad Ticomán', 'UPIIG Campus Guanajuato'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería Ambiental', campuses: ['UPIBI', 'UPIIZ Campus Zacatecas'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería Biomédica', campuses: ['UPIBI'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería Bioquímica', campuses: ['ENCB'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería Biotecnológica', campuses: ['UPIBI', 'UPIIG Campus Guanajuato', 'UPIIP Campus Palenque', 'UPIIT Campus Tlaxcala'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería Biónica', campuses: ['UPIITA'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería Civil', campuses: ['ESIA Unidad Zacatenco', 'UPIIP Campus Palenque'], modalities: ['Escolarizada'], formerNames: ['Ingeniería Civil (ESIA)'] },
    { name: 'Ingeniería Eléctrica', campuses: ['ESIME Unidad Zacatenco'], modalities: ['Escolarizada'], formerNames: ['Ingeniería Eléctrica (ESIME)'] },
    { name: 'Ingeniería Farmacéutica', campuses: ['UPIBI', 'UPIIG Campus Guanajuato'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería Ferroviaria', campuses: ['UPIIP Campus Palenque', 'UPIICSA'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería Fotónica', campuses: ['ESIME Unidad Zacatenco'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería Geofísica', campuses: ['ESIA Unidad Ticomán'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería Geológica', campuses: ['ESIA Unidad Ticomán'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería Industrial', campuses: ['UPIIG Campus Guanajuato', 'UPIIT Campus Tlaxcala', 'UPIICSA'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería Matemática', campuses: ['ESFM'], modalities: ['Escolarizada'], formerNames: ['Ingeniería Matemática (ESFM)'] },
    { name: 'Ingeniería Mecatrónica', campuses: ['UPIIZ Campus Zacatecas', 'UPIIH Campus Hidalgo', 'UPIITA'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería Mecánica', campuses: ['ESIME Unidad Azcapotzalco', 'ESIME Unidad Culhuacán'], modalities: ['Escolarizada'], formerNames: ['Ingeniería Mecánica (ESIME)'] },
    { name: 'Ingeniería Metalúrgica', campuses: ['UPIIZ Campus Zacatecas'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería Petrolera', campuses: ['ESIA Unidad Ticomán'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería Química Industrial', campuses: ['ESIQIE'], modalities: ['Escolarizada'], formerNames: ['Ingeniería Química (ESIQIE)'] },
    { name: 'Ingeniería Química Petrolera', campuses: ['ESIQIE'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería Telemática', campuses: ['UPIITA'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería Textil', campuses: ['ESIT'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería Topográfica y Fotogramétrica', campuses: ['ESIA Unidad Ticomán'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería en Alimentos', campuses: ['UPIBI', 'UPIIZ Campus Zacatecas'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería en Computación', campuses: ['ESIME Unidad Culhuacán'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería en Comunicaciones y Electrónica', campuses: ['ESIME Unidad Zacatenco', 'ESIME Unidad Culhuacán'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería en Control y Automatización', campuses: ['ESIME Unidad Zacatenco'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería en Energía', campuses: ['UPIITA'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería en Informática', campuses: ['UPIICSA'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería en Inteligencia Artificial', campuses: ['ESCOM', 'UPIIZ Campus Zacatecas', 'UPIIT Campus Tlaxcala'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería en Metalurgia y Materiales', campuses: ['ESIQIE'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería en Meteorología', campuses: ['ESIA Unidad Ticomán'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería en Movilidad Urbana', campuses: ['UPIEM'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería en Negocios Energéticos Sustentables', campuses: ['UPIEM'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería en Robótica Industrial', campuses: ['ESIME Unidad Azcapotzalco'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería en Sistemas Ambientales', campuses: ['ENCB'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería en Sistemas Automotrices', campuses: ['ESIME Unidad Zacatenco', 'ESIME Unidad Azcapotzalco', 'ESIME Unidad Culhuacán', 'ESIME Unidad Ticomán', 'UPIIG Campus Guanajuato', 'UPIIH Campus Hidalgo', 'UPIIT Campus Tlaxcala'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería en Sistemas Computacionales', campuses: ['ESCOM', 'UPIIZ Campus Zacatecas'], modalities: ['Escolarizada'], formerNames: ['Ingeniería en Sistemas Computacionales (ESCOM)'] },
    { name: 'Ingeniería en Sistemas Energéticos y Redes Inteligentes', campuses: ['UPIEM'], modalities: ['Escolarizada'] },
    { name: 'Ingeniería en Transporte', campuses: ['UPIIT Campus Tlaxcala', 'UPIICSA'], modalities: ['Escolarizada'] },
    { name: 'Licenciatura en Ciencia de Datos', campuses: ['ESCOM', 'UPIIT Campus Tlaxcala'], modalities: ['Escolarizada'] },
    { name: 'Licenciatura en Ciencias de la Informática', campuses: ['UPIICSA'], modalities: ['Escolarizada'] },
    { name: 'Licenciatura en Física y Matemáticas', campuses: ['ESFM'], modalities: ['Escolarizada'], formerNames: ['Licenciatura en Física y Matemáticas (ESFM)'] },
    { name: 'Licenciatura en Matemática Algorítmica', campuses: ['ESFM'], modalities: ['Escolarizada'] },
  ],
  IPN_MEDBIO: [
    { name: 'Licenciatura en Biología', campuses: ['ENCB'], modalities: ['Escolarizada'], formerNames: ['Licenciatura en Biología (ENCB)'] },
    { name: 'Licenciatura en Enfermería', campuses: ['CICS Unidad Milpa Alta', 'ESEO'], modalities: ['Escolarizada'] },
    { name: 'Licenciatura en Enfermería y Obstetricia', campuses: ['ESEO'], modalities: ['Escolarizada'], formerNames: ['Licenciatura en Enfermería y Obstetricia (ESEO)'] },
    { name: 'Licenciatura en Nutrición', campuses: ['CICS Unidad Milpa Alta'], modalities: ['Escolarizada'] },
    { name: 'Licenciatura en Odontología', campuses: ['CICS Unidad Santo Tomás', 'CICS Unidad Milpa Alta'], modalities: ['Escolarizada'], formerNames: ['Licenciatura en Odontología (CICS)'] },
    { name: 'Licenciatura en Optometría', campuses: ['CICS Unidad Santo Tomás', 'CICS Unidad Milpa Alta'], modalities: ['Escolarizada'] },
    { name: 'Licenciatura en Psicología', campuses: ['CICS Unidad Santo Tomás'], modalities: ['Escolarizada'], formerNames: ['Licenciatura en Psicología (CICS)'] },
    { name: 'Licenciatura en Trabajo Social', campuses: ['CICS Unidad Milpa Alta'], modalities: ['Escolarizada'] },
    { name: 'Médico Cirujano Homeópata', campuses: ['ENMyH'], modalities: ['Escolarizada'] },
    { name: 'Médico Cirujano Partero', campuses: ['CICS Unidad Milpa Alta', 'ENMyH', 'ESM'], modalities: ['Escolarizada'], formerNames: ['Médico Cirujano y Partero (ESM)'] },
    { name: 'Químico Bacteriólogo y Parasitólogo', campuses: ['ENCB'], modalities: ['Escolarizada'] },
    { name: 'Químico Farmacéutico Industrial', campuses: ['ENCB'], modalities: ['Escolarizada'], formerNames: ['Químico Farmacéutico Industrial (ENCB)'] },
  ],
  IPN_SOCADM: [
    { name: 'Contador Público', campuses: ['ESCA Unidad Santo Tomás', 'ESCA Unidad Tepepan'], modalities: ['Escolarizada', 'No escolarizada'], formerNames: ['Contabilidad (CIMA)'] },
    { name: 'Licenciatura en Administración Industrial', campuses: ['UPIICSA'], modalities: ['Escolarizada'], formerNames: ['Administración (CIMA)'] },
    { name: 'Licenciatura en Administración y Desarrollo Empresarial', campuses: ['ESCA Unidad Santo Tomás'], modalities: ['Escolarizada', 'No escolarizada'] },
    { name: 'Licenciatura en Archivonomía', campuses: ['ENBA'], modalities: ['Escolarizada', 'No escolarizada'] },
    { name: 'Licenciatura en Biblioteconomía', campuses: ['ENBA'], modalities: ['Escolarizada', 'No escolarizada'] },
    { name: 'Licenciatura en Comercio Internacional', campuses: ['ESCA Unidad Santo Tomás'], modalities: ['No escolarizada'] },
    { name: 'Licenciatura en Contaduría y Finanzas Públicas', campuses: ['ESCA Unidad Tepepan'], modalities: ['No escolarizada'] },
    { name: 'Licenciatura en Economía', campuses: ['ESE'], modalities: ['Escolarizada'], formerNames: ['Economía (CICS)'] },
    { name: 'Licenciatura en Mercadotecnia Digital', campuses: ['ESCA Unidad Santo Tomás'], modalities: ['Escolarizada'] },
    { name: 'Licenciatura en Negocios Digitales', campuses: ['ESCA Unidad Santo Tomás'], modalities: ['Escolarizada'] },
    { name: 'Licenciatura en Negocios Internacionales', campuses: ['ESCA Unidad Santo Tomás', 'ESCA Unidad Tepepan'], modalities: ['Escolarizada', 'No escolarizada'], formerNames: ['Comercio Internacional (CIMA)'] },
    { name: 'Licenciatura en Relaciones Comerciales', campuses: ['ESCA Unidad Santo Tomás', 'ESCA Unidad Tepepan'], modalities: ['Escolarizada', 'No escolarizada'] },
    { name: 'Licenciatura en Turismo', campuses: ['EST'], modalities: ['Escolarizada'], formerNames: ['Turismo (CIMA)'] },
    { name: 'Licenciatura en Turismo Sustentable', campuses: ['UPIIP Campus Palenque'], modalities: ['Escolarizada'] },
  ],
};

const ALL: Record<CatalogAreaCode, readonly CatalogCareer[]> = { ...UNAM_CAREERS, ...IPN_CAREERS };

/** Catálogo de un área por su código (`areas.code`), o `null` si no tiene. */
export function catalogForArea(areaCode: string): readonly CatalogCareer[] | null {
  return (ALL as Record<string, readonly CatalogCareer[]>)[areaCode] ?? null;
}

/**
 * Planteles de una carrera para mostrarlos junto al nombre. Por nombre y área
 * porque la tabla `careers` no guarda planteles (no se toca el schema sin
 * instrucción); un nombre que no esté en el catálogo devuelve lista vacía y la
 * interfaz simplemente no muestra la línea.
 */
export function campusesFor(areaCode: string, careerName: string): readonly string[] {
  return catalogForArea(areaCode)?.find((c) => c.name === careerName)?.campuses ?? [];
}

/** Modalidades distintas de la presencial, para avisarlas en la interfaz. */
export function nonDefaultModalities(areaCode: string, careerName: string): readonly string[] {
  const career = catalogForArea(areaCode)?.find((c) => c.name === careerName);
  return career?.modalities.filter((m) => m !== 'Escolarizado' && m !== 'Escolarizada') ?? [];
}
