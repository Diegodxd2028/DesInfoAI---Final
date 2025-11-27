// analysis-permanent.js - VERSIÓN MEJORADA Y PERMANENTE
console.log('🎯 analysis-permanent.js CARGADO');

class NewsAnalysis {
    constructor() {
        console.log('🔧 Inicializando NewsAnalysis...');
        this.currentAnalysis = null;
        this.isAnalyzing = false;
        this.analysisStartTime = null;
        this.progressInterval = null;
        this.init();
    }

    init() {
        console.log('🚀 Configurando sistema...');
        this.setupEventListeners();
        this.setupCharacterCounter();
        this.checkSystemStatus();
        this.loadMetrics(); // Cargar métricas al iniciar
        console.log('✅ Sistema listo');
    }

    setupEventListeners() {
        const analyzeBtn = document.getElementById('analyze-btn');
        const analysisForm = document.getElementById('analysis-container');
        
        // PREVENIR ENVÍO DEL FORMULARIO
        if (analysisForm) {
            analysisForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('📝 Formulario prevenido');
                this.handleAnalysis();
            });
        }
        
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🎯 Botón Analizar clickeado');
                this.handleAnalysis();
            });
        }

        // Botones de utilidad
        document.getElementById('clear-form')?.addEventListener('click', () => {
            this.clearForm();
        });

        document.getElementById('preview-btn')?.addEventListener('click', () => {
            this.showPreview();
        });

        document.getElementById('new-analysis')?.addEventListener('click', () => {
            this.clearForm();
        });

        // Modales
        document.getElementById('close-preview')?.addEventListener('click', () => {
            this.hidePreview();
        });

        document.getElementById('analyze-from-preview')?.addEventListener('click', () => {
            this.hidePreview();
            this.handleAnalysis();
        });

        // Vista previa
        document.getElementById('cancel-feedback')?.addEventListener('click', () => {
            this.hideFeedbackModal();
        });

        document.getElementById('submit-feedback')?.addEventListener('click', () => {
            this.submitDetailedFeedback();
        });

        document.getElementById('toggle-technical')?.addEventListener('click', () => {
            this.toggleTechnicalDetails();
        });

        // Cerrar modales al hacer click fuera
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('show');
            }
        });
    }

    setupCharacterCounter() {
        const contentTextarea = document.getElementById('newsContent');
        const charCount = document.getElementById('charCount');

        if (contentTextarea && charCount) {
            contentTextarea.addEventListener('input', () => {
                const count = contentTextarea.value.length;
                charCount.textContent = count;
                
                // Actualizar clases de color
                charCount.className = 'char-count ';
                if (count < 50) charCount.classList.add('text-false');
                else if (count < 200) charCount.classList.add('text-doubtful');
                else charCount.classList.add('text-credible');
            });
        }
    }

    async checkSystemStatus() {
        try {
            const response = await fetch(`${window.API_BASE}/health`);
            const data = await response.json();
            
            this.updateStatus('api-status-analysis', 'Conectado', true);
            this.updateStatus('ml-status-analysis', data.ml_ready ? 'Disponible' : 'No Disponible', data.ml_ready);
            this.updateStatus('llm-status-analysis', data.llm?.configured ? 'Configurado' : 'No Configurado', data.llm?.configured);
            
        } catch (error) {
            console.error('Error de conexión:', error);
            this.updateStatus('api-status-analysis', 'Sin Conexión', false);
            this.updateStatus('ml-status-analysis', 'No Verificado', false);
            this.updateStatus('llm-status-analysis', 'No Verificado', false);
        }
    }

    async loadMetrics() {
        try {
            const response = await fetch(`${window.API_BASE}/history?limit=1000`);
            const data = await response.json();
            
            if (data.ok && data.items) {
                this.updateMetrics(data.items);
            }
        } catch (error) {
            console.error('Error cargando métricas:', error);
        }
    }

    updateMetrics(analyses) {
        if (!analyses.length) return;

        const total = analyses.length;
        const totalScore = analyses.reduce((sum, analysis) => sum + (analysis.score || 0), 0);
        const totalLatency = analyses.reduce((sum, analysis) => sum + (analysis.latency_ms || 0), 0);
        const fakeNews = analyses.filter(analysis => 
            analysis.verdict && analysis.verdict.toLowerCase().includes('falsa')
        ).length;

        const avgScore = Math.round(totalScore / total);
        const avgLatency = (totalLatency / total / 1000).toFixed(1);

        document.getElementById('total-analyses-metric').textContent = total.toLocaleString();
        document.getElementById('avg-accuracy-metric').textContent = `${avgScore}%`;
        document.getElementById('avg-time-metric').textContent = `${avgLatency}s`;
        document.getElementById('fake-detected-metric').textContent = fakeNews.toLocaleString();
    }

    updateStatus(elementId, text, isOnline) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
            element.className = `status-value ${isOnline ? 'text-credible' : 'text-false'}`;
            
            // Actualizar icono también
            const statusItem = element.closest('.system-status-item');
            if (statusItem) {
                const statusIcon = statusItem.querySelector('.status-icon');
                if (statusIcon) {
                    statusIcon.className = `status-icon ${isOnline ? 'online' : 'error'}`;
                }
            }
        }
    }

    validateForm() {
        const source = document.getElementById('newsSource').value.trim();
        const title = document.getElementById('newsTitle').value.trim();
        const content = document.getElementById('newsContent').value.trim();

        if (!source || !title || !content) {
            this.showAlert('Complete todos los campos requeridos', 'error', false);
            return false;
        }

        if (content.length < 50) {
            this.showAlert('El contenido debe tener al menos 50 caracteres', 'warning', false);
            return false;
        }

        return true;
    }

    async handleAnalysis() {
        console.log('🎯 INICIANDO ANÁLISIS...');
        
        if (this.isAnalyzing) {
            this.showAlert('Ya hay un análisis en curso', 'warning', false);
            return;
        }

        if (!this.validateForm()) {
            return;
        }

        this.isAnalyzing = true;
        this.analysisStartTime = Date.now();
        
        const btn = document.getElementById('analyze-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analizando...';

        // Mostrar progreso
        this.showProgress();

        try {
            const formData = this.getFormData();
            console.log('📤 Enviando datos:', formData);
            
            const result = await this.performAnalysis(formData);
            console.log('📥 Resultado recibido:', result);
            
            this.displayAnalysisResult(result);
            this.loadMetrics(); // Actualizar métricas
            this.showAlert('✅ Análisis completado correctamente', 'success', true);
            
        } catch (error) {
            console.error('Error:', error);
            this.showAlert('❌ Error en el análisis: ' + error.message, 'error', false);
        } finally {
            this.isAnalyzing = false;
            this.hideProgress();
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-search"></i> Analizar Noticia';
        }
    }

    showProgress() {
        const progressCard = document.getElementById('progress-card');
        if (progressCard) {
            progressCard.style.display = 'block';
            progressCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Iniciar contador de tiempo
        this.startProgressTimer();
        
        // Animar pasos progresivamente
        this.animateProgressSteps();
    }

    hideProgress() {
        const progressCard = document.getElementById('progress-card');
        if (progressCard) {
            progressCard.style.display = 'none';
        }
        
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    startProgressTimer() {
        const timeElement = document.getElementById('elapsed-time');
        if (!timeElement) return;

        this.progressInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.analysisStartTime) / 1000);
            timeElement.textContent = `${elapsed}s`;
        }, 1000);
    }

    animateProgressSteps() {
        const steps = ['step-1', 'step-2', 'step-3', 'step-4'];
        
        steps.forEach((stepId, index) => {
            setTimeout(() => {
                const step = document.getElementById(stepId);
                if (step) {
                    step.classList.add('active');
                }
            }, (index + 1) * 1000);
        });
    }

    getFormData() {
        return {
            source: document.getElementById('newsSource').value.trim(),
            title: document.getElementById('newsTitle').value.trim(),
            body: document.getElementById('newsContent').value.trim(),
            url: document.getElementById('newsUrl')?.value.trim() || ""
        };
    }

    async performAnalysis(formData) {
        const response = await fetch(`${window.API_BASE}/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.ok) {
            throw new Error(result.error || 'Error en el análisis');
        }

        return result;
    }

    displayAnalysisResult(result) {
        this.currentAnalysis = result;
        
        const finalResult = result.result?.final || {};
        const geminiResult = result.result?.gemini || {};
        const explanations = result.result?.explanations || {};
        const mlResult = result.result?.ml || {};

        console.log('🎯 Mostrando resultados PERMANENTES...');

        // MOSTRAR SECCIÓN DE RESULTADOS
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
            resultsSection.style.display = 'block';
            // Hacer scroll suave a los resultados
            setTimeout(() => {
                resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }

        // Resultado principal
        this.showMainResult(finalResult, geminiResult);
        
        // Explicación
        this.showExplanation(explanations);
        
        // Sistema de utilidad
        this.showUsefulnessSection();
        
        // Detalles técnicos
        this.showTechnicalDetails(finalResult, geminiResult, mlResult);
        
        // Sistema de feedback
        this.showFeedbackSection(result);
        
        // Reconectar listeners
        this.reconnectFeedbackListeners();
    }

    showMainResult(finalResult, geminiResult) {
        const container = document.getElementById('analysis-result');
        if (!container) return;
        
        const score = finalResult.score || 50;
        const verdict = finalResult.verdict || 'no_verificable';
        const colorClass = this.getColorClass(verdict);

        container.innerHTML = `
            <div class="analysis-result ${colorClass}">
                <div class="result-header">
                    <div class="result-icon">
                        <i class="fas fa-${this.getResultIcon(verdict)}"></i>
                    </div>
                    <div class="result-main">
                        <div class="result-score">${score}%</div>
                        <div class="result-label">${this.getVerdictText(verdict)}</div>
                    </div>
                </div>
                
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill ${colorClass}" style="width: ${score}%"></div>
                    </div>
                    <div class="progress-labels">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                    </div>
                </div>
                
                <div class="result-meta">
                    <span><i class="fas fa-clock"></i> ${this.formatTime(finalResult.latency_ms)}</span>
                    <span><i class="fas fa-shield-alt"></i> ${this.getConfidenceLevel(score)}</span>
                    <span><i class="fas fa-robot"></i> ML + LLaMA</span>
                </div>
            </div>
        `;
    }

    showExplanation(explanations) {
        const container = document.getElementById('explanation-result');
        if (!container) return;
        
        container.innerHTML = `
            <div class="explanation-card">
                <div class="explanation-header">
                    <i class="fas fa-info-circle"></i>
                    <h4>Explicación del Resultado</h4>
                </div>
                <div class="explanation-content">
                    <div class="explanation-simple">
                        <strong>Resumen:</strong> ${explanations.simple || "Análisis completado."}
                    </div>
                    <div class="explanation-detailed">
                        <strong>Detalles:</strong> ${explanations.detailed || "Evaluación basada en múltiples factores de credibilidad."}
                    </div>
                    ${explanations.factors && explanations.factors.length ? `
                    <div class="explanation-factors">
                        <strong>Factores considerados:</strong>
                        <ul>
                            ${explanations.factors.map(factor => `<li>${factor.replace('• ', '')}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    showUsefulnessSection() {
        const container = document.getElementById('feedback-section');
        if (!container) return;
        
        container.innerHTML = `
            <div class="usefulness-section">
                <div class="usefulness-header">
                    <i class="fas fa-thumbs-up"></i>
                    <h4>¿Te fue útil este análisis?</h4>
                    <p>Tu opinión ayuda a mejorar la precisión del sistema</p>
                </div>
                <div class="usefulness-buttons">
                    <button class="btn btn-success" id="feedback-useful">
                        <i class="fas fa-thumbs-up"></i>
                        Sí, fue útil
                    </button>
                    <button class="btn btn-error" id="feedback-not-useful">
                        <i class="fas fa-thumbs-down"></i>
                        No fue útil
                    </button>
                </div>
                <div class="usefulness-feedback" id="detailed-feedback" style="display: none;">
                    <div class="form-group">
                        <label class="form-label">¿Qué podría mejorar?</label>
                        <textarea class="form-control" id="improvement-feedback" placeholder="Describe qué podría mejorar..."></textarea>
                    </div>
                    <button class="btn btn-primary" id="submit-improvement">
                        <i class="fas fa-paper-plane"></i> Enviar sugerencias
                    </button>
                </div>
            </div>
        `;

        // Reconectar listeners
        this.reconnectUsefulnessListeners();
    }

    reconnectUsefulnessListeners() {
        document.getElementById('feedback-useful')?.addEventListener('click', () => {
            this.submitUsefulnessFeedback(true);
        });

        document.getElementById('feedback-not-useful')?.addEventListener('click', () => {
            document.getElementById('detailed-feedback').style.display = 'block';
        });

        document.getElementById('submit-improvement')?.addEventListener('click', () => {
            this.submitImprovementFeedback();
        });
    }

    showTechnicalDetails(finalResult, geminiResult, mlResult) {
        const container = document.getElementById('technical-content');
        if (!container) return;
        
        container.innerHTML = `
            <div class="technical-grid">
                <div class="technical-item">
                    <label>Modelo Groq LLaMA:</label>
                    <span>${geminiResult.provider || 'N/A'} - ${geminiResult.model || 'N/A'}</span>
                </div>
                <div class="technical-item">
                    <label>Score LLaMA:</label>
                    <span>${geminiResult.score || 'N/A'}%</span>
                </div>
                <div class="technical-item">
                    <label>Veredicto LLaMA:</label>
                    <span>${this.getVerdictText(geminiResult.verdict)}</span>
                </div>
                <div class="technical-item">
                    <label>Modelo ML Local:</label>
                    <span>Logistic Regression + TF-IDF</span>
                </div>
                <div class="technical-item">
                    <label>Score ML:</label>
                    <span>${mlResult.ml_score || 'N/A'}%</span>
                </div>
                <div class="technical-item">
                    <label>Veredicto ML:</label>
                    <span>${this.getVerdictText(mlResult.ml_verdict)}</span>
                </div>
                <div class="technical-item">
                    <label>Método Combinación:</label>
                    <span>${finalResult.method || 'Reglas híbridas'}</span>
                </div>
                <div class="technical-item">
                    <label>Flags de Combinación:</label>
                    <span>${(finalResult.flags || []).join(', ') || 'Ninguno'}</span>
                </div>
            </div>
        `;
    }

    showFeedbackSection(result) {
        // Esta sección ahora es para feedback detallado
        const existingSection = document.querySelector('.feedback-section');
        if (existingSection) {
            existingSection.innerHTML += `
                <div class="detailed-feedback-section" style="margin-top: 2rem;">
                    <div class="feedback-card">
                        <div class="feedback-header">
                            <i class="fas fa-bullseye"></i>
                            <h4>¿El análisis fue correcto?</h4>
                            <p>Si crees que el veredicto es incorrecto, corrígelo aquí</p>
                        </div>
                        <div class="feedback-buttons">
                            <button class="btn btn-success" id="feedback-correct">
                                <i class="fas fa-check-circle"></i>
                                Sí, es correcto
                            </button>
                            <button class="btn btn-error" id="feedback-wrong">
                                <i class="fas fa-times-circle"></i>
                                El análisis está mal
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    reconnectFeedbackListeners() {
        document.getElementById('feedback-correct')?.addEventListener('click', () => {
            this.submitFeedback(true);
        });

        document.getElementById('feedback-wrong')?.addEventListener('click', () => {
            this.showFeedbackModal();
        });

        document.getElementById('submit-feedback')?.addEventListener('click', () => {
            this.submitDetailedFeedback();
        });

        document.getElementById('cancel-feedback')?.addEventListener('click', () => {
            this.hideFeedbackModal();
        });
    }

    async submitUsefulnessFeedback(isUseful) {
        if (!this.currentAnalysis) return;

        try {
            const response = await fetch(`${window.API_BASE}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    analysis_id: this.currentAnalysis.saved?.id,
                    user_feedback: isUseful ? 'analysis_useful' : 'analysis_not_useful',
                    correct_verdict: this.currentAnalysis.result?.final?.verdict,
                    correct_score: this.currentAnalysis.result?.final?.score
                })
            });

            if (response.ok) {
                this.showAlert(
                    isUseful ? 
                    '✅ ¡Gracias! Tu feedback ayuda a mejorar el sistema.' : 
                    '📝 Abriendo formulario de mejora...',
                    'success', 
                    false
                );
                
                if (!isUseful) {
                    document.getElementById('detailed-feedback').style.display = 'block';
                }
            }
        } catch (error) {
            this.showAlert('Error al enviar feedback', 'error', false);
        }
    }

    async submitImprovementFeedback() {
        const feedback = document.getElementById('improvement-feedback').value.trim();

        if (!feedback) {
            this.showAlert('Por favor describe qué podría mejorar', 'warning', false);
            return;
        }

        try {
            const response = await fetch(`${window.API_BASE}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    analysis_id: this.currentAnalysis.saved?.id,
                    user_feedback: `improvement_suggestion: ${feedback}`,
                    correct_verdict: this.currentAnalysis.result?.final?.verdict,
                    correct_score: this.currentAnalysis.result?.final?.score
                })
            });

            if (response.ok) {
                this.showAlert('✅ ¡Gracias por tus sugerencias!', 'success', false);
                document.getElementById('detailed-feedback').style.display = 'none';
                document.getElementById('improvement-feedback').value = '';
            }
        } catch (error) {
            this.showAlert('Error al enviar sugerencias', 'error', false);
        }
    }

    showPreview() {
        const source = document.getElementById('newsSource').value.trim();
        const title = document.getElementById('newsTitle').value.trim();
        const content = document.getElementById('newsContent').value.trim();

        if (!source || !title || !content) {
            this.showAlert('Complete los campos para ver la vista previa', 'warning', false);
            return;
        }

        document.getElementById('preview-source').textContent = source || '-';
        document.getElementById('preview-title').textContent = title || '-';
        document.getElementById('preview-content').textContent = content || '-';

        document.getElementById('previewModal').classList.add('show');
    }

    hidePreview() {
        document.getElementById('previewModal').classList.remove('show');
    }

    toggleTechnicalDetails() {
        const technicalDetails = document.getElementById('technical-details');
        const toggleBtn = document.getElementById('toggle-technical');
        
        if (technicalDetails.style.display === 'none') {
            technicalDetails.style.display = 'block';
            toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Ocultar Detalles';
        } else {
            technicalDetails.style.display = 'none';
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Detalles Técnicos';
        }
    }

    // SISTEMA DE COLORES
    getColorClass(verdict) {
        const v = verdict.toLowerCase();
        if (v.includes('verdadera') || v.includes('real')) return 'result-credible';
        if (v.includes('falsa')) return 'result-false';
        if (v.includes('dudosa')) return 'result-doubtful';
        return 'result-neutral';
    }

    getVerdictText(verdict) {
        if (!verdict) return 'NO VERIFICABLE';
        const v = verdict.toLowerCase();
        if (v.includes('verdadera') || v.includes('real')) return 'CREÍBLE';
        if (v.includes('falsa')) return 'FALSA';
        if (v.includes('dudosa')) return 'DUDOSA';
        return 'NO VERIFICABLE';
    }

    getResultIcon(verdict) {
        const v = (verdict || '').toLowerCase();
        if (v.includes('verdadera') || v.includes('real')) return 'check-circle';
        if (v.includes('falsa')) return 'times-circle';
        if (v.includes('dudosa')) return 'exclamation-circle';
        return 'question-circle';
    }

    getConfidenceLevel(score) {
        if (score >= 80) return 'Alta Confianza';
        if (score >= 60) return 'Media Confianza';
        if (score >= 40) return 'Baja Confianza';
        return 'Muy Baja Confianza';
    }

    formatTime(ms) {
        if (!ms) return 'N/A';
        return `${(ms / 1000).toFixed(1)}s`;
    }

    clearForm() {
        document.getElementById('newsSource').value = '';
        document.getElementById('newsTitle').value = '';
        document.getElementById('newsContent').value = '';
        document.getElementById('newsUrl').value = '';
        
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
        
        this.showAlert('Formulario limpiado', 'info', true);
    }

    showFeedbackModal() {
        document.getElementById('feedbackModal').classList.add('show');
    }

    hideFeedbackModal() {
        document.getElementById('feedbackModal').classList.remove('show');
    }

    async submitFeedback(isCorrect) {
        if (!this.currentAnalysis) return;

        try {
            const response = await fetch(`${window.API_BASE}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    analysis_id: this.currentAnalysis.saved?.id,
                    correct_verdict: isCorrect ? this.currentAnalysis.result?.final?.verdict : 'user_correction',
                    correct_score: isCorrect ? this.currentAnalysis.result?.final?.score : 50,
                    user_feedback: isCorrect ? 'analysis_correct' : 'user_correction_pending'
                })
            });

            if (response.ok) {
                this.showAlert(
                    isCorrect ? '✅ ¡Gracias por confirmar!' : '📝 Abriendo formulario de corrección...',
                    'success',
                    false
                );
                if (!isCorrect) this.showFeedbackModal();
            }
        } catch (error) {
            this.showAlert('Error al enviar feedback', 'error', false);
        }
    }

    async submitDetailedFeedback() {
        const correctVerdict = document.querySelector('input[name="correct-verdict"]:checked')?.value;
        const correctScore = document.getElementById('correct-score').value;
        const userFeedback = document.getElementById('user-feedback').value;

        if (!correctVerdict) {
            this.showAlert('Por favor seleccione el veredicto correcto', 'error', false);
            return;
        }

        try {
            const response = await fetch(`${window.API_BASE}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    analysis_id: this.currentAnalysis.saved?.id,
                    correct_verdict: correctVerdict,
                    correct_score: parseInt(correctScore) || 50,
                    user_feedback: userFeedback || 'user_corrected_analysis'
                })
            });

            if (response.ok) {
                this.showAlert('✅ ¡Gracias! Tu corrección ayudará a mejorar el sistema.', 'success', false);
                this.hideFeedbackModal();
            }
        } catch (error) {
            this.showAlert('Error al enviar corrección', 'error', false);
        }
    }

    showAlert(message, type = 'info', autoClose = true) {
        // Usar sistema de alertas consistente
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible`;
        alertDiv.innerHTML = `
            <div class="alert-content">
                <div class="alert-icon">
                    <i class="fas fa-${this.getAlertIcon(type)}"></i>
                </div>
                <div class="alert-message">
                    <strong>${this.getAlertTitle(type)}</strong>
                    <span>${message}</span>
                </div>
                <button type="button" class="alert-close" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        const alertContainer = document.getElementById('alertSystem');
        alertContainer.appendChild(alertDiv);

        // Mostrar con animación
        setTimeout(() => alertDiv.classList.add('show'), 100);

        // Solo auto-cerrar si es true
        if (autoClose) {
            setTimeout(() => {
                if (alertDiv.parentElement) {
                    alertDiv.remove();
                }
            }, 5000);
        }
        // Si autoClose es false, la alerta permanece hasta que el usuario la cierre
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

    getAlertTitle(type) {
        const titles = {
            success: 'Éxito: ',
            error: 'Error: ',
            warning: 'Advertencia: ',
            info: 'Info: '
        };
        return titles[type] || '';
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado - Inicializando NewsAnalysis...');
    window.newsAnalysis = new NewsAnalysis();
});