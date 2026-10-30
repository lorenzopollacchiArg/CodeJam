const { cargarDatos, guardarPlan } = require('./io.js');
const { verificarPlan } = require('./validador.js');
const { optimizarRuteo } = require('./ruteo.js'); // Asegúrate de que ruteo.js exporte esta función o adáptala según tu estructura

function ejecutarPrincipal() {
    console.log("1. Cargando datos de entrada");
    const { mundo, pedidos, vehiculos } = cargarDatos();

    console.log(`Depósito detectado en: X= ${mundo.deposito_x}, Y=${mundo.deposito_y}`);
    console.log(`Total de pedidos a rutear: ${pedidos.length}`);
    console.log(`Vehículos disponibles: ${vehiculos.length}`);

    console.log("\n 2. Ejecutando algoritmo de ruteo");
    // Aquí llamamos al generador de rutas (puedes ajustar el nombre según la función principal de ruteo.js)
    const resultadoRuteo = optimizarRuteo(pedidos, mundo, vehiculos.length);

    // Armamos la estructura de salida requerida por el simulador: { rutas: [ { vehiculo, paradas }, ... ] }
    const planGenerado = {
        rutas: resultadoRuteo.rutas.map(r => ({
            vehiculo: vehiculos[r.vehiculo_id - 1]?.id || `V${r.vehiculo_id}`,
            paradas: r.pedidos // Aquí incluirías los IDs y/o "DEPOSITO" según tu lógica de tramos
        }))
    };

    console.log("\n 3. Validando restricciones críticas del plan...");
    const esValido = verificarPlan(planGenerado, vehiculos, pedidos);

    if (!esValido) {
        console.error("❌ El plan generado no superó la validación. Proceso abortado para evitar penalizaciones.");
        process.exit(1);
    }

    console.log("\n💾 4. Guardando el archivo plan.json...");
    guardarPlan(planGenerado);
    console.log("🎉 ¡Proceso finalizado con éxito! Ya puedes probar el plan en el simulador.");
}

ejecutarPrincipal();