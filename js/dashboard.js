/**
 * @fileoverview Funcions per renderitzar i actualitzar els ginys (widgets) del tauler principal.
 * Gestiona comptadors, la llista de préstecs vençuts i els gràfics de categories populars.
 */

// --- Comptadors del Tauler ---

/**
 * Actualitza els comptadors estadístics al tauler (Llibres disponibles, Préstecs actius, Préstecs vençuts).
 * Llegeix directament de les variables d'estat global.
 */
function updateDashboardCounts() {
  try {
    const elAvailable = document.getElementById('count-available');
    const elAvailableTrend = document.getElementById('count-available-trend');
    const elLoaned = document.getElementById('count-loaned');
    const elLoanedTrend = document.getElementById('count-loaned-trend');
    const elOverdueCount = document.getElementById('overdue-count');

    // Targetes de dades noves
    const elTotalBooks = document.getElementById('total-books-count');
    const elActiveLoans = document.getElementById('active-loans-count');
    const elTotalUsers = document.getElementById('total-users-count');

    const stats = calculateDashboardStats(
        window.documents || [], 
        window.prestecs || [], 
        window.usuaris || []
    );

    // 1. Estadístiques totals (Targetes noves)
    if (elTotalBooks) elTotalBooks.textContent = String(stats.totalDocs);
    if (elActiveLoans) elActiveLoans.textContent = String(stats.totalLoans);
    if (elTotalUsers) elTotalUsers.textContent = String(stats.totalUsers);

    // 2. Llibres disponibles (Llegat o altres ubicacions)
    if (elAvailable) {
      elAvailable.textContent = String(stats.totalAvailable);
      
      if (elAvailableTrend) {
        elAvailableTrend.textContent = `+${stats.newDocsThisMonth} aquest mes`;
      }
    }

    // 3. Préstecs actius
    if (elLoaned) {
      elLoaned.textContent = String(stats.totalLoans);
      
      if (elLoanedTrend) {
        elLoanedTrend.textContent = `+${stats.newLoansToday} avui`;
      }
    }

    // 3. Comptador de préstecs vençuts
    if (elOverdueCount) {
      elOverdueCount.textContent = String(stats.overdueCount);
    }
  } catch (e) {
    console.warn('Error en actualitzar els comptadors del tauler', e);
  }
}

/**
 * Calcula les estadístiques del tauler.
 * @param {Array} docs - Llista de documents.
 * @param {Array} loans - Llista de préstecs.
 * @param {Array} users - Llista d'usuaris.
 * @returns {Object} Estadístiques calculades.
 */
function calculateDashboardStats(docs, loans, users) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM
    
    // Comptadors
    const totalDocs = docs.length;
    const totalLoans = loans.length;
    const totalUsers = users.length;
    
    // True available count: not loaned and not excluded
    const totalAvailable = docs.filter(doc => {
        const isLoaned = loans.some(p => p.id_document === doc.id_document);
        const isExcluded = doc.exclos_prestec === true;
        return !isLoaned && !isExcluded;
    }).length;
    
    // Tendències
    const newDocsThisMonth = docs.filter(d => d.data_alta && d.data_alta.startsWith(currentMonthPrefix)).length;
    const newLoansToday = loans.filter(p => p.data_prestec === todayStr).length;
    
    // Vençuts
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const overdueCount = loans.filter(p => {
        const d = p && p.data_devolucio ? new Date(p.data_devolucio + 'T00:00:00') : null;
        return d && d < todayDate;
    }).length;

    return {
        totalDocs,
        totalLoans,
        totalUsers,
        totalAvailable,
        newDocsThisMonth,
        newLoansToday,
        overdueCount
    };
}

// --- Llista de Préstecs Vençuts Tauler  ---

/**
 * Renderitza la llista de préstecs vençuts al widget del tauler.
 * Mostra un màxim de 3 elements ordenats per data de venciment.
 */
function renderOverdueWidget() {
  const container = document.getElementById('overdue-list');
  if (!container) return;
  container.innerHTML = '';

  const overdue = getTopOverdueLoans(window.prestecs || []);
  const allOverdue = getAllOverdueLoans(window.prestecs || []);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Gestiona l'estat buit
  if (!allOverdue.length) {
    const none = document.createElement('div');
    none.className = 'text-sm text-slate-500';
    none.textContent = 'No hi ha préstecs vençuts.';
    container.appendChild(none);
    
    // Actualitza el comptador per si de cas
    const elOverdueCount = document.getElementById('overdue-count');
    if (elOverdueCount) elOverdueCount.textContent = '0';
    return;
  }

  // Renderitza els elements (màxim 3)
  overdue.forEach(p => {
    const doc = window.getDocumentById(p.id_document) || { titol: '—', cover_url: '' };
    const usu = window.usuaris.find(u => u.id_usuari === p.id_usuari) || { nom: 'Usuari desconegut' };

    const item = document.createElement('div');
    item.className = 'flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30';

    // Imatge de portada
    const cover = document.createElement('div');
    cover.className = 'size-10 rounded bg-slate-200 shrink-0 bg-cover bg-center';
    if (doc.cover_url) cover.style.backgroundImage = `url("${doc.cover_url}")`;

    // Informació de text
    const meta = document.createElement('div');
    meta.className = 'flex-1 min-w-0';

    const titleP = document.createElement('p');
    titleP.className = 'text-sm font-semibold text-slate-900 dark:text-white truncate';
    titleP.textContent = doc.titol;

    const infoP = document.createElement('p');
    infoP.className = 'text-xs text-slate-500 dark:text-slate-400';
    const daysLate = Math.ceil((today - p.due) / (24 * 60 * 60 * 1000));
    infoP.innerHTML = `${usu.nom} • <span class="text-red-600 font-medium">${daysLate} dia(s) tard</span>`;
    
    // Botó de reclamació
    const btn = document.createElement('button');
    btn.className = 'text-xs font-medium text-red-600 hover:text-red-800 bg-white dark:bg-surface-dark dark:hover:bg-slate-800 px-2 py-1 rounded border border-red-200 dark:border-slate-700 shadow-sm';
    btn.textContent = 'Reclamar';
    
    btn.addEventListener('click', () => { 
        // Validació
        if (!window.EMAILJS_CONFIG || !window.emailjs || window.EMAILJS_CONFIG.PUBLIC_KEY.includes('PON_AQUI')) {
            if (window.showTempNotification) {
                window.showTempNotification("EmailJS no està configurat. Revisa l'arxiu js/email-config.js", 'error');
            } else {
                alert("EmailJS no està configurat. Revisa l'arxiu js/email-config.js");
            }
            return;
        }

        if (!usu.email || !usu.email.trim()) {
            if (window.showTempNotification) {
                window.showTempNotification(`No es pot enviar el correu: manca l'email de l'usuari "${usu.nom}".`, 'error');
            } else {
                alert(`No es pot enviar el correu: No s'ha trobat una adreça d'email vàlida per a l'usuari "${usu.nom}".`);
            }
            return;
        }

        const templateParams = {
            to_name: usu.nom,
            to_email: usu.email.trim(),
            book_title: doc.titol,
            days_late: daysLate,
        };
        
        const originalText = btn.textContent;
        btn.textContent = 'Enviant...';
        btn.disabled = true;

        emailjs.send(window.EMAILJS_CONFIG.SERVICE_ID, window.EMAILJS_CONFIG.TEMPLATE_ID, templateParams)
            .then(() => {
                window.showTempNotification(`Correu de reclamació enviat correctament a ${usu.nom} (${usu.email})`, 'success');
                btn.textContent = 'Reclamat';
                btn.className = 'text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 shadow-sm cursor-default';
            })
            .catch((err) => {
                console.error('FAILED...', err);
                window.showTempNotification('Error enviant el correu.', 'error');
                btn.textContent = originalText;
                btn.disabled = false;
            });
    });

    meta.appendChild(titleP);
    meta.appendChild(infoP);

    item.appendChild(cover);
    item.appendChild(meta);
    item.appendChild(btn);

    container.appendChild(item);
  });

  const elOverdueCount = document.getElementById('overdue-count');
  if (elOverdueCount) elOverdueCount.textContent = String(allOverdue.length);
}

/**
 * Obté els 3 primers préstecs vençuts, ordenats per data de venciment.
 * @param {Array} loans - Llista de préstecs.
 * @returns {Array} Llista de préstecs vençuts (màxim 3) amb objecte Date 'due'.
 */
function getTopOverdueLoans(loans) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return loans
        .map(p => Object.assign({}, p, { due: window.parseDateNoTZ(p.data_devolucio) }))
        .filter(p => p.due && p.due < today)
        .sort((a, b) => a.due - b.due)
        .slice(0, 3);
}

/**
 * Obté TOTS els préstecs vençuts, ordenats per data de venciment (sense límit).
 * @param {Array} loans - Llista de préstecs.
 * @returns {Array} Llista de tots els préstecs vençuts amb objecte Date 'due'.
 */
function getAllOverdueLoans(loans) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return loans
        .map(p => Object.assign({}, p, { due: window.parseDateNoTZ(p.data_devolucio) }))
        .filter(p => p.due && p.due < today)
        .sort((a, b) => a.due - b.due);
}

// Exportacions Globals
window.updateDashboardCounts = updateDashboardCounts;
window.renderOverdueWidget = renderOverdueWidget;