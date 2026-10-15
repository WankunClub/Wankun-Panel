// Apps Script — Registro de reseñas pedidas (Wankun Club)
// Se pega en la planilla de Ventas: Extensiones > Apps Script.
// Guarda en la hoja "Resenas" a quién se le pidió reseña, para que el panel
// no permita pedirla dos veces, desde cualquier dispositivo.

const HOJA = 'Resenas';
const COLS = ['Telefono', 'Nombre', 'Pedida', 'Dejada', 'Origen'];

function hoja_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(HOJA);
  if (!sh) {
    sh = ss.insertSheet(HOJA);
    sh.appendRow(COLS);
    sh.setFrozenRows(1);
    sh.getRange('A:A').setNumberFormat('@'); // teléfono como texto
  }
  return sh;
}

// Normaliza el teléfono para comparar: solo dígitos, sin 54 ni 9 inicial.
function normTel_(t) {
  let d = String(t || '').replace(/\D/g, '');
  if (d.startsWith('54')) d = d.slice(2);
  if (d.startsWith('9') && d.length === 11) d = d.slice(1);
  return d;
}

function salida_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// GET: devuelve toda la lista.
function doGet() {
  const vals = hoja_().getDataRange().getValues();
  const filas = vals.slice(1).filter(r => r[0] || r[1]).map(r => ({
    telefono: String(r[0]),
    nombre: String(r[1]),
    pedida: r[2] ? Utilities.formatDate(new Date(r[2]), 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd') : '',
    dejada: r[3] === true || String(r[3]).toUpperCase() === 'TRUE' || String(r[3]).toUpperCase() === 'SI',
  }));
  return salida_({ ok: true, filas: filas });
}

// POST: crea o actualiza un cliente. Body JSON:
// {telefono, nombre, pedida: true/false, dejada: true/false, origen}
// o {lote: [ ...varios... ]} para cargar muchos de una vez.
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const items = body.lote || [body];
    const sh = hoja_();
    const vals = sh.getDataRange().getValues();
    const idx = {};
    vals.forEach((r, i) => {
      if (i === 0) return;
      const k = normTel_(r[0]) || ('nom:' + String(r[1]).trim().toLowerCase());
      idx[k] = i + 1; // número de fila
    });
    items.forEach(it => {
      const tel = normTel_(it.telefono);
      const k = tel || ('nom:' + String(it.nombre || '').trim().toLowerCase());
      const fila = idx[k];
      if (fila) {
        // Ya existe: nunca se borra la fecha de pedida (eso es lo que bloquea).
        if (it.pedida && !sh.getRange(fila, 3).getValue()) sh.getRange(fila, 3).setValue(new Date());
        if (typeof it.dejada === 'boolean') sh.getRange(fila, 4).setValue(it.dejada);
        if (it.nombre && !sh.getRange(fila, 2).getValue()) sh.getRange(fila, 2).setValue(it.nombre);
      } else {
        sh.appendRow([tel, it.nombre || '', it.pedida ? (it.fecha ? new Date(it.fecha) : new Date()) : '', !!it.dejada, it.origen || 'panel']);
        idx[k] = sh.getLastRow();
      }
    });
    return salida_({ ok: true, procesados: items.length });
  } catch (err) {
    return salida_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
