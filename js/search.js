/**
 * @fileoverview Gestiona la funcionalitat de cerca global entre llibres, usuaris i préstecs.
 * Proporciona funcions per filtrar dades i mostrar resultats en un modal.
 */

import { createModal, getDocumentById } from './utils.js';

// Estat
// Variables per mantenir l'estat de cerca i resultats entre pulsacions si cal
let lastValidQuery = '';
let lastBookResults = [];
let lastUserResults = [];
let lastLoanResults = [];

/**
 * Gestor d'esdeveniments per als canvis en el camp de cerca.
 * @param {Event} e - L'esdeveniment d'entrada.
 */
function handleGlobalSearch(e) {
  const query = e.target.value.trim().toLowerCase();
  if (query.length < 1) {
    // Si està buit, tanca el modal
    const existingModal = document.querySelector('.global-search-modal');
    if (existingModal) existingModal.remove();
    return;
  }
  showGlobalSearchResults(query);
}

/**
 * Filtra les dades i mostra el modal de resultats de cerca.
 * @param {string} query - La cadena de cerca.
 */
function showGlobalSearchResults(query) {
  // Tanca el modal existent
  const existingModal = document.querySelector('.global-search-modal');
  if (existingModal) existingModal.remove();

  const results = performSearch(query);

  let displayQuery = query;
  let displayBookResults = results.bookResults;
  let displayUserResults = results.userResults;
  let displayLoanResults = results.loanResults;

  if (!results.hasResults) {
    if (lastValidQuery && (query.includes(lastValidQuery) || lastValidQuery.includes(query))) {
      displayQuery = lastValidQuery;
      displayBookResults = lastBookResults;
      displayUserResults = lastUserResults;
      displayLoanResults = lastLoanResults;
    } else {
      // No s'han trobat resultats
      return; 
    }
  } else {
    lastValidQuery = query;
    lastBookResults = results.bookResults;
    lastUserResults = results.userResults;
    lastLoanResults = results.loanResults;
  }
  
  // Crea el modal
  const { box, closeModal } = createModal('global-search-modal', 'min(800px, 95%)');

  const header = document.createElement('div');
  Object.assign(header.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: '0' });
  
  const title = document.createElement('h3');
  title.textContent = `Resultats de cerca: "${displayQuery}"`;
  Object.assign(title.style, { margin: '0', fontSize: '18px', fontWeight: '600' });

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' });
  closeBtn.onclick = closeModal;

  header.append(title, closeBtn);

  const content = document.createElement('div');
  Object.assign(content.style, { 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '24px',
      maxHeight: '70vh', // Limita l'alçada al 70% de la pantalla
      overflowY: 'auto',  // Permet el desplaçament vertical
      paddingRight: '8px' // Espai per a la barra de desplaçament
  });

  // Estil personalitzat de la barra de desplaçament per al contingut
  content.className = 'custom-scrollbar';
  const styleTag = document.getElementById('search-scroll-styles') || document.createElement('style');
  styleTag.id = 'search-scroll-styles';
  styleTag.textContent = `
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; }
  `;
  if (!styleTag.parentNode) document.head.appendChild(styleTag);

  // Helper per crear seccions
  const createSection = (titleText, count, items, renderItem) => {
    const section = document.createElement('div');
    const h = document.createElement('h4');
    h.textContent = `${titleText} (${count})`;
    Object.assign(h.style, { fontSize: '16px', fontWeight: '500', marginBottom: '8px' });
    section.appendChild(h);

    const list = document.createElement('div');
    Object.assign(list.style, { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' });
    
    if (titleText === 'Préstecs') {
        Object.assign(list.style, { display: 'flex', flexDirection: 'column', gap: '8px' });
    }

    items.forEach(item => {
        const el = renderItem(item);
        if (el) list.appendChild(el);
    });
    
    section.appendChild(list);
    return section;
  };

  const isDark = document.body.classList.contains('dark');
  const cardStyle = {
      padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', 
      background: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#e2e8f0',
      cursor: 'pointer'
  };

  // 1. Secció de llibres
  if (displayBookResults.length) {
    content.appendChild(createSection('Llibres', displayBookResults.length, displayBookResults, (book) => {
        const div = document.createElement('div');
        Object.assign(div.style, cardStyle);
        div.onclick = () => { if(window.showBookDetailsModal) window.showBookDetailsModal(book); };
        div.innerHTML = `<p style="font-weight:600;margin:0 0 4px 0;">${book.titol}</p><p style="font-size:14px;color:#64748b;margin:0;">Autor: ${book.autor}</p>`;
        return div;
    }));
  }

  // 2. Secció d'usuaris
  if (displayUserResults.length) {
    content.appendChild(createSection('Alumnes', displayUserResults.length, displayUserResults, (user) => {
        const div = document.createElement('div');
        Object.assign(div.style, cardStyle);
        div.onclick = () => { if(window.showUserDetailsModal) window.showUserDetailsModal(user); };
        div.innerHTML = `<p style="font-weight:600;margin:0 0 4px 0;">${user.nom}</p><p style="font-size:14px;color:#64748b;margin:0;">${user.email}</p>`;
        return div;
    }));
  }

  // 3. Secció de préstecs
  if (displayLoanResults.length) {
    content.appendChild(createSection('Préstecs', displayLoanResults.length, displayLoanResults, (loan) => {
        const user = (window.usuaris || []).find(u => u.id_usuari === loan.id_usuari);
        const doc = (window.documents || []).find(d => d.id_document === loan.id_document);
        
        const div = document.createElement('div');
        Object.assign(div.style, cardStyle);
        div.onclick = () => { if(window.showLoanDetailsModal) window.showLoanDetailsModal(loan); };
        
        div.innerHTML = `<p style="margin:0;"><strong>${doc ? doc.titol : 'Llibre desconegut'}</strong> prestat a <strong>${user ? user.nom : 'Usuari desconegut'}</strong> (devolució: ${loan.data_devolucio})</p>`;
        return div;
    }));
  }

  box.appendChild(header);
  box.appendChild(content);
}

// Exportacions globals
window.handleGlobalSearch = handleGlobalSearch;
window.showGlobalSearchResults = showGlobalSearchResults;

/**
 * Realitza la cerca entre totes les entitats.
 * @param {string} query 
 * @returns {Object} Resultats de la cerca.
 */
function performSearch(query) {
    const bookResults = (window.documents || []).filter(d =>
        (d.titol || '').toLowerCase().includes(query) ||
        (d.autor || '').toLowerCase().includes(query) ||
        (d.isbn || '').toLowerCase().includes(query)
    );

    const userResults = (window.usuaris || []).filter(u =>
        (u.nom || '').toLowerCase().includes(query) ||
        (u.email || '').toLowerCase().includes(query) ||
        (u.codi_usuari || '').toLowerCase().includes(query)
    );

    const loanResults = (window.prestecs || []).filter(p => {
        const user = (window.usuaris || []).find(u => u.id_usuari === p.id_usuari);
        const doc = (window.documents || []).find(d => d.id_document === p.id_document);
        return (user && (user.nom || '').toLowerCase().includes(query)) ||
               (doc && (doc.titol || '').toLowerCase().includes(query));
    });

    return {
        bookResults,
        userResults,
        loanResults,
        hasResults: bookResults.length > 0 || userResults.length > 0 || loanResults.length > 0
    };
}