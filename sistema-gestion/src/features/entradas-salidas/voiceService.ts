/**
 * Servicio de Sintesis de Voz para saludos de Entradas y Salidas
 */

export function reproducirSaludo(nombre: string, tipo: 'entrada' | 'salida'): void {
  if (!('speechSynthesis' in window)) {
    console.warn('El navegador no soporta la API de síntesis de voz.');
    return;
  }

  // Cancelar locuciones previas en cola
  window.speechSynthesis.cancel();

  // Limpiar título formal si lo tuviera o usar primer nombre
  const primerNombre = nombre.trim().split(' ')[0] || nombre;

  const mensaje = tipo === 'entrada'
    ? `¡Bienvenido ${primerNombre}! Acceso de entrada registrado.`
    : `¡Adiós ${primerNombre}! Esperamos que vuelva pronto. Acceso de salida registrado.`;

  const utterance = new SpeechSynthesisUtterance(mensaje);
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // Intentar seleccionar voz en español
  const voices = window.speechSynthesis.getVoices();
  const spanishVoice = voices.find((v) => v.lang.startsWith('es'));
  if (spanishVoice) {
    utterance.voice = spanishVoice;
  } else {
    utterance.lang = 'es-ES';
  }

  window.speechSynthesis.speak(utterance);
}
