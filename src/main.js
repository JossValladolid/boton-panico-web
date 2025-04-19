document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('.nav-menu a');
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const showFormButton = document.getElementById('show-form-button');
    const formOverlay = document.getElementById('form-overlay');
    const closeFormButton = document.getElementById('close-form');
    const accordionItems = document.querySelectorAll('.accordion-item');
    const contactForm = document.getElementById('contactForm');
    
    // Funciones para el formulario principal
    function limpiarMensajeExito() {
        document.getElementById('exitoEnvio').textContent = '';
    }
    
    function limpiarMensajeErrorCodigo() {
        document.getElementById('errorCodigo').textContent = '';
    }

    function limpiarMensajeErrorDescripcion() {
        document.getElementById('errorDescripcion').textContent = '';
    }
    
    // Toggle del menú móvil
    menuToggle.addEventListener('click', function() {
        navMenu.classList.toggle('active');
    });
    
    
    // Acordeón para FAQ
    accordionItems.forEach(item => {
        const header = item.querySelector('.accordion-header');
        
        header.addEventListener('click', function() {
            // Cerrar todos los otros acordeones
            accordionItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });
            
            // Alternar el estado del acordeón actual
            item.classList.toggle('active');
        });
    });
    
    // Validación del formulario principal
    const mainForm = document.getElementById('myForm');
    const codigoEstudianteInput = document.getElementById('codigoEstudiante');
    const errorCodigoSpan = document.getElementById('errorCodigo');
    const descripcionInput = document.getElementById('descripcion');
    const nombreInput = document.getElementById('nombre');
    const errorDescripcionSpan = document.getElementById('errorDescripcion');
    const exitoEnvioSpan = document.getElementById('exitoEnvio');

    if (codigoEstudianteInput) {
        codigoEstudianteInput.addEventListener('focus', limpiarMensajeExito);
        codigoEstudianteInput.addEventListener('focus', limpiarMensajeErrorCodigo);
    }
    
    if (nombreInput) {
        nombreInput.addEventListener('focus', limpiarMensajeExito);
    }
    
    if (descripcionInput) {
        descripcionInput.addEventListener('focus', limpiarMensajeExito);
        descripcionInput.addEventListener('focus', limpiarMensajeErrorDescripcion);
    }

    if (mainForm) {
        mainForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Evita el envío tradicional del formulario

            const codigoEstudianteValor = codigoEstudianteInput.value.trim();
            const nombreValor = document.getElementById('nombre').value;
            const descripcionValor = descripcionInput.value.trim();

            let isValid = true;

            // Validar código de estudiante
            if (codigoEstudianteValor.length !== 9 || !/^\d+$/.test(codigoEstudianteValor)) {
                errorCodigoSpan.textContent = 'El código de estudiante debe tener exactamente 9 dígitos numéricos.';
                isValid = false;
            } else {
                errorCodigoSpan.textContent = '';
            }

            // Validar descripción (no vacía)
            if (descripcionValor === '') {
                errorDescripcionSpan.textContent = 'La descripción no puede estar vacía.';
                isValid = false;
            } else {
                errorDescripcionSpan.textContent = '';
            }

            // Si todos los campos son válidos, proceder con el envío
            if (isValid) {
                const formData = {
                    codigoEstudiante: codigoEstudianteValor,
                    nombre: nombreValor,
                    descripcion: descripcionValor
                };

                const jsonData = JSON.stringify(formData);
                console.log('Datos JSON a enviar:', jsonData);

                fetch('http://localhost:8000/tasks/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: jsonData
                })
                .then(response => response.json())
                .then(data => {
                    console.log('Respuesta del servidor:', data);
                    exitoEnvioSpan.textContent = 'Su reporte ha sido recibido';
                    errorCodigoSpan.textContent = '';
                    errorDescripcionSpan.textContent = '';
                    document.getElementById('codigoEstudiante').value = '';
                    document.getElementById('nombre').value = '';
                    document.getElementById('descripcion').value = '';
                })
                .catch(error => {
                    console.error('Error al enviar la petición:', error);
                });
            }
            else {
                limpiarMensajeExito();
            }
        });
    }
    
    // Eventos de navegación
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Quitar la clase active de todos los enlaces
            navLinks.forEach(item => item.classList.remove('active'));
            
            // Agregar la clase active al enlace actual
            this.classList.add('active');
            
            // Obtener el ID de la sección a mostrar
            const targetId = this.getAttribute('href').substring(1);
            
            // Ocultar todas las secciones
            sections.forEach(section => section.classList.remove('active-section'));
            
            // Mostrar la sección seleccionada
            document.getElementById(targetId).classList.add('active-section');
            
            // Cerrar el menú móvil si está abierto
            if (navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
            }

            if(targetId == "enviar-reporte") {
                limpiarMensajeErrorCodigo();
                limpiarMensajeErrorDescripcion();
                limpiarMensajeExito();
                document.getElementById('codigoEstudiante').value = '';
                document.getElementById('nombre').value = '';
                document.getElementById('descripcion').value = '';
            }
            
            // Desplazamiento suave al inicio de la sección
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    });

    // Formulario de contacto
    if (contactForm) {
        contactForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const nombre = document.getElementById('contactNombre').value.trim();
            const email = document.getElementById('contactEmail').value.trim();
            const asunto = document.getElementById('contactAsunto').value.trim();
            const mensaje = document.getElementById('contactMensaje').value.trim();
            
            if (nombre && email && asunto && mensaje) {
                // Aquí iría el código para enviar el formulario
                // Por ahora, solo mostraremos un mensaje de éxito
                document.getElementById('contactExito').textContent = 'Mensaje enviado correctamente. Nos pondremos en contacto contigo pronto.';
                
                // Limpiar campos
                document.getElementById('contactNombre').value = '';
                document.getElementById('contactEmail').value = '';
                document.getElementById('contactAsunto').value = '';
                document.getElementById('contactMensaje').value = '';
                
                // Limpiar mensaje después de 5 segundos
                setTimeout(() => {
                    document.getElementById('contactExito').textContent = '';
                }, 5000);
            }
        });
    }
});
