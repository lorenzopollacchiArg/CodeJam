const fs = require ('fs');
const path = require('path');

function cargarDatos(){
    const mundo = JSON.parse(fs.readFileSync(path.join(dirname, '../datos/mundo/json'), 'utf-8'));
    const pedidos  = JSON.parse(fs.readFileSync(path.join(dirname, '../datos/pedidos/json)', ' utf-8')));
    const vehiculos = JSON.parse(fs.readFileSync(path.join(path.dirname, '../datos/vehiculo/json', 'uft-8')));

    return {mundo, pedidos, vehiculos};
}

function guardarPlan(plan){
    fs.writeFileSync(path.join(__dirname, '../plan.json'), JSON.stringify(plan , null, 2), 'utf-8');
    console.log('archivo generado con exito');


}

module.exports = {cargarDatos , guardarPlan}; 