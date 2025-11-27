// debug-simple.js - PRUEBA EXTREMA
console.log('🎯 debug-simple.js CARGADO');

// Función GLOBAL para probar
window.testAnalysis = function() {
    console.log('🎯 TEST: Función global ejecutada');
    
    // Obtener datos del formulario
    const source = document.getElementById('newsSource').value;
    const title = document.getElementById('newsTitle').value;
    const body = document.getElementById('newsContent').value;
    
    console.log('📝 Datos del formulario:', { source, title, body });
    
    if (!source || !title || !body) {
        alert('❌ Complete todos los campos');
        return;
    }
    
    alert('✅ Formulario válido - Conectando al backend...');
    
    // Cambiar estado del botón
    const btn = document.getElementById('analyze-btn');
    btn.disabled = true;
    btn.textContent = "🔍 Analizando...";
    
    // Hacer la petición MANUALMENTE
    fetch('http://localhost:3000/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            source: source,
            title: title, 
            body: body
        })
    })
    .then(response => {
        console.log('📥 Respuesta status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('✅ Análisis completado:', data);
        alert('🎉 ANÁLISIS EXITOSO! Revise la consola');
        
        // Mostrar resultado simple
        if (data.result && data.result.final) {
            const final = data.result.final;
            alert(`📊 RESULTADO:\nPuntaje: ${final.score}%\nVeredicto: ${final.verdict}`);
        }
    })
    .catch(error => {
        console.error('❌ Error:', error);
        alert('❌ Error: ' + error.message);
    })
    .finally(() => {
        btn.disabled = false;
        btn.textContent = "🔍 Analizar Noticia";
    });
};

// Event listener DIRECTO
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado - Configurando botón...');
    
    const btn = document.getElementById('analyze-btn');
    console.log('🔍 Botón encontrado:', btn);
    
    if (btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🎯 CLICK DIRECTO en el botón');
            window.testAnalysis();
        });
    } else {
        console.error('❌ NO SE ENCUENTRA EL BOTÓN analyze-btn');
    }
    
    // Probar conexión inmediatamente
    fetch('http://localhost:3000/health')
        .then(r => r.json())
        .then(data => {
            console.log('🔌 Conexión backend:', data);
            document.getElementById('api-status-analysis').textContent = 'Conectado';
        })
        .catch(err => {
            console.error('❌ Sin conexión:', err);
            document.getElementById('api-status-analysis').textContent = 'Sin Conexión';
        });
});

console.log('✅ debug-simple.js completamente cargado');