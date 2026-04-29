/**
 * @fileoverview Lògica per gestionar la pàgina 'Extra', que s'encarrega de les configuracions
 * administratives com armaris, idiomes, matèries i gèneres.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Si la BD ja estava carregada, renderitzam
    if (window.DB && window.DB.idiomas && window.DB.idiomas.length > 0) {
        initExtraPage();
    } else {
        // Si no, esperam a l'esdeveniment
        document.addEventListener('db-loaded', initExtraPage);
    }
});

let currentTab = 'armaris';

// Inicialitza la pàgina extra.
function initExtraPage() {
    setupTabs();
    renderCurrentTab();
}

// Configura el comportament de les pestanyes
function setupTabs() {
    const tabs = document.querySelectorAll('.extra-tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Actualitza l'estat actiu de la interfície d'usuari
            tabs.forEach(t => {
                t.classList.remove('bg-primary', 'text-white');
                t.classList.add('bg-white', 'text-slate-600', 'dark:bg-surface-dark', 'dark:text-slate-400');
            });
            tab.classList.remove('bg-white', 'text-slate-600', 'dark:bg-surface-dark', 'dark:text-slate-400');
            tab.classList.add('bg-primary', 'text-white');
            
            // Canvia el contingut
            currentTab = tab.dataset.tab;
            renderCurrentTab();
        });
    });
}

function renderCurrentTab() {
    const container = document.getElementById('extra-content-area');
    container.innerHTML = ''; // Neteja el contingut actual

    switch (currentTab) {
        case 'armaris':
            renderArmaris(container);
            break;
        case 'idiomes':
            renderIdiomes(container);
            break;
        case 'materies':
            renderMateries(container);
            break;
        case 'generes':
            renderGeneres(container);
            break;
    }
}

// ARMARIS
function renderArmaris(container) {
    const section = createSectionLayout('Gestió d\'Armaris', 'Afegeix nous armaris i ubicacions.');
    
    // Formulari
    const form = document.createElement('form');
    form.className = 'grid grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg mb-6';
    form.innerHTML = `
        <input type="text" id="armari-codi" placeholder="Codi (ex: A1)" class="rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark text-sm" required>
        <input type="text" id="armari-nom" placeholder="Nom (ex: Armari Central)" class="rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark text-sm" required>
        <input type="text" id="armari-ubicacio" placeholder="Ubicació (ex: Planta 0)" class="rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark text-sm" required>
        <button type="submit" class="bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-600 transition-colors">Afegir Armari</button>
    `;
    
    // Afegir armari
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codi = document.getElementById('armari-codi').value;
        const nom = document.getElementById('armari-nom').value;
        const ubicacio = document.getElementById('armari-ubicacio').value;
        
        try {
            await window.DB.actions.addArmari(codi, nom, ubicacio);
            form.reset();
            renderCurrentTab(); // Refresca la llista d'armaris
            if (window.showTempNotification) window.showTempNotification('Armari afegit correctament', 'success');
        } catch (err) {
            if (window.showTempNotification) window.showTempNotification('Error afegint armari', 'error');
            else alert('Error afegint armari');
        }
    });
    
    section.appendChild(form);

    // Llista
    const listContainer = document.createElement('div');
    listContainer.className = 'grid grid-cols-3 gap-4';
    
    // Renderitza cada armari
    (window.armaris || []).forEach(armari => {
        const card = document.createElement('div');
        card.className = 'bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex justify-between items-start group hover:shadow-md transition-shadow';
        card.innerHTML = `
            <div>
                <div class="flex items-center gap-2 mb-1">
                    <span class="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-mono px-1.5 py-0.5 rounded">${armari.codi_armari || '??'}</span>
                    <h4 class="font-medium text-slate-900 dark:text-white">${armari.nom_armari}</h4>
                </div>
                <p class="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]">location_on</span> ${armari.ubicacio}
                </p>
            </div>
            <button class="delete-btn text-slate-400 hover:text-red-500 transition-colors p-1" title="Eliminar">
                <span class="material-symbols-outlined text-[20px]">delete</span>
            </button>
        `;
        // Eliminar armari amb confirmació
        card.querySelector('.delete-btn').addEventListener('click', () => {
            showConfirmationModal(
                'Eliminar Armari',
                `Estàs segur que vols eliminar l'armari "${armari.nom_armari}"?`,
                () => {
                    window.DB.actions.deleteArmari(armari.id_armari)
                        .then(() => {
                            renderCurrentTab();
                            if (window.showTempNotification) window.showTempNotification('Armari eliminat', 'success');
                        });
                }
            );
        });
        
        listContainer.appendChild(card);
    });
    
    section.appendChild(listContainer);
    container.appendChild(section);
}

// IDIOMES
function renderIdiomes(container) {
    const section = createSectionLayout('Gestió d\'Idiomes', 'Defineix els idiomes disponibles per als documents.');
    
    // Formulari
    const form = document.createElement('form');
    form.className = 'flex gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg mb-6';
    form.innerHTML = `
        <input type="text" id="idioma-nom" placeholder="Nou Idioma (ex: Japonès)" class="flex-1 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark text-sm" required>
        <button type="submit" class="bg-primary text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-blue-600 transition-colors">Afegir</button>
    `;
    
    // Afegir idioma
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nom = document.getElementById('idioma-nom').value;
        try {
            await window.DB.actions.addIdioma(nom);
            form.reset();
            renderCurrentTab();
            if (window.showTempNotification) window.showTempNotification('Idioma afegit', 'success');
        } catch (err) {
            if (window.showTempNotification) window.showTempNotification('Error afegint idioma', 'error');
            else alert('Error afegint idioma');
        }
    });
    
    section.appendChild(form);

    // Llista
    const listContainer = document.createElement('div');
    listContainer.className = 'grid grid-cols-6 gap-3';
    
    // Renderitza cada idioma
    (window.idiomas || []).forEach(idioma => {
        const card = document.createElement('div');
        card.className = 'bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex justify-between items-center group hover:border-primary/50 transition-colors';
        card.innerHTML = `
            <span class="font-medium text-slate-700 dark:text-slate-200">${idioma.tipus_idioma}</span>
            <button class="delete-btn text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" title="Eliminar">
                <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
        `;
        
        // Eliminar idioma amb confirmació
        card.querySelector('.delete-btn').addEventListener('click', () => {
            showConfirmationModal(
                'Eliminar Idioma',
                `Estàs segur que vols eliminar l'idioma "${idioma.tipus_idioma}"?`,
                () => {
                    window.DB.actions.deleteIdioma(idioma.id_idioma)
                        .then(() => {
                            renderCurrentTab();
                            if (window.showTempNotification) window.showTempNotification('Idioma eliminat', 'success');
                        });
                }
            );
        });
        
        listContainer.appendChild(card);
    });
    
    section.appendChild(listContainer);
    container.appendChild(section);
}

// MATERIES
function renderMateries(container) {
    const section = createSectionLayout('Gestió de Matèries', 'Classificació CDU i temàtiques.');
    
    // Formulari
    const form = document.createElement('form');
    form.className = 'grid grid-cols-[1fr_2fr_auto] gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg mb-6';
    form.innerHTML = `
        <input type="text" id="materia-cdu" placeholder="CDU (ex: 500)" class="rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark text-sm" required>
        <input type="text" id="materia-nom" placeholder="Nom de la matèria (ex: Ciències Pures)" class="rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark text-sm" required>
        <button type="submit" class="bg-primary text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-blue-600 transition-colors">Afegir Matèria</button>
    `;
    
    // Afegir matèria
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cdu = document.getElementById('materia-cdu').value;
        const nom = document.getElementById('materia-nom').value;
        
        try {
            await window.DB.actions.addMateria(cdu, nom);
            form.reset();
            renderCurrentTab();
            if (window.showTempNotification) window.showTempNotification('Matèria afegida', 'success');
        } catch (err) {
            if (window.showTempNotification) window.showTempNotification('Error afegint matèria', 'error');
            else alert('Error afegint matèria');
        }
    });
    
    section.appendChild(form);

    // Llista
    const listContainer = document.createElement('div');
    listContainer.className = 'grid grid-cols-3 gap-3';
    
    // Renderitza cada matèria
    (window.materias || []).forEach(materia => {
        const card = document.createElement('div');
        card.className = 'bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex justify-between items-center group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors';
        card.innerHTML = `
            <div class="flex items-center gap-4">
                <span class="bg-primary/10 text-primary font-mono font-bold px-2 py-1 rounded text-xs w-12 text-center">${materia.cdu}</span>
                <span class="font-medium text-slate-900 dark:text-white">${materia.nom}</span>
            </div>
            <button class="delete-btn text-slate-400 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100" title="Eliminar">
                <span class="material-symbols-outlined text-[20px]">delete</span>
            </button>
        `;
        
        // Eliminar matèria amb confirmació
        card.querySelector('.delete-btn').addEventListener('click', () => {
            showConfirmationModal(
                'Eliminar Matèria',
                `Estàs segur que vols eliminar la matèria "${materia.nom}"?`,
                () => {
                    window.DB.actions.deleteMateria(materia.id_materia)
                        .then(() => {
                            renderCurrentTab();
                            if (window.showTempNotification) window.showTempNotification('Matèria eliminada', 'success');
                        });
                }
            );
        });
        
        listContainer.appendChild(card);
    });
    
    section.appendChild(listContainer);
    container.appendChild(section);
}

// GENERES
function renderGeneres(container) {
    const section = createSectionLayout('Gestió de Gèneres', 'Categories literàries i tipus de documents.');
    
    // Formulari
    const form = document.createElement('form');
    form.className = 'flex gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg mb-6';
    form.innerHTML = `
        <input type="text" id="genere-nom" placeholder="Nou Gènere (ex: Novel·la Negra)" class="flex-1 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark text-sm" required>
        <button type="submit" class="bg-primary text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-blue-600 transition-colors">Afegir</button>
    `;
    
    // Afegir gènere
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nom = document.getElementById('genere-nom').value;
        try {
            await window.DB.actions.addGenere(nom);
            form.reset();
            renderCurrentTab();
            if (window.showTempNotification) window.showTempNotification('Gènere afegit', 'success');
        } catch (err) {
            if (window.showTempNotification) window.showTempNotification('Error afegint gènere', 'error');
            else alert('Error afegint gènere');
        }
    });
    
    section.appendChild(form);

    // Llista
    const listContainer = document.createElement('div');
    listContainer.className = 'grid grid-cols-5 gap-3';
    
    // Renderitza cada gènere
    (window.generes || []).forEach(genere => {
        const card = document.createElement('div');
        card.className = 'bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex justify-between items-center group hover:border-purple-300 transition-colors';
        card.innerHTML = `
            <span class="font-medium text-slate-700 dark:text-slate-200 truncate pr-2" title="${genere.tipus_genere}">${genere.tipus_genere}</span>
            <button class="delete-btn text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0" title="Eliminar">
                <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
        `;
        
        // Eliminar gènere amb confirmació
        card.querySelector('.delete-btn').addEventListener('click', () => {
            showConfirmationModal(
                'Eliminar Gènere',
                `Estàs segur que vols eliminar el gènere "${genere.tipus_genere}"?`,
                () => {
                    window.DB.actions.deleteGenere(genere.id_genere)
                        .then(() => {
                            renderCurrentTab();
                            if (window.showTempNotification) window.showTempNotification('Gènere eliminat', 'success');
                        });
                }
            );
        });
        
        listContainer.appendChild(card);
    });
    
    section.appendChild(listContainer);
    container.appendChild(section);
}

// Funcion que crea la capçalera de cada secció (armaris, idiomes, matèries, gèneres)
function createSectionLayout(title, subtitle) {
    const div = document.createElement('div');
    div.className = 'animate-fade-in';
    div.innerHTML = `
        <div class="mb-6">
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">${title}</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">${subtitle}</p>
        </div>
    `;
    return div;
}
