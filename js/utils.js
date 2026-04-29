/**
 * @fileoverview Funcions auxiliars per a l'aplicació de gestió de biblioteques.
 * Proporciona ajudes per a la manipulació de dates, elements DOM i creació de modals.
 */

// Utilitats de Dates

/**
 * Analitza una cadena de data (AAAA-MM-DD) en un objecte Date sense desplaçament de zona horària.
 * @param {string} s - La cadena de data a analitzar.
 * @returns {Date|null} L'objecte Date analitzat o null si l'entrada està buida.
 */
export function parseDateNoTZ(s) {
  if (!s) return null;
  return new Date(s + 'T00:00:00');
}

/**
 * Formata una cadena de data en una cadena específica de la configuració regional.
 * @param {string} s - La cadena de data a formatar.
 * @returns {string} La cadena de data formatada.
 */
export function formatDate(s) {
  const d = parseDateNoTZ(s);
  if (!d) return '';
  return d.toLocaleDateString();
}

/**
 * Retorna una llista de préstecs que vencen en un nombre determinat de dies.
 * @param {number} [daysAhead=3] - Nombre de dies a mirar endavant.
 * @returns {Array} Llista de préstecs vençuts amb una propietat Date 'due'.
 */
export function getDuePrestecs(daysAhead = 3) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const max = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  
  return (window.prestecs || [])
    .map(p => {
      const due = parseDateNoTZ(p.data_devolucio);
      return Object.assign({}, p, { due });
    })
    .filter(p => p.due && p.due <= max)
    .sort((a, b) => a.due - b.due);
}

// Ajudants de Documents i Dades

/**
 * Cerca un document pel seu ID.
 * @param {number|string} id - L'ID del document.
 * @returns {Object|null} L'objecte del document o null si no es troba.
 */
export function getDocumentById(id) {
  return (window.documents || []).find(d => d.id_document === id) || null;
}

/**
 * Cerca documents que coincideixin amb un ISBN específic.
 * @param {string} isbn - L'ISBN a cercar.
 * @returns {Array} Llista de documents que coincideixen.
 */
export function getDocumentsByISBN(isbn) {
  return (window.documents || []).filter(d => d.isbn === isbn);
}

/**
 * Cerca documents per títol.
 * @param {string} q - La consulta de cerca.
 * @returns {Array} Llista de documents que coincideixen amb el títol.
 */
export function searchDocumentsByTitle(q) {
  const s = String(q).toLowerCase();
  return (window.documents || []).filter(d => (d.titol || '').toLowerCase().includes(s));
}

/**
 * Obté tots els préstecs per a un ID d'usuari específic.
 * @param {number|string} idUsuari - L'ID de l'usuari.
 * @returns {Array} Llista de préstecs per a l'usuari.
 */
export function getPrestecsByUserId(idUsuari) {
  return (window.prestecs || []).filter(p => p.id_usuari === idUsuari);
}

/**
 * Obté tots els préstecs per a un usuari pel seu correu electrònic.
 * @param {string} email - El correu electrònic de l'usuari.
 * @returns {Array} Llista de préstecs per a l'usuari.
 */
export function getPrestecsByUserEmail(email) {
  const u = (window.usuaris || []).find(x => x.email === email);
  return u ? getPrestecsByUserId(u.id_usuari) : [];
}

/**
 * Obté tots els documents associats a un ID de matèria específic.
 * @param {number|string} idMat - L'ID de la matèria.
 * @returns {Array} Llista de documents.
 */
export function getDocumentsByMateriaId(idMat) {
  const docIds = (window.document_materia || [])
    .filter(dm => dm.id_materia === idMat)
    .map(dm => dm.id_document);
  return (window.documents || []).filter(d => docIds.includes(d.id_document));
}

/**
 * Obté tots els documents associats a un ID de gènere específic.
 * @param {number|string} idGen - L'ID del gènere.
 * @returns {Array} Llista de documents.
 */
export function getDocumentsByGenereId(idGen) {
  const docIds = (window.document_genere || [])
    .filter(dg => dg.id_genere === idGen)
    .map(dg => dg.id_document);
  return (window.documents || []).filter(d => docIds.includes(d.id_document));
}

// Ajudants d'Interfície d'Usuari (UI)

/**
 * Crea una superposició de modal i una caixa.
 * @param {string} [overlayClass=''] - Classe personalitzada per a la superposició.
 * @param {string} [boxWidth='min(600px, 95%)'] - Amplada de la caixa modal.
 * @returns {Object} Un objecte que conté la superposició, la caixa i una funció closeModal.
 */
export function createModal(overlayClass = '', boxWidth = 'min(600px, 95%)') {
  const overlay = document.createElement('div');
  overlay.className = overlayClass;
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '10000'
  });

  const box = document.createElement('div');
  const isDark = document.body.classList.contains('dark');
  Object.assign(box.style, {
    width: boxWidth,
    maxHeight: '90vh',
    overflowY: 'auto',
    background: isDark ? '#0f172a' : '#fff',
    color: isDark ? '#f8fafc' : '#0f172a',
    borderRadius: '10px',
    padding: '24px',
    boxShadow: '0 10px 30px rgba(2,6,23,0.3)',
    position: 'relative',
    zIndex: '10001'
  });

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const closeModal = () => {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  };

  // Escoltadors d'esdeveniments per tancar
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  }, { once: true });

  return { overlay, box, closeModal };
}

// Suport Global i Exportacions de Llegat

// Exposa les funcions globalment per a scripts que no són mòduls si cal
window.getDocumentById = getDocumentById;
window.parseDateNoTZ = parseDateNoTZ;
window.createModal = createModal;

if (!window.DB) window.DB = {};
window.DB.findDocumentById = getDocumentById;
window.DB.searchDocumentsByTitle = searchDocumentsByTitle;
window.DB.getPrestecsByUserEmail = getPrestecsByUserEmail;
window.DB.getDuePrestecs = getDuePrestecs;