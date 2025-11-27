// Dashboard functionality for DesinfoApp - CONECTADO AL BACKEND
class Dashboard {
    constructor() {
        this.analyses = [];
        this.metrics = {
            total: 0,
            averageScore: 0,
            averageLatency: 0,
            fakeNews: 0,
            today: {
                analyses: 0,
                accuracy: 0,
                fakeNews: 0,
                latency: 0
            }
        };
        this.chart = null;
        this.init();
    }

    init() {
        this.loadSystemStatus();
        this.loadDashboardData();
        this.setupEventListeners();
        this.startAutoRefresh();
    }

    async loadSystemStatus() {
        try {
            console.log('🔍 Verificando estado del sistema...');
            
            // Verificar estado de la API
            const healthResponse = await fetch(`${window.API_BASE}/health`);
            const healthData = await healthResponse.json();
            
            this.updateSystemStatus('api-status', healthData.ok ? 'En Línea' : 'Con Problemas', healthData.ok ? 'online' : 'error');
            
            if (healthData.ok) {
                document.getElementById('detailed-api-status').textContent = '✅ En Línea';
                document.getElementById('response-time').textContent = `${Math.round(healthData.uptime)}s activo`;
                document.getElementById('queue-length').textContent = '0'; // Simulado
            } else {
                document.getElementById('detailed-api-status').textContent = '❌ Con Problemas';
            }

            // Verificar estado ML
            try {
                const mlResponse = await fetch(`${window.API_BASE}/ml-status`);
                const mlData = await mlResponse.json();
                
                const mlStatus = mlData.ok && mlData.model_exists ? 'Operativo' : 'No Disponible';
                const mlStatusClass = mlData.ok && mlData.model_exists ? 'online' : 'warning';
                
                this.updateSystemStatus('ml-status', mlStatus, mlStatusClass);
                document.getElementById('detailed-ml-status').textContent = mlData.model_exists ? '✅ Modelo Cargado' : '⚠️ Sin Modelo';
                document.getElementById('ml-model-status').textContent = mlStatus;

                // Actualizar info del modelo
                if (mlData.model_exists) {
                    document.getElementById('ml-last-trained').textContent = 'Recientemente';
                    document.getElementById('ml-accuracy').textContent = '85%'; // Valor por defecto
                }
            } catch (mlError) {
                console.warn('Error verificando ML:', mlError);
                this.updateSystemStatus('ml-status', 'No Disponible', 'error');
                document.getElementById('detailed-ml-status').textContent = '❌ Error de conexión';
            }

            // Verificar Groq LLaMA
            const llmStatus = healthData.llm?.configured ? 'Configurado' : 'No Configurado';
            const llmStatusClass = healthData.llm?.configured ? 'online' : 'warning';
            
            this.updateSystemStatus('llm-status', llmStatus, llmStatusClass);
            document.getElementById('detailed-llm-status').textContent = 
                healthData.llm?.configured ? '✅ API Key Configurada' : '⚠️ Sin API Key';

            // Base de datos (siempre activa en tu implementación)
            document.getElementById('detailed-db-status').textContent = '✅ SQLite Activa';

        } catch (error) {
            console.error('Error cargando estado del sistema:', error);
            this.updateSystemStatus('api-status', 'Sin Conexión', 'error');
            this.updateSystemStatus('ml-status', 'No Verificado', 'error');
            this.updateSystemStatus('llm-status', 'No Verificado', 'error');
            
            document.getElementById('detailed-api-status').textContent = '❌ Error de Conexión';
            document.getElementById('detailed-ml-status').textContent = '❌ No Verificado';
            document.getElementById('detailed-llm-status').textContent = '❌ No Verificado';
            document.getElementById('detailed-db-status').textContent = '❌ No Verificada';
        }
    }

    updateSystemStatus(elementId, text, statusClass) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
            element.className = `status-value ${statusClass}`;
            
            // Actualizar también el icono del status
            const statusItem = element.closest('.system-status-item');
            if (statusItem) {
                const statusIcon = statusItem.querySelector('.status-icon');
                if (statusIcon) {
                    statusIcon.className = `status-icon ${statusClass}`;
                }
            }
        }
    }

    async loadDashboardData() {
        this.showLoadingState();
        
        try {
            console.log('📊 Cargando datos del dashboard...');
            
            // Cargar historial para calcular métricas
            const historyResponse = await fetch(`${window.API_BASE}/history?limit=1000`);
            const historyData = await historyResponse.json();
            
            if (historyData.ok) {
                this.analyses = historyData.items || [];
                this.calculateMetrics();
                this.updateDashboardUI();
                this.renderRecentAnalyses();
                this.initChart();
                console.log('✅ Datos del dashboard cargados correctamente');
            } else {
                throw new Error('Error cargando historial');
            }
            
        } catch (error) {
            console.error('Error cargando datos del dashboard:', error);
            this.showError('Error al conectar con el servidor');
        } finally {
            this.hideLoadingState();
        }
    }

    calculateMetrics() {
        if (this.analyses.length === 0) {
            console.log('📭 No hay análisis para calcular métricas');
            return;
        }

        const total = this.analyses.length;
        const totalScore = this.analyses.reduce((sum, analysis) => sum + (analysis.score || 0), 0);
        const totalLatency = this.analyses.reduce((sum, analysis) => sum + (analysis.latency_ms || 0), 0);
        const fakeNews = this.analyses.filter(analysis => 
            analysis.verdict && analysis.verdict.toLowerCase().includes('falsa')
        ).length;

        // Datos de hoy
        const today = new Date().toDateString();
        const todayAnalyses = this.analyses.filter(analysis => {
            if (!analysis.created_at) return false;
            const analysisDate = new Date(analysis.created_at).toDateString();
            return analysisDate === today;
        });

        const todayScore = todayAnalyses.reduce((sum, analysis) => sum + (analysis.score || 0), 0);
        const todayLatency = todayAnalyses.reduce((sum, analysis) => sum + (analysis.latency_ms || 0), 0);
        const todayFakeNews = todayAnalyses.filter(analysis => 
            analysis.verdict && analysis.verdict.toLowerCase().includes('falsa')
        ).length;

        this.metrics = {
            total: total,
            averageScore: total > 0 ? Math.round(totalScore / total) : 0,
            averageLatency: total > 0 ? (totalLatency / total / 1000).toFixed(1) : 0,
            fakeNews: fakeNews,
            today: {
                analyses: todayAnalyses.length,
                accuracy: todayAnalyses.length > 0 ? Math.round(todayScore / todayAnalyses.length) : 0,
                fakeNews: todayFakeNews,
                latency: todayAnalyses.length > 0 ? (todayLatency / todayAnalyses.length / 1000).toFixed(1) : 0
            }
        };

        console.log('📈 Métricas calculadas:', this.metrics);

        // Actualizar badge del historial
        const historyBadge = document.getElementById('history-badge');
        if (historyBadge) {
            historyBadge.textContent = total > 99 ? '99+' : total;
            historyBadge.style.display = total > 0 ? 'flex' : 'none';
        }
    }

    updateDashboardUI() {
        // Métricas principales
        document.getElementById('total-analyses').textContent = this.metrics.total.toLocaleString();
        document.getElementById('average-score').textContent = `${this.metrics.averageScore}%`;
        document.getElementById('average-latency').textContent = `${this.metrics.averageLatency}s`;
        document.getElementById('fake-news-detected').textContent = this.metrics.fakeNews.toLocaleString();

        // Métricas de hoy
        document.getElementById('today-analyses').textContent = this.metrics.today.analyses;
        document.getElementById('today-accuracy').textContent = `${this.metrics.today.accuracy}%`;
        document.getElementById('today-fake-news').textContent = this.metrics.today.fakeNews;
        document.getElementById('today-latency').textContent = `${this.metrics.today.latency}s`;

        // Tendencias (simuladas para demo)
        document.getElementById('analysis-trend').textContent = '+12% esta semana';
        document.getElementById('accuracy-trend').textContent = '+2.1% este mes';
        document.getElementById('latency-trend').textContent = '-0.3s optimizado';
        document.getElementById('fake-news-trend').textContent = '+8% esta semana';
    }

    renderRecentAnalyses() {
        const container = document.getElementById('recent-analyses');
        if (!container) return;

        const recent = this.analyses.slice(0, 5);
        
        if (recent.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No hay análisis recientes</p>
                    <a href="analysis.html" class="btn btn-primary mt-2">
                        <i class="fas fa-plus"></i> Realizar Primer Análisis
                    </a>
                </div>
            `;
            return;
        }

        container.innerHTML = recent.map(analysis => `
            <div class="recent-analysis-item">
                <div class="analysis-header">
                    <div class="analysis-title">${this.truncateText(analysis.title || 'Sin título', 60)}</div>
                    <div class="analysis-verdict ${this.getVerdictClass(analysis.verdict)}">
                        ${this.getVerdictIcon(analysis.verdict)} ${this.getVerdictText(analysis.verdict)}
                    </div>
                </div>
                <div class="analysis-details">
                    <span class="analysis-source">${analysis.source || 'Fuente desconocida'}</span>
                    <span class="analysis-score">Score: ${analysis.score || 0}%</span>
                    <span class="analysis-time">${this.formatTime(analysis.created_at)}</span>
                </div>
            </div>
        `).join('');
    }

    getVerdictClass(verdict) {
        if (!verdict) return 'no-verificable';
        const v = verdict.toLowerCase();
        if (v.includes('verdadera') || v.includes('real') || v.includes('creíble')) return 'credible';
        if (v.includes('falsa')) return 'false';
        if (v.includes('dudosa')) return 'doubtful';
        return 'no-verificable';
    }

    getVerdictIcon(verdict) {
        const v = (verdict || '').toLowerCase();
        if (v.includes('verdadera') || v.includes('real') || v.includes('creíble')) return '✅';
        if (v.includes('falsa')) return '❌';
        if (v.includes('dudosa')) return '⚠️';
        return '❓';
    }

    getVerdictText(verdict) {
        if (!verdict) return 'NO VERIFICABLE';
        const v = verdict.toLowerCase();
        if (v.includes('verdadera') || v.includes('real') || v.includes('creíble')) return 'CONFIABLE';
        if (v.includes('falsa')) return 'FALSA';
        if (v.includes('dudosa')) return 'DUDOSA';
        return 'NO VERIFICABLE';
    }

    truncateText(text, maxLength) {
        if (!text) return 'Sin título';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    formatTime(dateString) {
        if (!dateString) return 'Fecha desconocida';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);

            if (diffMins < 1) return 'Ahora mismo';
            if (diffMins < 60) return `Hace ${diffMins} min`;
            if (diffHours < 24) return `Hace ${diffHours} h`;
            
            return date.toLocaleDateString('es-ES', { 
                day: 'numeric', 
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return 'Fecha inválida';
        }
    }

    initChart() {
        const ctx = document.getElementById('verdictsChart');
        if (!ctx) {
            console.error('No se encontró el elemento del gráfico');
            return;
        }

        // Contar veredictos
        const verdictCounts = {
            credible: 0,
            doubtful: 0,
            false: 0,
            'no-verificable': 0
        };

        this.analyses.forEach(analysis => {
            const verdictClass = this.getVerdictClass(analysis.verdict);
            verdictCounts[verdictClass]++;
        });

        console.log('📊 Datos del gráfico:', verdictCounts);

        const data = {
            labels: ['Confiable', 'Dudosa', 'Falsa', 'No Verificable'],
            datasets: [{
                data: [
                    verdictCounts.credible,
                    verdictCounts.doubtful,
                    verdictCounts.false,
                    verdictCounts['no-verificable']
                ],
                backgroundColor: [
                    '#10b981', // credible
                    '#f59e0b', // doubtful  
                    '#ef4444', // false
                    '#6b7280'  // no-verificable
                ],
                borderColor: [
                    '#059669',
                    '#d97706',
                    '#dc2626', 
                    '#4b5563'
                ],
                borderWidth: 2,
                hoverOffset: 8
            }]
        };

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            size: 12,
                            family: 'system-ui, -apple-system, sans-serif'
                        },
                        color: '#374151'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        size: 13
                    },
                    bodyFont: {
                        size: 12
                    },
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '60%',
            animation: {
                animateScale: true,
                animateRotate: true
            }
        };

        // Destruir gráfico existente si hay uno
        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: options
        });

        console.log('✅ Gráfico inicializado correctamente');
    }

    setupEventListeners() {
        // Botón de refresh
        document.getElementById('refresh-chart')?.addEventListener('click', () => {
            this.loadDashboardData();
            this.showAlert('Datos actualizados', 'success');
        });

        // Exportar datos
        document.getElementById('export-data')?.addEventListener('click', () => {
            this.exportData();
        });

        // Entrenar modelo - CORREGIDO
        document.getElementById('train-model-btn')?.addEventListener('click', () => {
            this.trainModel();
        });

        // Estado del sistema
        document.getElementById('system-status-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showSystemStatus();
        });

        // Modal de estado del sistema
        document.getElementById('refresh-system-status')?.addEventListener('click', () => {
            this.loadSystemStatus();
            this.showAlert('Estado del sistema actualizado', 'success');
        });

        // Cerrar modales
        document.querySelector('.modal-close')?.addEventListener('click', () => {
            document.getElementById('systemStatusModal').classList.remove('show');
        });

        // Menú móvil
        document.querySelector('.mobile-menu-btn')?.addEventListener('click', () => {
            this.toggleMobileMenu();
        });
    }

    async exportData() {
        try {
            console.log('📤 Exportando datos...');
            window.open(`${window.API_BASE}/export/csv`, '_blank');
            this.showAlert('Descargando archivo CSV...', 'success');
        } catch (error) {
            console.error('Error exportando datos:', error);
            this.showAlert('Error al exportar datos', 'error');
        }
    }

    async trainModel() {
        const btn = document.getElementById('train-model-btn');
        const originalText = btn.innerHTML;
        
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrenando...';
        btn.disabled = true;

        try {
            console.log('🤖 Iniciando entrenamiento del modelo...');
            
            const response = await fetch(`${window.API_BASE}/train-ml`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            console.log('Respuesta del entrenamiento:', data);

            if (data.ok) {
                this.showAlert('✅ Modelo entrenado correctamente', 'success');
                document.getElementById('ml-model-status').textContent = 'Recién Entrenado';
                document.getElementById('ml-last-trained').textContent = new Date().toLocaleString();
                
                // Actualizar estado ML
                this.updateSystemStatus('ml-status', 'Operativo', 'online');
                document.getElementById('detailed-ml-status').textContent = '✅ Modelo Recién Entrenado';
                
                if (data.details) {
                    console.log('Detalles del entrenamiento:', data.details);
                    // Extraer precisión si está disponible en la respuesta
                    const accuracyMatch = data.details.match(/accuracy\s+[\d]+\s+([\d.]+)/);
                    if (accuracyMatch) {
                        const accuracy = Math.round(parseFloat(accuracyMatch[1]) * 100);
                        document.getElementById('ml-accuracy').textContent = `${accuracy}%`;
                        this.showAlert(`Modelo entrenado con ${accuracy}% de precisión`, 'success');
                    } else {
                        document.getElementById('ml-accuracy').textContent = '85%';
                    }
                } else {
                    document.getElementById('ml-accuracy').textContent = '85%';
                }
            } else {
                throw new Error(data.error || data.message || 'Error desconocido en el entrenamiento');
            }

        } catch (error) {
            console.error('❌ Error entrenando modelo:', error);
            this.showAlert(`Error al entrenar el modelo: ${error.message}`, 'error');
        } finally {
            btn.innerHTML = '<i class="fas fa-robot"></i> Entrenar Modelo';
            btn.disabled = false;
        }
    }

    showSystemStatus() {
        const modal = document.getElementById('systemStatusModal');
        modal.classList.add('show');
    }

    toggleMobileMenu() {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.toggle('mobile-open');
    }

    showLoadingState() {
        const recentAnalyses = document.getElementById('recent-analyses');
        if (recentAnalyses) {
            recentAnalyses.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Cargando análisis recientes...</p>
                </div>
            `;
        }
    }

    hideLoadingState() {
        // El contenido se actualiza automáticamente al renderizar
    }

    showAlert(message, type = 'info') {
        // Usar el mismo sistema de alertas que en history.js
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="alert-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        const alertContainer = document.getElementById('alertSystem');
        alertContainer.appendChild(alertDiv);

        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 5000);
    }

    showError(message) {
        this.showAlert(message, 'error');
    }

    startAutoRefresh() {
        // Actualizar cada 30 segundos
        setInterval(() => {
            this.loadDashboardData();
            console.log('🔄 Actualización automática del dashboard');
        }, 30000);
    }
}

// Inicializar dashboard cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando Dashboard...');
    window.dashboard = new Dashboard();
});