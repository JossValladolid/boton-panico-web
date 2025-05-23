const API_URL = 'http://localhost:8000';

let activeReportId = null;
let activeSection = 'home';

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');

    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    fetch(`${API_URL}/me`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(res => {
        if (!res.ok) throw new Error('Token inválido');
        return res.json();
    })
    .then(user => {
        document.getElementById('username').textContent = `Usuario: ${user.correo} (${user.codigo})`;
        loadReports();
    })
    .catch(() => {
        logout();
    });

    setupNavigationEvents();
    setupModalEvents();
    setupFormEvents();
    setupAccordion();
});

function logout() {
    localStorage.removeItem('access_token');
    window.location.href = 'index.html';
}

function loadReports() {
    const token = localStorage.getItem('access_token');
    const reportsContainer = document.getElementById('reports-list');

    fetch(`${API_URL}/my-tasks/`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(res => {
        if (!res.ok) throw new Error('Error al cargar reportes');
        return res.json();
    })
    .then(reports => {
        reportsContainer.innerHTML = '';
        if (reports.length === 0) {
            reportsContainer.innerHTML = '<p>No hay reportes pendientes</p>';
            return;
        }

        reports.forEach(report => {
            // Modificado: Ahora verifica si el estado es Cancelado O Completado
            const isInactiveState = report.estado === 'Cancelado' || report.estado === 'Completado';
            const div = document.createElement('div');
            // Aplicar la misma clase para reportes cancelados y completados
            div.className = isInactiveState ? 'report-item canceled-report' : 'report-item';
            div.innerHTML = `
                <div class="report-header">
                    <span class="report-id">${report.id}</span>
                    <span class="report-date-time">${report.fecha} ${report.hora || ''}</span>
                </div>
                <div class="report-description">${report.descripcion}</div>
                <div class="report-status">Estado: ${report.estado}</div>
                <div class="report-actions">
                    <button class="action-button form-button" data-id="${report.id}" ${isInactiveState ? 'disabled' : ''}>
                        Editar
                    </button>
                    <button class="action-button cancel-button" data-id="${report.id}" ${isInactiveState ? 'disabled' : ''}>
                        ${report.estado === 'Cancelado' ? 'Cancelado' : report.estado === 'Completado' ? 'Completado' : 'Cancelar Reporte'}
                    </button>
                </div>
            `;
            reportsContainer.appendChild(div);
        });

        document.querySelectorAll('.form-button:not([disabled])').forEach(btn => {
            btn.addEventListener('click', () => {
                editReport(btn.dataset.id);
            });
        });

        document.querySelectorAll('.cancel-button:not([disabled])').forEach(btn => {
            btn.addEventListener('click', () => {
                confirmCancelReport(btn.dataset.id);
            });
        });
    })
    .catch(err => {
        console.error('Error al cargar reportes:', err);
        reportsContainer.innerHTML = '<p>Error al cargar los reportes</p>';
    });
}

function submitReport(descripcion) {
    const token = localStorage.getItem('access_token');
    
    // Si hay activeReportId, es una edición; si no, es un nuevo reporte
    const isEdit = activeReportId !== null;
    const url = isEdit ? `${API_URL}/my-tasks/${activeReportId}` : `${API_URL}/my-tasks/`;
    const method = isEdit ? 'PUT' : 'POST';

    fetch(url, {
        method: method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ descripcion })
    })
    .then(res => {
        if (!res.ok) throw new Error(`No se pudo ${isEdit ? 'actualizar' : 'enviar'} el reporte`);
        return res.json();
    })
    .then(() => {
        document.getElementById('exitoEnvio').textContent = 
            isEdit ? 'Reporte actualizado con éxito' : 'Reporte enviado con éxito';
        document.getElementById('reportForm').reset();
        loadReports();
        
        // Resetear el activeReportId después de la operación
        activeReportId = null;
        
        setTimeout(() => {
            document.getElementById('report-modal').style.display = 'none';
            document.getElementById('exitoEnvio').textContent = '';
        }, 2000);
    })
    .catch(err => {
        console.error('Error:', err);
        document.getElementById('exitoEnvio').textContent = 
            `Error al ${isEdit ? 'actualizar' : 'enviar'} el reporte.`;
    });
}

function editReport(id) {
    const token = localStorage.getItem('access_token');
    fetch(`${API_URL}/my-tasks/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if (!res.ok) throw new Error('No se pudo obtener el reporte');
        return res.json();
    })
    .then(report => {
        document.getElementById('descripcion').value = report.descripcion;
        activeReportId = id;
        document.getElementById('report-modal').style.display = 'block';
    })
    .catch(err => {
        console.error('Error al obtener el reporte:', err);
        alert('Error al cargar el reporte para editar');
    });
}

function confirmCancelReport(id) {
    activeReportId = id;
    document.getElementById('cancel-confirmation-modal').style.display = 'block';
}

function cancelReport(id) {
    const token = localStorage.getItem('access_token');
    
    // Primero obtener el reporte actual
    fetch(`${API_URL}/my-tasks/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if (!res.ok) throw new Error('No se pudo obtener el reporte');
        return res.json();
    })
    .then(task => {
        // Actualizar solo el estado a "Cancelado"
        return fetch(`${API_URL}/my-tasks/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                descripcion: task.descripcion,
                estado: "Cancelado"
            })
        });
    })
    .then(res => {
        if (!res.ok) throw new Error('No se pudo cancelar el reporte');
        return res.json();
    })
    .then(() => {
        activeReportId = null;
        loadReports();
        document.getElementById('cancel-confirmation-modal').style.display = 'none';
    })
    .catch(err => {
        console.error('Error al cancelar reporte:', err);
        alert('Error al cancelar el reporte');
        document.getElementById('cancel-confirmation-modal').style.display = 'none';
    });
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