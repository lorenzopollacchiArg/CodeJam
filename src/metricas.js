export function calcularDistancia(puntoA, puntoB) {
  // Aseguramos compatibilidad por si las coordenadas se llaman diferente en el JSON
  const ax = puntoA.x ?? puntoA.coordX ?? 0;
  const ay = puntoA.y ?? puntoA.coordY ?? 0;
  const bx = puntoB.x ?? puntoB.coordX ?? 0;
  const by = puntoB.y ?? puntoB.coordY ?? 0;

  return Math.abs(ax - bx) + Math.abs(ay - by);
}

export function calcularMetricas(rutas = [], pedidos = [], mundo = {}) {
  let cuadras = 0;

  // Extracción dinámica del depósito (evita hardcodear (0,0))
  const deposito = {
    x: mundo.deposito_x ?? mundo.deposito?.x ?? 0,
    y: mundo.deposito_y ?? mundo.deposito?.y ?? 0,
  };

  for (const ruta of rutas) {
    let origen = { ...deposito };

    for (const pedidoId of ruta.pedidos ?? []) {
      const pedido = pedidos.find((item) => item.id === pedidoId);
      if (!pedido) continue;

      cuadras += calcularDistancia(origen, pedido);
      origen = pedido; // Actualizamos el origen al último punto visitado
    }

    // Retorno obligatorio al depósito al finalizar la ruta
    cuadras += calcularDistancia(origen, deposito);
  }

  // Conjunto con los IDs de pedidos que sí fueron entregados
  const pedidosAsignados = new Set(
    rutas.flatMap((ruta) => ruta.pedidos ?? [])
  );

  // Pedidos no entregados (penalización)
  const fallas = pedidos.filter((pedido) => !pedidosAsignados.has(pedido.id)).length;

  // Parámetros de costo y tiempo del mundo (con valores por defecto de respaldo)
  const minPorCuadra = mundo.min_por_cuadra ?? 1;
  const tiempoServicio = mundo.tiempo_servicio ?? 0;
  const costoPorCuadra = mundo.costo_por_cuadra ?? 0;
  const costoPorVehiculo = mundo.costo_por_vehiculo ?? 0;
  const costoPorMinutoTotal = mundo.costo_por_minuto_total ?? 0;
  const costoPorFalla = mundo.costo_por_falla ?? 0;

  const minutos = cuadras * minPorCuadra + fallas * tiempoServicio;
  const costoCuadras = cuadras * costoPorCuadra;
  const costoVehiculos = rutas.length * costoPorVehiculo;
  const costoTiempo = minutos * costoPorMinutoTotal;
  const costoFallas = fallas * costoPorFalla;

  return {
    cuadras,
    minutos,
    fallas,
    costoTotal: costoCuadras + costoVehiculos + costoTiempo + costoFallas,
    costoCuadras,
    costoVehiculos,
    costoTiempo,
    costoFallas,
  };
}