/**
 * @fileoverview Punt d'entrada principal de l'aplicació.
 * Inicialitza l'aplicació, configura els escoltadors d'esdeveniments i gestiona la renderització inicial.
 */

import { renderBookTable, renderLoansTable, renderUsersTable } from './tables.js';
import { handleImport } from './import.js';

document.addEventListener('DOMContentLoaded', () => {
    // Escolta l'esdeveniment de base de dades carregada des de data.js
    document.addEventListener('db-loaded', () => {
        console.log("UI: Base de dades carregada, renderitzant...");
        initApp();
    });
});

// Inicialitza l'aplicació un cop s'han carregat les dades
function initApp() {
  // 1. Inicialització del Tauler
  if (window.updateDashboardCounts) window.updateDashboardCounts();
  if (window.renderOverdueWidget) window.renderOverdueWidget();

  // 2. Configuració de la cerca global
  setupGlobalSearch();

  // 3. Configuració dels disparadors de modals
  setupModalTriggers();

  // 4. Configuració del menú mòbil
  setupMobileMenu();

  // 5. Configuració dels filtres de taula
  setupTableFilters();

  // 5. Renderització inicial de les taules de funcions extra
  if (document.getElementById('books-table-body')) renderBookTable();
  if (document.getElementById('loans-table-body')) renderLoansTable();
  if (document.getElementById('users-table-body')) renderUsersTable();

  // Exposa les funcions de renderització globalment per al seu ús en altres mòduls
  window.renderBookTable = renderBookTable;
  window.renderLoansTable = renderLoansTable;
  window.renderUsersTable = renderUsersTable;
}

// Configura els escoltadors d'esdeveniments per a la barra de cerca global.
function setupGlobalSearch() {
  const globalSearchInput = document.getElementById('global-search');

  if (globalSearchInput && window.handleGlobalSearch) {
    globalSearchInput.addEventListener('input', window.handleGlobalSearch);
  }
}

// Configura els escoltadors d'esdeveniments per als botons que obren modals.
function setupModalTriggers() {
  const triggers = [
    { id: 'register-loan-btn', action: () => window.showRegisterLoanModal && window.showRegisterLoanModal() },
    { id: 'return-loan-btn', action: () => window.showReturnLoanModal && window.showReturnLoanModal() },
    { id: 'add-book-btn', action: () => window.showAddBookModal && window.showAddBookModal() },
    { id: 'add-user-btn', action: () => window.showAddUserModal && window.showAddUserModal() },
    { id: 'view-all-overdue-btn', action: () => window.showAllOverdueModal && window.showAllOverdueModal() },
    // Disparadors d'importació
    { 
      id: 'import-books-btn', 
      action: () => window.showImportModal && window.showImportModal('books', (file) => handleImport(file, 'books')) 
    },
    { 
      id: 'import-users-btn', 
      action: () => window.showImportModal && window.showImportModal('users', (file) => handleImport(file, 'users')) 
    }
  ];

  triggers.forEach(({ id, action }) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        action();
      });
    }
  });
}

// Configura els escoltadors d'esdeveniments per als filtres de taula (Cerca, Selecció, etc.)
function setupTableFilters() {
  // Filtres de Llibres
  const filterGenre = document.getElementById('filter-genre');
  const filterStatus = document.getElementById('filter-status');
  const catalogSearchInput = document.getElementById('catalog-search');
  const clearFiltersBtn = document.getElementById('clear-filters-btn');

  // Funcio per mostrar o amagar el boto de netejar filtres
  function updateClearButtonVisibility() {
    if (!clearFiltersBtn) return;
    const hasSearch = catalogSearchInput && catalogSearchInput.value.trim() !== '';
    const hasGenre = filterGenre && filterGenre.value !== '';
    const hasStatus = filterStatus && filterStatus.value !== '';
    
    if (hasSearch || hasGenre || hasStatus) {
      clearFiltersBtn.classList.remove('hidden');
    } else {
      clearFiltersBtn.classList.add('hidden');
    }
  }

  // Esbora els filtres i renderitza la taula
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      if (catalogSearchInput) catalogSearchInput.value = '';
      if (filterGenre) filterGenre.value = '';
      if (filterStatus) filterStatus.value = '';
      renderBookTable();
      updateClearButtonVisibility();
    });
  }

  if (filterGenre) {
    // Emplena els gèneres
    if (window.generes) {
        window.generes.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.id_genere;
        opt.textContent = g.tipus_genere;
        filterGenre.appendChild(opt);
        });
    }
    filterGenre.addEventListener('change', () => {
      renderBookTable();
      updateClearButtonVisibility();
    });
  }

  if (filterStatus) {
    filterStatus.addEventListener('change', () => {
      renderBookTable();
      updateClearButtonVisibility();
    });
  }

  if (catalogSearchInput) {
    catalogSearchInput.addEventListener('input', () => {
      renderBookTable();
      updateClearButtonVisibility();
    });
  }

  // Filtres de Préstecs
  const loanSearchInput = document.getElementById('loan-search');
  const filterLoanStatus = document.getElementById('filter-loan-status');

  if (loanSearchInput) {
    loanSearchInput.addEventListener('input', renderLoansTable);
  }
  if (filterLoanStatus) {
    filterLoanStatus.addEventListener('change', renderLoansTable);
  }

  // Filtres d'Usuaris
  const userSearchInput = document.getElementById('user-search');
  const filterUserRole = document.getElementById('filter-user-role');
  const filterUserStatus = document.getElementById('filter-user-status');

  if (userSearchInput) {
    userSearchInput.addEventListener('input', renderUsersTable);
  }
  if (filterUserRole) {
    filterUserRole.addEventListener('change', renderUsersTable);
  }
  if (filterUserStatus) {
    filterUserStatus.addEventListener('change', renderUsersTable);
  }
}

// Configura la funcionalitat del menú mòbil
function setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    
    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('-translate-x-full');
            
            // Crea un overlay si no existeix per tancar el menú al fer clic fora
            let overlay = document.getElementById('sidebar-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'sidebar-overlay';
                overlay.className = 'fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity';
                document.body.appendChild(overlay);
                
                overlay.addEventListener('click', () => {
                    sidebar.classList.add('-translate-x-full');
                    overlay.classList.add('hidden');
                });
            }
            
            if (!sidebar.classList.contains('-translate-x-full')) {
                overlay.classList.remove('hidden');
            } else {
                overlay.classList.add('hidden');
            }
        });
    }
}
