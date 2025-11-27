// Sistema de autenticación para DesinfoApp - CORREGIDO
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.checkAuthStatus();
        this.setupEventListeners();
        this.setupAdminAuth();
    }

    setupAdminAuth() {
        // Verificar autenticación admin en páginas protegidas
        if (this.isAdminPage() && !this.isAdminAuthenticated()) {
            this.redirectToAdminLogin();
        }
    }

    setupEventListeners() {
        // Login admin
        document.getElementById('adminLoginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAdminLogin();
        });

        // Logout admin
        document.getElementById('logout-admin')?.addEventListener('click', () => {
            this.handleAdminLogout();
        });
    }

    handleAdminLogin() {
        const username = document.getElementById('adminUsername').value;
        const password = document.getElementById('adminPassword').value;
        const remember = document.getElementById('rememberAdmin')?.checked || false;

        // Credenciales hardcodeadas (las mismas que en tu backend)
        if (username === 'admin' && password === '1234') {
            this.setAdminAuthenticated(true, remember);
            this.showAlert('✅ Acceso de administrador concedido', 'success');
            
            // Redirigir después de un breve delay
            setTimeout(() => {
                const redirectTo = this.getUrlParameter('redirect') || 'datasets.html';
                window.location.href = redirectTo;
            }, 1000);
        } else {
            this.showAlert('❌ Credenciales de administrador incorrectas', 'error');
        }
    }

    handleAdminLogout() {
        this.setAdminAuthenticated(false);
        this.showAlert('🔒 Sesión de administrador cerrada', 'info');
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }

    setAdminAuthenticated(authenticated, remember = false) {
        if (authenticated) {
            localStorage.setItem('adminAuthenticated', 'true');
            if (remember) {
                localStorage.setItem('adminRemember', 'true');
                // Guardar por 7 días
                const expiry = new Date();
                expiry.setDate(expiry.getDate() + 7);
                localStorage.setItem('adminExpiry', expiry.toISOString());
            }
        } else {
            localStorage.removeItem('adminAuthenticated');
            localStorage.removeItem('adminRemember');
            localStorage.removeItem('adminExpiry');
        }
    }

    isAdminAuthenticated() {
        const authenticated = localStorage.getItem('adminAuthenticated') === 'true';
        const expiry = localStorage.getItem('adminExpiry');
        
        if (expiry && new Date() > new Date(expiry)) {
            this.setAdminAuthenticated(false);
            return false;
        }
        
        return authenticated;
    }

    isAdminPage() {
        return window.location.pathname.includes('datasets.html') || 
               window.location.pathname.includes('calibration.html') ||
               window.location.pathname.includes('admin');
    }

    redirectToAdminLogin() {
        const currentPath = window.location.pathname.split('/').pop();
        window.location.href = `login.html?redirect=${encodeURIComponent(currentPath)}`;
    }

    checkAuthStatus() {
        if (this.isAdminAuthenticated()) {
            this.updateUIForAdmin();
        } else if (this.isAdminPage()) {
            this.redirectToAdminLogin();
        }
    }

    updateUIForAdmin() {
        // Mostrar elementos de admin
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => {
            el.style.display = 'block';
        });

        // Ocultar elementos de login
        const loginElements = document.querySelectorAll('.login-only');
        loginElements.forEach(el => {
            el.style.display = 'none';
        });

        // Actualizar interfaz con info de admin
        const adminInfoElements = document.querySelectorAll('.admin-info');
        adminInfoElements.forEach(el => {
            el.textContent = 'Administrador';
        });
    }

    getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible`;
        alertDiv.innerHTML = `
            <div class="alert-content">
                <div class="alert-icon">
                    <i class="fas fa-${this.getAlertIcon(type)}"></i>
                </div>
                <div class="alert-message">
                    <span>${message}</span>
                </div>
                <button type="button" class="alert-close" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        const alertSystem = document.getElementById('alertSystem');
        if (alertSystem) {
            alertSystem.appendChild(alertDiv);
        } else {
            // Crear contenedor si no existe
            const container = document.createElement('div');
            container.id = 'alertSystem';
            container.className = 'alert-system';
            container.appendChild(alertDiv);
            document.body.appendChild(container);
        }

        // Mostrar animación
        setTimeout(() => alertDiv.classList.add('show'), 100);

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 5000);
    }

    getAlertIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    window.authSystem = new AuthSystem();
});