const {cargarDatos} = require ('./io');
const {mundo, pedidos, vehiculos } = cargarDatos();


function verificarPlan(vehiculos, pedidos, mundo) {
    if (!vehiculos || vehiculos.length === 0) {
        console.log('No hay vehiculos ingresados');
        return false;
    }

    const idsVistos = new Set();

    for (let i = 0; i < vehiculos.length; i++) {
        const idVehiculo = vehiculos[i].id;

        // Si el set ya tiene este id significa que estsa repetido
        if (idsVistos.has(idVehiculo)) {
            console.log(`Error, hay un vehiculo repetido: ${idVehiculo}`);
            return false;
        }

        // Si no esta se guarda en el set para futuras comparaciones
        idsVistos.add(idVehiculo);
    }

    return true;
}