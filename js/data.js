// js/data.js - Gestor de dades connectat a Firestore
/**
 * @fileoverview Gestiona la capa de dades de l'aplicació, encarregant-se de la sincronització entre
 * l'estat local i la base de dades Firestore.
 * 
 * VISTA GENERAL DE L'ESQUEMA:
 * - idiomas: { id_idioma, tipus_idioma }
 * - generes: { id_genere, tipus_genere }
 * - armaris: { id_armari, codi_armari, nom_armari, ubicacio }
 * - materias: { id_materia, cdu, nom }
 * - usuaris: { id_usuari, nom, email, rol, blocked, created_at }
 * - documents: { id_document, titol, autor, isbn, id_idioma, id_armari, ... }
 * - prestecs: { id_prestec, id_document, id_usuari, data_prestec, data_devolucio }
 * - document_materia: { id_document, id_materia }
 * - document_genere: { id_document, id_genere }
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Inicialitza Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Estat local (Caché de la interfície d'usuari)
const state = {
    idiomas: [],
    generes: [],
    armaris: [],
    materias: [],
    usuaris: [],
    documents: [],
    prestecs: [],
    document_materia: [],
    document_genere: []
};

/**
 * Exposa l'estat local a l'objecte global 'window'.
 * Necessari per a la compatibilitat amb versions anteriors de scripts que accedeixen a window.documents, etc.
 */
function exposeGlobals() {
    Object.keys(state).forEach(key => {
        window[key] = state[key];
    });
}

const DataService = {
    /**
     * Carrega totes les dades de les col·leccions de Firestore a l'estat local.
     * Dispara un esdeveniment 'db-loaded' en finalitzar.
     */
    load: async function() {
        console.log("Connectant a Firestore...");
        try {
            const collections = Object.keys(state);

            const promises = collections.map(col => getDocs(collection(db, col)));
            const results = await Promise.all(promises);

            results.forEach((snapshot, index) => {
                const colName = collections[index];
                state[colName] = snapshot.docs.map(d => d.data());
            });

            exposeGlobals();
            console.log("Dades carregades de Firestore correctament.");
            
            // Dispatxa l'esdeveniment per notificar a la interfície d'usuari
            document.dispatchEvent(new CustomEvent('db-loaded'));

        } catch (error) {
            console.error("Error carregant de Firestore:", error);
            if (window.showTempNotification) window.showTempNotification("Error carregant dades.", "error");
            else alert("Error carregant dades. Revisa la consola.");
        }
    },

    // ==========================================
    // DOCUMENTS (Llibres)
    // ==========================================

    /**
     * Afegeix un nou document (llibre) i les seves relacions a Firestore i a l'estat local.
     * @param {Object} newDoc - L'objecte del document a afegir.
     * @param {Array} genres - Llista de gèneres a associar.
     * @param {Array} materias - Llista de matèries a associar.
     */
    async addDocument(newDoc, genres = [], materias = []) {
        try {
            // 1. Desa el document
            await setDoc(doc(db, 'documents', String(newDoc.id_document)), newDoc);
            state.documents.push(newDoc);

            // 2. Desa els gèneres
            for (const g of genres) {
                const id = `${newDoc.id_document}_${g.id_genere}`;
                const rel = { id_document: newDoc.id_document, id_genere: g.id_genere };
                await setDoc(doc(db, 'document_genere', id), rel);
                state.document_genere.push(rel);
            }

            // 3. Desa les matèries
            for (const m of materias) {
                const id = `${newDoc.id_document}_${m.id_materia}`;
                const rel = { id_document: newDoc.id_document, id_materia: m.id_materia };
                await setDoc(doc(db, 'document_materia', id), rel);
                state.document_materia.push(rel);
            }
            
            exposeGlobals();
            return true;
        } catch (e) {
            console.error("Error en afegir el document:", e);
            throw e;
        }
    },

    /**
     * Elimina un document i les seves relacions locals.
     * Nota: Firestore no elimina automàticament en cascada.
     * @param {number|string} id_document - L'ID del document a eliminar.
     */
    async deleteDocument(id_document) {
        try {
            const id = String(id_document);
            await deleteDoc(doc(db, 'documents', id));
            
            // Actualitza l'estat local
            const idx = state.documents.findIndex(d => d.id_document === id_document);
            if (idx !== -1) state.documents.splice(idx, 1);

            // Neteja les relacions locals
            state.document_genere = state.document_genere.filter(dg => dg.id_document !== id_document);
            state.document_materia = state.document_materia.filter(dm => dm.id_document !== id_document);
            
            exposeGlobals();
            return true;
        } catch (e) {
            console.error("Error en eliminar el document:", e);
            throw e;
        }
    },

    // ==========================================
    // PRÉSTECS
    // ==========================================

    async addPrestec(newPrestec) {
        try {
            await setDoc(doc(db, 'prestecs', String(newPrestec.id_prestec)), newPrestec);
            state.prestecs.push(newPrestec);
            exposeGlobals();
            return true;
        } catch (e) {
            console.error("Error en afegir el préstec:", e);
            throw e;
        }
    },

    async removePrestec(id_prestec) {
        try {
            await deleteDoc(doc(db, 'prestecs', String(id_prestec)));
            const idx = state.prestecs.findIndex(p => p.id_prestec === id_prestec);
            if (idx !== -1) state.prestecs.splice(idx, 1);
            exposeGlobals();
            return true;
        } catch (e) {
            console.error("Error en eliminar el préstec:", e);
            throw e;
        }
    },

    // ==========================================
    // USUARIS
    // ==========================================

    async addUser(newUser) {
        try {
            await setDoc(doc(db, 'usuaris', String(newUser.id_usuari)), newUser);
            state.usuaris.push(newUser);
            exposeGlobals();
            return true;
        } catch (e) {
            console.error("Error en afegir l'usuari:", e);
            throw e;
        }
    },

    async deleteUser(id_usuari) {
        try {
            await deleteDoc(doc(db, 'usuaris', String(id_usuari)));
            const idx = state.usuaris.findIndex(u => u.id_usuari === id_usuari);
            if (idx !== -1) state.usuaris.splice(idx, 1);
            exposeGlobals();
            return true;
        } catch (e) {
            console.error("Error en eliminar l'usuari:", e);
            throw e;
        }
    },

    async updateUser(updatedUser) {
        try {
            await updateDoc(doc(db, 'usuaris', String(updatedUser.id_usuari)), updatedUser);
            const idx = state.usuaris.findIndex(u => u.id_usuari === updatedUser.id_usuari);
            if (idx !== -1) {
                state.usuaris[idx] = { ...state.usuaris[idx], ...updatedUser };
            }
            exposeGlobals();
            return true;
        } catch (e) {
            console.error("Error en actualitzar l'usuari:", e);
            throw e;
        }
    },

    // ==========================================
    // TAULES AUXILIARS (Idiomes, Gèneres, etc.)
    // ==========================================

    async addIdioma(text) {
        try {
            const maxId = state.idiomas.reduce((max, i) => Math.max(max, Number(i.id_idioma) || 0), 0);
            const newId = maxId + 1;
            const newObj = { id_idioma: newId, tipus_idioma: text };
            
            await setDoc(doc(db, 'idiomas', String(newId)), newObj);
            state.idiomas.push(newObj);
            exposeGlobals();
            return true;
        } catch (e) {
            console.error("Error en afegir l'idioma:", e);
            throw e;
        }
    },

    async deleteIdioma(id) {
        try {
            await deleteDoc(doc(db, 'idiomas', String(id)));
            const idx = state.idiomas.findIndex(i => i.id_idioma === id);
            if (idx !== -1) state.idiomas.splice(idx, 1);
            exposeGlobals();
            return true;
        } catch (e) {
            console.error("Error en eliminar l'idioma:", e);
            throw e;
        }
    },

    async addGenere(text) {
        try {
            const maxId = state.generes.reduce((max, g) => Math.max(max, Number(g.id_genere) || 0), 0);
            const newId = maxId + 1;
            const newObj = { id_genere: newId, tipus_genere: text };

            await setDoc(doc(db, 'generes', String(newId)), newObj);
            state.generes.push(newObj);
            exposeGlobals();
            return true;
        } catch (e) {
            console.error("Error en afegir el gènere:", e);
            throw e;
        }
    },

    async deleteGenere(id) {
        try {
            await deleteDoc(doc(db, 'generes', String(id)));
            const idx = state.generes.findIndex(g => g.id_genere === id);
            if (idx !== -1) state.generes.splice(idx, 1);
            exposeGlobals();
            return true;
        } catch (e) {
            console.error("Error en eliminar el gènere:", e);
            throw e;
        }
    },

    async addArmari(codi, nom, ubicacio) {
        try {
            const maxId = state.armaris.reduce((max, a) => Math.max(max, Number(a.id_armari) || 0), 0);
            const newId = maxId + 1;
            const newObj = { id_armari: newId, codi_armari: codi, nom_armari: nom, ubicacio: ubicacio };

            await setDoc(doc(db, 'armaris', String(newId)), newObj);
            state.armaris.push(newObj);
            exposeGlobals();
            return true;
        } catch (e) {
            console.error("Error en afegir l'armari:", e);
            throw e;
        }
    },

    async deleteArmari(id) {
        try {
            await deleteDoc(doc(db, 'armaris', String(id)));
            const idx = state.armaris.findIndex(a => a.id_armari === id);
            if (idx !== -1) state.armaris.splice(idx, 1);
            exposeGlobals();
            return true;
        } catch (e) {
            console.error("Error en eliminar l'armari:", e);
            throw e;
        }
    },

    async addMateria(cdu, nom) {
        try {
            const maxId = state.materias.reduce((max, m) => Math.max(max, Number(m.id_materia) || 0), 0);
            const newId = maxId + 1;
            const newObj = { id_materia: newId, cdu: cdu, nom: nom };

            await setDoc(doc(db, 'materias', String(newId)), newObj);
            state.materias.push(newObj);
            exposeGlobals();
            return true;
        } catch (e) {
            console.error("Error en afegir la matèria:", e);
            throw e;
        }
    },

    async deleteMateria(id) {
        try {
            await deleteDoc(doc(db, 'materias', String(id)));
            const idx = state.materias.findIndex(m => m.id_materia === id);
            if (idx !== -1) state.materias.splice(idx, 1);
            exposeGlobals();
            return true;
        } catch (e) {
            console.error("Error en eliminar la matèria:", e);
            throw e;
        }
    }
};

// Inicia la càrrega de dades
DataService.load();

// Exposa l'API globalment
window.DB = {
    ...state, // Exposa les col·leccions directament (instantània de només lectura)
    actions: DataService
};

// Ajudants per a la compatibilitat amb versions anteriors
window.loadDB = DataService.load; 
window.saveDB = () => console.warn("saveDB() està obsolet. Utilitzeu DB.actions en el seu lloc.");