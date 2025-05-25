const API_URL = 'http://localhost:8000';

let activeReportId = null;
let activeSection = 'home';
let autoUpdate = true;

// Función centralizada para manejar peticiones con manejo de errores de autenticación
async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
        handleAuthError();
        return null;
    }

    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
        const response = await fetch(url, finalOptions);
        
        // Manejar errores de autenticación de forma centralizada
        if (response.status === 401 || response.status === 403) {
            console.warn('Token expirado o inválido, cerrando sesión...');
            handleAuthError();
            return null;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
    } catch (error) {
        console.error('Error en petición autenticada:', error);
        throw error;
    }
}

// Función centralizada para manejar errores de autenticación
function handleAuthError() {
    localStorage.removeItem('access_token');
    alert('Tu sesión ha expirado. Serás redirigido al login.');
    window.location.href = 'index.html';
}

// Función para verificar si el token sigue siendo válido
async function verifyTokenValidity() {
    try {
        const response = await authenticatedFetch(`${API_URL}/me`);
        return response !== null;
    } catch (error) {
        console.error('Error verificando token:', error);
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');

    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await authenticatedFetch(`${API_URL}/me`);
        if (!response) return; // Ya manejado por authenticatedFetch
        
        const user = await response.json();
        document.getElementById('username').textContent = `Usuario: ${user.correo} (${user.codigo})`;
        loadReports();
    } catch (error) {
        console.error('Error al obtener información del usuario:', error);
        handleAuthError();
    }

    setupNavigationEvents();
    setupModalEvents();
    setupFormEvents();
    setupAccordion();
});

function logout() {
    localStorage.removeItem('access_token');
    window.location.href = 'index.html';
}

async function loadReports() {
    const reportsContainer = document.getElementById('reports-list');

    try {
        const response = await authenticatedFetch(`${API_URL}/my-tasks/`);
        if (!response) return; // Ya manejado por authenticatedFetch
        
        const reports = await response.json();
        
        reportsContainer.innerHTML = '';
        if (reports.length === 0) {
            reportsContainer.innerHTML = '<p>No hay reportes pendientes</p>';
            return;
        }

        reports.forEach(report => {
            const isDisabled = report.estado === 'Cancelado' || report.estado === 'Completado';
            const buttonLabel = report.estado === 'Completado' ? 'Completado' :
                                report.estado === 'Cancelado' ? 'Cancelado' : 'Cancelar Reporte';

            const div = document.createElement('div');
            div.className = isDisabled ? 'report-item canceled-report' : 'report-item';
            div.innerHTML = `
                <div class="report-header">
                    <span class="report-id">${report.id}</span>
                    <span class="report-date-time">${report.fecha} ${report.hora || ''}</span>
                </div>
                <div class="report-description">${report.descripcion}</div>
                <div class="report-status">Estado: ${report.estado}</div>
                <div class="report-actions">
                    <button class="action-button form-button" data-id="${report.id}" ${isDisabled ? 'disabled' : ''}>
                        Formulario
                    </button>
                    <button class="action-button cancel-button" data-id="${report.id}" ${isDisabled ? 'disabled' : ''}>
                        ${buttonLabel}
                    </button>
                </div>
            `;
            reportsContainer.appendChild(div);
        });

        document.querySelectorAll('.cancel-button:not([disabled])').forEach(btn => {
            btn.addEventListener('click', () => {
                confirmCancelReport(btn.dataset.id);
            });
        });
    } catch (error) {
        console.error('Error al cargar reportes:', error);
        reportsContainer.innerHTML = '<p>Error al cargar los reportes</p>';
    }
}

async function submitReport(descripcion) {
    try {
        // Si hay activeReportId, es una edición; si no, es un nuevo reporte
        const isEdit = activeReportId !== null;
        const url = isEdit ? `${API_URL}/my-tasks/${activeReportId}` : `${API_URL}/my-tasks/`;
        const method = isEdit ? 'PUT' : 'POST';

        const response = await authenticatedFetch(url, {
            method: method,
            body: JSON.stringify({ descripcion })
        });
        
        if (!response) return; // Ya manejado por authenticatedFetch
        
        await response.json();
        
        document.getElementById('exitoEnvio').textContent = 
            isEdit ? 'Reporte actualizado con éxito' : 'Reporte enviado con éxito';
        document.getElementById('reportForm').reset();
        loadReports();
        
        // Resetear el activeReportId después de la operación
        activeReportId = null;
        
        setTimeout(() => {
            document.getElementById('report-modal').style.display = 'none';
            document.getElementById('exitoEnvio').textContent = '';
        }, 1000);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('exitoEnvio').textContent = 
            `Error al ${activeReportId ? 'actualizar' : 'enviar'} el reporte.`;
    }
}

async function editReport(id) {
    try {
        const response = await authenticatedFetch(`${API_URL}/my-tasks/${id}`);
        if (!response) return; // Ya manejado por authenticatedFetch
        
        const report = await response.json();
        document.getElementById('descripcion').value = report.descripcion;
        activeReportId = id;
        document.getElementById('report-modal').style.display = 'block';
    } catch (error) {
        console.error('Error al obtener el reporte:', error);
        alert('Error al cargar el reporte para editar');
    }
}

function confirmCancelReport(id) {
    activeReportId = id;
    document.getElementById('cancel-confirmation-modal').style.display = 'block';
}

async function cancelReport(id) {
    try {
        // Primero obtener el reporte actual
        const getResponse = await authenticatedFetch(`${API_URL}/my-tasks/${id}`);
        if (!getResponse) return; // Ya manejado por authenticatedFetch
        
        const task = await getResponse.json();
        
        // Actualizar solo el estado a "Cancelado"
        const updateResponse = await authenticatedFetch(`${API_URL}/my-tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                descripcion: task.descripcion,
                estado: "Cancelado"
            })
        });
        
        if (!updateResponse) return; // Ya manejado por authenticatedFetch
        
        await updateResponse.json();
        
        activeReportId = null;
        loadReports();
        document.getElementById('cancel-confirmation-modal').style.display = 'none';
    } catch (error) {
        console.error('Error al cancelar reporte:', error);
        alert('Error al cancelar el reporte');
        document.getElementById('cancel-confirmation-modal').style.display = 'none';
    }
}

function setupNavigationEvents() {
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const section = link.getAttribute('href').substring(1);
            document.querySelector('.section.active-section')?.classList.remove('active-section');
            document.getElementById(section).classList.add('active-section');

            document.querySelector('.nav-menu a.active')?.classList.remove('active');
            link.classList.add('active');

            activeSection = section;
        });
    });

    document.getElementById('help-button').addEventListener('click', e => {
        e.preventDefault();
        document.getElementById('help-modal').style.display = 'block';
    });

    document.querySelector('.close-help-modal').addEventListener('click', () => {
        document.getElementById('help-modal').style.display = 'none';
    });
}

function setupModalEvents() {
    document.getElementById('panic-button').addEventListener('click', () => {
        // Resetear activeReportId para nuevo reporte
        activeReportId = null;
        document.getElementById('reportForm').reset();
        document.getElementById('report-modal').style.display = 'block';
    });

    document.querySelector('.close-modal').addEventListener('click', () => {
        document.getElementById('report-modal').style.display = 'none';
        // Resetear activeReportId al cerrar
        activeReportId = null;
        document.getElementById('reportForm').reset();
    });

    document.getElementById('confirm-cancel').addEventListener('click', () => {
        if (activeReportId) cancelReport(activeReportId);
    });

    document.getElementById('abort-cancel').addEventListener('click', () => {
        document.getElementById('cancel-confirmation-modal').style.display = 'none';
    });

    window.addEventListener('click', e => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
            // Resetear activeReportId si se cierra el modal de reporte
            if (e.target.id === 'report-modal') {
                activeReportId = null;
                document.getElementById('reportForm').reset();
            }
        }
    });

    document.addEventListener('keydown', (e) => {
        const reportModal = document.getElementById('report-modal');
        const helpModal = document.getElementById('help-modal');

        if (e.key === 'Enter' && reportModal.style.display === 'block') {
            e.preventDefault();
            document.getElementById('reportForm').dispatchEvent(new Event('submit'));
        }

        if (e.key === 'Escape') {
            if (reportModal.style.display === 'block') {
                reportModal.style.display = 'none';
                activeReportId = null;
                document.getElementById('reportForm').reset();
            }
            if (helpModal.style.display === 'block') {
                helpModal.style.display = 'none';
            }
        }
    });

    document.addEventListener("selectionchange", () => {
        const selection = document.getSelection();
        if (selection && selection.toString().length > 0) {
            autoUpdate = false;
        }
        else {
            autoUpdate = true;
        }
    });
}

// Actualización automática cada 3 segundos
setInterval(() => {
    loadReports();
}, 3000);

function setupFormEvents() {
    document.getElementById('reportForm').addEventListener('submit', e => {
        e.preventDefault();
        const descripcion = document.getElementById('descripcion').value;
        if (!descripcion.trim()) {
            document.getElementById('errorDescripcion').textContent = 'La descripción es obligatoria';
            return;
        }
        document.getElementById('errorDescripcion').textContent = '';
        submitReport(descripcion);
    });

    document.getElementById('contactForm').addEventListener('submit', e => {
        e.preventDefault();
        document.getElementById('contactExito').textContent = 'Mensaje enviado con éxito';
        e.target.reset();
        setTimeout(() => {
            document.getElementById('contactExito').textContent = '';
        }, 3000);
    });
}

function setupAccordion() {
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            header.classList.toggle('active');
            const content = header.nextElementSibling;
            content.style.maxHeight = content.style.maxHeight ? null : content.scrollHeight + 'px';
        });
    });
}

// Verificar periódicamente la validez del token
setInterval(async () => {
    if (autoUpdate) {
        // Verificar token cada 30 segundos
        const isValid = await verifyTokenValidity();
        if (isValid) {
            loadReports();
        }
    }
}, 30000);

// Actualizar reportes cada 3 segundos como antes
setInterval(() => {
    if (autoUpdate) {
        loadReports();
    }
}, 3000);