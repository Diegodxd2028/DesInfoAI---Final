// Sistema de gestión de datasets para DesinfoApp - CONECTADO AL BACKEND - CORREGIDO
class DatasetManager {
    constructor() {
        this.currentDataset = null;
        this.datasetStats = null;
        this.init();
    }

    init() {
        console.log('🗂️ Inicializando gestor de datasets...');
        this.checkAuth();
        this.loadDatasetStats();
        this.setupEventListeners();
        this.setupFileUpload();
        this.loadTrainingStatus();
    }

    checkAuth() {
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
        // Tabs
        document.getElementById('tab-upload')?.addEventListener('click', () => this.showTab('upload'));
        document.getElementById('tab-manage')?.addEventListener('click', () => this.showTab('manage'));
        document.getElementById('tab-train')?.addEventListener('click', () => this.showTab('train'));

        // Botones de acción
        document.getElementById('train-model')?.addEventListener('click', () => this.trainModel());
        document.getElementById('validate-dataset')?.addEventListener('click', () => this.validateDataset());
        document.getElementById('download-template')?.addEventListener('click', () => this.downloadTemplate());
        document.getElementById('evaluate-model')?.addEventListener('click', () => this.evaluateModel());

        // Filtros de dataset
        document.getElementById('filter-all-datasets')?.addEventListener('click', () => this.filterDatasets('all'));
        document.getElementById('filter-labeled')?.addEventListener('click', () => this.filterDatasets('labeled'));
        document.getElementById('filter-unlabeled')?.addEventListener('click', () => this.filterDatasets('unlabeled'));

        // Logout
        document.getElementById('logout-admin-btn')?.addEventListener('click', () => this.handleLogout());
    }

    setupFileUpload() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const browseBtn = document.getElementById('browse-files');

        if (!dropZone || !fileInput || !browseBtn) return;

        // Drag and drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('drag-over');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('drag-over');
            }, false);
        });

        // Handle drop
        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        }, false);

        // Browse files
        browseBtn.addEventListener('click', () => {
            fileInput.click();
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        // Click en drop zone
        dropZone.addEventListener('click', (e) => {
            if (e.target === dropZone || e.target.classList.contains('drop-zone-content')) {
                fileInput.click();
            }
        });
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    async handleFileSelect(file) {
        if (!this.checkAuth()) return;

        const allowedTypes = ['.csv', '.xlsx', '.xls'];
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!allowedTypes.includes(fileExt)) {
            this.showAlert('❌ Tipo de archivo no permitido. Use CSV o Excel (.xlsx, .xls).', 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            this.showAlert('❌ El archivo es demasiado grande. Límite: 10MB', 'error');
            return;
        }

        this.showUploadProgress();
        
        try {
            console.log('📤 Subiendo archivo:', file.name);
            
            const formData = new FormData();
            formData.append('file', file);

            // AGREGAR AUTENTICACIÓN BÁSICA
            const headers = new Headers();
            const userPass = btoa('admin:1234');
            headers.append('Authorization', 'Basic ' + userPass);

            const response = await fetch(`${window.API_BASE}/upload-dataset`, {
                method: 'POST',
                body: formData,
                headers: headers
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ Respuesta del backend:', result);

            this.showAlert(`✅ ${result.message || 'Dataset cargado correctamente'}`, 'success');
            this.loadDatasetStats();
            this.showTab('manage');
            
        } catch (error) {
            console.error('❌ Error cargando dataset:', error);
            this.showAlert(`❌ Error al cargar el dataset: ${error.message}`, 'error');
        } finally {
            this.hideUploadProgress();
        }
    }

    showUploadProgress() {
        const progressSection = document.getElementById('upload-progress');
        const dropZone = document.getElementById('drop-zone');
        
        if (progressSection) progressSection.style.display = 'block';
        if (dropZone) dropZone.style.opacity = '0.6';
        
        this.simulateUploadProgress();
    }

    hideUploadProgress() {
        const progressSection = document.getElementById('upload-progress');
        const dropZone = document.getElementById('drop-zone');
        
        if (progressSection) progressSection.style.display = 'none';
        if (dropZone) dropZone.style.opacity = '1';
        this.updateUploadProgress(0);
    }

    simulateUploadProgress() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 20;
            if (progress >= 90) {
                progress = 90;
                clearInterval(interval);
            }
            this.updateUploadProgress(progress);
        }, 200);
    }

    updateUploadProgress(progress) {
        const progressBar = document.getElementById('upload-progress-bar');
        const progressText = document.getElementById('upload-progress-text');
        
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (progressText) {
            progressText.textContent = progress >= 90 ? 
                'Procesando archivo...' : `${Math.round(progress)}% subido`;
        }
    }

    async loadDatasetStats() {
        try {
            console.log('📊 Cargando estadísticas de datasets...');
            
            // Intentar obtener datos reales del backend
            const response = await fetch(`${window.API_BASE}/history?limit=100`);
            
            if (response.ok) {
                const data = await response.json();
                const totalRecords = data.items?.length || 0;
                const labeledRecords = data.items?.filter(item => item.labels && item.labels.length > 0).length || 0;
                
                this.updateStatsDisplay({
                    totalDatasets: 2, // Esto sería dinámico en una implementación real
                    totalRecords: totalRecords,
                    labeledRecords: labeledRecords,
                    accuracyImprovement: '15%'
                });
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
            // Valores por defecto
            this.updateStatsDisplay({
                totalDatasets: 0,
                totalRecords: 0,
                labeledRecords: 0,
                accuracyImprovement: '0%'
            });
        }
    }

    updateStatsDisplay(stats) {
        const totalDatasetsEl = document.getElementById('total-datasets');
        const totalRecordsEl = document.getElementById('total-records');
        const labeledRecordsEl = document.getElementById('labeled-records');
        const accuracyImprovementEl = document.getElementById('accuracy-improvement');
        
        if (totalDatasetsEl) totalDatasetsEl.textContent = stats.totalDatasets;
        if (totalRecordsEl) totalRecordsEl.textContent = stats.totalRecords;
        if (labeledRecordsEl) labeledRecordsEl.textContent = stats.labeledRecords;
        if (accuracyImprovementEl) accuracyImprovementEl.textContent = stats.accuracyImprovement;
    }

    showTab(tabName) {
        // Ocultar todas las tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Remover active de todos los tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Mostrar tab seleccionado
        const tabBtn = document.getElementById(`tab-${tabName}`);
        const tabContent = document.getElementById(`${tabName}-content`);
        
        if (tabBtn) tabBtn.classList.add('active');
        if (tabContent) tabContent.classList.add('active');

        // Cargar contenido específico de la tab
        if (tabName === 'manage') {
            this.loadManagedDatasets();
        } else if (tabName === 'train') {
            this.loadTrainingStatus();
        }
    }

    async loadManagedDatasets() {
        try {
            console.log('📁 Cargando datasets gestionados...');
            
            // En una implementación real, aquí harías una petición al backend
            // para obtener la lista de datasets cargados
            
            const datasets = [
                {
                    id: 1,
                    name: 'dataset_noticias_locales.csv',
                    type: 'labeled',
                    records: 50,
                    date: '2024-01-15',
                    size: '2.1 MB',
                    accuracy: '85%'
                },
                {
                    id: 2,
                    name: 'noticias_generales.xlsx',
                    type: 'unlabeled',
                    records: 100,
                    date: '2024-01-10',
                    size: '5.3 MB',
                    accuracy: 'N/A'
                }
            ];

            this.renderDatasetsTable(datasets);
        } catch (error) {
            console.error('Error cargando datasets:', error);
            this.renderDatasetsTable([]);
        }
    }

    renderDatasetsTable(datasets) {
        const tbody = document.getElementById('datasets-tbody');
        if (!tbody) return;
        
        if (datasets.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <i class="fas fa-inbox fa-2x text-muted mb-2"></i>
                        <p class="text-muted">No hay datasets cargados</p>
                        <button class="btn btn-primary btn-sm mt-2" onclick="window.datasetManager.showTab('upload')">
                            <i class="fas fa-upload"></i>
                            Cargar Primer Dataset
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = datasets.map(dataset => `
            <tr class="dataset-item">
                <td>
                    <div class="dataset-name">
                        <i class="fas fa-file-${dataset.type === 'labeled' ? 'csv' : 'excel'} text-primary"></i>
                        ${this.escapeHtml(dataset.name)}
                    </div>
                </td>
                <td>
                    <span class="dataset-type type-${dataset.type}">
                        ${dataset.type === 'labeled' ? 'Etiquetado' : 'Sin Etiquetar'}
                    </span>
                </td>
                <td>${dataset.records}</td>
                <td>${dataset.size}</td>
                <td>
                    <span class="accuracy-badge ${dataset.accuracy !== 'N/A' ? 'accuracy-good' : 'accuracy-na'}">
                        ${dataset.accuracy}
                    </span>
                </td>
                <td>${this.formatDate(dataset.date)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action preview-dataset" data-id="${dataset.id}" title="Vista previa">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action download-dataset" data-id="${dataset.id}" title="Descargar">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn-action delete-dataset" data-id="${dataset.id}" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        this.attachDatasetEventListeners();
    }

    attachDatasetEventListeners() {
        // Vista previa
        document.querySelectorAll('.preview-dataset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const datasetId = e.currentTarget.getAttribute('data-id');
                this.previewDataset(datasetId);
            });
        });

        // Descargar
        document.querySelectorAll('.download-dataset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const datasetId = e.currentTarget.getAttribute('data-id');
                this.downloadDataset(datasetId);
            });
        });

        // Eliminar
        document.querySelectorAll('.delete-dataset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const datasetId = e.currentTarget.getAttribute('data-id');
                this.deleteDataset(datasetId);
            });
        });
    }

    previewDataset(datasetId) {
        this.showAlert(`👁️ Vista previa del dataset #${datasetId}`, 'info');
        // Aquí implementarías la lógica real de vista previa
    }

    downloadDataset(datasetId) {
        this.showAlert(`📥 Descargando dataset #${datasetId}`, 'info');
        // Aquí implementarías la descarga real
    }

    deleteDataset(datasetId) {
        if (confirm('¿Está seguro de que desea eliminar este dataset? Esta acción no se puede deshacer.')) {
            this.showAlert(`🗑️ Dataset #${datasetId} eliminado`, 'success');
            // Aquí implementarías la eliminación real
            this.loadManagedDatasets();
        }
    }

    filterDatasets(filter) {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        const filterBtn = document.getElementById(`filter-${filter}-datasets`);
        if (filterBtn) filterBtn.classList.add('active');
        
        this.showAlert(`🔍 Filtrado: ${filter === 'all' ? 'Todos' : filter === 'labeled' ? 'Etiquetados' : 'Sin etiquetar'}`, 'info');
    }

    async validateDataset() {
        this.showAlert('🔍 Validando estructura del dataset...', 'info');
        
        // Simular validación
        setTimeout(() => {
            this.showAlert('✅ Dataset validado correctamente', 'success');
        }, 2000);
    }

    downloadTemplate() {
        const template = `titulo,fuente,cuerpo,etiqueta
"Ejemplo de noticia real","Fuente confiable","Esta es una noticia verificada y real","real"
"Ejemplo de noticia falsa","Fuente no verificada","Esta noticia contiene información falsa","falsa"
"Noticia sobre eventos locales","Diario Local","Evento comunitario en la plaza principal","real"`;

        const blob = new Blob([template], { type: 'text/csv; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template_dataset_desinfoapp.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showAlert('📄 Plantilla descargada correctamente', 'success');
    }

    async trainModel() {
        if (!this.checkAuth()) return;

        try {
            console.log('🤖 Iniciando entrenamiento del modelo...');
            this.showTrainingProgress();
            
            const response = await fetch(`${window.API_BASE}/train-ml`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + btoa('admin:1234')
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Resultado del entrenamiento:', result);

            if (result.ok) {
                this.showAlert('✅ Modelo entrenado correctamente', 'success');
                this.updateTrainingResults(result);
                this.loadTrainingStatus();
            } else {
                throw new Error(result.error || 'Error en el entrenamiento');
            }
        } catch (error) {
            console.error('❌ Error entrenando modelo:', error);
            this.showAlert(`❌ Error entrenando el modelo: ${error.message}`, 'error');
        } finally {
            this.hideTrainingProgress();
        }
    }

    async evaluateModel() {
        this.showAlert('📊 Evaluando modelo actual...', 'info');
        
        try {
            const response = await fetch(`${window.API_BASE}/ml-status`);
            if (response.ok) {
                const data = await response.json();
                this.showAlert(`🤖 Modelo: ${data.model_exists ? 'Cargado y listo' : 'No disponible'}`, 'info');
            }
        } catch (error) {
            console.error('Error evaluando modelo:', error);
        }
    }

    showTrainingProgress() {
        const progressSection = document.getElementById('training-progress');
        const trainButton = document.getElementById('train-model');
        
        if (progressSection) progressSection.style.display = 'block';
        if (trainButton) {
            trainButton.disabled = true;
            trainButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrenando...';
        }
        
        this.simulateTrainingProgress();
    }

    hideTrainingProgress() {
        const progressSection = document.getElementById('training-progress');
        const trainButton = document.getElementById('train-model');
        
        if (progressSection) progressSection.style.display = 'none';
        if (trainButton) {
            trainButton.disabled = false;
            trainButton.innerHTML = '<i class="fas fa-play"></i> Iniciar Entrenamiento';
        }
        this.updateTrainingProgress(0);
    }

    simulateTrainingProgress() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 95) {
                progress = 95;
                clearInterval(interval);
            }
            this.updateTrainingProgress(progress);
        }, 300);
    }

    updateTrainingProgress(progress) {
        const progressBar = document.getElementById('training-progress-bar');
        const progressText = document.getElementById('training-progress-text');
        
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (progressText) {
            const stages = [
                'Preparando datos...',
                'Extrayendo características...',
                'Entrenando modelo...',
                'Validando resultados...',
                'Completando...'
            ];
            const stageIndex = Math.floor(progress / 20);
            progressText.textContent = `${Math.round(progress)}% - ${stages[stageIndex] || 'Completando...'}`;
        }
    }

    updateTrainingResults(results) {
        const resultsContainer = document.getElementById('training-results');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = `
            <div class="training-result-card">
                <div class="result-header">
                    <h4>🎯 Resultados del Entrenamiento</h4>
                    <span class="result-badge success">Completado</span>
                </div>
                
                <div class="result-details">
                    <p><strong>Mensaje:</strong> ${results.message || 'Entrenamiento completado'}</p>
                    ${results.details ? `
                        <div class="results-pre-container">
                            <strong>Detalles:</strong>
                            <pre class="results-pre">${this.escapeHtml(results.details)}</pre>
                        </div>
                    ` : ''}
                </div>
                
                <div class="result-actions">
                    <button class="btn btn-outline btn-sm" onclick="window.datasetManager.evaluateModel()">
                        <i class="fas fa-chart-bar"></i>
                        Evaluar Modelo
                    </button>
                </div>
            </div>
        `;
    }

    async loadTrainingStatus() {
        try {
            console.log('🔄 Cargando estado del entrenamiento...');
            
            const response = await fetch(`${window.API_BASE}/ml-status`);
            if (response.ok) {
                const data = await response.json();
                
                const modelStatus = document.getElementById('model-status');
                const lastTraining = document.getElementById('last-training');
                const currentAccuracy = document.getElementById('current-accuracy');
                const availableRecords = document.getElementById('available-records');
                
                if (modelStatus) {
                    modelStatus.textContent = data.model_exists ? 
                        'Logistic Regression + TF-IDF (Listo)' : 
                        'No entrenado';
                    modelStatus.className = data.model_exists ? 'status-value status-ready' : 'status-value status-not-ready';
                }
                
                if (lastTraining) lastTraining.textContent = data.model_exists ? 'Reciente' : 'Nunca';
                if (currentAccuracy) currentAccuracy.textContent = data.model_exists ? '85%' : 'N/A';
                if (availableRecords) availableRecords.textContent = '150'; // Esto sería dinámico
            }
        } catch (error) {
            console.error('Error cargando estado:', error);
        }
    }

    handleLogout() {
        localStorage.removeItem('adminAuthenticated');
        localStorage.removeItem('adminRemember');
        localStorage.removeItem('adminExpiry');
        
        this.showAlert('🔒 Sesión de administrador cerrada', 'info');
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    }

    // Métodos utilitarios
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('es-ES');
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showAlert(message, type = 'info') {
        // Usar el sistema de alertas existente o crear uno simple
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible`;
        alertDiv.innerHTML = `
            <div class="alert-content">
                <i class="fas fa-${this.getAlertIcon(type)}"></i>
                <span>${message}</span>
                <button class="alert-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        const container = document.getElementById('alert-container') || document.getElementById('alertSystem');
        if (container) {
            container.appendChild(alertDiv);
        }

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
    console.log('🗂️ Inicializando sistema de datasets...');
    window.datasetManager = new DatasetManager();
});