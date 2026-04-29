/**
 * @fileoverview Lògica per renderitzar taules de dades (Llibres, Usuaris, Préstecs).
 * Separat de main.js per millorar la modularitat.
 */

import { parseDateNoTZ, getDocumentById } from './utils.js';

// Constants i Estat
const ITEMS_PER_PAGE = 10;
let currentBookPage = 1;
let currentUserPage = 1;

// Taula de llibres

// Renderitza la taula de llibres segons els filtres actuals
export function renderBookTable(resetPage = true) {
  const tbody = document.getElementById('books-table-body');
  if (!tbody) return;

  if (resetPage) currentBookPage = 1;

  const catalogSearchInput = document.getElementById('catalog-search');
  const filterGenre = document.getElementById('filter-genre');
  const filterStatus = document.getElementById('filter-status');
  const clearFiltersBtn = document.getElementById('clear-filters-btn');

  const query = catalogSearchInput ? catalogSearchInput.value.trim().toLowerCase() : '';
  const genreId = filterGenre ? filterGenre.value : '';
  const statusVal = filterStatus ? filterStatus.value : '';

  // Mostra o oculta el botó de netejar filtres
  if (clearFiltersBtn) {
    if (query || genreId || statusVal) {
        clearFiltersBtn.classList.remove('hidden');
    } else {
        clearFiltersBtn.classList.add('hidden');
    }
  }

  tbody.innerHTML = '';

  const filteredDocs = filterBooks(window.documents || [], query, genreId, statusVal);

  if (filteredDocs.length === 0) {
    renderEmptyRow(tbody, 'No s\'han trobat llibres amb aquests criteris.');
    renderPagination('books-pagination', 0, 1, () => {});
    return;
  }

  // Lògica de paginació
  const totalPages = Math.ceil(filteredDocs.length / ITEMS_PER_PAGE);
  if (currentBookPage > totalPages) currentBookPage = Math.max(1, totalPages);
  
  const start = (currentBookPage - 1) * ITEMS_PER_PAGE;
  const paginatedDocs = filteredDocs.slice(start, start + ITEMS_PER_PAGE);

  paginatedDocs.forEach(doc => renderBookRow(tbody, doc));
  
  renderPagination('books-pagination', filteredDocs.length, currentBookPage, (newPage) => {
    currentBookPage = newPage;
    renderBookTable(false);
    // Desplaça fins a dalt de la taula
    tbody.closest('.max-w-6xl').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/**
 * Filtra la llista de llibres segons la cerca, gènere i estat.
 * @param {Array} docs - Llista de documents a filtrar.
 * @param {string} query - Cerca (títol, autor, isbn).
 * @param {string} genreId - ID de gènere per filtrar.
 * @param {string} statusVal - Estat ('available', 'loaned').
 * @returns {Array} Llista filtrada de documents.
 */
function filterBooks(docs, query, genreId, statusVal) {
  return docs.filter(doc => {
    // 1. Filtre de cerca
    const matchesSearch = !query || (
      (doc.titol || '').toLowerCase().includes(query) ||
      (doc.autor || '').toLowerCase().includes(query) ||
      (doc.isbn || '').toLowerCase().includes(query)
    );
    if (!matchesSearch) return false;

    // 2. Filtre de gènere
    if (genreId) {
      const hasGenre = (window.document_genere || []).some(dg => dg.id_document === doc.id_document && String(dg.id_genere) === genreId);
      if (!hasGenre) return false;
    }

    // 3. Filtre d'estat
    if (statusVal) {
      const isBookLoaned = (window.prestecs || []).some(p => p.id_document === doc.id_document);
      const isExcluded = doc.exclos_prestec === true;

      if (statusVal === 'loaned' && !isBookLoaned) return false;
      if (statusVal === 'available' && (isBookLoaned || isExcluded)) return false;
      if (statusVal === 'unavailable' && !isExcluded) return false;
    }

    return true;
  });
}

// Renderitza una fila de llibre a la taula
function renderBookRow(tbody, doc) {
    const isBookLoaned = (window.prestecs || []).some(p => p.id_document === doc.id_document);
    
    const tr = document.createElement('tr');
    tr.className = 'group hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer';
    tr.addEventListener('click', () => {
        if (window.showBookDetailsModal) window.showBookDetailsModal(doc);
    });

    // 1. Portada
    const tdCover = document.createElement('td');
    tdCover.className = 'px-6 py-3';
    const divCover = document.createElement('div');
    divCover.className = 'bg-center bg-no-repeat aspect-[2/3] bg-cover rounded-md w-12 shadow-sm border border-gray-200 dark:border-gray-700';
    const coverUrl = doc.cover_url || 'https://placehold.co/100x150?text=No+Cover';
    divCover.style.backgroundImage = `url("${coverUrl}")`;
    tdCover.appendChild(divCover);
    tr.appendChild(tdCover);

    // 2. Titol i Autor
    const tdTitle = document.createElement('td');
    tdTitle.className = 'px-6 py-3';
    const divTitle = document.createElement('div');
    divTitle.className = 'flex flex-col';
    const pTitle = document.createElement('p');
    pTitle.className = 'text-[#0d141b] dark:text-white text-sm font-semibold';
    pTitle.textContent = doc.titol;
    const pAuthor = document.createElement('p');
    pAuthor.className = 'text-[#4c739a] dark:text-gray-400 text-sm';
    pAuthor.textContent = doc.autor;
    divTitle.appendChild(pTitle);
    divTitle.appendChild(pAuthor);
    tdTitle.appendChild(divTitle);
    tr.appendChild(tdTitle);

    // 3. ISBN
    const tdISBN = document.createElement('td');
    tdISBN.className = 'px-6 py-3';
    const spanISBN = document.createElement('span');
    spanISBN.className = 'text-[#4c739a] dark:text-gray-400 text-sm font-mono bg-slate-100 dark:bg-gray-800 px-2 py-1 rounded';
    spanISBN.textContent = doc.isbn;
    tdISBN.appendChild(spanISBN);
    tr.appendChild(tdISBN);

    // 4. Gènere
    const tdGenre = document.createElement('td');
    tdGenre.className = 'px-6 py-3';
    const docGen = (window.document_genere || []).find(dg => dg.id_document === doc.id_document);
    const genreObj = docGen ? (window.generes || []).find(g => g.id_genere === docGen.id_genere) : null;
    const genreName = genreObj ? genreObj.tipus_genere : 'General';
    
    const spanGenre = document.createElement('span');
    spanGenre.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    spanGenre.textContent = genreName;
    tdGenre.appendChild(spanGenre);
    tr.appendChild(tdGenre);

    // 5. Estat
    const tdStatus = document.createElement('td');
    tdStatus.className = 'px-6 py-3';
    const spanStatus = document.createElement('span');
    
    if (doc.exclos_prestec === true) {
        spanStatus.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
        spanStatus.innerHTML = '<span class="size-1.5 rounded-full bg-red-500"></span> No disponible';
    } else if (isBookLoaned) {
        spanStatus.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
        spanStatus.innerHTML = '<span class="size-1.5 rounded-full bg-amber-500"></span> Prestat';
    } else {
        spanStatus.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
        spanStatus.innerHTML = '<span class="size-1.5 rounded-full bg-green-500"></span> Disponible';
    }
    tdStatus.appendChild(spanStatus);
    tr.appendChild(tdStatus);

    // 6. Accions
    const tdActions = document.createElement('td');
    tdActions.className = 'px-6 py-3 text-right';
    const divActions = document.createElement('div');
    divActions.className = 'flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity';
    
    // Botó Editar
    const btnEdit = document.createElement('button');
    btnEdit.className = 'p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-md transition-colors';
    btnEdit.title = 'Editar';
    btnEdit.innerHTML = '<span class="material-symbols-outlined text-[20px]">edit</span>';
    btnEdit.addEventListener('click', (e) => {
        e.stopPropagation();
        
        const relGen = (window.document_genere || []).find(dg => dg.id_document === doc.id_document);
        const relMat = (window.document_materia || []).find(dm => dm.id_document === doc.id_document);
        
        const prefill = {
            id: doc.id_document,
            title: doc.titol,
            subtitle: doc.subtitol,
            author: doc.autor,
            isbn: doc.isbn,
            year: doc.any_publicacio,
            publisher: doc.editorial,
            edition: doc.edicio,
            collection: doc.coleccio,
            language: null, 
            id_idioma: doc.id_idioma,
            id_armari: doc.id_armari,
            id_genere: relGen ? relGen.id_genere : null,
            id_materia: relMat ? relMat.id_materia : null,
            observacions: doc.observacions,
            exclos_prestec: doc.exclos_prestec,
            cover: doc.cover_url,
            data_alta: doc.data_alta
        };
        if(window.showManualBookForm) window.showManualBookForm(prefill);
    });

    // Botó Eliminar
    const btnDelete = document.createElement('button');
    btnDelete.className = 'p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors';
    btnDelete.title = 'Eliminar';
    btnDelete.innerHTML = '<span class="material-symbols-outlined text-[20px]">delete</span>';
    btnDelete.addEventListener('click', (e) => {
        e.stopPropagation();
        
        if(window.showConfirmationModal) {
            window.showConfirmationModal(
                'Eliminar Llibre',
                `Estàs segur que vols eliminar "${doc.titol}"? Aquesta acció no es pot desfer.`,async () => {
                    try {
                        await window.DB.actions.deleteDocument(doc.id_document);
                        renderBookTable();
                        if (window.updateDashboardCounts) window.updateDashboardCounts();
                        if (window.showTempNotification) window.showTempNotification('Llibre eliminat correctament.', 'error');
                    } catch (e) {
                        console.error(e);
                        if (window.showTempNotification) window.showTempNotification('Error eliminant llibre', 'error');
                    }
                },
                'danger'
            );
        }
    });

    divActions.appendChild(btnEdit);
    divActions.appendChild(btnDelete);
    tdActions.appendChild(divActions);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
}

// Taula de préstecs

// Renderitza la taula de préstecs segons els filtres actuals
export function renderLoansTable() {
  const tbody = document.getElementById('loans-table-body');
  if (!tbody) return;

  const loanSearchInput = document.getElementById('loan-search');
  const filterLoanStatus = document.getElementById('filter-loan-status');

  const query = loanSearchInput ? loanSearchInput.value.trim().toLowerCase() : '';
  const statusVal = filterLoanStatus ? filterLoanStatus.value : '';

  tbody.innerHTML = '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredLoans = filterLoans(window.prestecs || [], query, statusVal, today);

  if (filteredLoans.length === 0) {
    renderEmptyRow(tbody, 'No s\'han trobat préstecs amb aquests criteris.');
    return;
  }

  filteredLoans.forEach(loan => renderLoanRow(tbody, loan, today));
}

/**
 * Filtra la llista de préstecs segons la cerca i estat.
 * @param {Array} loans - Llista de préstecs a filtrar.
 * @param {string} query - Serca (títol del llibre, nom de l'usuari).
 * @param {string} statusVal - Estat ('active', 'overdue').
 * @param {Date} today - Data actual per calcular si un préstec està vençut.
 * @returns {Array} Llista filtrada de préstecs.
 */
function filterLoans(loans, query, statusVal, today) {
  return loans.filter(loan => {
    const doc = getDocumentById(loan.id_document) || { titol: '' };
    const user = (window.usuaris || []).find(u => u.id_usuari === loan.id_usuari) || { nom: '' };

    // 1. Filtre de cerca
    const matchesSearch = !query || (
      doc.titol.toLowerCase().includes(query) ||
      user.nom.toLowerCase().includes(query)
    );
    if (!matchesSearch) return false;

    // 2. Filtre d'estat
    if (statusVal) {
      const dueDate = parseDateNoTZ(loan.data_devolucio);
      const isOverdue = dueDate && dueDate < today;
      if (statusVal === 'overdue' && !isOverdue) return false;
      if (statusVal === 'active' && isOverdue) return false;
    }

    return true;
  });
}

// Renderitza una fila de préstec a la taula
function renderLoanRow(tbody, loan, today) {
    const doc = getDocumentById(loan.id_document) || { titol: 'Desconegut' };
    const user = (window.usuaris || []).find(u => u.id_usuari === loan.id_usuari) || { nom: 'Desconegut' };
    const dueDate = parseDateNoTZ(loan.data_devolucio);
    const isOverdue = dueDate && dueDate < today;

    const tr = document.createElement('tr');
    tr.className = 'group hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer';
    tr.onclick = () => { if(window.showLoanDetailsModal) window.showLoanDetailsModal(loan); };

    // Títol del llibre
    const tdBook = document.createElement('td');
    tdBook.className = 'px-6 py-4';
    tdBook.innerHTML = `<p class="text-sm font-semibold text-slate-900 dark:text-white">${doc.titol}</p>`;
    tr.appendChild(tdBook);

    // Nom de l'usuari
    const tdUser = document.createElement('td');
    tdUser.className = 'px-6 py-4';
    tdUser.innerHTML = `<p class="text-sm text-slate-600 dark:text-slate-400">${user.nom}</p>`;
    tr.appendChild(tdUser);

    // Data de préstec
    const tdLoanDate = document.createElement('td');
    tdLoanDate.className = 'px-6 py-4 text-sm text-slate-600 dark:text-slate-400';
    tdLoanDate.textContent = loan.data_prestec;
    tr.appendChild(tdLoanDate);

    // Data de devolució
    const tdDueDate = document.createElement('td');
    tdDueDate.className = 'px-6 py-4 text-sm';
    tdDueDate.innerHTML = `<span class="${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-600 dark:text-slate-400'}">${loan.data_devolucio}</span>`;
    tr.appendChild(tdDueDate);

    // Estat
    const tdStatus = document.createElement('td');
    tdStatus.className = 'px-6 py-4';
    const spanStatus = document.createElement('span');
    if (isOverdue) {
      spanStatus.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      spanStatus.innerHTML = '<span class="size-1.5 rounded-full bg-red-500"></span> Vençut';
    } else {
      spanStatus.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      spanStatus.innerHTML = '<span class="size-1.5 rounded-full bg-green-500"></span> Actiu';
    }
    tdStatus.appendChild(spanStatus);
    tr.appendChild(tdStatus);

    // Accions
    const tdActions = document.createElement('td');
    tdActions.className = 'px-6 py-4 text-right';
    const divActions = document.createElement('div');
    divActions.className = 'flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity';

    // Botó Retornar
    const btnReturn = document.createElement('button');
    btnReturn.className = 'p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors';
    btnReturn.title = 'Retornar';
    btnReturn.innerHTML = '<span class="material-symbols-outlined text-[20px]">assignment_returned</span>';
    btnReturn.addEventListener('click', (e) => {
      e.stopPropagation();
      if(window.showConfirmationModal) {
          showConfirmationModal(
            'Retornar Préstec',
            `Estàs segur que vols marcar com a retornat el préstec de "${doc.titol}" per part de ${user.nom}?`,
            async () => {
              try {
                await window.DB.actions.removePrestec(loan.id_prestec);
                renderLoansTable();
                if(window.updateDashboardCounts) window.updateDashboardCounts();
                if (window.showTempNotification) window.showTempNotification('Préstec retornat correctament!', 'success');
              } catch (e) {
                console.error(e);
                if (window.showTempNotification) window.showTempNotification('Error retornant préstec', 'error');
              }
            },
            'info'
          );
      }
    });

    // Botó Reclamar (només si està vençut)
    if (isOverdue) {
      const btnReclaim = document.createElement('button');
      btnReclaim.className = 'p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors';
      btnReclaim.title = 'Reclamar';
      btnReclaim.innerHTML = '<span class="material-symbols-outlined text-[20px]">mail</span>';
      btnReclaim.addEventListener('click', (e) => {
        e.stopPropagation();
        
        if (!window.EMAILJS_CONFIG || !window.emailjs || window.EMAILJS_CONFIG.PUBLIC_KEY.includes('PON_AQUI')) {
          if (window.showTempNotification) {
            window.showTempNotification("EmailJS no està configurat. Revisa l'arxiu js/email-config.js", 'error');
          } else {
            alert("EmailJS no està configurat. Revisa l'arxiu js/email-config.js");
          }
          return;
        }

        if (!user.email || !user.email.trim()) {
          if (window.showTempNotification) {
            window.showTempNotification(`No es pot enviar el correu: manca l'email de l'usuari "${user.nom}".`, 'error');
          } else {
            alert(`No es pot enviar el correu: No s'ha trobat una adreça d'email vàlida per a l'usuari "${user.nom}".`);
          }
          return;
        }

        const daysLate = Math.ceil((today - dueDate) / (24 * 60 * 60 * 1000));
        const templateParams = {
          to_name: user.nom,
          nom: user.nom,
          to_email: user.email.trim(),
          book_title: doc.titol,
          days_late: daysLate
        };

        btnReclaim.disabled = true;
        btnReclaim.style.opacity = '0.5';

        // Enviar correu amb EmailJS
        emailjs.send(window.EMAILJS_CONFIG.SERVICE_ID, window.EMAILJS_CONFIG.TEMPLATE_ID, templateParams)
          .then(() => {
            if (window.showTempNotification) window.showTempNotification(`Correu de reclamació enviat correctament a ${user.nom}`, 'success');
            btnReclaim.innerHTML = '<span class="material-symbols-outlined text-[20px]" style="color: #059669">check_circle</span>';
          })
          .catch((err) => {
            console.error('FAILED...', err);
            if (window.showTempNotification) {
              window.showTempNotification('Error enviant el correu.', 'error');
            } else {
              alert('Error enviant el correu.');
            }
            btnReclaim.disabled = false;
            btnReclaim.style.opacity = '1';
          });
      });
      divActions.appendChild(btnReclaim);
    }

    divActions.appendChild(btnReturn);
    tdActions.appendChild(divActions);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
}

// Taula d'usuaris

/**
 * Renderitza la taula d'usuaris segons els filtres actuals i la pàgina actual.
 */
export function renderUsersTable(resetPage = true) {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;

  if (resetPage) currentUserPage = 1;

  const userSearchInput = document.getElementById('user-search');
  const filterUserRole = document.getElementById('filter-user-role');
  const filterUserStatus = document.getElementById('filter-user-status');

  const query = userSearchInput ? userSearchInput.value.trim().toLowerCase() : '';
  const roleVal = filterUserRole ? filterUserRole.value : '';
  const statusVal = filterUserStatus ? filterUserStatus.value : '';

  tbody.innerHTML = '';

  const filteredUsers = filterUsers(window.usuaris || [], query, roleVal, statusVal);

  if (filteredUsers.length === 0) {
    renderEmptyRow(tbody, 'No s\'han trobat usuaris amb aquests criteris.');
    renderPagination('users-pagination', 0, 1, () => {});
    return;
  }

  // Lògica de paginació
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  if (currentUserPage > totalPages) currentUserPage = Math.max(1, totalPages);
  
  const start = (currentUserPage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(start, start + ITEMS_PER_PAGE);

  paginatedUsers.forEach(user => renderUserRow(tbody, user));

  renderPagination('users-pagination', filteredUsers.length, currentUserPage, (newPage) => {
    currentUserPage = newPage;
    renderUsersTable(false);
    // Desplaça fins a dalt de la taula
    tbody.closest('.max-w-6xl').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/**
 * Filtra la llista d'usuaris segons la cerca, rol i estat.
 * @param {Array} users - Llista d'usuaris a filtrar.
 * @param {string} query - Cerca (nom o email).
 * @param {string} roleVal - Rol de l'usuari ('admin', 'teacher', 'student').
 * @param {string} statusVal - Estat de l'usuari ('active', 'blocked').
 * @returns {Array} Llista filtrada d'usuaris.
 */
function filterUsers(users, query, roleVal, statusVal) {
  return users.filter(user => {
    // 1. Filtre de cerca
    const matchesSearch = !query || (
      (user.nom || '').toLowerCase().includes(query) ||
      (user.email || '').toLowerCase().includes(query)
    );
    if (!matchesSearch) return false;

    // 2. Filtre de rol
    if (roleVal && user.rol !== roleVal) return false;

    // 3. Filtre d'estat
    if (statusVal) {
        if (statusVal === 'blocked' && !user.blocked) return false;
        if (statusVal === 'active' && user.blocked) return false;
    }

    return true;
  });
}

function renderUserRow(tbody, user) {
    const tr = document.createElement('tr');
    tr.className = 'group hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer';
    tr.onclick = () => { if(window.showUserDetailsModal) window.showUserDetailsModal(user); };

    // Nom
    const tdNom = document.createElement('td');
    tdNom.className = 'px-6 py-4';
    tdNom.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
          ${(user.nom || 'U').substring(0, 1).toUpperCase()}
        </div>
        <p class="text-sm font-semibold text-slate-900 dark:text-white">${user.nom || 'Sense nom'}</p>
      </div>
    `;
    tr.appendChild(tdNom);

    // Email
    const tdEmail = document.createElement('td');
    tdEmail.className = 'px-6 py-4';
    tdEmail.innerHTML = `<p class="text-sm text-slate-600 dark:text-slate-400">${user.email || '—'}</p>`;
    tr.appendChild(tdEmail);

    // Rol
    const tdRol = document.createElement('td');
    tdRol.className = 'px-6 py-4';
    const roleLabels = {
      'admin': 'Administrador',
      'teacher': 'Professor',
      'student': 'Alumne'
    };
    const roleColors = {
      'admin': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      'teacher': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'student': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    };
    const roleLabel = roleLabels[user.rol] || 'Alumne';
    const roleColor = roleColors[user.rol] || roleColors['student'];
    
    tdRol.innerHTML = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColor}">${roleLabel}</span>`;
    tr.appendChild(tdRol);

    // Data Registre
    const tdData = document.createElement('td');
    tdData.className = 'px-6 py-4 text-sm text-slate-600 dark:text-slate-400';
    tdData.textContent = user.created_at ? new Date(user.created_at).toLocaleDateString() : '—';
    tr.appendChild(tdData);

    // Estat
    const tdEstat = document.createElement('td');
    tdEstat.className = 'px-6 py-4';
    if (user.blocked) {
        tdEstat.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
            <span class="size-1.5 rounded-full bg-red-500"></span> Bloquejat
          </span>
        `;
    } else {
        tdEstat.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
            <span class="size-1.5 rounded-full bg-green-500"></span> Actiu
          </span>
        `;
    }
    tr.appendChild(tdEstat);

    // Actions
    const tdActions = document.createElement('td');
    tdActions.className = 'px-6 py-4 text-right';
    const divActions = document.createElement('div');
    divActions.className = 'flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity';

    const btnBlock = document.createElement('button');
    const isBlocked = !!user.blocked;
    btnBlock.className = `p-1.5 rounded-md transition-colors ${
        isBlocked 
            ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' 
            : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
    }`;
    btnBlock.title = isBlocked ? 'Desbloquejar' : 'Bloquejar';
    btnBlock.innerHTML = `<span class="material-symbols-outlined text-[20px]">${isBlocked ? 'lock_open' : 'lock'}</span>`;
    
    // Event Listener per bloquejar/desbloquejar usuari
    btnBlock.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = isBlocked ? 'desbloquejar' : 'bloquejar';
        const actionLabel = isBlocked ? 'Desbloquejar' : 'Bloquejar';
        
        if(window.showConfirmationModal) {
            window.showConfirmationModal(
                `${actionLabel} Usuari`,
                `Estàs segur que vols ${action} a l'usuari "${user.nom}"?`,
                async () => {
                    try {
                        await window.DB.actions.updateUser({ ...user, blocked: !isBlocked });
                        renderUsersTable();
                        if (window.showTempNotification) window.showTempNotification(`Usuari ${action === 'bloquejar' ? 'bloquejat' : 'desbloquejat'} correctament.`, 'success');
                    } catch (e) {
                        console.error(e);
                        if (window.showTempNotification) window.showTempNotification(`Error al ${action} l'usuari`, 'error');
                    }
                },
                isBlocked ? 'info' : 'danger',
                actionLabel
            );
        }
    });

    divActions.appendChild(btnBlock);
    tdActions.appendChild(divActions);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
}

/**
 * Renderitza els controls de paginació per a les taules de llibres i usuaris.
 * @param {string} containerId - ID del contenidor on es mostrarà la paginació.
 * @param {number} totalItems - Nombre total d'elements (llibres o usuaris) després de filtrar.
 * @param {number} currentPage - Pàgina actual que s'està mostrant.
 * @param {function} onPageChange - Funció que s'executa quan l'usuari canvia de pàgina, rep la nova pàgina com a paràmetre.
 */
function renderPagination(containerId, totalItems, currentPage, onPageChange) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  
  if (totalItems === 0) {
    container.innerHTML = '';
    container.classList.add('hidden');
    return;
  }
  
  container.classList.remove('hidden');
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIdx = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  container.className = 'flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-gray-900/50 border-t border-[#cfdbe7] dark:border-gray-800';
  container.innerHTML = `
    <div class="flex-1 flex items-center justify-between">
      <div>
        <p class="text-sm text-slate-700 dark:text-slate-400">
          Mostrant <span class="font-medium">${startIdx}</span> a <span class="font-medium">${endIdx}</span> de <span class="font-medium">${totalItems}</span> resultats
        </p>
      </div>
      <div>
        <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
          <button id="${containerId}-prev" ${currentPage === 1 ? 'disabled' : ''} class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-[#cfdbe7] dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
            <span class="sr-only">Anterior</span>
            <span class="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          
          <div class="flex items-center px-4 border-t border-b border-[#cfdbe7] dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-slate-700 dark:text-slate-300">
            Pàgina ${currentPage} de ${totalPages}
          </div>

          <button id="${containerId}-next" ${currentPage === totalPages ? 'disabled' : ''} class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-[#cfdbe7] dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
            <span class="sr-only">Següent</span>
            <span class="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </nav>
      </div>
    </div>
  `;

  // Assignar esdeveniments als botons de paginació
  const prevBtn = document.getElementById(`${containerId}-prev`);
  const nextBtn = document.getElementById(`${containerId}-next`);

  if (prevBtn) prevBtn.onclick = () => onPageChange(currentPage - 1);
  if (nextBtn) nextBtn.onclick = () => onPageChange(currentPage + 1);
}

function renderEmptyRow(tbody, message) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'px-6 py-8 text-center text-slate-500 dark:text-slate-400';
    td.textContent = message;
    tr.appendChild(td);
    tbody.appendChild(tr);
}

// Exposar les funcions de renderització a l'objecte global per poder-les cridar des d'altres mòduls o components
window.renderBookTable = renderBookTable;
window.renderLoansTable = renderLoansTable;
window.renderUsersTable = renderUsersTable;
