// Configuración de API
const API_URL = 'http://localhost:8000'; // Cambia esto según donde esté desplegada tu API

// Function to show login view
function showLoginView() {
    document.getElementById('loginView').style.display = 'block';
    document.getElementById('forgotView').style.display = 'none';
    document.getElementById('confirmationView').style.display = 'none';
    document.getElementById('registerView').style.display = 'none';
}

// Function to show forgot password view
function showForgotView() {
    document.getElementById('loginView').style.display = 'none';
    document.getElementById('forgotView').style.display = 'block';
    document.getElementById('confirmationView').style.display = 'none';
    document.getElementById('registerView').style.display = 'none';
}

// Function to show register view
function showRegisterView() {
    document.getElementById('loginView').style.display = 'none';
    document.getElementById('forgotView').style.display = 'none';
    document.getElementById('confirmationView').style.display = 'none';
    document.getElementById('registerView').style.display = 'block';
}

// Function to show confirmation view
function showConfirmationView() {
    document.getElementById('loginView').style.display = 'none';
    document.getElementById('forgotView').style.display = 'none';
    document.getElementById('confirmationView').style.display = 'block';
    document.getElementById('registerView').style.display = 'none';
}

// Login function - connects to API
function login() {
    const codigo = document.getElementById('codigo').value;
    const password = document.getElementById('password').value;

    clearError();

    localStorage.removeItem('access_token');

    if (!codigo || !password) {
        showError('Por favor, complete todos los campos');
        return;
    }

    const loginData = {
        username: codigo,
        password: password
    };

    document.getElementById('loginButton').disabled = true;
    document.getElementById('loginButton').textContent = 'CARGANDO...';

    fetch(`${API_URL}/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(loginData)
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Credenciales incorrectas');
            } else {
                throw new Error('Error del servidor: ' + response.status);
            }
        }
        return response.json();
    })
    .then(data => {
        console.log('Login exitoso:', data);
        localStorage.setItem('access_token', data.access_token);
        window.location.href = 'dashboard.html';
    })
    .catch(error => {
        showError('Error: ' + error.message);
    })
    .finally(() => {
        document.getElementById('loginButton').disabled = false;
        document.getElementById('loginButton').textContent = 'INGRESAR';
    });
}

// Helper function to show errors
function showError(message) {
    // Check if error element exists, if not create it
    let errorElement = document.getElementById('loginError');
    
    if (!errorElement) {
        errorElement = document.createElement('p');
        errorElement.id = 'loginError';
        errorElement.style.color = 'red';
        errorElement.style.fontSize = '0.9rem';
        errorElement.style.marginTop = '10px';
        
        // Insert after login button
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.parentNode.insertBefore(errorElement, loginButton.nextSibling);
        } else {
            // Fallback insert location
            document.querySelector('.login-container').appendChild(errorElement);
        }
    }
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

// Helper function to clear errors
function clearError() {
    const errorElement = document.getElementById('loginError');
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

// Register function - connects to API
function register() {
    const codigo = document.getElementById('newCodigo').value;
    const email = document.getElementById('newEmail').value;
    const password = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate fields
    if (!codigo || !email || !password || !confirmPassword) {
        alert('Por favor, complete todos los campos');
        return;
    }
    
    if (password !== confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
    }
    
    // Validate email format
    if (!email.includes('@') || !email.includes('.')) {
        alert('Por favor, ingrese un correo electrónico válido');
        return;
    }
    
    // Create user data object for API
    const userData = {
        codigo: codigo,
        correo: email,  // CORREGIDO: era 'nombre' ahora es 'email'
        contrasena: password
    };
    
    console.log('Datos a enviar:', userData); // Para debugging
    
    // Disable register button
    document.getElementById('registerButton').disabled = true;
    document.getElementById('registerButton').textContent = 'REGISTRANDO...';
    
    // Send request to API
    fetch(`${API_URL}/usuarios/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
    })
    .then(response => {
        console.log('Response status:', response.status); // Para debugging
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.detail || 'Error en el registro');
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Registro exitoso:', data); // Para debugging
        alert('Usuario registrado exitosamente');
        showLoginView();
        // Limpiar campos del formulario
        document.getElementById('newCodigo').value = '';
        document.getElementById('newEmail').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    })
    .catch(error => {
        console.error('Error en registro:', error); // Para debugging
        alert('Error al registrar usuario: ' + error.message);
    })
    .finally(() => {
        // Re-enable register button
        document.getElementById('registerButton').disabled = false;
        document.getElementById('registerButton').textContent = 'REGISTRARSE';
    });
}

// Verificar si el usuario ya está logueado al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    // Si hay un token guardado, redirigir al dashboard
    const token = localStorage.getItem('access_token');
    if (token) {
        window.location.href = 'dashboard.html';
    }
});