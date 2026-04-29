/**
 * @fileoverview Lògica per crear i gestionar tots els modals de l'aplicació.
 * Inclou modals per a registre, edició, detalls, confirmació i notificacions.
 */

import { parseDateNoTZ, getDocumentById, createModal } from './utils.js';

/**
 * Mostra una notificació temporal al centre de la pantalla.
 * @param {string} message 
 * @param {string} type - 'success' o 'error'
 */
export function showTempNotification(message, type = 'success') {
  const notif = document.getElementById('temp-notification');
  if (notif) {
    if (notif._timeout) clearTimeout(notif._timeout);
    if (notif._hideTimeout) clearTimeout(notif._hideTimeout);

    notif.className = ''; 
    const isError = type === 'error';
    const icon = isError ? 'error' : 'check_circle';
    
    notif.innerHTML = `<div class="flex items-center gap-3"><span class="material-symbols-outlined text-[20px]">${icon}</span><span>${message}</span></div>`;
    
    notif.classList.add('fixed', 'top-1/2', 'left-1/2', '-translate-x-1/2', '-translate-y-1/2', 'px-6', 'py-4', 'rounded-xl', 'border', 'shadow-2xl', 'text-base', 'font-medium', 'z-[10001]', 'transition-all', 'duration-300', 'transform');
    
    if (isError) {
      notif.classList.add('bg-red-50', 'dark:bg-red-900/60', 'text-red-800', 'dark:text-red-200', 'border-red-200', 'dark:border-red-700/50');
    } else {
      notif.classList.add('bg-emerald-50', 'dark:bg-emerald-900/60', 'text-emerald-800', 'dark:text-emerald-200', 'border-emerald-200', 'dark:border-emerald-700/50');
    }

    notif.classList.remove('hidden');
    notif.classList.add('scale-90', 'opacity-0');
    
    setTimeout(() => {
        notif.classList.remove('scale-90', 'opacity-0');
        notif.classList.add('scale-100', 'opacity-100');
    }, 10);

    notif._timeout = setTimeout(() => {
      notif.classList.remove('scale-100', 'opacity-100');
      notif.classList.add('scale-90', 'opacity-0');
      notif._hideTimeout = setTimeout(() => notif.classList.add('hidden'), 300);
    }, 3000);
  }
}
window.showTempNotification = showTempNotification;

// MODALS DE PRÉSTECS

// Mostra el modal per registrar un nou préstec
function showRegisterLoanModal() {
  const { overlay, box, closeModal } = createModal('', 'min(500px, 95%)');

  const header = createModalHeader('Registrar Préstec');
  const form = document.createElement('div');
  Object.assign(form.style, { display: 'flex', flexDirection: 'column', gap: '16px' });

  // Mapes per cerca ràpida (nom -> id)
  const bookMap = new Map();
  const userMap = new Map();

  // 1. Selecció de llibre
  const bookInputGroup = createDatalistInput('Seleccionar Llibre', 'Escriu el títol del llibre...', 'book-list');
  const bookDatalist = bookInputGroup.datalist;
  
  (window.documents || []).forEach(doc => {
    // Filtra: exclou llibres "exclosos de préstec" o ja prestats
    if (doc.exclos_prestec === true) return;
    const isBookLoaned = (window.prestecs || []).some(p => p.id_document === doc.id_document);
    if (isBookLoaned) return;
    
    const option = document.createElement('option');
    option.value = doc.titol;
    bookDatalist.appendChild(option);
    bookMap.set(doc.titol, doc.id_document);
  });

  // 2. Selecció d'alumne
  const userInputGroup = createDatalistInput('Seleccionar Alumne', 'Escriu el nom de l\'alumne...', 'user-list');
  const userDatalist = userInputGroup.datalist;
  
  (window.usuaris || []).forEach(usu => {
    // Filtra: exclou usuaris bloquejats
    if (usu.blocked) return;

    const displayText = usu.nom + ' (' + usu.email + ')';
    const option = document.createElement('option');
    option.value = displayText;
    userDatalist.appendChild(option);
    userMap.set(displayText, usu.id_usuari);
  });

  // 3. Data de devolució
  const dateLabel = document.createElement('label'); 
  dateLabel.textContent = 'Data de Devolució';
  Object.assign(dateLabel.style, { fontSize: '14px', fontWeight: '500' });
  
  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  Object.assign(dateInput.style, { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' });
  
  // Per defecte +7 dies
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 7);
  dateInput.value = defaultDate.toISOString().split('T')[0];

  // Botons
  const buttons = createActionButtons('Registrar', () => {
    const bookTitle = bookInputGroup.input.value.trim();
    const userDisplay = userInputGroup.input.value.trim();
    const dataDevolucio = dateInput.value;
    
    const idDocument = bookMap.get(bookTitle);
    const idUsuari = userMap.get(userDisplay);
    
    if (!idDocument || !idUsuari || !dataDevolucio) {
      window.showTempNotification('Si us plau, selecciona un llibre i un alumne vàlids i omple la data.', 'error');
      return;
    }
    
    const newPrestec = {
      id_prestec: Date.now(),
      id_document: idDocument,
      id_usuari: idUsuari,
      data_prestec: new Date().toISOString().split('T')[0],
      data_devolucio: dataDevolucio
    };
    
    // Afegir el préstec a la base de dades
    window.DB.actions.addPrestec(newPrestec).then(() => {
        if (window.updateDashboardCounts) window.updateDashboardCounts();
        if (window.renderOverdueWidget) window.renderOverdueWidget();
        if (window.renderBookTable) window.renderBookTable(); // Actualitza l'estat a la taula de llibres
        if (window.renderLoansTable) window.renderLoansTable(); // Actualitza la taula de préstecs
        
        closeModal();
        if (window.showTempNotification) window.showTempNotification('Préstec registrat correctament!', 'success');
    }).catch(err => {
        console.error(err);
        if (window.showTempNotification) window.showTempNotification('Error al registrar el préstec.', 'error');
    });
  }, closeModal);

  form.appendChild(bookInputGroup.container);
  form.appendChild(userInputGroup.container);
  form.appendChild(dateLabel);
  form.appendChild(dateInput);

  box.appendChild(header);
  box.appendChild(form);
  box.appendChild(buttons);
}

// Mostra el modal per retornar un préstec actiu
function showReturnLoanModal() {
  const { overlay, box, closeModal } = createModal('', 'min(600px, 95%)');

  const header = createModalHeader('Retornar Préstec');
  const form = document.createElement('div');
  Object.assign(form.style, { display: 'flex', flexDirection: 'column', gap: '16px' });

  const loanMap = new Map();

  const loanInputGroup = createDatalistInput('Seleccionar Préstec a Retornar', 'Escriu el títol del llibre o nom de l\'alumne...', 'loan-list');
  const loanDatalist = loanInputGroup.datalist;
  
  (window.prestecs || []).forEach(p => {
    const doc = getDocumentById(p.id_document) || { titol: 'Desconegut' };
    const usu = (window.usuaris || []).find(u => u.id_usuari === p.id_usuari) || { nom: 'Desconegut' };
    const displayText = `${doc.titol} - ${usu.nom} (${p.data_prestec} a ${p.data_devolucio})`;
    const option = document.createElement('option');
    option.value = displayText;
    loanDatalist.appendChild(option);
    loanMap.set(displayText, p.id_prestec);
  });

  const buttons = createActionButtons('Retornar', () => {
    const loanDisplay = loanInputGroup.input.value.trim();
    const idPrestec = loanMap.get(loanDisplay);
    if (!idPrestec) {
      window.showTempNotification('Si us plau, selecciona un préstec vàlid per retornar.', 'error');
      return;
    }
    window.DB.actions.removePrestec(idPrestec).then(() => {
        if (window.updateDashboardCounts) window.updateDashboardCounts();
        if (window.renderOverdueWidget) window.renderOverdueWidget();
        if (window.renderBookTable) window.renderBookTable();
        if (window.renderLoansTable) window.renderLoansTable(); // Actualitza la taula de préstecs després de retornar
        
        closeModal();
        if (window.showTempNotification) window.showTempNotification('Préstec retornat correctament!', 'success');
    }).catch(err => {
        console.error(err);
        if (window.showTempNotification) window.showTempNotification('Error al retornar el préstec.', 'error');
    });
  }, closeModal, '#10b981');

  form.appendChild(loanInputGroup.container);
  box.appendChild(header);
  box.appendChild(form);
  box.appendChild(buttons);
}

// MODALS DE LLIBRES

/**
 * Mostra el formulari per afegir o editar un llibre manualment.
 * @param {Object|null} prefillData - Dades per preomplir el formulari (per a edició).
 */
function showManualBookForm(prefillData = null) {
  const langMap = new Map();
  const armMap = new Map();
  const genreMap = new Map();
  const materiaMap = new Map();

  const { overlay, box, closeModal } = createModal('', 'min(700px, 90%)');

  const header = createModalHeader(prefillData ? 'Verificar i Afegir Llibre' : 'Afegir Nou Llibre');
  
  const form = document.createElement('div');
  Object.assign(form.style, {
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', alignItems: 'start',
      maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px'
  });

  // Crea els camps
  const title = createInputField('Títol', 'Títol del llibre', prefillData ? prefillData.title : '', 2, 'text', true);
  const subtitle = createInputField('Subtítol', 'Subtítol (opcional)', prefillData ? prefillData.subtitle : '', 2);
  const author = createInputField('Autor', 'Nom de l\'autor', prefillData ? prefillData.author : '', 2, 'text', true);
  const isbn = createInputField('ISBN', 'ISBN-10 o ISBN-13', prefillData ? prefillData.isbn : '', 1, 'text', true);
  const year = createInputField('Any de Publicació', 'Any', prefillData ? prefillData.year : '', 1, 'number', true);
  const editorial = createInputField('Editorial', 'Nom de l\'editorial', prefillData ? prefillData.publisher : '', 1);
  const edition = createInputField('Edició', 'Ex: 1a, 2a...', prefillData ? prefillData.edition : '1a', 1);
  const collection = createInputField('Col·lecció', 'Nom de la col·lecció', prefillData ? prefillData.collection : '', 1);

  // Idioma amb Datalist
  const langInputGroup = createDatalistInput('Idioma', 'Escriu l\'idioma...', 'lang-list', true);
  const langInput = langInputGroup.input;
  langInputGroup.container.style.gridColumn = 'span 1';
  if (prefillData && prefillData.id_idioma) {
      const found = (window.idiomas || []).find(i => i.id_idioma === prefillData.id_idioma);
      if (found) langInput.value = found.tipus_idioma;
  }
  (window.idiomas || []).forEach(i => {
    const option = document.createElement('option');
    option.value = i.tipus_idioma;
    langInputGroup.datalist.appendChild(option);
    langMap.set(i.tipus_idioma, i.id_idioma);
  });

  // Armari amb Datalist
  const armInputGroup = createDatalistInput('Armari', 'Escriu l\'armari...', 'arm-list', true);
  const armInput = armInputGroup.input;
  armInputGroup.container.style.gridColumn = 'span 1';
  if (prefillData && prefillData.id_armari) {
      const found = (window.armaris || []).find(a => a.id_armari === prefillData.id_armari);
      if (found) armInput.value = found.nom_armari + ' (' + found.codi_armari + ')';
  }
  (window.armaris || []).forEach(a => {
    const displayText = a.nom_armari + ' (' + a.codi_armari + ')';
    const option = document.createElement('option');
    option.value = displayText;
    armInputGroup.datalist.appendChild(option);
    armMap.set(displayText, a.id_armari);
  });

  // Gènere amb Datalist
  const genreInputGroup = createDatalistInput('Gènere', 'Selecciona el gènere...', 'genre-list', true);
  const genreInput = genreInputGroup.input;
  genreInputGroup.container.style.gridColumn = 'span 1';
  if (prefillData && prefillData.id_genere) {
      const found = (window.generes || []).find(g => g.id_genere === prefillData.id_genere);
      if (found) genreInput.value = found.tipus_genere;
  }
  (window.generes || []).forEach(g => {
    const option = document.createElement('option');
    option.value = g.tipus_genere;
    genreInputGroup.datalist.appendChild(option);
    genreMap.set(g.tipus_genere, g.id_genere);
  });

  // Matèria amb Datalist
  const matInputGroup = createDatalistInput('Matèria', 'Selecciona la matèria...', 'mat-list', true);
  const matInput = matInputGroup.input;
  matInputGroup.container.style.gridColumn = 'span 1';
  if (prefillData && prefillData.id_materia) {
      const found = (window.materias || []).find(m => m.id_materia === prefillData.id_materia);
      if (found) matInput.value = found.nom + ' (' + found.cdu + ')';
  }
  (window.materias || []).forEach(m => {
    const option = document.createElement('option');
    option.value = m.nom + ' (' + m.cdu + ')';
    matInputGroup.datalist.appendChild(option);
    materiaMap.set(option.value, m.id_materia);
  });

  // Observacions
  const obsLabel = document.createElement('label'); obsLabel.textContent = 'Observacions';
  Object.assign(obsLabel.style, { fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '4px' });
  const obsInput = document.createElement('textarea');
  obsInput.placeholder = 'Observacions addicionals...';
  obsInput.value = prefillData ? prefillData.observacions || '' : '';
  Object.assign(obsInput.style, { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', gridColumn: 'span 2', minHeight: '60px' });
  const obsCont = document.createElement('div');
  obsCont.style.gridColumn = 'span 2';
  obsCont.appendChild(obsLabel);
  obsCont.appendChild(obsInput);

  // Checkbox d'exclusió
  const exclCont = document.createElement('div');
  Object.assign(exclCont.style, { gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px' });
  const exclInput = document.createElement('input');
  exclInput.type = 'checkbox';
  exclInput.id = 'excl-check';
  exclInput.checked = prefillData ? prefillData.exclos_prestec === true : false;
  const exclLabel = document.createElement('label');
  exclLabel.textContent = 'Exclòs de préstec';
  exclLabel.htmlFor = 'excl-check';
  exclLabel.style.fontSize = '14px';
  exclCont.appendChild(exclInput);
  exclCont.appendChild(exclLabel);

  // Contenidor de missatge d'error
  const errorMsg = document.createElement('div');
  errorMsg.id = 'form-error-msg';
  Object.assign(errorMsg.style, { 
      display: 'none', gridColumn: 'span 2', color: '#dc2626', backgroundColor: '#fef2f2', 
      border: '1px solid #fee2e2', borderRadius: '6px', padding: '10px', fontSize: '14px', marginTop: '10px' 
  });
  errorMsg.innerHTML = '<span class="material-symbols-outlined" style="vertical-align: bottom; font-size: 18px; margin-right: 4px;">error</span> Si us plau, omple tots els camps obligatoris marcats amb *.';

  // Afegeix els camps
  form.append(
      title.container, subtitle.container, author.container, isbn.container, year.container,
      editorial.container, edition.container, collection.container, langInputGroup.container,
      armInputGroup.container, genreInputGroup.container, matInputGroup.container,
      obsCont, exclCont, errorMsg
  );

  // Acció de guardar
  const saveAction = () => {
    // Reinicia errors
    errorMsg.style.display = 'none';
    const inputsToCheck = [title.input, author.input, isbn.input, year.input, langInput, armInput, genreInput, matInput];
    inputsToCheck.forEach(inp => inp.style.borderColor = '#d1d5db');

    // Recull valors
    const titol = title.input.value.trim();
    const autor = author.input.value.trim();
    const isbnVal = isbn.input.value.trim();
    const anyPublicacio = parseInt(year.input.value);
    
    // Obté els IDs
    const idIdioma = langMap.get(langInput.value.trim());
    const idArmari = armMap.get(armInput.value.trim());
    const idGenere = genreMap.get(genreInput.value.trim());
    const idMateria = materiaMap.get(matInput.value.trim());

    let hasError = false;
    if (!titol) { title.input.style.borderColor = '#ef4444'; hasError = true; }
    if (!autor) { author.input.style.borderColor = '#ef4444'; hasError = true; }
    if (!isbnVal) { isbn.input.style.borderColor = '#ef4444'; hasError = true; }
    if (!year.input.value) { year.input.style.borderColor = '#ef4444'; hasError = true; }
    if (!idIdioma) { langInput.style.borderColor = '#ef4444'; hasError = true; }
    if (!idArmari) { armInput.style.borderColor = '#ef4444'; hasError = true; }
    if (!idGenere) { genreInput.style.borderColor = '#ef4444'; hasError = true; }
    if (!idMateria) { matInput.style.borderColor = '#ef4444'; hasError = true; }

    if (hasError) {
      errorMsg.style.display = 'block';
      errorMsg.scrollIntoView({ behavior: 'smooth', block: 'end' });
      return;
    }

    const isEdit = !!(prefillData && prefillData.id);
    const newId = isEdit ? prefillData.id : Date.now();
    const newDocument = {
      id_document: newId,
      codi_document: 'DOC-' + String(newId).substring(6),
      isbn: isbnVal,
      observacions: obsInput.value.trim(),
      tipus_document: null,
      titol: titol,
      subtitol: subtitle.input.value.trim() || null,
      autor: autor,
      editorial: editorial.input.value.trim() || null,
      estat_registre: null,
      signatura: 'NEW-' + titol.substring(0,3).toUpperCase() + '-' + isbnVal.slice(-4),
      any_publicacio: anyPublicacio,
      edicio: edition.input.value.trim() || '1a',
      exclos_prestec: exclInput.checked,
      coleccio: collection.input.value.trim() || null,
      id_armari: idArmari,
      id_idioma: idIdioma,
      cover_url: prefillData && prefillData.cover ? prefillData.cover : null,
      data_alta: isEdit ? (prefillData.data_alta || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0]
    };
    
    const genresToAdd = [{ id_genere: idGenere }];
    const materiasToAdd = [{ id_materia: idMateria }];

    window.DB.actions.addDocument(newDocument, genresToAdd, materiasToAdd).then(() => {
        if (window.updateDashboardCounts) window.updateDashboardCounts();
        if (window.renderBookTable) window.renderBookTable();
        if (window.renderLoansTable) window.renderLoansTable(); // Assegura que els préstecs mostrin el títol actualitzat
        if (window.renderPopularCategories) window.renderPopularCategories();

        closeModal();
        if (window.showTempNotification) window.showTempNotification('Llibre guardat correctament!');
    });
  };

  const buttons = createActionButtons('Guardar Llibre', saveAction, closeModal, '#7c3aed');

  box.appendChild(header);
  box.appendChild(form);
  box.appendChild(buttons);
}

// Mostra el modal inicial per triar entre cerca per ISBN o entrada manual
function showAddBookModal() {
  const { overlay, box, closeModal } = createModal('', 'min(450px, 95%)');

  const header = document.createElement('div');
  header.style.textAlign = 'center';
  header.style.marginBottom = '24px';
  header.innerHTML = `
    <h3 style="margin: 0 0 8px 0; fontSize: 22px; fontWeight: 700;">Afegir Nou Llibre</h3>
    <p style="fontSize: 14px; color: #64748b; margin: 0;">Introdueix l\'ISBN per cercar automàticament les dades a OpenLibrary.</p>
  `;

  const content = document.createElement('div');
  Object.assign(content.style, { display: 'flex', flexDirection: 'column', gap: '20px' });

  // Input i botó de cerca
  const inputContainer = document.createElement('div');
  Object.assign(inputContainer.style, { display: 'flex', gap: '10px' });
  
  const isbnInput = document.createElement('input');
  isbnInput.type = 'text';
  isbnInput.placeholder = 'ISBN (ex: 9780132350884)';
  Object.assign(isbnInput.style, { flex: '1', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '15px', outline: 'none' });

  const searchBtn = document.createElement('button');
  searchBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px;">search</span>';
  Object.assign(searchBtn.style, { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', background: '#137fec', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' });
  
  inputContainer.append(isbnInput, searchBtn);

  // Missatge d'estat
  const statusMsg = document.createElement('div');
  Object.assign(statusMsg.style, { fontSize: '13px', marginTop: '-10px', minHeight: '20px' });

  // Botó d'entrada manual
  const manualBtn = document.createElement('button');
  manualBtn.textContent = 'Introduir dades manualment';
  Object.assign(manualBtn.style, { width: '100%', padding: '12px', background: 'transparent', border: '1px dashed #94a3b8', borderRadius: '8px', color: '#475569', cursor: 'pointer', transition: 'all 0.2s' });
  
  manualBtn.addEventListener('click', () => {
    closeModal();
    showManualBookForm();
  });

  const performSearch = async () => {
    const isbn = isbnInput.value.trim().replace(/-/g, '');
    if (!isbn) {
      statusMsg.textContent = 'Introdueix un ISBN vàlid.';
      statusMsg.style.color = '#ef4444';
      return;
    }

    statusMsg.textContent = 'Cercant a OpenLibrary...';
    statusMsg.style.color = '#3b82f6';
    searchBtn.disabled = true;

    // Consulta a OpenLibrary per obtenir les dades del llibre
    try {
      const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`);
      const data = await response.json();
      const key = `ISBN:${isbn}`;
      
      if (data[key]) {
        const bookData = data[key];
        const prefill = {
          title: bookData.title || '',
          author: bookData.authors ? bookData.authors.map(a => a.name).join(', ') : '',
          isbn: isbn,
          year: bookData.publish_date ? parseInt(bookData.publish_date) : '',
          cover: bookData.cover ? bookData.cover.large || bookData.cover.medium : null
        };
        // Intenta extreure l'any si parseInt falla amb una cadena complexa
        if (!prefill.year && bookData.publish_date) {
            const match = bookData.publish_date.match(/\d{4}/);
            if (match) prefill.year = parseInt(match[0]);
        }

        closeModal();
        showManualBookForm(prefill);
      } else {
        statusMsg.textContent = 'Llibre no trobat. Prova manualment.';
        statusMsg.style.color = '#ef4444';
      }
    } catch (err) {
      console.error(err);
      statusMsg.textContent = 'Error de connexió. Prova manualment.';
      statusMsg.style.color = '#ef4444';
    } finally {
      searchBtn.disabled = false;
    }
  };

  searchBtn.addEventListener('click', performSearch);
  isbnInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') performSearch(); });

  content.append(inputContainer, statusMsg, manualBtn);
  box.append(header, content);
}

// MODALS D'USUARIS

function showAddUserModal() {
  const { overlay, box, closeModal } = createModal('', 'min(400px, 95%)');
  const header = createModalHeader('Afegir Nou Alumne');
  const form = document.createElement('div');
  Object.assign(form.style, { display: 'flex', flexDirection: 'column', gap: '16px' });

  const nameInput = createInputField('Nom i Cognoms', 'Ex: Joan Garcia');
  const emailInput = createInputField('Correu Electrònic', 'Ex: joan.garcia@school.edu', '', 2, 'email');
  const roleSelect = createSelect('Rol', [
      { value: 'student', text: 'Alumne' },
      { value: 'teacher', text: 'Professor' },
  ]);

  // Automatic role assignment based on email
  emailInput.input.addEventListener('input', () => {
      const email = emailInput.input.value.trim().toLowerCase();
      if (email.includes('@alumne.iesllucmajor.org')) {
          roleSelect.select.value = 'student';
      } else if (email.includes('@iesllucmajor.org')) {
          roleSelect.select.value = 'teacher';
      }
  });

  const buttons = createActionButtons('Afegir', () => {
      const nom = nameInput.input.value.trim();
      const email = emailInput.input.value.trim();
      const rol = roleSelect.select.value;

      if (!nom || !email) {
          window.showTempNotification('Per favor, omple tots els camps.', 'error');
          return;
      }

      const newUser = {
          id_usuari: Date.now(),
          nom: nom,
          email: email,
          rol: rol,
          created_at: new Date().toISOString()
      };

      window.DB.actions.addUser(newUser).then(() => {
          if (window.renderUsersTable) window.renderUsersTable();
          if (window.updateDashboardCounts) window.updateDashboardCounts();
          closeModal();
          if (window.showTempNotification) window.showTempNotification('Usuari afegit correctament!', 'success');
      }).catch(err => {
          console.error(err);
          if (window.showTempNotification) window.showTempNotification('Error al afegir l\'usuari.', 'error');
      });
  }, closeModal);

  form.append(nameInput.container, emailInput.container, roleSelect.container);
  box.append(header, form, buttons);
}

//Mostra els detalls d'un usuari, incloent els seus préstecs actius
function showUserDetailsModal(user) {
    const { overlay, box, closeModal } = createModal('', 'min(600px, 95%)');

    const header = document.createElement('div');
    header.style.marginBottom = '20px';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';

    const h = document.createElement('h3');
    h.textContent = 'Detalls de l\'Usuari';
    Object.assign(h.style, { margin: '0', fontSize: '20px', fontWeight: '600' });
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
    Object.assign(closeBtn.style, { background: 'transparent', border: 'none', cursor: 'pointer' });
    closeBtn.onclick = closeModal;

    header.append(h, closeBtn);

    const content = document.createElement('div');
    Object.assign(content.style, { display: 'flex', flexDirection: 'column', gap: '24px' });

    const basicInfo = document.createElement('div');
    Object.assign(basicInfo.style, { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' });

    const createInfoItem = (label, value) => {
        const div = document.createElement('div');
        div.innerHTML = `<p style="font-size: 13px; color: #64748b; font-weight: 500; margin: 0 0 4px 0;">${label}</p><p style="font-size: 15px; color: #1e293b; font-weight: 600; margin: 0;">${value || '—'}</p>`;
        return div;
    };

    const roleLabels = { 'admin': 'Administrador', 'teacher': 'Professor', 'student': 'Alumne' };
    basicInfo.append(
        createInfoItem('Nom', user.nom),
        createInfoItem('Email', user.email),
        createInfoItem('Rol', roleLabels[user.rol] || 'Alumne'),
        createInfoItem('Data Registre', user.created_at ? new Date(user.created_at).toLocaleDateString() : '—')
    );

    // Prestecs actius
    const loansSection = document.createElement('div');
    loansSection.innerHTML = '<h4 style="margin: 0 0 12px 0; fontSize: 16px; fontWeight: 600; color: #334155;">Préstecs Actius</h4>';
    
    const userLoans = (window.prestecs || []).filter(p => p.id_usuari === user.id_usuari);
    if (userLoans.length === 0) {
        loansSection.innerHTML += '<div style="padding: 20px; text-align: center; color: #64748b; background-color: #f1f5f9; border-radius: 8px; font-size: 14px;">Aquest usuari no té préstecs actius.</div>';
    } else {
        const list = document.createElement('div');
        Object.assign(list.style, { display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' });
        
        userLoans.forEach(loan => {
            const doc = (window.documents || []).find(d => d.id_document === loan.id_document) || { titol: 'Desconegut' };
            const isOverdue = new Date(loan.data_devolucio) < new Date().setHours(0,0,0,0);
            
            const item = document.createElement('div');
            Object.assign(item.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' });
            item.onclick = () => showLoanDetailsModal(loan);
            
            item.innerHTML = `
                <div><p style="margin: 0; font-weight: 600; font-size: 14px; color: #1e293b;">${doc.titol}</p><p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">Prestat: ${loan.data_prestec}</p></div>
                <div style="text-align: right;"><p style="margin: 0; font-weight: 500; font-size: 13px; color: ${isOverdue ? '#ef4444' : '#10b981'};">${isOverdue ? 'Vençut' : 'Al dia'}</p><p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">Fins: ${loan.data_devolucio}</p></div>
            `;
            list.appendChild(item);
        });
        loansSection.appendChild(list);
    }

    content.append(basicInfo, loansSection);
    box.append(header, content);
}

/**
 * Crea una etiqueta i un camp d'entrada estàndard.
 * @param {string} label - El text de l'etiqueta.
 * @param {string} placeholder - Placeholder de l'input.
 * @param {string} value - Valor inicial.
 * @param {number} gridSpan - Columnes a ocupar en el grid.
 * @param {string} type - Tipus d'input (text, number, email, etc.).
 * @param {boolean} required - Si el camp és obligatori.
 * @returns {Object} { container, input }
 */
function createInputField(label, placeholder, value = '', gridSpan = 2, type = 'text', required = false) {
    const lbl = document.createElement('label'); 
    lbl.innerHTML = label + (required ? '<span style="color:#ef4444; margin-left:2px;">*</span>' : ''); 
    Object.assign(lbl.style, { fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '4px' });
    
    const inp = document.createElement('input');
    inp.type = type;
    inp.placeholder = placeholder;
    inp.value = value;
    Object.assign(inp.style, { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' });
    
    inp.addEventListener('input', () => {
      inp.style.borderColor = '#d1d5db';
      const errorMsg = document.getElementById('form-error-msg');
      if(errorMsg) errorMsg.style.display = 'none';
    });
    
    const container = document.createElement('div');
    container.style.gridColumn = `span ${gridSpan}`;
    container.appendChild(lbl);
    container.appendChild(inp);
    return { container, input: inp };
}

function createModalHeader(titleText) {
  const header = document.createElement('div');
  header.style.marginBottom = '20px';
  const h = document.createElement('h3');
  h.textContent = titleText;
  Object.assign(h.style, { margin: '0', fontSize: '20px', fontWeight: '600' });
  header.appendChild(h);
  return header;
}

function createDatalistInput(label, placeholder, listId, isRequired = false) {
  const container = document.createElement('div');
  const lbl = document.createElement('label');
  lbl.innerHTML = label + (isRequired ? '<span style="color:#ef4444; margin-left:2px;">*</span>' : '');
  Object.assign(lbl.style, { fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '4px' });

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;
  input.setAttribute('list', listId);
  Object.assign(input.style, { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' });

  const datalist = document.createElement('datalist');
  datalist.id = listId;

  container.append(lbl, input, datalist);
  return { container, input, datalist };
}

function createSelect(label, options) {
    const container = document.createElement('div');
    const lbl = document.createElement('label');
    lbl.textContent = label;
    Object.assign(lbl.style, { fontSize: '14px', fontWeight: '500' });
    const sel = document.createElement('select');
    Object.assign(sel.style, { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' });
    
    options.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.text;
        sel.appendChild(opt);
    });
    
    container.append(lbl, sel);
    return { container, select: sel };
}

function createActionButtons(confirmText, onConfirm, onCancel, confirmColor = '#137fec') {
  const buttons = document.createElement('div');
  Object.assign(buttons.style, { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' });

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel·lar';
  Object.assign(cancelBtn.style, { padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'transparent', cursor: 'pointer' });
  if (onCancel) cancelBtn.addEventListener('click', onCancel);

  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = confirmText;
  Object.assign(confirmBtn.style, { padding: '8px 16px', border: 'none', borderRadius: '6px', background: confirmColor, color: 'white', cursor: 'pointer' });
  confirmBtn.addEventListener('click', onConfirm);

  buttons.append(cancelBtn, confirmBtn);
  return buttons;
}

// CONFIRMACIÓ I NOTIFICACIONS

function showConfirmationModal(title, message, onConfirm, type = 'danger', confirmText = null) {
  const { overlay, box, closeModal } = createModal('', 'min(400px, 95%)');

  // Animation
  box.style.transform = 'scale(0.95)';
  box.style.opacity = '0';
  box.style.transition = 'all 0.2s ease-out';
  requestAnimationFrame(() => { box.style.transform = 'scale(1)'; box.style.opacity = '1'; });

  const content = document.createElement('div');
  content.className = 'flex flex-col gap-6 text-center items-center';

  const isDanger = type === 'danger';
  const iconDiv = document.createElement('div');
  iconDiv.className = `size-14 rounded-full flex items-center justify-center ${isDanger ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-primary/10 text-primary'}`;
  iconDiv.innerHTML = `<span class="material-symbols-outlined text-[32px]">${isDanger ? 'warning' : 'info'}</span>`;

  const textDiv = document.createElement('div');
  textDiv.className = 'flex flex-col gap-2';
  textDiv.innerHTML = `<h3 class="text-xl font-bold text-slate-900 dark:text-white">${title}</h3><p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">${message}</p>`;

  const btnGroup = document.createElement('div');
  btnGroup.className = 'flex gap-3 w-full';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel·lar';
  cancelBtn.className = 'flex-1 h-10 rounded-lg border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors';
  cancelBtn.onclick = closeModal;

  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = confirmText || (isDanger ? 'Eliminar' : 'Confirmar');
  confirmBtn.className = `flex-1 h-10 rounded-lg font-bold text-white shadow-sm transition-all ${isDanger ? 'bg-red-600 hover:bg-red-700 shadow-red-200 dark:shadow-none' : 'bg-primary hover:bg-primary/90 shadow-blue-200 dark:shadow-none'}`;
  confirmBtn.onclick = () => { onConfirm(); closeModal(); };

  btnGroup.append(cancelBtn, confirmBtn);
  content.append(iconDiv, textDiv, btnGroup);
  box.appendChild(content);
}

// NOTIFICACIONS I PRÉSTECS VENÇUTS

// Mostra el modal de notificacions amb dades dinàmiques de préstecs vençuts
function showNotificationsModal() {
  const { overlay, box, closeModal } = createModal('', 'min(400px, 95%)');

  const header = document.createElement('div');
  header.style.marginBottom = '20px';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';

  const h = document.createElement('h3'); 
  h.textContent = 'Notificacions'; 
  Object.assign(h.style, { margin: '0', fontSize: '20px', fontWeight: '600' });
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
  Object.assign(closeBtn.style, { background: 'transparent', border: 'none', cursor: 'pointer' });
  closeBtn.addEventListener('click', closeModal);

  header.appendChild(h);
  header.appendChild(closeBtn);

  const list = document.createElement('div');
  Object.assign(list.style, { display: 'flex', flexDirection: 'column', gap: '12px' });

  // 1. Comprova quants préstecs estan vençuts
  const overdueCount = (window.prestecs || []).filter(p => {
      const d = p && p.data_devolucio ? new Date(p.data_devolucio + 'T00:00:00') : null;
      return d && d < new Date().setHours(0,0,0,0);
  }).length;

  const notifications = [];

  if (overdueCount > 0) {
      notifications.push({
          title: 'Préstecs Vençuts',
          desc: `Hi ha ${overdueCount} llibre(s) pendent(s) de retorn.`, 
          time: 'Ara mateix',
          type: 'alert'
      });
  } else {
      notifications.push({
          title: 'Tot al dia',
          desc: 'No hi ha préstecs vençuts en aquest moment.',
          time: 'Ara mateix',
          type: 'info'
      });
  }

  notifications.forEach(notif => {
    const item = document.createElement('div');
    Object.assign(item.style, {
        padding: '12px', borderRadius: '8px',
        backgroundColor: notif.type === 'alert' ? '#fef2f2' : '#f8fafc',
        border: `1px solid ${notif.type === 'alert' ? '#fee2e2' : '#e2e8f0'}`
    });

    const top = document.createElement('div');
    Object.assign(top.style, { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' });

    const title = document.createElement('span');
    title.textContent = notif.title;
    Object.assign(title.style, { fontWeight: '600', fontSize: '14px', color: notif.type === 'alert' ? '#dc2626' : '#334155' });

    const time = document.createElement('span');
    time.textContent = notif.time;
    Object.assign(time.style, { fontSize: '12px', color: '#94a3b8' });

    top.append(title, time);

    const desc = document.createElement('p');
    desc.textContent = notif.desc;
    Object.assign(desc.style, { fontSize: '13px', color: '#64748b', margin: '0' });

    item.append(top, desc);
    list.appendChild(item);
  });

  box.append(header, list);
}

function showAllOverdueModal() {
  const { overlay, box, closeModal } = createModal('', 'min(600px, 95%)');

  const header = document.createElement('div');
  header.style.marginBottom = '20px';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';

  const h = document.createElement('h3'); 
  h.textContent = 'Tots els Préstecs Vençuts'; 
  Object.assign(h.style, { margin: '0', fontSize: '20px', fontWeight: '600' });
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
  Object.assign(closeBtn.style, { background: 'transparent', border: 'none', cursor: 'pointer' });
  closeBtn.addEventListener('click', closeModal);

  header.appendChild(h);
  header.appendChild(closeBtn);

  const list = document.createElement('div');
  Object.assign(list.style, { display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '60vh', overflowY: 'auto' });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = (window.prestecs || [])
    .map(p => Object.assign({}, p, { due: parseDateNoTZ(p.data_devolucio) }))
    .filter(p => p.due && p.due < today)
    .sort((a, b) => a.due - b.due);

  if (overdue.length === 0) {
    const empty = document.createElement('div');
    empty.textContent = 'No hi ha préstecs vençuts.';
    Object.assign(empty.style, { textAlign: 'center', padding: '20px', color: '#64748b' });
    list.appendChild(empty);
  } else {
    overdue.forEach(p => {
      const doc = getDocumentById(p.id_document) || { titol: '—' };
      const usu = (window.usuaris || []).find(u => u.id_usuari === p.id_usuari) || { nom: 'Usuari desconegut' };
      
      const item = document.createElement('div');
      Object.assign(item.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2' });

      const info = document.createElement('div');
      const title = document.createElement('div');
      title.textContent = doc.titol;
      Object.assign(title.style, { fontWeight: '600', color: '#1e293b' });
      
      const sub = document.createElement('div');
      const daysLate = Math.ceil((today - p.due) / (24 * 60 * 60 * 1000));
      sub.innerHTML = `${usu.nom} • <span style="color: #dc2626; font-weight: 500;">${daysLate} dia(s) tard</span>`;
      Object.assign(sub.style, { fontSize: '13px', color: '#64748b', marginTop: '2px' });

      info.append(title, sub);

      const actionBtn = document.createElement('button');
      actionBtn.textContent = 'Reclamar';
      Object.assign(actionBtn.style, { backgroundColor: 'white', border: '1px solid #fecaca', color: '#dc2626', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' });
      
      actionBtn.addEventListener('click', () => { 
        if (!window.EMAILJS_CONFIG || !window.emailjs || window.EMAILJS_CONFIG.PUBLIC_KEY.includes('PON_AQUI')) {
            window.showTempNotification("EmailJS no està configurat.", 'error');
            return;
        }

        const templateParams = {
            to_name: usu.nom,
            to_email: usu.email.trim(),
            book_title: doc.titol,
            days_late: daysLate,
        };
        
        const originalText = actionBtn.textContent;
        actionBtn.textContent = 'Enviant...';
        actionBtn.disabled = true;

        emailjs.send(window.EMAILJS_CONFIG.SERVICE_ID, window.EMAILJS_CONFIG.TEMPLATE_ID, templateParams)
            .then(() => {
                if (window.showTempNotification) {
                    window.showTempNotification(`Correu de reclamació enviat correctament a ${usu.nom}`, 'success');
                }
                actionBtn.textContent = 'Reclamat';
                actionBtn.style.color = '#059669';
                actionBtn.style.borderColor = '#a7f3d0';
            })
            .catch((err) => {
                console.error('FAILED...', err);
                if (window.showTempNotification) window.showTempNotification('Error enviant el correu.', 'error');
                actionBtn.textContent = originalText;
                actionBtn.disabled = false;
            });
      });

      item.append(info, actionBtn);
      list.appendChild(item);
    });
  }

  box.append(header, list);
}

function showBookDetailsModal(doc) {
  const { overlay, box, closeModal } = createModal('', 'min(600px, 95%)');

  const header = document.createElement('div');
  header.style.marginBottom = '20px';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'start';

  const h = document.createElement('h3'); 
  h.textContent = doc.titol; 
  Object.assign(h.style, { margin: '0', fontSize: '22px', fontWeight: '700', lineHeight: '1.3' });
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
  Object.assign(closeBtn.style, { background: 'transparent', border: 'none', cursor: 'pointer' });
  closeBtn.addEventListener('click', closeModal);

  const titleDiv = document.createElement('div');
  titleDiv.appendChild(h);
  if (doc.subtitol) {
    const sub = document.createElement('p');
    sub.textContent = doc.subtitol;
    Object.assign(sub.style, { fontSize: '16px', color: '#64748b', margin: '4px 0 0 0' });
    titleDiv.appendChild(sub);
  }

  header.append(titleDiv, closeBtn);

  const content = document.createElement('div');
  Object.assign(content.style, { display: 'grid', gridTemplateColumns: '150px 1fr', gap: '24px', marginBottom: '24px' });

  // Cover
  const coverDiv = document.createElement('div');
  Object.assign(coverDiv.style, {
      backgroundColor: '#e2e8f0', borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      aspectRatio: '2/3', backgroundSize: 'cover', backgroundPosition: 'center',
      backgroundImage: `url("${doc.cover_url || 'https://placehold.co/150x225?text=No+Cover'}")`
  });

  // Info
  const infoDiv = document.createElement('div');
  Object.assign(infoDiv.style, { display: 'flex', flexDirection: 'column', gap: '12px' });

  const createDetail = (label, value) => {
    if (!value) return null;
    const p = document.createElement('p');
    Object.assign(p.style, { margin: '0', fontSize: '14px' });
    p.innerHTML = `<span style="font-weight: 600; color: #475569;">${label}:</span> <span style="color: #1e293b;">${value}</span>`;
    return p;
  };

  const relGen = (window.document_genere || []).find(dg => dg.id_document === doc.id_document);
  const genreObj = relGen ? (window.generes || []).find(g => g.id_genere === relGen.id_genere) : null;
  
  const relMat = (window.document_materia || []).find(dm => dm.id_document === doc.id_document);
  const matObj = relMat ? (window.materias || []).find(m => m.id_materia === relMat.id_materia) : null;

  const langObj = (window.idiomas || []).find(i => i.id_idioma === doc.id_idioma);
  const armObj = (window.armaris || []).find(a => a.id_armari === doc.id_armari);

  const details = [
    createDetail('Autor', doc.autor),
    createDetail('ISBN', doc.isbn),
    createDetail('Editorial', doc.editorial),
    createDetail('Any', doc.any_publicacio),
    createDetail('Edició', doc.edicio),
    createDetail('Col·lecció', doc.coleccio),
    createDetail('Gènere', genreObj ? genreObj.tipus_genere : null),
    createDetail('Matèria', matObj ? matObj.nom : null),
    createDetail('Idioma', langObj ? langObj.tipus_idioma : null),
    createDetail('Ubicació', armObj ? `${armObj.nom_armari} (${armObj.codi_armari})` : null),
  ];

  details.forEach(d => { if (d) infoDiv.appendChild(d); });

  // Status
  const statusDiv = document.createElement('div');
  Object.assign(statusDiv.style, { marginTop: '8px', padding: '8px 12px', borderRadius: '6px', fontSize: '14px', fontWeight: '500', display: 'inline-block' });

  const isBookLoaned = (window.prestecs || []).some(p => p.id_document === doc.id_document);
  
  if (doc.exclos_prestec === true) {
      Object.assign(statusDiv.style, { backgroundColor: '#fef2f2', color: '#dc2626' });
      statusDiv.innerHTML = 'No disponible (Exclòs de préstec)';
  } else if (isBookLoaned) {
      Object.assign(statusDiv.style, { backgroundColor: '#fef3c7', color: '#d97706' });
      const loan = (window.prestecs || []).find(p => p.id_document === doc.id_document);
      const user = (window.usuaris || []).find(u => u.id_usuari === loan.id_usuari);
      statusDiv.innerHTML = `Prestat a ${user ? user.nom : 'Unknown'} (fins el ${loan.data_devolucio})`;
  } else {
      Object.assign(statusDiv.style, { backgroundColor: '#dcfce7', color: '#16a34a' });
      statusDiv.innerHTML = 'Disponible';
  }
  infoDiv.appendChild(statusDiv);

  if (doc.observacions) {
    const obsDiv = document.createElement('div');
    Object.assign(obsDiv.style, { marginTop: '12px', padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' });
    obsDiv.innerHTML = `<span style="font-weight: 600; font-size: 13px; color: #64748b; display: block; margin-bottom: 4px;">OBSERVACIONS</span><p style="margin: 0; font-size: 14px;">${doc.observacions}</p>`;
    infoDiv.appendChild(obsDiv);
  }

  content.append(coverDiv, infoDiv);

  // Actions
  const actions = document.createElement('div');
  Object.assign(actions.style, { display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' });

  const editBtn = document.createElement('button');
  editBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px; vertical-align: bottom; margin-right: 4px;">edit</span> Editar';
  Object.assign(editBtn.style, { padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center' });

  editBtn.addEventListener('click', () => {
      closeModal();
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
          id_idioma: doc.id_idioma,
          id_armari: doc.id_armari,
          id_genere: relGen ? relGen.id_genere : null,
          id_materia: relMat ? relMat.id_materia : null,
          observacions: doc.observacions,
          exclos_prestec: doc.exclos_prestec,
          cover: doc.cover_url,
          data_alta: doc.data_alta
      };
      showManualBookForm(prefill);
  });

  actions.appendChild(editBtn);

  box.append(header, content, actions);
}

function showLoanDetailsModal(loan) {
  const { overlay, box, closeModal } = createModal('', 'min(500px, 95%)');

  const doc = getDocumentById(loan.id_document) || { titol: 'Llibre desconegut' };
  const user = (window.usuaris || []).find(u => u.id_usuari === loan.id_usuari) || { nom: 'Usuari desconegut' };
  
  const dueDate = parseDateNoTZ(loan.data_devolucio);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = dueDate && dueDate < today;

  const header = document.createElement('div');
  header.style.marginBottom = '20px';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';

  const h = document.createElement('h3'); 
  h.textContent = 'Detalls del Préstec'; 
  Object.assign(h.style, { margin: '0', fontSize: '20px', fontWeight: '600' });
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
  Object.assign(closeBtn.style, { background: 'transparent', border: 'none', cursor: 'pointer' });
  closeBtn.onclick = closeModal;

  header.append(h, closeBtn);

  const content = document.createElement('div');
  Object.assign(content.style, { display: 'flex', flexDirection: 'column', gap: '16px' });

  const createInfoLine = (label, value, isValueBold = false) => {
    const p = document.createElement('p');
    Object.assign(p.style, { margin: '0', fontSize: '14px' });
    p.innerHTML = `<span style="color: #64748b; font-weight: 500;">${label}:</span> <span style="color: #1e293b; ${isValueBold ? 'font-weight: 600;' : ''}">${value}</span>`;
    return p;
  };

  const bookInfo = createInfoLine('Llibre', doc.titol, true);
  const userInfo = createInfoLine('Alumne', user.nom, true);
  const emailInfo = createInfoLine('Email', user.email || '—');
  const dateLoanInfo = createInfoLine('Data de préstec', loan.data_prestec);
  const dateDueInfo = createInfoLine('Data de venciment', loan.data_devolucio);

  const statusWrap = document.createElement('div');
  statusWrap.style.marginTop = '8px';
  const statusBadge = document.createElement('span');
  Object.assign(statusBadge.style, { padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '600' });

  if (isOverdue) {
    Object.assign(statusBadge.style, { background: '#fef2f2', color: '#dc2626' });
    const daysLate = Math.ceil((today - dueDate) / (24 * 60 * 60 * 1000));
    statusBadge.textContent = `Vençut (${daysLate} dies de retard)`;
  } else {
    Object.assign(statusBadge.style, { background: '#dcfce7', color: '#16a34a' });
    statusBadge.textContent = 'Actiu';
  }
  statusWrap.appendChild(statusBadge);

  content.append(bookInfo, userInfo, emailInfo, dateLoanInfo, dateDueInfo, statusWrap);

  const footer = document.createElement('div');
  Object.assign(footer.style, { marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' });

  if (isOverdue) {
    const reclaimBtn = document.createElement('button');
    reclaimBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px; vertical-align: bottom; margin-right: 4px;">mail</span> Reclamar';
    Object.assign(reclaimBtn.style, { padding: '8px 16px', background: 'white', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center' });

    reclaimBtn.onclick = () => {
        if (!window.EMAILJS_CONFIG || !window.emailjs || window.EMAILJS_CONFIG.PUBLIC_KEY.includes('PON_AQUI')) {
            window.showTempNotification("EmailJS no està configurat.", 'error');
            return;
        }

        const daysLate = Math.ceil((today - dueDate) / (24 * 60 * 60 * 1000));
        const templateParams = {
            to_name: user.nom,
            to_email: user.email.trim(),
            book_title: doc.titol,
            days_late: daysLate,
        };
        
        reclaimBtn.textContent = 'Enviant...';
        reclaimBtn.disabled = true;

        emailjs.send(window.EMAILJS_CONFIG.SERVICE_ID, window.EMAILJS_CONFIG.TEMPLATE_ID, templateParams)
            .then(() => {
                if (window.showTempNotification) {
                    window.showTempNotification(`Correu de reclamació enviat correctament a ${user.nom}`, 'success');
                }
                reclaimBtn.textContent = 'Reclamat';
                reclaimBtn.style.color = '#059669';
                reclaimBtn.style.borderColor = '#a7f3d0';
            })
            .catch((err) => {
                console.error('FAILED...', err);
                if (window.showTempNotification) window.showTempNotification('Error enviant el correu.', 'error');
                reclaimBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px; vertical-align: bottom; margin-right: 4px;">mail</span> Reclamar';
                reclaimBtn.disabled = false;
            });
    };
    footer.appendChild(reclaimBtn);
  }

  const returnBtn = document.createElement('button');
  returnBtn.textContent = 'Retornar Llibre';
  Object.assign(returnBtn.style, { padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' });
  returnBtn.onclick = () => {
    closeModal();
    showConfirmationModal(
      'Retornar Préstec',
      `Estàs segur que vols marcar com a retornat el préstec de "${doc.titol}"?`,
      async () => {
        await window.DB.actions.removePrestec(loan.id_prestec);
        if (window.renderLoansTable) window.renderLoansTable();
        if (window.renderBookTable) window.renderBookTable();
        if (window.updateDashboardCounts) window.updateDashboardCounts();
        if (window.renderOverdueWidget) window.renderOverdueWidget();
        window.showTempNotification('Préstec retornat correctament!', 'success');
      }
    );
  };

  footer.appendChild(returnBtn);

  box.append(header, content, footer);
}

/**
 * Mostra un modal per importar dades des d'un fitxer CSV.
 * @param {string} importType - El tipus de dades a importar ('users' o 'books').
 * @param {function(File): void} onConfirm - Callback que s'executa quan l'usuari confirma la importació.
 */
function showImportModal(importType, onConfirm) {
    const { overlay, box, closeModal } = createModal('', 'min(500px, 95%)');

    const typeText = importType === 'users' ? 'Usuaris' : 'Llibres';
    const header = createModalHeader(`Importar ${typeText} des de CSV`);

    const content = document.createElement('div');
    content.className = 'flex flex-col gap-4';

    const fileInputLabel = document.createElement('label');
    fileInputLabel.textContent = 'Selecciona l\'arxiu CSV';
    fileInputLabel.className = 'text-sm font-medium text-slate-700 dark:text-slate-300';
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.className = 'w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20';

    const helpText = document.createElement('div');
    helpText.className = 'p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs text-slate-500 dark:text-slate-400';
    
    const userHelp = 'La capçalera del CSV ha de contenir: <strong>nom,email</strong>. El rol és opcional i s\'assigna automàticament segons el domini del correu (@alumne.iesllucmajor.org per alumnes i @iesllucmajor.org per professors).';
    const bookHelp = 'La capçalera ha d\'incloure: <strong>isbn, id_idioma, id_armari, id_genere, id_materia</strong>. Altres camps com títol, autor i portada es poden autocompletar via ISBN si es deixen buits.';
    
    helpText.innerHTML = `
        <h4 class="font-bold mb-1">Format Requerit</h4>
        <p>${importType === 'users' ? userHelp : bookHelp}</p>
    `;
    
    content.append(fileInputLabel, fileInput, helpText);

    const buttons = createActionButtons('Importar', () => {
        const file = fileInput.files[0];
        if (file) {
            onConfirm(file);
            closeModal();
        } else {
            showTempNotification('No has seleccionat cap arxiu.', 'error');
        }
    }, closeModal, '#16a34a');

    box.append(header, content, buttons);
}

window.showBookDetailsModal = showBookDetailsModal;
window.showLoanDetailsModal = showLoanDetailsModal;
window.showRegisterLoanModal = showRegisterLoanModal;
window.showReturnLoanModal = showReturnLoanModal;
window.showAddBookModal = showAddBookModal;
window.showNotificationsModal = showNotificationsModal;
window.showAllOverdueModal = showAllOverdueModal;
window.showConfirmationModal = showConfirmationModal;
window.showManualBookForm = showManualBookForm;
window.showAddUserModal = showAddUserModal;
window.showUserDetailsModal = showUserDetailsModal;
window.showImportModal = showImportModal;
