// Configuració d'EmailJS
// Registra't a https://www.emailjs.com/ per obtenir aquestes dades.

const EMAILJS_CONFIG = {
    // 1. ID del Servei (connectat al teu Gmail/Outlook)
    // antic: SERVICE_ID: "service_vft957q",
    SERVICE_ID: "service_av0xr2i",

    // 2. ID de la Plantilla (la plantilla del correu)
    // Recomanació variables plantilla: {{to_name}}, {{to_email}}, {{book_title}}, {{days_late}}
    // antic: TEMPLATE_ID: "template_8m9j84v",
    TEMPLATE_ID: "template_l11opqo",

    
    // 3. Clau Pública (la teva identificació d'usuari)
    //PUBLIC_KEY: "iNgeT5bGqvB8uG9o4"
    PUBLIC_KEY: "pYPNGAJcRpe36BA0P"
};

// Exposició global de la configuració
window.EMAILJS_CONFIG = EMAILJS_CONFIG;