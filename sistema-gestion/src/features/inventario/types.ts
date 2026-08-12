export interface ModeloSpecs {
  modeloId: string;
  nombre: string;
  marca: string;
  tipo: 'Laptop' | 'Monitor' | 'Servidor' | 'Periferico' | 'Desktop' | 'Impresora';
  specsRequeridas: Record<string, string>;
}

export type EstadoInspeccion = 'pendiente_revision' | 'cuarentena_tecnica' | 'en_proceso' | 'completada';
export type ResultadoInspeccion = 'conforme' | 'conforme_observaciones' | 'no_conforme';
export type DisposicionFinal = 'liberacion' | 'retencion' | 'rechazo';
export type TipoHallazgo = 'documental' | 'fisico' | 'tecnico' | 'accesorio_faltante';
export type SeveridadHallazgo = 'baja' | 'media' | 'alta' | 'critica';

export type EstadoDocumentalIngreso = 'con_documento' | 'pendiente_validacion';

export interface IngresoEquipo {
  id: string;
  folio: string;
  fecha: string;
  origen: 'proveedor' | 'interno' | 'donacion' | 'cliente' | 'otro';
  proveedor: string;
  cantidad: number;
  documentoReferencia: string;
  estadoDocumental: EstadoDocumentalIngreso;
  tipoEquipo: string;
  modelo: string;
  numeroParte: string;
  numeroSerie: string;
  estadoFisico: 'Nuevo' | 'Usado - Bueno' | 'Usado - Danado';
  observaciones: string;
  registradoPor: string;
  fechaRegistro?: string;
}

export interface DocumentacionValidacion {
  fichaTecnica: boolean;
  manuales: boolean;
  certificados: boolean;
  etiquetas: boolean;
  documentoReferencia: boolean;
  coincidenciaDatosClave?: {
    marca: boolean;
    modelo: boolean;
    numeroParte: boolean;
    numeroSerie: boolean;
  };
  resultado: 'completa' | 'incompleta' | 'con_discrepancias' | 'no_proporcionada' | '';
  observaciones: string;
}

export interface InspeccionFisica {
  condicionGeneral: 'sin_dano' | 'con_observaciones' | 'con_dano' | '';
  empaqueEstado?: string;
  placaIdentificacion?: boolean;
  accesoriosFaltantes?: string;
  serialesVisibles: string;
  observaciones: string;
}

export interface Hallazgo {
  id: string;
  tipo: TipoHallazgo;
  severidad: SeveridadHallazgo;
  pasoAsociado: string;
  descripcion: string;
  origen: string;
  registradoPor: string;
  fechaRegistro?: string;
}

export interface Evidencia {
  id: string;
  nombre: string;
  tipo: string;
  contenido: string;
  tamano: number;
  hallazgoId?: string;
  etapa: string;
  registradoPor: string;
  fechaRegistro?: string;
}

export interface DevolucionHistorial {
  fecha: string;
  usuario: string;
  motivo: string;
}

export interface Inspeccion {
  id: string;
  ingresoId: string;
  folio: string;
  estado: EstadoInspeccion;
  documentacion: DocumentacionValidacion;
  inspeccionFisica: InspeccionFisica;
  verificacionTecnica: Record<string, { valor: string; estado: 'verificado' | 'pendiente' | 'no_aplica' }>;
  verificacionTecnicaConfirmada?: boolean;
  checklistFisico: boolean[];
  hallazgos: Hallazgo[];
  evidencias: Evidencia[];
  resultado: ResultadoInspeccion | '';
  comentarioFinal: string;
  disposicion: DisposicionFinal | '';
  justificacionDisposicion: string;
  historialDevoluciones?: DevolucionHistorial[];
  fechaCierre: string | null;
  creadoPor: string;
  fechaCreacion: string;
}

export const MODELOS_CATALOGO: ModeloSpecs[] = [
  {
    modeloId: 'dell-xps-13',
    nombre: 'Dell XPS 13 9310',
    marca: 'Dell',
    tipo: 'Laptop',
    specsRequeridas: {
      procesador: 'Intel Core i7-1185G7',
      ram: '16 GB',
      almacenamiento: '512 GB SSD NVMe',
      pantalla: '13.4" FHD+ (1920 x 1200)'
    }
  },
  {
    modeloId: 'macbook-pro-14',
    nombre: 'MacBook Pro 14" M1 Pro',
    marca: 'Apple',
    tipo: 'Laptop',
    specsRequeridas: {
      procesador: 'Apple M1 Pro (10-core)',
      ram: '16 GB',
      almacenamiento: '512 GB SSD',
      pantalla: '14.2" Liquid Retina XDR'
    }
  },
  {
    modeloId: 'hp-elitebook-840',
    nombre: 'EliteBook 840 G8',
    marca: 'HP',
    tipo: 'Laptop',
    specsRequeridas: {
      procesador: 'Intel Core i5-1135G7',
      ram: '8 GB',
      almacenamiento: '256 GB SSD NVMe',
      pantalla: '14" FHD (1920 x 1080)'
    }
  },
  {
    modeloId: 'dell-optiplex-7090',
    nombre: 'OptiPlex 7090',
    marca: 'Dell',
    tipo: 'Desktop',
    specsRequeridas: {
      procesador: 'Intel Core i5-11500',
      ram: '16 GB',
      almacenamiento: '512 GB SSD',
      pantalla: 'No aplica (torre)'
    }
  }
];

export const MAPA_CHECKLIST_POR_TIPO: Record<string, string[]> = {
  laptop: [
    'Carcasa sin golpes ni rayones significativos',
    'Bisagras y ensambles firmes',
    'Puertos y conectores funcionales',
    'Teclado y touchpad operativos',
    'Pantalla sin pixeles muertos',
    'Bateria con carga funcional',
    'Etiquetas de inventario legibles',
    'Accesorios incluidos (cargador, cable)'
  ],
  desktop: [
    'Torre sin golpes ni abolladuras',
    'Puertos USB y de video funcionales',
    'Fuente de poder operativa',
    'Discos y memorias reconocidos',
    'Ventiladores funcionando',
    'Etiquetas de inventario legibles',
    'Cable de corriente incluido'
  ],
  monitor: [
    'Carcasa sin golpes ni rayones',
    'Pantalla sin pixeles muertos ni lineas',
    'Puertos de video funcionales',
    'Fuente de alimentacion operativa',
    'Base y soporte firmes',
    'Cable de corriente y de video incluidos'
  ],
  impresora: [
    'Carcasa sin danos visibles',
    'Bandejas de papel funcionales',
    'Cabezales/toner reconocidos',
    'Cable de corriente y USB incluidos',
    'Prueba de impresion OK'
  ],
  otro: [
    'Carcasa sin danos visibles',
    'Conectores y puertos funcionales',
    'Accesorios incluidos',
    'Etiquetas de inventario legibles'
  ]
};

export const CHECKLIST_FISICO_BASE: string[] = [
  'Carcasa sin golpes ni rayones significativos',
  'Bisagras y ensambles firmes',
  'Puertos y conectores funcionales',
  'Teclado / botones operativos',
  'Pantalla sin pixeles muertos',
  'Bateria con carga funcional',
  'Etiquetas de inventario legibles',
  'Accesorios incluidos (cargador, cable)'
];

export const ESTADO_LABELS: Record<string, string> = {
  pendiente_revision: 'Pendiente',
  cuarentena_tecnica: 'Cuarentena',
  en_proceso: 'En proceso',
  completada: 'Completada'
};

export const RESULTADO_LABELS: Record<string, string> = {
  conforme: 'Conforme',
  conforme_observaciones: 'Conforme (obs.)',
  no_conforme: 'No conforme'
};

export const PLANTILLA_GENERICA_SPECS: Record<string, Record<string, string>> = {
  laptop: {
    procesador: 'CPU Estándar',
    ram: 'Memoria RAM',
    almacenamiento: 'Disco / SSD',
    pantalla: 'Pantalla Integrada',
    puertos: 'Puertos de E/S',
    conectividad: 'Wi-Fi / Ethernet'
  },
  desktop: {
    procesador: 'CPU Estándar',
    ram: 'Memoria RAM',
    almacenamiento: 'Disco / SSD',
    graficos: 'Tarjeta de Video',
    puertos: 'Puertos de E/S',
    fuentePoder: 'Fuente de Poder'
  },
  monitor: {
    pantalla: 'Tamaño y Panel',
    resolucion: 'Resolución de Video',
    puertos: 'Puertos HDMI/DP/VGA',
    alimentacion: 'Fuente / Adaptador'
  },
  impresora: {
    tecnologia: 'Laser / Inyección',
    conectividad: 'USB / Red',
    consumible: 'Tóner / Cartucho',
    bandeja: 'Capacidad Bandeja'
  },
  generica: {
    procesador: 'Procesador / Chipset',
    ram: 'Memoria RAM / Capacidad',
    almacenamiento: 'Unidad Almacenamiento',
    interfaces: 'Puertos / Interfaz',
    alimentacion: 'Tensión / Adaptador'
  }
};
