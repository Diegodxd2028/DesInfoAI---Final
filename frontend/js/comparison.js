// Sistema de comparación para DesinfoApp
class NewsComparison {
    constructor() {
        this.comparisonItems = [];
        this.init();
    }

    init() {
        this.loadComparisonItems();
        this.setupEventListeners();
        this.renderComparison();
    }

    setupEventListeners() {
        // Botones de acción
        document.getElementById('clear-comparison').addEventListener('click', () => this.clearComparison());
        document.getElementById('export-comparison').addEventListener('click', () => this.exportComparison());
        
        // Selector de análisis recientes
        document.getElementById('recent-analysis-select').addEventListener('change', (e) => {
            this.addRecentAnalysis(e.target.value);
        });

        // Búsqueda en historial
        document.getElementById('search-historical').addEventListener('click', () => {
            this.searchHistoricalAnalysis();
        });
    }

    loadComparisonItems() {
        this.comparisonItems = JSON.parse(localStorage.getItem('comparison_items') || '[]');
        this.loadRecentAnalyses();
    }

    async loadRecentAnalyses() {
        try {
            const response = await fetch(`${window.API_BASE}/history?limit=50`);
            const data = await response.json();
            
            if (data.ok) {
                this.populateRecentSelect(data.items || []);
            }
        } catch (error) {
            console.error('Error cargando análisis recientes:', error);
        }
    }

    populateRecentSelect(analyses) {
        const select = document.getElementById('recent-analysis-select');
        select.innerHTML = '<option value="">Seleccionar análisis reciente...</option>';
        
        analyses.slice(0, 20).forEach(analysis => {
            const option = document.createElement('option');
            option.value = analysis.id;
            option.textContent = `${analysis.source} - ${this.truncateText(analysis.title, 50)} (${this.formatDate(analysis.created_at)})`;
            select.appendChild(option);
        });
    }

    async addRecentAnalysis(analysisId) {
        if (!analysisId) return;

        try {
            const response = await fetch(`${window.API_BASE}/history?limit=1000`);
            const data = await response.json();
            
            if (data.ok) {
                const analysis = data.items.find(item => item.id == analysisId);
                if (analysis) {
                    this.addToComparison({
                        source: analysis.source,
                        title: analysis.title,
                        score: analysis.score,
                        verdict: analysis.verdict,
                        timestamp: analysis.created_at,
                        analysisId: analysis.id
                    });
                    
                    // Reset select
                    document.getElementById('recent-analysis-select').value = '';
                }
            }
        } catch (error) {
            console.error('Error agregando análisis reciente:', error);
            this.showAlert('Error al agregar el análisis', 'error');
        }
    }

    addToComparison(item) {
        // Evitar duplicados
        if (!this.comparisonItems.some(ci => ci.analysisId === item.analysisId)) {
            this.comparisonItems.push({
                ...item,
                id: Date.now()
            });
            
            this.saveComparisonItems();
            this.renderComparison();
            this.showAlert('Análisis agregado a la comparación', 'success');
        } else {
            this.showAlert('Este análisis ya está en la comparación', 'warning');
        }
    }

    removeFromComparison(itemId) {
        this.comparisonItems = this.comparisonItems.filter(item => item.id !== itemId);
        this.saveComparisonItems();
        this.renderComparison();
        this.showAlert('Análisis removido de la comparación', 'info');
    }

    saveComparisonItems() {
        localStorage.setItem('comparison_items', JSON.stringify(this.comparisonItems));
    }

    renderComparison() {
        this.renderComparisonGrid();
        this.renderComparisonStats();
        this.updateEmptyState();
    }

    renderComparisonGrid() {
        const container = document.getElementById('comparison-grid');
        
        if (this.comparisonItems.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = this.comparisonItems.map(item => `
            <div class="comparison-card animate-fadeIn">
                <div class="comparison-header">
                    <h4 class="comparison-title" title="${this.escapeHtml(item.title)}">
                        ${this.truncateText(item.title, 60)}
                    </h4>
                    <button class="btn btn-sm btn-outline remove-comparison" data-id="${item.id}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="comparison-source">
                    <i class="fas fa-newspaper"></i>
                    ${this.escapeHtml(item.source || 'Sin fuente')}
                </div>
                
                <div class="comparison-score">
                    <div class="score-circle score-${this.getScoreClass(item.score)}">
                        <span class="score-value">${item.score || 0}%</span>
                    </div>
                    <div class="verdict-badge verdict-${this.getVerdictClass(item.verdict)}">
                        ${this.getVerdictText(item.verdict)}
                    </div>
                </div>
                
                <div class="comparison-meta">
                    <div class="meta-item">
                        <i class="fas fa-calendar"></i>
                        ${this.formatDate(item.timestamp)}
                    </div>
                </div>
                
                <div class="comparison-actions">
                    <button class="btn btn-sm btn-outline view-details" data-id="${item.analysisId}">
                        <i class="fas fa-eye"></i> Ver Detalles
                    </button>
                </div>
            </div>
        `).join('');

        // Agregar event listeners
        this.attachComparisonEventListeners();
    }

    attachComparisonEventListeners() {
        // Remover de comparación
        document.querySelectorAll('.remove-comparison').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = parseInt(e.currentTarget.getAttribute('data-id'));
                this.removeFromComparison(itemId);
            });
        });

        // Ver detalles
        document.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const analysisId = e.currentTarget.getAttribute('data-id');
                this.viewAnalysisDetails(analysisId);
            });
        });
    }

    renderComparisonStats() {
        if (this.comparisonItems.length < 2) {
            document.getElementById('comparison-stats').style.display = 'none';
            return;
        }

        document.getElementById('comparison-stats').style.display = 'block';
        
        const scores = this.comparisonItems.map(item => item.score || 0);
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        
        const verdicts = this.comparisonItems.map(item => this.getVerdictClass(item.verdict));
        const credibleCount = verdicts.filter(v => v === 'credible').length;
        const doubtfulCount = verdicts.filter(v => v === 'doubtful').length;
        const falseCount = verdicts.filter(v => v === 'false').length;

        document.getElementById('stat-average').textContent = Math.round(averageScore) + '%';
        document.getElementById('stat-range').textContent = `${minScore}% - ${maxScore}%`;
        document.getElementById('stat-credible-count').textContent = credibleCount;
        document.getElementById('stat-doubtful-count').textContent = doubtfulCount;
        document.getElementById('stat-false-count').textContent = falseCount;

        // Actualizar barras de distribución
        this.updateDistributionChart(credibleCount, doubtfulCount, falseCount);
    }

    updateDistributionChart(credible, doubtful, falseCount) {
        const total = credible + doubtful + falseCount || 1;
        
        document.getElementById('dist-credible').style.width = `${(credible / total) * 100}%`;
        document.getElementById('dist-doubtful').style.width = `${(doubtful / total) * 100}%`;
        document.getElementById('dist-false').style.width = `${(falseCount / total) * 100}%`;
    }

    updateEmptyState() {
        const emptyState = document.getElementById('comparison-empty');
        const comparisonContent = document.getElementById('comparison-content');
        
        if (this.comparisonItems.length === 0) {
            emptyState.style.display = 'block';
            comparisonContent.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            comparisonContent.style.display = 'block';
        }
    }

    async viewAnalysisDetails(analysisId) {
        try {
            const response = await fetch(`${window.API_BASE}/history?limit=1000`);
            const data = await response.json();
            
            if (data.ok) {
                const analysis = data.items.find(item => item.id == analysisId);
                if (analysis) {
                    this.showAnalysisModal(analysis);
                }
            }
        } catch (error) {
            console.error('Error cargando detalles:', error);
            this.showAlert('Error al cargar los detalles', 'error');
        }
    }

    showAnalysisModal(analysis) {
        // Implementar modal de detalles similar al del historial
        console.log('Mostrar detalles del análisis:', analysis);
        // Aquí podrías reutilizar el código del modal de historial
    }

    searchHistoricalAnalysis() {
        // Redirigir a historial para búsqueda
        window.location.href = 'history.html';
    }

    clearComparison() {
        if (this.comparisonItems.length === 0) return;
        
        if (confirm('¿Está seguro de que desea limpiar toda la comparación?')) {
            this.comparisonItems = [];
            this.saveComparisonItems();
            this.renderComparison();
            this.showAlert('Comparación limpiada', 'success');
        }
    }

    exportComparison() {
        if (this.comparisonItems.length === 0) {
            this.showAlert('No hay análisis para exportar', 'warning');
            return;
        }

        const exportData = {
            exportDate: new Date().toISOString(),
            totalItems: this.comparisonItems.length,
            items: this.comparisonItems
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `comparacion-analisis-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showAlert('Comparación exportada a JSON', 'success');
    }

    // Métodos utilitarios
    getScoreClass(score) {
        if (score >= 70) return 'credible';
        if (score >= 40) return 'doubtful';
        return 'false';
    }

    getVerdictClass(verdict) {
        if (!verdict) return 'no-verificable';
        const v = verdict.toLowerCase();
        if (v.includes('verdadera') || v.includes('real') || v.includes('creíble')) return 'credible';
        if (v.includes('falsa')) return 'false';
        if (v.includes('dudosa')) return 'doubtful';
        return 'no-verificable';
    }

    getVerdictText(verdict) {
        if (!verdict) return 'NO VERIFICABLE';
        const v = verdict.toLowerCase();
        if (v.includes('verdadera') || v.includes('real') || v.includes('creíble')) return 'CREÍBLE';
        if (v.includes('falsa')) return 'FALSA';
        if (v.includes('dudosa')) return 'DUDOSA';
        return 'NO VERIFICABLE';
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('es-ES', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    truncateText(text, maxLength) {
        if (!text) return 'N/A';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible animate-fadeIn`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="alert-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        const alertContainer = document.getElementById('alert-container');
        alertContainer.appendChild(alertDiv);

        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    window.newsComparison = new NewsComparison();
});