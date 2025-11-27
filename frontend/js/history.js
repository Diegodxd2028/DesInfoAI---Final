// Sistema de historial para DesinfoApp - CONECTADO AL BACKEND
class NewsHistory {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalItems = 0;
        this.currentFilter = 'all';
        this.allItems = [];
        this.currentSearch = '';
        this.init();
    }

    init() {
        this.loadHistory();
        this.setupEventListeners();
        this.setupSearch();
    }

    setupEventListeners() {
        // Filtros con veredictos exactos de tu backend
        document.getElementById('filter-all').addEventListener('click', () => this.filterByType('all'));
        document.getElementById('filter-verdadera').addEventListener('click', () => this.filterByType('verdadera'));
        document.getElementById('filter-dudosa').addEventListener('click', () => this.filterByType('dudosa'));
        document.getElementById('filter-falsa').addEventListener('click', () => this.filterByType('falsa'));
        document.getElementById('filter-no-verificable').addEventListener('click', () => this.filterByType('no_verificable'));
        
        // Ordenamiento
        document.getElementById('sort-date').addEventListener('click', () => this.sortBy('date'));
        document.getElementById('sort-score').addEventListener('click', () => this.sortBy('score'));
        document.getElementById('sort-source').addEventListener('click', () => this.sortBy('source'));
        
        // Exportación
        document.getElementById('export-csv').addEventListener('click', () => this.exportToCSV());
        document.getElementById('export-json').addEventListener('click', () => this.exportToJSON());
        
        // Paginación
        document.getElementById('prev-page').addEventListener('click', () => this.previousPage());
        document.getElementById('next-page').addEventListener('click', () => this.nextPage());
        
        // Limpiar búsqueda
        document.getElementById('clear-search').addEventListener('click', () => this.clearSearch());
        
        // Cerrar modal
        document.querySelector('.modal-close').addEventListener('click', () => {
            document.getElementById('item-details-modal').classList.remove('show');
        });
    }

    setupSearch() {
        const searchInput = document.getElementById('history-search');
        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.currentSearch = e.target.value;
                this.currentPage = 1;
                this.renderHistory();
            }, 300);
        });
    }

    async loadHistory() {
        try {
            this.showLoading();
            
            const response = await fetch(`${window.API_BASE}/history?limit=1000`);
            const data = await response.json();
            
            if (data.ok) {
                this.allItems = data.items || [];
                this.totalItems = this.allItems.length;
                this.renderHistory();
                this.updateHistoryBadge();
            } else {
                throw new Error(data.error || 'Error cargando historial');
            }
        } catch (error) {
            console.error('Error cargando historial:', error);
            this.showError('Error al cargar el historial');
        } finally {
            this.hideLoading();
        }
    }

    renderHistory() {
        const filteredItems = this.filterItems(this.allItems);
        const sortedItems = this.sortItems(filteredItems);
        const paginatedItems = this.paginateItems(sortedItems);
        
        this.renderTable(paginatedItems);
        this.renderPagination(filteredItems.length);
        this.renderStats();
        this.updateResultsCount(filteredItems.length, paginatedItems.length);
    }

    filterItems(items) {
        let filtered = items;
        
        // Aplicar filtro por tipo
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(item => {
                const verdict = (item.verdict || '').toLowerCase();
                return verdict === this.currentFilter;
            });
        }
        
        // Aplicar búsqueda
        if (this.currentSearch) {
            const searchTerm = this.currentSearch.toLowerCase();
            filtered = filtered.filter(item => 
                (item.title || '').toLowerCase().includes(searchTerm) ||
                (item.source || '').toLowerCase().includes(searchTerm) ||
                (item.body || '').toLowerCase().includes(searchTerm)
            );
        }
        
        return filtered;
    }

    sortItems(items) {
        const sortBy = document.getElementById('sort-date').classList.contains('active') ? 'date' :
                      document.getElementById('sort-score').classList.contains('active') ? 'score' : 'source';
        
        return [...items].sort((a, b) => {
            switch (sortBy) {
                case 'date':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'score':
                    return (b.score || 0) - (a.score || 0);
                case 'source':
                    return (a.source || '').localeCompare(b.source || '');
                default:
                    return 0;
            }
        });
    }

    paginateItems(items) {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        return items.slice(startIndex, startIndex + this.itemsPerPage);
    }

    renderTable(items) {
        const tbody = document.getElementById('history-tbody');
        
        if (items.length === 0) {
            tbody.innerHTML = this.getEmptyState();
            return;
        }

        tbody.innerHTML = items.map(item => {
            const verdictClass = this.getVerdictClass(item.verdict);
            const scoreClass = this.getScoreClass(item.score);
            
            return `
                <tr class="history-item" data-verdict="${item.verdict || 'no_verificable'}" data-id="${item.id}">
                    <td>
                        <div class="source-info">
                            <div class="source-name">${this.escapeHtml(item.source || 'Sin fuente')}</div>
                            <div class="date-info">${this.formatDate(item.created_at)}</div>
                        </div>
                    </td>
                    <td>
                        <div class="content-preview">
                            <strong class="title-text">${this.truncateText(item.title || 'Sin título', 80)}</strong>
                            ${item.body ? '<div class="text-muted text-sm mt-1">' + this.truncateText(item.body, 120) + '</div>' : ''}
                        </div>
                    </td>
                    <td>
                        <div class="score-display ${scoreClass}">
                            ${item.score || 0}
                        </div>
                    </td>
                    <td>
                        <span class="verdict-badge-table ${verdictClass}">
                            ${this.getVerdictText(item.verdict)}
                        </span>
                    </td>
                    <td>
                        <div class="performance-info">
                            <div class="latency-badge">
                                <i class="fas fa-clock"></i>
                                ${this.formatTime(item.latency_ms)}
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action btn-view view-details" data-id="${item.id}" title="Ver detalles">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-action btn-compare compare-item" data-id="${item.id}" title="Agregar a comparación">
                                <i class="fas fa-balance-scale"></i>
                            </button>
                            <button class="btn-action btn-delete delete-item" data-id="${item.id}" title="Eliminar análisis">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        this.attachItemEventListeners();
    }

    getEmptyState() {
        if (this.allItems.length === 0) {
            return `
                <tr>
                    <td colspan="6" class="empty-state-cell">
                        <div class="empty-content">
                            <i class="fas fa-inbox fa-3x"></i>
                            <h4>No hay análisis en el historial</h4>
                            <p>Realice su primer análisis para comenzar</p>
                            <a href="analysis.html" class="btn btn-primary">
                                <i class="fas fa-plus"></i> Realizar Primer Análisis
                            </a>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            return `
                <tr>
                    <td colspan="6" class="empty-state-cell">
                        <div class="empty-content">
                            <i class="fas fa-search fa-3x"></i>
                            <h4>No se encontraron resultados</h4>
                            <p>Intenta con otros filtros o términos de búsqueda</p>
                            <button class="btn btn-outline" onclick="newsHistory.clearFilters()">
                                <i class="fas fa-times"></i> Limpiar Filtros
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    attachItemEventListeners() {
        document.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.currentTarget.getAttribute('data-id');
                this.viewItemDetails(itemId);
            });
        });

        document.querySelectorAll('.compare-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.currentTarget.getAttribute('data-id');
                this.addToComparison(itemId);
            });
        });

        document.querySelectorAll('.delete-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.currentTarget.getAttribute('data-id');
                this.deleteItem(itemId);
            });
        });
    }

    renderPagination(totalItems) {
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const paginationInfo = document.getElementById('pagination-info');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        paginationInfo.textContent = `Página ${this.currentPage} de ${totalPages} · ${totalItems} elementos`;

        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === totalPages || totalPages === 0;
    }

    updateResultsCount(total, showing) {
        const resultsElement = document.getElementById('results-count');
        if (resultsElement) {
            resultsElement.textContent = `Mostrando ${showing} de ${total} resultados`;
        }
    }

    renderStats() {
        const stats = {
            total: this.allItems.length,
            verdadera: this.allItems.filter(item => 
                (item.verdict || '').toLowerCase() === 'verdadera'
            ).length,
            dudosa: this.allItems.filter(item => 
                (item.verdict || '').toLowerCase() === 'dudosa'
            ).length,
            falsa: this.allItems.filter(item => 
                (item.verdict || '').toLowerCase() === 'falsa'
            ).length,
            no_verificable: this.allItems.filter(item => 
                !item.verdict || (item.verdict || '').toLowerCase() === 'no_verificable'
            ).length
        };

        // Actualizar estadísticas principales
        document.getElementById('stat-total').textContent = stats.total;
        document.getElementById('stat-credible').textContent = stats.verdadera;
        document.getElementById('stat-doubtful').textContent = stats.dudosa;
        document.getElementById('stat-false').textContent = stats.falsa;

        // Actualizar porcentajes
        const total = stats.total || 1;
        document.getElementById('stat-credible-pct').textContent = Math.round((stats.verdadera / total) * 100) + '%';
        document.getElementById('stat-doubtful-pct').textContent = Math.round((stats.dudosa / total) * 100) + '%';
        document.getElementById('stat-false-pct').textContent = Math.round((stats.falsa / total) * 100) + '%';
    }

    filterByType(type) {
        this.currentFilter = type;
        this.currentPage = 1;
        
        // Actualizar botones activos
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`filter-${type}`).classList.add('active');
        
        this.renderHistory();
    }

    sortBy(field) {
        document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`sort-${field}`).classList.add('active');
        
        this.renderHistory();
    }

    clearSearch() {
        document.getElementById('history-search').value = '';
        this.currentSearch = '';
        this.currentPage = 1;
        this.renderHistory();
    }

    clearFilters() {
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.currentPage = 1;
        
        document.getElementById('history-search').value = '';
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('filter-all').classList.add('active');
        
        this.renderHistory();
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderHistory();
        }
    }

    nextPage() {
        const filteredItems = this.filterItems(this.allItems);
        const totalPages = Math.ceil(filteredItems.length / this.itemsPerPage);
        
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderHistory();
        }
    }

    async viewItemDetails(itemId) {
        try {
            const item = this.allItems.find(i => i.id == itemId);
            if (!item) return;

            this.showItemModal(item);
        } catch (error) {
            console.error('Error mostrando detalles:', error);
            this.showError('Error al cargar los detalles');
        }
    }

    showItemModal(item) {
        const modal = document.getElementById('item-details-modal');
        const content = document.getElementById('item-details-content');
        
        const verdictClass = this.getVerdictClass(item.verdict);
        const scoreClass = this.getScoreClass(item.score);
        
        content.innerHTML = `
            <div class="detail-grid">
                <div class="detail-card">
                    <h4><i class="fas fa-newspaper"></i> Información General</h4>
                    <div class="detail-item">
                        <label>Fuente:</label>
                        <span class="source-tag">${this.escapeHtml(item.source || 'N/A')}</span>
                    </div>
                    <div class="detail-item">
                        <label>Fecha de Análisis:</label>
                        <span>${this.formatDate(item.created_at)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Score Final:</label>
                        <span class="score-badge ${scoreClass}">${item.score || 0}/100</span>
                    </div>
                    <div class="detail-item">
                        <label>Veredicto:</label>
                        <span class="verdict-tag ${verdictClass}">
                            ${this.getVerdictText(item.verdict)}
                        </span>
                    </div>
                </div>

                <div class="detail-card">
                    <h4><i class="fas fa-chart-bar"></i> Métricas de Análisis</h4>
                    <div class="detail-item">
                        <label>Tiempo de Procesamiento:</label>
                        <span>${this.formatTime(item.latency_ms)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Score Groq LLaMA:</label>
                        <span>${item.gemini_score || 'N/A'}/100</span>
                    </div>
                    <div class="detail-item">
                        <label>Score ML Local:</label>
                        <span>${item.ml_score || 'N/A'}/100</span>
                    </div>
                    <div class="detail-item">
                        <label>Método:</label>
                        <span class="method-tag">Combinación ML + LLM</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-file-alt"></i> Contenido Analizado</h4>
                <div class="content-card">
                    <div class="content-field">
                        <label>Título:</label>
                        <div class="content-text">${this.escapeHtml(item.title || 'N/A')}</div>
                    </div>
                    <div class="content-field">
                        <label>Cuerpo:</label>
                        <div class="content-text scrollable">${this.escapeHtml(item.body || 'N/A').replace(/\n/g, '<br>')}</div>
                    </div>
                </div>
            </div>

            ${item.rationale ? `
            <div class="detail-section">
                <h4><i class="fas fa-lightbulb"></i> Explicación del Análisis</h4>
                <div class="explanation-card">
                    <p>${this.escapeHtml(item.rationale)}</p>
                </div>
            </div>
            ` : ''}

            ${item.labels && item.labels.length > 0 ? `
            <div class="detail-section">
                <h4><i class="fas fa-tags"></i> Etiquetas Identificadas</h4>
                <div class="tags-container">
                    ${item.labels.map(label => `<span class="tag">${this.escapeHtml(label)}</span>`).join('')}
                </div>
            </div>
            ` : ''}
        `;

        modal.classList.add('show');
    }

    addToComparison(itemId) {
        const item = this.allItems.find(i => i.id == itemId);
        if (!item) return;

        const comparisonItems = JSON.parse(localStorage.getItem('comparison_items') || '[]');
        
        if (!comparisonItems.some(ci => ci.analysisId == itemId)) {
            comparisonItems.push({
                id: Date.now(),
                source: item.source,
                title: item.title,
                score: item.score,
                verdict: item.verdict,
                timestamp: item.created_at,
                analysisId: itemId
            });

            localStorage.setItem('comparison_items', JSON.stringify(comparisonItems));
            this.showAlert('✓ Análisis agregado a la comparación', 'success');
        } else {
            this.showAlert('⚠ Este análisis ya está en la lista de comparación', 'warning');
        }
    }

    async deleteItem(itemId) {
        if (!confirm('¿Está seguro de que desea eliminar este análisis del historial local?')) {
            return;
        }

        try {
            // Eliminar solo del frontend (tu backend no tiene endpoint DELETE)
            this.allItems = this.allItems.filter(item => item.id != itemId);
            this.totalItems = this.allItems.length;
            
            this.renderHistory();
            this.updateHistoryBadge();
            this.showAlert('✓ Análisis eliminado del historial local', 'success');
        } catch (error) {
            console.error('Error eliminando item:', error);
            this.showAlert('✗ Error al eliminar el análisis', 'error');
        }
    }

    async exportToCSV() {
        try {
            window.open(`${window.API_BASE}/export/csv`, '_blank');
            this.showAlert('✓ Descargando CSV...', 'success');
        } catch (error) {
            console.error('Error exportando CSV:', error);
            this.showAlert('✗ Error al exportar CSV', 'error');
        }
    }

    exportToJSON() {
        try {
            const dataStr = JSON.stringify(this.allItems, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `historial-desinfoapp-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showAlert('✓ Historial exportado a JSON', 'success');
        } catch (error) {
            console.error('Error exportando JSON:', error);
            this.showAlert('✗ Error al exportar JSON', 'error');
        }
    }

    updateHistoryBadge() {
        const badge = document.getElementById('history-badge');
        if (badge) {
            badge.textContent = this.totalItems > 99 ? '99+' : this.totalItems;
            badge.style.display = this.totalItems > 0 ? 'flex' : 'none';
        }
    }

    // Métodos utilitarios
    getScoreClass(score) {
        score = Number(score) || 0;
        if (score >= 70) return 'high';
        if (score >= 40) return 'medium';
        return 'low';
    }

    getVerdictClass(verdict) {
        if (!verdict) return 'no-verificable';
        const v = verdict.toLowerCase();
        if (v === 'verdadera' || v === 'real' || v === 'confiable') return 'credible';
        if (v === 'falsa') return 'false';
        if (v === 'dudosa') return 'doubtful';
        return 'no-verificable';
    }

    getVerdictText(verdict) {
        if (!verdict) return 'NO VERIFICABLE';
        const v = verdict.toLowerCase();
        if (v === 'verdadera') return 'CONFIABLE';
        if (v === 'falsa') return 'FALSA';
        if (v === 'dudosa') return 'DUDOSA';
        return 'NO VERIFICABLE';
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatTime(ms) {
        if (!ms) return 'N/A';
        return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
    }

    truncateText(text, maxLength) {
        if (!text) return 'N/A';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showLoading() {
        document.getElementById('history-loading').style.display = 'flex';
        document.getElementById('history-content').style.display = 'none';
        document.getElementById('history-empty').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('history-loading').style.display = 'none';
        
        if (this.allItems.length === 0) {
            document.getElementById('history-empty').style.display = 'flex';
            document.getElementById('history-content').style.display = 'none';
        } else {
            document.getElementById('history-empty').style.display = 'none';
            document.getElementById('history-content').style.display = 'block';
        }
    }

    showError(message) {
        this.showAlert(message, 'error');
    }

    showAlert(message, type = 'info') {
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
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    window.newsHistory = new NewsHistory();
    
    // Cerrar modal al hacer click fuera
    document.getElementById('item-details-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('show');
        }
    });
});