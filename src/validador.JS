const {cargarDatos} = require ('./io');
const {mundo, pedidos, vehiculos } = cargarDatos();


function verificarPlan(plan, vehiculosDisponibles, pedidosDisponibles) {
    // 1. Validar que existan vehículos y que no haya repetidos (¡esto ya lo hiciste!)
    if (!vehiculosDisponibles || vehiculosDisponibles.length === 0) {
        console.log('No hay vehiculos ingresados');
        return false;
    }

    const idsVehiculosValidos = new Set(vehiculosDisponibles.map(v => v.id));
    const idsPedidosValidos = new Set(pedidosDisponibles.map(p => p.id));

    const vehiculosVistos = new Set();
    const pedidosVistos = new Set();

    if (!plan || !plan.rutas) {
        console.log('El plan no tiene la estructura correcta de rutas');
        return false;
    }

    for (const ruta of plan.rutas) {
        const idVehiculo = ruta.vehiculo;

        // Verificar vehículo repetido
        if (vehiculosVistos.has(idVehiculo)) {
            console.log(`Error, hay un vehiculo repetido: ${idVehiculo}`);
            return false;
        }
        vehiculosVistos.add(idVehiculo);

        // Verificar si el vehículo existe en vehiculos.json
        if (!idsVehiculosValidos.has(idVehiculo)) {
            console.log(`Error, el vehículo ${idVehiculo} no existe.`);
            return false;
        }

        // 2. Ahora recorremos las paradas de cada vehículo para revisar los pedidos
        for (const parada of ruta.paradas) {
            // Si la parada es la palabra "DEPOSITO", la saltamos porque está permitida
            if (parada === "DEPOSITO") {
                continue;
            }

            // Verificar pedido duplicado[cite: 1]
            if (pedidosVistos.has(parada)) {
                console.log(`Error, hay un pedido duplicado: ${parada}`);
                return false;
            }
            pedidosVistos.add(parada);

            // Verificar si el pedido existe en pedidos.json[cite: 1]
            if (!idsPedidosValidos.has(parada)) {
                console.log(`Error, el pedido ${parada} no existe.`);
                return false;
            }
        }
    }

    console.log('¡El plan es totalmente válido!');
    return true;
}