/**
 * @fileoverview Gestiona la lògica d'importació massiva de dades des de fitxers CSV.
 */

import { showTempNotification } from './modals.js';

/**
 * Analitza una cadena CSV en una matriu d'objectes.
 * Assumeix que la primera línia és la fila de capçalera.
 * @param {string} csvContent El contingut en forma de cadena del fitxer CSV.
 * @returns {Array<Object>} Una matriu d'objectes que representen les files del CSV.
 */
function parseCSV(csvContent) {
    try {
        const lines = csvContent.trim().split(/\r?\n/);
        if (lines.length < 2) {
            throw new Error("El CSV ha d'incloure una capçalera i almenys una línia de dades.");
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const data = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            return headers.reduce((obj, header, index) => {
                obj[header] = values[index] || '';
                return obj;
            }, {});
        });
        return data;
    } catch (error) {
        console.error("Error en parsejar el CSV:", error);
        showTempNotification(`Error en el format del CSV: ${error.message}`, 'error');
        return [];
    }
}

/**
 * Obté els detalls del llibre de l'API Open Library per ISBN.
 * @param {string} isbn 
 * @returns {Promise<Object|null>}
 */
async function fetchBookDetails(isbn) {
    try {
        const cleanIsbn = isbn.replace(/[- ]/g, '');
        const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&jscmd=data&format=json`);
        const data = await response.json();
        return data[`ISBN:${cleanIsbn}`] || null;
    } catch (error) {
        console.warn(`No s'ha pogut carregar informació de l'ISBN ${isbn}:`, error);
        return null;
    }
}

/**
 * Gestiona el procés de lectura i importació de fitxers.
 */
export async function handleImport(file, importType) {
    if (!file) {
        showTempNotification('No s\'ha seleccionat cap arxiu.', 'error');
        return;
    }
    if (!file.name.endsWith('.csv')) {
        showTempNotification('Si us plau, selecciona un arxiu amb format CSV.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        const records = parseCSV(event.target.result);
        if (records.length === 0) {
            return; // Error ja mostrat per parseCSV
        }

        let successCount = 0;
        let errorCount = 0;

        if (importType === 'users') {
            for (const record of records) {
                try {
                    // Validació bàsica
                    if (!record.nom || !record.email) {
                        throw new Error(`Registre invàlid: ${JSON.stringify(record)}`);
                    }

                    // Assignació automàtica de rol basada en el domini de correu
                    let assignedRol = record.rol || 'student';
                    const email = record.email.toLowerCase();
                    if (email.includes('@alumne.iesllucmajor.org')) {
                        assignedRol = 'student';
                    } else if (email.includes('@iesllucmajor.org')) {
                        assignedRol = 'teacher';
                    }

                    const newUser = {
                        id_usuari: Date.now() + Math.random(), // Assegurar ID única per a importacions en lot
                        nom: record.nom,
                        email: record.email,
                        rol: assignedRol,
                        created_at: new Date().toISOString()
                    };
                    await window.DB.actions.addUser(newUser);
                    successCount++;
                } catch (e) {
                    console.error("Error afegint usuari:", e);
                    errorCount++;
                }
            }
        } else if (importType === 'books') {
            for (const record of records) {
                try {
                    if (!record.isbn) {
                        throw new Error(`Registre de llibre invàlid (manca ISBN): ${JSON.stringify(record)}`);
                    }

                    // Intentar obtenir dades que falten de Open Library
                    const apiData = await fetchBookDetails(record.isbn);
                    
                    const titol = record.titol || (apiData ? apiData.title : null);
                    const autor = record.autor || (apiData && apiData.authors ? apiData.authors.map(a => a.name).join(', ') : null);
                    
                    if (!titol || !autor) {
                        throw new Error(`No es pot importar el llibre amb ISBN ${record.isbn}: manca títol o autor i no s'ha trobat a Open Library.`);
                    }

                    const newId = Date.now() + Math.random();
                    const newDocument = {
                        id_document: newId,
                        codi_document: 'DOC-' + String(newId).substring(6),
                        isbn: record.isbn,
                        titol: titol,
                        autor: autor,
                        any_publicacio: parseInt(record.any_publicacio) || (apiData && apiData.publish_date ? parseInt(apiData.publish_date.match(/\d{4}/)) : new Date().getFullYear()),
                        id_idioma: parseInt(record.id_idioma),
                        id_armari: parseInt(record.id_armari),
                        data_alta: new Date().toISOString().split('T')[0],
                        subtitol: record.subtitol || (apiData ? apiData.subtitle : null) || null,
                        editorial: record.editorial || (apiData && apiData.publishers ? apiData.publishers.map(p => p.name).join(', ') : null) || null,
                        edicio: record.edicio || '1a',
                        exclos_prestec: record.exclos_prestec === 'true',
                        coleccio: record.coleccio || null,
                        cover_url: record.cover_url || (apiData && apiData.cover ? apiData.cover.large || apiData.cover.medium : null) || null,
                        observacions: record.observacions || ''
                    };

                    // Assumir que els IDs de gènere i matèria estan en un format com "1;3"
                    const genresToAdd = (record.id_genere || '').split(';').map(id => ({ id_genere: parseInt(id.trim()) })).filter(g => !isNaN(g.id_genere));
                    const materiasToAdd = (record.id_materia || '').split(';').map(id => ({ id_materia: parseInt(id.trim()) })).filter(m => !isNaN(m.id_materia));

                    if (isNaN(newDocument.id_idioma) || isNaN(newDocument.id_armari) || genresToAdd.length === 0 || materiasToAdd.length === 0) {
                        throw new Error(`El llibre ha de tenir 'id_idioma', 'id_armari', 'id_genere' i 'id_materia' vàlids. Registre: ${JSON.stringify(record)}`);
                    }

                    await window.DB.actions.addDocument(newDocument, genresToAdd, materiasToAdd);
                    successCount++;
                } catch (e) {
                    console.error("Error afegint llibre:", e);
                    errorCount++;
                }
            }
        }

        if (successCount > 0) {
            showTempNotification(`${successCount} registre(s) importat(s) amb èxit!`, 'success');
            // Actualitza les taules després de la importació
            if (importType === 'users' && window.renderUsersTable) window.renderUsersTable();
            if (importType === 'books' && window.renderBookTable) window.renderBookTable();
            if (window.updateDashboardCounts) window.updateDashboardCounts();
        }
        if (errorCount > 0) {
            showTempNotification(`${errorCount} registre(s) no s'han pogut importar. Revisa la consola.`, 'error');
        }
    };

    reader.onerror = () => {
        showTempNotification("No s'ha pogut llegir l'arxiu.", 'error');
    };

    reader.readAsText(file);
}
