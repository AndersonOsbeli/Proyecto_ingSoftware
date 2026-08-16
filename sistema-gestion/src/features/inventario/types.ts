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
export type TipoHallazgo = 'documental' | 'fisico' | 'tecnico' | 'accesorio_faltante' | 'sin_hallazgos';
export type SeveridadHallazgo = 'baja' | 'media' | 'alta' | 'critica';

export type EstadoDocumentalIngreso = 'con_documento' | 'pendiente_validacion';

export interface Especificacion {
  id: string;
  nombre: string;
  valor: string;
  aplica: boolean;
  esPredeterminada?: boolean;
  ejemplo?: string;
}

export interface IngresoEquipo {
  id: string;
  tipoProducto: string;
  proveedor: string;
  fechaIngreso: string;
  cantidad: number;
  codigoBarras: string;
  especificaciones: Especificacion[];
  registradoPor: string;
  fechaRegistro?: string;
  ubicacion?: string;
  activo?: boolean;
  
  // Legacy fields para evitar que otras pantallas rompan mientras se migra
  folio?: string;
  origen?: string;
  documentoReferencia?: string;
  estadoDocumental?: EstadoDocumentalIngreso;
  tipoEquipo?: string;
  marca?: string;
  modelo?: string;
  numeroParte?: string;
  numeroSerie?: string;
  estadoFisico?: string;
  observaciones?: string;
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
    procesador: 'Modelo de CPU (Ej. Intel Core i5-1235U)',
    generacionCPU: 'Generación del procesador',
    ram: 'Capacidad RAM (Ej. 8 GB / 16 GB DDR4)',
    almacenamiento: 'Tipo y capacidad (Ej. 256 GB SSD NVMe)',
    pantalla: 'Tamaño y resolución (Ej. 14" FHD 1920x1080)',
    tipoPantalla: 'Panel (IPS / TN / OLED)',
    graficos: 'GPU (Integrada o dedicada)',
    bateria: 'Capacidad (Ej. 56 Whr)',
    puertos: 'Puertos disponibles (USB-A, USB-C, HDMI, etc.)',
    conectividad: 'Wi-Fi / Bluetooth / Ethernet',
    sistemaOperativo: 'SO instalado (Ej. Windows 11 Pro)',
    pesoAproximado: 'Peso (Ej. 1.5 kg)',
  },
  desktop: {
    procesador: 'Modelo de CPU (Ej. Intel Core i7-12700)',
    ram: 'Capacidad RAM (Ej. 16 GB DDR4)',
    almacenamiento: 'Tipo y capacidad (Ej. 512 GB SSD + 1 TB HDD)',
    graficos: 'Tarjeta de video (Ej. NVIDIA GTX 1660)',
    fuentePoder: 'Potencia (Ej. 500W 80+)',
    puertos: 'Puertos (USB, HDMI, DisplayPort, etc.)',
    conectividad: 'Red (Ethernet Gigabit / Wi-Fi)',
    factorForma: 'Factor de forma (Torre / Mini / All-in-One)',
    sistemaOperativo: 'SO instalado (Ej. Windows 11 Pro)',
    ranurasExpansion: 'Ranuras disponibles (PCIe, RAM, etc.)',
  },
  monitor: {
    tamano: 'Tamaño de pantalla (Ej. 27")',
    resolucion: 'Resolución (Ej. 2560x1440 / 4K)',
    tipoPantalla: 'Tipo de panel (IPS / VA / TN)',
    tasaRefresco: 'Tasa de refresco (Ej. 60Hz / 144Hz)',
    tiempoRespuesta: 'Tiempo de respuesta (Ej. 5ms)',
    puertosVideo: 'Conexiones (HDMI, DisplayPort, VGA, USB-C)',
    brillo: 'Brillo máximo (Ej. 300 cd/m²)',
    relacionAspecto: 'Relación de aspecto (16:9 / 21:9)',
    altavoces: 'Altavoces integrados (Sí / No)',
    alimentacion: 'Alimentación (Adaptador externo / interna)',
  },
  impresora: {
    tecnologia: 'Tecnología (Láser / Inyección de tinta)',
    funcionamiento: 'Funciones (Impresora / Multifuncional: copia, escaneo, fax)',
    velocidadImpresion: 'Velocidad (Ej. 20 ppm)',
    resolucionImpresion: 'Resolución (Ej. 600x600 dpi)',
    conectividad: 'Conexiones (USB / Red / Wi-Fi)',
    consumible: 'Tipo de consumible (Cartucho / Tóner)',
    capacidadBandeja: 'Capacidad bandeja (Ej. 250 hojas)',
    formatoPapel: 'Formatos soportados (A4, A3, Carta, etc.)',
    duplex: 'Impresión dúplex (Automática / Manual / No)',
    voltaje: 'Voltaje de operación (110V / 220V)',
  },
  servidor: {
    procesador: 'Modelo CPU servidor (Ej. Intel Xeon E-2300)',
    nucleos: 'Número de núcleos / hilos',
    ram: 'Capacidad RAM ECC (Ej. 32 GB DDR4 ECC)',
    almacenamiento: 'Configuración de discos (Ej. 2x 1TB SSD RAID 1)',
    raidController: 'Controlador RAID (Ej. PERC H730)',
    redundancia: 'Fuentes de poder redundantes (Sí / No)',
    fuentePoder: 'Potencia de fuente (Ej. 2x 550W)',
    formFactor: 'Factor de forma (1U / 2U / Torre)',
    puertosRed: 'Puertos de red (Ej. 4x GbE)',
    gestionRemota: 'Gestión remota (iDRAC / iLO / IPMI)',
    sistemaOperativo: 'SO / Virtualización (Linux / Windows Server / VMware)',
  },
  periferico: {
    tipo: 'Tipo de periférico (Teclado / Mouse / Webcam / etc.)',
    interfaz: 'Interfaz de conexión (USB / Bluetooth / PS/2)',
    conectividad: 'Tipo de conexión (Cableado / Inalámbrico)',
    compatibilidad: 'Compatibilidad de SO',
    alimentacion: 'Fuente de energía (USB / Baterías / Adaptador)',
    caracteristicas: 'Características especiales (Ej. retroiluminado, ergonómico)',
    color: 'Color / Acabado',
  },
  otro: {
    descripcion: 'Descripción del equipo',
    procesador: 'Procesador / Chipset (si aplica)',
    ram: 'Memoria RAM / Capacidad (si aplica)',
    almacenamiento: 'Unidad de almacenamiento (si aplica)',
    interfaces: 'Puertos / Interfaz de conexión',
    alimentacion: 'Tensión / Adaptador de corriente',
    funcionPrincipal: 'Función o uso principal',
  },
  generica: {
    procesador: 'Procesador / Chipset',
    ram: 'Memoria RAM / Capacidad',
    almacenamiento: 'Unidad Almacenamiento',
    interfaces: 'Puertos / Interfaz',
    alimentacion: 'Tensión / Adaptador',
  }
};

