// Sistema de calibración para DesinfoApp - CONECTADO AL BACKEND - CORREGIDO
class CalibrationSystem {
    constructor() {
        this.calibrationHistory = [];
        this.currentCalibration = null;
        this.init();
    }

    init() {
        console.log('🎯 Inicializando sistema de calibración...');
        this.checkAuth();
        this.loadCalibrationHistory();
        this.setupEventListeners();
        this.updateCalibrationStatus();
        this.loadCalibrationSettings();
    }

    checkAuth() {
        // Verificar autenticación admin
        const isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';
        if (!isAuthenticated) {
            console.log('🔒 Redirigiendo a login...');
            const currentPage = window.location.pathname.split('/').pop();
            window.location.href = `login.html?redirect=${encodeURIComponent(currentPage)}`;
            return false;
        }
        return true;
    }

    setupEventListeners() {
        // Ejecutar calibración
        const runBtn = document.getElementById('run-calibration');
        if (runBtn) {
            runBtn.addEventListener('click', () => {
                this.runCalibration();
            });
        }

        // Ver logs de calibración
        const viewLogsBtn = document.getElementById('view-calibration-logs');
        if (viewLogsBtn) {
            viewLogsBtn.addEventListener('click', () => {
                this.loadCalibrationHistory();
            });
        }

        // Configuración
        const saveSettingsBtn = document.getElementById('save-calibration-settings');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => {
                this.saveCalibrationSettings();
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logout-admin');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
    }

    async runCalibration() {
        if (!this.checkAuth()) return;

        try {
            this.showCalibrationProgress();
            this.showAlert('🔄 Iniciando proceso de calibración...', 'info');
            
            console.log('🎯 Ejecutando calibración en el backend...');
            const response = await fetch(`${window.API_BASE}/calibrate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + btoa('admin:1234')
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('📈 Resultado de calibración:', result);

            if (result.ok) {
                this.currentCalibration = result;
                this.updateCalibrationResults(result);
                this.loadCalibrationHistory();
                this.showAlert('✅ Calibración completada exitosamente', 'success');
            } else {
                throw new Error(result.error || 'Error en la calibración');
            }
        } catch (error) {
            console.error('❌ Error en calibración:', error);
            this.showAlert(`Error en la calibración: ${error.message}`, 'error');
        } finally {
            this.hideCalibrationProgress();
        }
    }

    async loadCalibrationHistory() {
        try {
            console.log('📊 Cargando historial de calibración...');
            const response = await fetch(`${window.API_BASE}/calibration-logs`);
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.ok) {
                this.calibrationHistory = data.logs || [];
                this.renderCalibrationHistory();
                this.updateCalibrationStatus();
                console.log(`✅ Historial cargado: ${this.calibrationHistory.length} registros`);
            } else {
                throw new Error(data.error || 'Error en la respuesta del servidor');
            }
        } catch (error) {
            console.error('❌ Error cargando historial:', error);
            this.showAlert(`Error al cargar el historial: ${error.message}`, 'error');
        }
    }

    showCalibrationProgress() {
        const progressSection = document.getElementById('calibration-progress');
        const runButton = document.getElementById('run-calibration');
        
        if (progressSection) progressSection.style.display = 'block';
        if (runButton) {
            runButton.disabled = true;
            runButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calibrando...';
        }
        
        this.simulateProgress();
    }

    hideCalibrationProgress() {
        const progressSection = document.getElementById('calibration-progress');
        const runButton = document.getElementById('run-calibration');
        
        if (progressSection) progressSection.style.display = 'none';
        if (runButton) {
            runButton.disabled = false;
            runButton.innerHTML = '<i class="fas fa-play"></i> Ejecutar Calibración';
        }
        this.updateProgressBar(0);
    }

    simulateProgress() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 90) {
                progress = 90;
                clearInterval(interval);
            }
            this.updateProgressBar(progress);
        }, 300);
    }

    updateProgressBar(progress) {
        const progressBar = document.getElementById('calibration-progress-bar');
        const progressText = document.getElementById('calibration-progress-text');
        
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (progressText) progressText.textContent = `${Math.round(progress)}%`;
    }

    updateCalibrationResults(results) {
        const resultsContainer = document.getElementById('calibration-results');
        if (!resultsContainer) return;
        
        const accuracy = results.avg_accuracy || 0;
        const calibrationRate = results.calibration_rate || 0;
        const calibratedCount = results.results?.length || 0;

        resultsContainer.innerHTML = `
            <div class="calibration-result-card">
                <div class="result-header">
                    <h4>🎯 Resultados de la Calibración</h4>
                    <span class="result-badge ${accuracy >= 80 ? 'success' : accuracy >= 60 ? 'warning' : 'error'}">
                        ${Math.round(accuracy)}% Precisión
                    </span>
                </div>
                
                <div class="result-stats">
                    <div class="stat-item">
                        <div class="stat-value">${Math.round(calibrationRate)}%</div>
                        <div class="stat-label">Tasa de Calibración</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${calibratedCount}</div>
                        <div class="stat-label">Análisis Calibrados</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${Math.round(accuracy)}%</div>
                        <div class="stat-label">Precisión Promedio</div>
                    </div>
                </div>
                
                ${results.results && results.results.length > 0 ? `
                    <div class="result-details">
                        <h5>📊 Detalles de Calibración</h5>
                        <div class="details-list">
                            ${results.results.slice(0, 5).map(result => `
                                <div class="detail-item">
                                    <span class="item-id">#${String(result.analysis_id).substring(0, 8)}</span>
                                    <span class="item-score">
                                        ${result.original_score} → ${result.calibrated_score}
                                    </span>
                                    <span class="item-accuracy ${result.accuracy >= 80 ? 'high' : result.accuracy >= 60 ? 'medium' : 'low'}">
                                        ${Math.round(result.accuracy)}% precisión
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : `
                    <div class="no-results">
                        <i class="fas fa-info-circle"></i>
                        <p>No se encontraron análisis para calibrar</p>
                    </div>
                `}
            </div>
        `;
    }

    renderCalibrationHistory() {
        const tbody = document.getElementById('calibration-history-tbody');
        if (!tbody) return;
        
        if (this.calibrationHistory.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <i class="fas fa-inbox fa-2x text-muted mb-2"></i>
                        <p class="text-muted">No hay registros de calibración</p>
                    </td>
                </tr>
            `;
            return;
        }

        const sortedHistory = [...this.calibrationHistory].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        tbody.innerHTML = sortedHistory.map(log => `
            <tr class="calibration-log">
                <td>
                    <div class="log-date">
                        ${this.formatDateTime(log.timestamp)}
                    </div>
                </td>
                <td>${log.total_analyses || 0}</td>
                <td>${log.calibrated_analyses || 0}</td>
                <td>
                    <span class="calibration-rate ${this.getRateClass(log.calibration_rate)}">
                        ${Math.round(log.calibration_rate || 0)}%
                    </span>
                </td>
                <td>
                    <span class="accuracy-badge ${this.getAccuracyClass(log.average_accuracy)}">
                        ${Math.round(log.average_accuracy || 0)}%
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action view-details" data-timestamp="${log.timestamp}" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Agregar event listeners para los botones de detalles
        document.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const timestamp = e.currentTarget.getAttribute('data-timestamp');
                this.viewCalibrationDetails(timestamp);
            });
        });
    }

    viewCalibrationDetails(timestamp) {
        const log = this.calibrationHistory.find(l => l.timestamp === timestamp);
        if (!log) return;

        const modal = document.getElementById('calibration-details-modal');
        const content = document.getElementById('calibration-details-content');
        
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="calibration-detail-section">
                <h4>📋 Información General</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Fecha y Hora:</label>
                        <span>${this.formatDateTime(log.timestamp)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Total de Análisis:</label>
                        <span>${log.total_analyses || 0}</span>
                    </div>
                    <div class="detail-item">
                        <label>Calibrados:</label>
                        <span>${log.calibrated_analyses || 0}</span>
                    </div>
                    <div class="detail-item">
                        <label>Tasa de Calibración:</label>
                        <span class="rate-badge ${this.getRateClass(log.calibration_rate)}">
                            ${Math.round(log.calibration_rate || 0)}%
                        </span>
                    </div>
                </div>
            </div>

            <div class="calibration-detail-section">
                <h4>📊 Métricas de Precisión</h4>
                <div class="accuracy-metrics">
                    <div class="metric-item">
                        <div class="metric-value ${this.getAccuracyClass(log.average_accuracy)}">
                            ${Math.round(log.average_accuracy || 0)}%
                        </div>
                        <div class="metric-label">Precisión Promedio</div>
                    </div>
                </div>
            </div>
        `;

        modal.classList.add('show');
    }

    updateCalibrationStatus() {
        const latestCalibration = this.calibrationHistory[0];
        
        const accuracyEl = document.getElementById('current-accuracy');
        const countEl = document.getElementById('calibration-count');
        const lastEl = document.getElementById('last-calibration');
        
        if (accuracyEl) {
            accuracyEl.textContent = latestCalibration ? 
                `${Math.round(latestCalibration.average_accuracy)}%` : '85%';
        }
        
        if (countEl) {
            countEl.textContent = this.calibrationHistory.length;
        }
        
        if (lastEl) {
            lastEl.textContent = latestCalibration ? 
                this.formatDateTime(latestCalibration.timestamp) : 'Nunca';
        }
    }

    saveCalibrationSettings() {
        const settings = {
            sensitivity: document.getElementById('calibration-sensitivity')?.value || 50,
            minMatches: document.getElementById('min-matches')?.value || 1,
            referenceDataset: document.getElementById('reference-dataset')?.value || 'local',
            autoCalibrate: document.getElementById('auto-calibrate')?.checked || false,
            savedAt: new Date().toISOString()
        };

        localStorage.setItem('calibration_settings', JSON.stringify(settings));
        this.showAlert('✅ Configuración guardada', 'success');
    }

    loadCalibrationSettings() {
        const saved = localStorage.getItem('calibration_settings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                const sensitivity = document.getElementById('calibration-sensitivity');
                const minMatches = document.getElementById('min-matches');
                const referenceDataset = document.getElementById('reference-dataset');
                const autoCalibrate = document.getElementById('auto-calibrate');
                
                if (sensitivity) sensitivity.value = settings.sensitivity || 50;
                if (minMatches) minMatches.value = settings.minMatches || 1;
                if (referenceDataset) referenceDataset.value = settings.referenceDataset || 'local';
                if (autoCalibrate) autoCalibrate.checked = settings.autoCalibrate || false;
            } catch (error) {
                console.error('Error cargando configuración:', error);
            }
        }
    }

    handleLogout() {
        localStorage.removeItem('adminAuthenticated');
        localStorage.removeItem('adminRemember');
        localStorage.removeItem('adminExpiry');
        this.showAlert('🔒 Sesión cerrada', 'info');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }

    // Métodos utilitarios
    getRateClass(rate) {
        rate = Number(rate) || 0;
        if (rate >= 80) return 'high';
        if (rate >= 50) return 'medium';
        return 'low';
    }

    getAccuracyClass(accuracy) {
        accuracy = Number(accuracy) || 0;
        if (accuracy >= 90) return 'excellent';
        if (accuracy >= 80) return 'good';
        if (accuracy >= 70) return 'fair';
        return 'poor';
    }

    formatDateTime(timestamp) {
        if (!timestamp) return 'N/A';
        return new Date(timestamp).toLocaleString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showAlert(message, type = 'info') {
        // Usar el sistema de alertas existente o crear uno simple
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.innerHTML = `
            <div class="alert-content">
                <i class="fas fa-${this.getAlertIcon(type)}"></i>
                <span>${message}</span>
                <button class="alert-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        const container = document.getElementById('alert-container') || document.body;
        container.appendChild(alertDiv);

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
    window.calibrationSystem = new CalibrationSystem();
    
    // Cerrar modal
    const modal = document.getElementById('calibration-details-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });

        document.querySelector('.modal-close')?.addEventListener('click', function() {
            modal.classList.remove('show');
        });
    }

    // Cerrar con ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('calibration-details-modal');
            if (modal) {
                modal.classList.remove('show');
            }
        }
    });
});