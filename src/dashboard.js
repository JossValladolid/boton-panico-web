const API_URL = "http://localhost:8000"

let activeReportId = null
let activeSection = "home"
let autoUpdate = true
let currentUserRole = ""
let existingFormData = null

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

function handleAuthError() {
  localStorage.removeItem("access_token")
  alert("Tu sesión ha expirado. Serás redirigido al login.")
  window.location.href = "index.html"
}

async function verifyTokenValidity() {
  try {
    const response = await authenticatedFetch(`${API_URL}/me`)
    return response !== null
  } catch (error) {
    console.error("Error verificando token:", error)
    return false
  }
}

function disableBodyScroll() {
  document.body.classList.add("modal-open")
}

function enableBodyScroll() {
  document.body.classList.remove("modal-open")
}

function showModal(modalId) {
  disableBodyScroll()
  document.getElementById(modalId).style.display = "block"
}

function hideModal(modalId) {
  enableBodyScroll()
  document.getElementById(modalId).style.display = "none"
}

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

function disableFormSubmission() {
  const submitButton = document.querySelector('#detailed-form button[type="submit"]')
  if (submitButton) {
    submitButton.disabled = true
    submitButton.textContent = "Formulario ya enviado"
    submitButton.style.backgroundColor = "#ccc"
    submitButton.style.cursor = "not-allowed"
  }
}

function enableFormSubmission() {
  const submitButton = document.querySelector('#detailed-form button[type="submit"]')
  if (submitButton) {
    submitButton.disabled = false
    submitButton.textContent = "Enviar"
    submitButton.style.backgroundColor = ""
    submitButton.style.cursor = ""
  }
}

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

function logout() {
  localStorage.removeItem("access_token")
  window.location.href = "index.html"
}

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
      // Solo bloquea todo el bloque si es cancelado o completado
      let reportClass = "report-item";
      if (report.estado === "Cancelado") {
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

      if (report.estado === "Cancelado" && report.razon && report.razon.trim()) {
        reportHTML += `
          <div class="report-reason">
            <strong>Razón de cancelación:</strong> ${report.razon}
          </div>
        `;
      }

      // Botón Formulario: solo deshabilitado si NO es pendiente ni completado
      reportHTML += `
        <div class="report-actions">
            <button class="action-button form-button${isCompleted ? " completed" : ""}" data-id="${report.id}" ${isPending || isCompleted ? "" : "disabled"}>
                ${buttonLabel}
            </button>
            <button class="action-button cancel-button" data-id="${report.id}" ${(isPending || isActive) ? "" : "disabled"}>
                ${report.estado === "Cancelado" ? "Cancelado" : "Cancelar Reporte"}
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

    document.querySelectorAll(".form-button").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const reportId = btn.dataset.id;
        const report = reports.find(r => r.id == reportId);
        if (!report) return;

        if (report.estado === "Pendiente") {
          openDetailedForm(reportId); // Editable
        } else if (report.estado === "Completado") {
          await openCompletedForm(reportId); // Solo lectura
        }
      });
    })
  } catch (error) {
    console.error("Error al cargar reportes:", error)
    reportsContainer.innerHTML = "<p>Error al cargar los reportes</p>"
  }
}

async function openDetailedForm(reportId) {
  activeReportId = reportId
  existingFormData = null

  document.getElementById("detailed-form").reset()
  enableFormSubmission()

  updateCurrentDate()
  await fillFormWithReportData(reportId)
  await loadExistingFormData(reportId)

  showModal("detailed-form-modal")
}

async function loadExistingFormData(reportId) {
  try {
    const response = await authenticatedFetch(`${API_URL}/my-tasks/${reportId}/formulario`)

    if (response && response.ok) {
      const formData = await response.json()
      existingFormData = formData

      document.getElementById("nombres").value = formData.nombres || ""
      document.getElementById("apellido-paterno").value = formData.apellido_paterno || ""
      document.getElementById("apellido-materno").value = formData.apellido_materno || ""
      document.getElementById("codigo-udg").value = formData.codigo_udg || ""
      document.getElementById("fecha-nacimiento").value = formData.fecha_nacimiento || ""
      document.getElementById("descripcion-detallada").value = formData.descripcion_detallada || ""

      const formInputs = document.querySelectorAll("#detailed-form input, #detailed-form textarea")
      formInputs.forEach((input) => {
        input.disabled = true
        input.style.backgroundColor = "#f5f5f5"
        input.style.color = "#666"
      })

      disableFormSubmission()

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
  } catch (error) {
    console.log("No existe formulario previo para este reporte")
  }
}

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

function confirmCancelReport(id) {
  activeReportId = id
  showModal("cancel-confirmation-modal")
}

function showCancelReasonModal() {
  hideModal("cancel-confirmation-modal")
  document.getElementById("cancel-reason-form").reset()
  document.getElementById("cancel-reason-error").textContent = ""
  showModal("cancel-reason-modal")
}

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
    enableFormSubmission()

    const infoMessage = document.getElementById("form-info-message")
    if (infoMessage) {
      infoMessage.remove()
    }

    const formInputs = document.querySelectorAll("#detailed-form input, #detailed-form textarea")
    formInputs.forEach((input) => {
      input.disabled = false
      input.style.backgroundColor = ""
      input.style.color = ""
    })
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
          enableFormSubmission()

          const infoMessage = document.getElementById("form-info-message")
          if (infoMessage) {
            infoMessage.remove()
          }

          const formInputs = document.querySelectorAll("#detailed-form input, #detailed-form textarea")
          formInputs.forEach((input) => {
            input.disabled = false
            input.style.backgroundColor = ""
            input.style.color = ""
          })
        }
      } else if (modalId === "cancel-reason-modal") {
        document.getElementById("cancel-reason-form").reset()
        document.getElementById("cancel-reason-error").textContent = ""
      }
    }
  })
}

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
      codigoUdg: document.getElementById("codigo-udg").value,
      fechaNacimiento: document.getElementById("fecha-nacimiento").value,
      descripcionDetallada: document.getElementById("descripcion-detallada").value,
    }

    if (
      !formData.nombres.trim() ||
      !formData.apellidoPaterno.trim() ||
      !formData.apellidoMaterno.trim() ||
      !formData.codigoUdg.trim() ||
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

function setupAccordion() {
  document.querySelectorAll(".accordion-header").forEach((header) => {
    header.addEventListener("click", () => {
      header.classList.toggle("active")
      const content = header.nextElementSibling
      content.style.maxHeight = content.style.maxHeight ? null : content.scrollHeight + "px"
    })
  })
}

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
      codigo_udg: formData.codigoUdg.trim(),
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

async function openCompletedForm(reportId) {
  // Limpia y deshabilita el formulario
  document.getElementById("detailed-form").reset();
  enableFormSubmission();

  // Obtén los datos del formulario completado
  try {
    const response = await authenticatedFetch(`${API_URL}/tasks/${reportId}/formulario`);
    if (!response) {
      alert("No se pudo obtener el formulario completado.");
      return;
    }
    const formData = await response.json();

    document.getElementById("nombres").value = formData.nombres || "";
    document.getElementById("apellido-paterno").value = formData.apellido_paterno || "";
    document.getElementById("apellido-materno").value = formData.apellido_materno || "";
    document.getElementById("codigo-udg").value = formData.codigo_udg || "";
    document.getElementById("fecha-nacimiento").value = formData.fecha_nacimiento || "";
    document.getElementById("descripcion-detallada").value = formData.descripcion_detallada || "";

    // Deshabilita todos los campos
    const formInputs = document.querySelectorAll("#detailed-form input, #detailed-form textarea");
    formInputs.forEach((input) => {
      input.disabled = true;
      input.style.backgroundColor = "#f5f5f5";
      input.style.color = "#666";
    });

    disableFormSubmission();

    // Muestra el modal
    showModal("detailed-form-modal");
  } catch (error) {
    alert("Error al cargar el formulario completado.");
  }
}

setInterval(async () => {
  if (autoUpdate) {
    const isValid = await verifyTokenValidity()
    if (isValid) {
      loadReports()
    }
  }
}, 30000)

setInterval(() => {
  if (autoUpdate) {
    loadReports()
  }
}, 3000)
