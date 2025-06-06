const API_URL = "http://localhost:8000"

// Variables de estado de la aplicación
let activeReportId = null        // ID del reporte actualmente seleccionado
let activeSection = "home"       // Sección activa en la navegación
let autoUpdate = true           // Control de actualización automática
let currentUserRole = ""        // Rol del usuario actual
let existingFormData = null     // Datos de formulario existente

// FUNCIONES DE AUTENTICACIÓN Y SEGURIDAD

/**
 * Realiza peticiones HTTP autenticadas con token JWT
 * Maneja automáticamente la autorización y errores de autenticación
 */
async function authenticatedFetch(url, options = {}) {
  const token = localStorage.getItem("access_token")

  if (!token) {
    handleAuthError()
    return null
  }

  // Copia headers del usuario o crea uno nuevo
  const userHeaders = options.headers ? { ...options.headers } : {}

  // Siempre agrega el Authorization
  userHeaders["Authorization"] = `Bearer ${token}`

  // Solo agrega Content-Type si NO viene en options.headers
  if (!userHeaders["Content-Type"]) {
    userHeaders["Content-Type"] = "application/json"
  }

  const finalOptions = {
    ...options,
    headers: userHeaders,
  }

  try {
    const response = await fetch(url, finalOptions)

    if (response.status === 401 || response.status === 403) {
      console.warn("Token expirado o inválido, cerrando sesión...")
      handleAuthError()
      return null
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response
  } catch (error) {
    console.error("Error en petición autenticada:", error)
    throw error
  }
}

/**
 * Maneja errores de autenticación
 * Limpia el token y redirige al login
 */
function handleAuthError() {
  localStorage.removeItem("access_token")
  alert("Tu sesión ha expirado. Serás redirigido al login.")
  window.location.href = "index.html"
}

/**
 * Verifica si el token actual es válido
 * Retorna true si es válido, false si no
 */
async function verifyTokenValidity() {
  try {
    const response = await authenticatedFetch(`${API_URL}/me`)
    return response !== null
  } catch (error) {
    console.error("Error verificando token:", error)
    return false
  }
}

/**
 * Cierra la sesión del usuario
 * Elimina el token y redirige al login
 */
function logout() {
  localStorage.removeItem("access_token")
  window.location.href = "index.html"
}


// FUNCIONES DE GESTIÓN DE MODALES
/**
 * Deshabilita el scroll del body cuando se abre un modal
 */
function disableBodyScroll() {
  document.body.classList.add("modal-open")
}

/**
 * Habilita el scroll del body cuando se cierra un modal
 */
function enableBodyScroll() {
  document.body.classList.remove("modal-open")
}

/**
 * Muestra un modal específico por su ID
 */
function showModal(modalId) {
  disableBodyScroll()
  document.getElementById(modalId).style.display = "block"
}

/**
 * Oculta un modal específico por su ID
 */
function hideModal(modalId) {
  enableBodyScroll()
  document.getElementById(modalId).style.display = "none"
}

/**
 * Obtiene el ID del modal que está actualmente visible
 * Retorna el ID del modal o null si ninguno está activo
 */
function getActiveModal() {
  const modals = [
    "report-modal",
    "detailed-form-modal",
    "cancel-confirmation-modal",
    "cancel-reason-modal",
    "help-modal",
  ]

  for (const modalId of modals) {
    const modal = document.getElementById(modalId)
    if (modal && modal.style.display === "block") {
      return modalId
    }
  }
  return null
}

/**
 * Cierra el modal actualmente visible y limpia sus datos
 */
function closeActiveModal() {
  const activeModalId = getActiveModal()
  if (activeModalId) {
    hideModal(activeModalId)

    switch (activeModalId) {
      case "report-modal":
        activeReportId = null
        document.getElementById("reportForm").reset()
        document.getElementById("exitoEnvio").textContent = ""
        break
      case "detailed-form-modal":
        activeReportId = null
        existingFormData = null
        document.getElementById("detailed-form").reset()
        enableFormSubmission()
        resetFormToEditable()
        break
      case "cancel-confirmation-modal":
        break
      case "cancel-reason-modal":
        document.getElementById("cancel-reason-form").reset()
        document.getElementById("cancel-reason-error").textContent = ""
        break
      case "help-modal":
        break
    }
  }
}

// FUNCIONES DE GESTIÓN DE FORMULARIOS

/**
 * Deshabilita el botón de envío del formulario detallado
 * Cambia el texto y estilo para indicar que ya fue enviado
 */
function disableFormSubmission() {
  const submitButton = document.querySelector('#detailed-form button[type="submit"]')
  if (submitButton) {
    submitButton.disabled = true
    submitButton.textContent = "Formulario ya enviado"
    submitButton.style.backgroundColor = "#ccc"
    submitButton.style.cursor = "not-allowed"
  }
}

/**
 * Habilita el botón de envío del formulario detallado
 * Restaura el texto y estilo original
 */
function enableFormSubmission() {
  const submitButton = document.querySelector('#detailed-form button[type="submit"]')
  if (submitButton) {
    submitButton.disabled = false
    submitButton.textContent = "Enviar"
    submitButton.style.backgroundColor = ""
    submitButton.style.cursor = ""
  }
}

/**
 * Resetea el formulario detallado a su estado editable
 * Habilita todos los campos y elimina mensajes informativos
 */
function resetFormToEditable() {
  // Remover mensaje de información si existe
  const infoMessage = document.getElementById("form-info-message")
  if (infoMessage) {
    infoMessage.remove()
  }

  // Habilitar todos los campos del formulario
  const formInputs = document.querySelectorAll("#detailed-form input, #detailed-form textarea")
  formInputs.forEach((input) => {
    input.disabled = false
    input.style.backgroundColor = ""
    input.style.color = ""
  })
}

/**
 * Convierte el formulario detallado en solo lectura
 * Deshabilita campos y muestra mensaje informativo
 */
function makeFormReadOnly() {
  // Deshabilitar todos los campos del formulario
  const formInputs = document.querySelectorAll("#detailed-form input, #detailed-form textarea")
  formInputs.forEach((input) => {
    input.disabled = true
    input.style.backgroundColor = "#f5f5f5"
    input.style.color = "#666"
  })

  // Deshabilitar botón de envío
  disableFormSubmission()

  // Agregar mensaje informativo
  const formActions = document.querySelector(".form-actions")
  if (formActions && !document.getElementById("form-info-message")) {
    const infoMessage = document.createElement("div")
    infoMessage.id = "form-info-message"
    infoMessage.style.cssText = `
      background: #e3f2fd;
      border: 1px solid #2196f3;
      border-radius: 4px;
      padding: 10px;
      margin-bottom: 15px;
      color: #1976d2;
      font-size: 14px;
      text-align: center;
    `
    infoMessage.innerHTML = `
      <i class="fas fa-info-circle"></i> 
      Este formulario ya ha sido enviado y no puede ser modificado.
    `
    formActions.parentNode.insertBefore(infoMessage, formActions)
  }
}

/**
 * Actualiza la fecha actual en el formulario
 * Formatea la fecha en formato DD/MM/YYYY
 */
function updateCurrentDate() {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, "0")
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const year = now.getFullYear()
  const currentDate = `${day}/${month}/${year}`

  const dateElement = document.getElementById("current-date")
  if (dateElement) {
    dateElement.textContent = currentDate
  }
}


// FUNCIONES DE GESTIÓN DE REPORTES
/**
 * Carga y muestra todos los reportes del usuario actual
 * Renderiza la lista con botones de acción según el estado
 */
async function loadReports() {
  const reportsContainer = document.getElementById("reports-list")

  try {
    const response = await authenticatedFetch(`${API_URL}/my-tasks/`)
    if (!response) return

    const reports = await response.json()

    reportsContainer.innerHTML = ""
    if (reports.length === 0) {
      reportsContainer.innerHTML = "<p>No hay reportes pendientes</p>"
      return
    }

    reports.forEach((report) => {
      const isPending = report.estado === "Pendiente";
      const isCompleted = report.estado === "Completado";
      const isActive = report.estado === "Activo";
      const isCanceled = report.estado === "Cancelado";
      
      // Solo bloquea todo el bloque si es cancelado
      let reportClass = "report-item";
      if (isCanceled) {
        reportClass += " canceled-report";
      } else if (isCompleted) {
        reportClass += " completed-report";
      } else if (isPending) {
        reportClass += " pending-report";
      } else if (isActive) {
        reportClass += " active-report";
      }

      const buttonLabel = isCompleted ? "Ver Formulario" : "Formulario";

      const div = document.createElement("div");
      div.className = reportClass;

      let reportHTML = `
        <div class="report-header">
            <span class="report-id">ID: ${report.id}</span>
            <span class="report-date-time">${report.fecha} ${report.hora || ""}</span>
        </div>
        <div class="report-description">Descripcion: ${report.descripcion}</div>
        <div class="report-status">Estado: ${report.estado}</div>
      `;

      if (isCanceled && report.razon && report.razon.trim()) {
        reportHTML += `
          <div class="report-reason">
            <strong>Razón de cancelación:</strong> ${report.razon}
          </div>
        `;
      }

      // Botón Formulario: habilitado para Pendiente y Completado, deshabilitado para otros estados
      reportHTML += `
        <div class="report-actions">
            <button class="action-button form-button${isCompleted ? " completed" : ""}" data-id="${report.id}" ${(isPending || isCompleted) ? "" : "disabled"}>
                ${buttonLabel}
            </button>
            <button class="action-button cancel-button" data-id="${report.id}" ${(isPending || isActive) ? "" : "disabled"}>
                ${isCanceled ? "Cancelado" : "Cancelar Reporte"}
            </button>
        </div>
      `;

      div.innerHTML = reportHTML;
      reportsContainer.appendChild(div);
    })

    document.querySelectorAll(".cancel-button:not([disabled])").forEach((btn) => {
      btn.addEventListener("click", () => {
        confirmCancelReport(btn.dataset.id)
      })
    })

    document.querySelectorAll(".form-button:not([disabled])").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const reportId = btn.dataset.id;
        const report = reports.find(r => r.id == reportId);
        if (!report) return;

        if (report.estado === "Pendiente") {
          openDetailedForm(reportId); // Editable
        } else if (report.estado === "Completado") {
          openCompletedForm(reportId); // Solo lectura
        }
      });
    })
  } catch (error) {
    console.error("Error al cargar reportes:", error)
    reportsContainer.innerHTML = "<p>Error al cargar los reportes</p>"
  }
}

/**
 * Envía un reporte rápido con descripción básica
 * Usado por el botón de pánico
 */
async function submitReport(descripcion) {
  try {
    const isEdit = activeReportId !== null

    // Construir el objeto submitData aquí
    const submitData = {
      descripcion: descripcion.trim(),
    }

    const response = await authenticatedFetch(`${API_URL}/my-tasks`, {
      method: "POST",
      body: JSON.stringify(submitData),
      headers: { "Content-Type": "application/json" },
    })

    if (!response) return

    await response.json()

    document.getElementById("exitoEnvio").textContent = isEdit
      ? "Reporte actualizado con éxito"
      : "Reporte enviado con éxito"
    document.getElementById("reportForm").reset()
    loadReports()

    activeReportId = null

    setTimeout(() => {
      hideModal("report-modal")
      document.getElementById("exitoEnvio").textContent = ""
    }, 1000)
  } catch (error) {
    console.error("Error:", error)
    document.getElementById("exitoEnvio").textContent =
      `Error al ${activeReportId ? "actualizar" : "enviar"} el reporte.`
  }
}

/**
 * Abre el modal de edición de reporte existente
 * Carga los datos del reporte en el formulario
 */
async function editReport(id) {
  try {
    const response = await authenticatedFetch(`${API_URL}/my-tasks/${id}`)
    if (!response) return

    const report = await response.json()
    document.getElementById("descripcion").value = report.descripcion
    activeReportId = id
    showModal("report-modal")
  } catch (error) {
    console.error("Error al obtener el reporte:", error)
    alert("Error al cargar el reporte para editar")
  }
}

/**
 * Inicia el proceso de confirmación para cancelar un reporte
 */
function confirmCancelReport(id) {
  activeReportId = id
  showCancelReasonModal()
}

/**
 * Muestra el modal para solicitar la razón de cancelación
 */
function showCancelReasonModal() {
  hideModal("cancel-confirmation-modal")
  document.getElementById("cancel-reason-form").reset()
  document.getElementById("cancel-reason-error").textContent = ""
  showModal("cancel-reason-modal")
}

/**
 * Cancela un reporte con la razón proporcionada
 * Incluye el rol del usuario en la razón
 */
async function cancelReportWithReason(reason) {
  try {
    if (!activeReportId) {
      throw new Error("No hay reporte activo para cancelar")
    }

    const formattedReason = `(${currentUserRole}) ${reason}`

    const response = await authenticatedFetch(
      `${API_URL}/my-tasks/${activeReportId}/${encodeURIComponent(formattedReason)}`,
      {
        method: "PUT",
      },
    )

    if (!response) return

    await response.json()

    activeReportId = null
    loadReports()
    hideModal("cancel-reason-modal")

    alert("Reporte cancelado exitosamente")
  } catch (error) {
    console.error("Error al cancelar reporte:", error)
    alert("Error al cancelar el reporte")
    hideModal("cancel-reason-modal")
  }
}

/**
 * Abre el formulario detallado para un reporte pendiente (editable)
 */
async function openDetailedForm(reportId) {
  activeReportId = reportId
  existingFormData = null

  // Resetear formulario y habilitarlo
  document.getElementById("detailed-form").reset()
  resetFormToEditable()
  enableFormSubmission()

  updateCurrentDate()
  
  // Llenar datos del reporte (descripción)
  await fillFormWithReportData(reportId)
  
  // Verificar si ya existe un formulario enviado
  await loadExistingFormData(reportId)

  showModal("detailed-form-modal")
}

/**
 * Abre el formulario detallado para un reporte completado (solo lectura)
 */
async function openCompletedForm(reportId) {
  activeReportId = reportId

  // Limpia el formulario
  document.getElementById("detailed-form").reset();
  
  updateCurrentDate()
  
  // Llenar datos del reporte (descripción)
  await fillFormWithReportData(reportId)

  // Obtén los datos del formulario completado
  try {
    const response = await authenticatedFetch(`${API_URL}/tasks/${reportId}/formulario`);
    if (!response) {
      alert("No se pudo obtener el formulario completado.");
      return;
    }
    const formData = await response.json();

    // Llenar campos con datos del formulario completado
    document.getElementById("nombres").value = formData.nombres || "";
    document.getElementById("apellido-paterno").value = formData.apellido_paterno || "";
    document.getElementById("apellido-materno").value = formData.apellido_materno || "";
    // document.getElementById("codigo-udg").value = formData.codigo_udg || ""; // <-- Quitar este campo
    document.getElementById("fecha-nacimiento").value = formData.fecha_nacimiento || "";
    document.getElementById("descripcion-detallada").value = formData.descripcion_detallada || "";

    // Hacer el formulario de solo lectura
    makeFormReadOnly()

    // Muestra el modal
    showModal("detailed-form-modal");
  } catch (error) {
    console.error("Error al cargar el formulario completado:", error);
    alert("Error al cargar el formulario completado.");
  }
}

/**
 * Carga datos de formulario existente si ya fue enviado
 * Hace el formulario de solo lectura si encuentra datos
 */
async function loadExistingFormData(reportId) {
  try {
    const response = await authenticatedFetch(`${API_URL}/my-tasks/${reportId}/formulario`)

    if (response && response.ok) {
      const formData = await response.json()
      existingFormData = formData

      // Llenar campos con datos existentes
      document.getElementById("nombres").value = formData.nombres || ""
      document.getElementById("apellido-paterno").value = formData.apellido_paterno || ""
      document.getElementById("apellido-materno").value = formData.apellido_materno || ""
      // document.getElementById("codigo-udg").value = formData.codigo_udg || "" // <-- Quitar este campo
      document.getElementById("fecha-nacimiento").value = formData.fecha_nacimiento || ""
      document.getElementById("descripcion-detallada").value = formData.descripcion_detallada || ""

      // Hacer el formulario de solo lectura
      makeFormReadOnly()
    }
  } catch (error) {
    console.log("No existe formulario previo para este reporte")
    // Si no hay formulario previo, asegurar que el formulario esté editable
    resetFormToEditable()
    enableFormSubmission()
  }
}

/**
 * Llena el formulario con datos básicos del reporte
 * Principalmente la descripción inicial
 */
async function fillFormWithReportData(reportId) {
  try {
    const response = await authenticatedFetch(`${API_URL}/my-tasks/${reportId}`)
    if (!response) return

    const report = await response.json()

    const formDescriptionElement = document.getElementById("form-description-text")
    if (formDescriptionElement) {
      formDescriptionElement.textContent = report.descripcion
    }
  } catch (error) {
    console.error("Error al obtener datos del reporte:", error)
  }
}

/**
 * Envía el formulario detallado con todos los datos del usuario
 * Cambia el estado del reporte a "Completado"
 */
async function submitDetailedForm(formData) {
  try {
    if (!activeReportId) {
      alert("Error: No se ha seleccionado un reporte válido")
      return
    }

    if (existingFormData) {
      alert("Este formulario ya ha sido enviado y no puede ser modificado")
      return
    }

    // Obtener el código UDG del usuario autenticado
    const userResponse = await authenticatedFetch(`${API_URL}/me`)
    if (!userResponse) {
      alert("No se pudo obtener el usuario actual")
      return
    }
    const user = await userResponse.json()
    const codigoUdg = user.codigo

    const fecha = new Date(formData.fechaNacimiento)
    const yyyy = fecha.getFullYear()
    const mm = String(fecha.getMonth() + 1).padStart(2, '0')
    const dd = String(fecha.getDate()).padStart(2, '0')
    const fechaFormateada = `${yyyy}-${mm}-${dd}`

    // Construir objeto para enviar como JSON
    const submitData = {
      nombres: formData.nombres.trim(),
      apellido_paterno: formData.apellidoPaterno.trim(),
      apellido_materno: formData.apellidoMaterno.trim(),
      codigo_udg: codigoUdg, // Usar el código del usuario autenticado
      fecha_nacimiento: fechaFormateada,
      descripcion_detallada: formData.descripcionDetallada.trim(),
    }

    // Cambiar estado a "Completado"
    await authenticatedFetch(`${API_URL}/tasks/${activeReportId}/estado`, {
      method: "PUT",
      body: JSON.stringify({ estado: "Completado" }),
      headers: { "Content-Type": "application/json" },
    })

    // Enviar formulario como JSON
    const response = await authenticatedFetch(`${API_URL}/my-tasks/${activeReportId}/formulario`, {
      method: "POST",
      body: JSON.stringify(submitData),
      headers: { "Content-Type": "application/json" },
    })

    if (!response) return

    alert("Formulario enviado con éxito")

    // Limpiar y cerrar modal
    document.getElementById("detailed-form").reset()
    loadReports()

    activeReportId = null
    existingFormData = null

    setTimeout(() => {
      hideModal("detailed-form-modal")
    }, 1000)

  } catch (error) {
    console.error("Error:", error)
    alert("Error al enviar el formulario detallado: " + error.message)
  }
}


// FUNCIONES DE CONFIGURACIÓN DE EVENTOS

/**
 * Configura los eventos de navegación del sidebar
 * Maneja el cambio entre secciones y botón de ayuda
 */
function setupNavigationEvents() {
  document.querySelectorAll(".nav-menu a").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault()
      const section = link.getAttribute("href").substring(1)
      document.querySelector(".section.active-section")?.classList.remove("active-section")
      document.getElementById(section).classList.add("active-section")

      document.querySelector(".nav-menu a.active")?.classList.remove("active")
      link.classList.add("active")

      activeSection = section
    })
  })

  document.getElementById("help-button").addEventListener("click", (e) => {
    e.preventDefault()
    showModal("help-modal")
  })

  document.querySelector(".close-help-modal").addEventListener("click", () => {
    hideModal("help-modal")
  })
}

/**
 * Configura todos los eventos relacionados con modales
 * Incluye botones de apertura, cierre y clics fuera del modal
 */
function setupModalEvents() {
  document.getElementById("panic-button").addEventListener("click", () => {
    activeReportId = null
    document.getElementById("reportForm").reset()
    showModal("report-modal")
  })

  document.querySelector(".close-modal").addEventListener("click", () => {
    hideModal("report-modal")
    activeReportId = null
    document.getElementById("reportForm").reset()
  })

  document.querySelector(".close-detailed-modal").addEventListener("click", () => {
    hideModal("detailed-form-modal")
    activeReportId = null
    existingFormData = null
    document.getElementById("detailed-form").reset()
    resetFormToEditable()
    enableFormSubmission()
  })

  document.getElementById("confirm-cancel").addEventListener("click", () => {
    if (activeReportId) {
      showCancelReasonModal()
    }
  })

  document.getElementById("abort-cancel").addEventListener("click", () => {
    hideModal("cancel-confirmation-modal")
  })

  document.querySelector(".close-reason-modal").addEventListener("click", () => {
    hideModal("cancel-reason-modal")
    document.getElementById("cancel-reason-form").reset()
    document.getElementById("cancel-reason-error").textContent = ""
  })

  document.getElementById("abort-reason-cancel").addEventListener("click", () => {
    hideModal("cancel-reason-modal")
    document.getElementById("cancel-reason-form").reset()
    document.getElementById("cancel-reason-error").textContent = ""
  })

  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      const modalId = e.target.id
      hideModal(modalId)

      if (modalId === "report-modal" || modalId === "detailed-form-modal") {
        activeReportId = null
        if (modalId === "report-modal") {
          document.getElementById("reportForm").reset()
        } else {
          existingFormData = null
          document.getElementById("detailed-form").reset()
          resetFormToEditable()
          enableFormSubmission()
        }
      } else if (modalId === "cancel-reason-modal") {
        document.getElementById("cancel-reason-form").reset()
        document.getElementById("cancel-reason-error").textContent = ""
      }
    }
  })
}

/**
 * Configura los eventos de todos los formularios
 * Incluye validación y envío de datos
 */
function setupFormEvents() {
  document.getElementById("reportForm").addEventListener("submit", (e) => {
    e.preventDefault()
    const descripcion = document.getElementById("descripcion").value
    if (!descripcion.trim()) {
      document.getElementById("errorDescripcion").textContent = "La descripción es obligatoria"
      return
    }
    document.getElementById("errorDescripcion").textContent = ""
    submitReport(descripcion)
  })

  document.getElementById("detailed-form").addEventListener("submit", (e) => {
    e.preventDefault()

    if (existingFormData) {
      alert("Este formulario ya ha sido enviado y no puede ser modificado")
      return
    }

    const formData = {
      nombres: document.getElementById("nombres").value,
      apellidoPaterno: document.getElementById("apellido-paterno").value,
      apellidoMaterno: document.getElementById("apellido-materno").value,
      // codigoUdg: document.getElementById("codigo-udg").value, // <-- Quitar este campo
      fechaNacimiento: document.getElementById("fecha-nacimiento").value,
      descripcionDetallada: document.getElementById("descripcion-detallada").value,
    }

    if (
      !formData.nombres.trim() ||
      !formData.apellidoPaterno.trim() ||
      !formData.apellidoMaterno.trim() ||
      // !formData.codigoUdg.trim() || // <-- Quitar esta validación
      !formData.fechaNacimiento.trim() ||
      !formData.descripcionDetallada.trim()
    ) {
      alert("Por favor, complete todos los campos obligatorios marcados con *")
      return
    }

    submitDetailedForm(formData)
  })

  document.getElementById("contactForm").addEventListener("submit", (e) => {
    e.preventDefault()
    document.getElementById("contactExito").textContent = "Mensaje enviado con éxito"
    e.target.reset()
    setTimeout(() => {
      document.getElementById("contactExito").textContent = ""
    }, 3000)
  })

  document.getElementById("cancel-reason-form").addEventListener("submit", (e) => {
    e.preventDefault()
    const reason = document.getElementById("cancel-reason-text").value.trim()

    if (!reason) {
      document.getElementById("cancel-reason-error").textContent = "La razón de cancelación es obligatoria"
      return
    }

    document.getElementById("cancel-reason-error").textContent = ""
    cancelReportWithReason(reason)
  })
}

/**
 * Configura los eventos de teclado globales
 * Maneja Escape para cerrar modales y Enter para enviar formularios
 */
function setupKeyboardEvents() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault()
      closeActiveModal()
      return
    }

    if (e.key === "Enter") {
      const activeModalId = getActiveModal()

      if (activeModalId === "report-modal") {
        const activeElement = document.activeElement
        if (activeElement && activeElement.tagName !== "BUTTON") {
          e.preventDefault()
          document.getElementById("reportForm").dispatchEvent(new Event("submit"))
        }
      } else if (activeModalId === "detailed-form-modal") {
        const activeElement = document.activeElement
        if (activeElement && activeElement.tagName !== "BUTTON" && !existingFormData) {
          e.preventDefault()
          document.getElementById("detailed-form").dispatchEvent(new Event("submit"))
        }
      } else if (activeModalId === "cancel-confirmation-modal") {
        e.preventDefault()
        document.getElementById("confirm-cancel").click()
      } else if (activeModalId === "cancel-reason-modal") {
        const activeElement = document.activeElement
        if (activeElement && activeElement.tagName !== "TEXTAREA") {
          e.preventDefault()
          document.getElementById("cancel-reason-form").dispatchEvent(new Event("submit"))
        }
      }
    }
  })

  document.addEventListener("selectionchange", () => {
    const selection = document.getSelection()
    if (selection && selection.toString().length > 0) {
      autoUpdate = false
    } else {
      autoUpdate = true
    }
  })
}

/**
 * Configura el comportamiento del acordeón en las FAQ
 * Permite expandir y contraer las preguntas frecuentes
 */
function setupAccordion() {
  document.querySelectorAll(".accordion-header").forEach((header) => {
    header.addEventListener("click", () => {
      header.classList.toggle("active")
      const content = header.nextElementSibling
      content.style.maxHeight = content.style.maxHeight ? null : content.scrollHeight + "px"
    })
  })
}


// FUNCIÓN DE INICIALIZACIÓN PRINCIPAL
/**
 * Inicializa la aplicación cuando el DOM está listo
 * Verifica autenticación, carga datos del usuario y configura eventos
 */
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("access_token")

  if (!token) {
    window.location.href = "index.html"
    return
  }

  try {
    const response = await authenticatedFetch(`${API_URL}/me`)
    if (!response) return

    const user = await response.json()
    currentUserRole = user.rol
    document.getElementById("username").textContent = `Usuario: ${user.correo} (${user.codigo})`
    loadReports()
  } catch (error) {
    console.error("Error al obtener información del usuario:", error)
    handleAuthError()
  }

  setupNavigationEvents()
  setupModalEvents()
  setupFormEvents()
  setupAccordion()
  setupKeyboardEvents()
})

// FUNCIONES DE ACTUALIZACIÓN AUTOMÁTICA

/**
 * Actualización automática cada 30 segundos
 * Verifica la validez del token y actualiza reportes si es válido
 */
setInterval(async () => {
  if (autoUpdate) {
    const isValid = await verifyTokenValidity()
    if (isValid) {
      loadReports()
    }
  }
}, 30000)

/**
 * Actualización automática cada 3 segundos
 * Actualiza reportes si la actualización automática está habilitada
 */
setInterval(() => {
  if (autoUpdate) {
    loadReports()
  }
}, 3000)