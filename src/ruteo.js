/**
 * MÓDULO INTEGRADO: MÉTRICAS, CLUSTERIZACIÓN, RUTEO Y DECISIÓN DE FLOTA
 * Responsabilidad: Integrante 2 - Algoritmos de Ruteo y Optimización Matemática
 */

// ============================================================================
// 1. CÁLCULO DE MÉTRICAS MANHATTAN Y COSTO DEL SIMULADOR
// ============================================================================

/**
 * Calcula la distancia Manhattan entre dos puntos: |x1 - x2| + |y1 - y2|
 */
export function calcularDistancia(puntoA, puntoB) {
  return Math.abs(puntoA.x - puntoB.x) + Math.abs(puntoA.y - puntoB.y);
}

/**
 * Calcula las cuadras recorridas por una sola ruta de pedidos (incluyendo salida y regreso al depósito)
 */
export function calcularCuadrasRuta(pedidosRuta, mundo) {
  let cuadras = 0;
  let origen = { x: mundo.deposito_x, y: mundo.deposito_y };

  for (const pedido of pedidosRuta) {
    cuadras += calcularDistancia(origen, pedido);
    origen = pedido;
  }

  cuadras += calcularDistancia(origen, {
    x: mundo.deposito_x,
    y: mundo.deposito_y,
  });

  return cuadras;
}

/**
 * Replica internamente la función de costos del simulador para evaluar mejoras en local
 */
export function calcularMetricas(rutas, pedidos, mundo) {
  let cuadras = 0;
  let makespanCuadras = 0;

  for (const ruta of rutas) {
    let origen = { x: mundo.deposito_x, y: mundo.deposito_y };
    let cuadrasVehiculo = 0;

    for (const pedidoId of ruta.pedidos ?? []) {
      const pedido = pedidos.find((item) => item.id === pedidoId);
      if (!pedido) continue;

      const d = calcularDistancia(origen, pedido);
      cuadras += d;
      cuadrasVehiculo += d;
      origen = pedido;
    }

    const regreso = calcularDistancia(origen, {
      x: mundo.deposito_x,
      y: mundo.deposito_y,
    });
    cuadras += regreso;
    cuadrasVehiculo += regreso;

    if (cuadrasVehiculo > makespanCuadras) {
      makespanCuadras = cuadrasVehiculo;
    }
  }

  const pedidosAsignados = new Set(
    rutas.flatMap((ruta) => ruta.pedidos ?? [])
  );
  const fallas = pedidos.filter((pedido) => !pedidosAsignados.has(pedido.id)).length;
  const minutos = cuadras * mundo.min_por_cuadra + fallas * mundo.tiempo_servicio;
  const costoCuadras = cuadras * mundo.costo_por_cuadra;
  const costoVehiculos = rutas.length * mundo.costo_por_vehiculo;
  const costoTiempo = minutos * mundo.costo_por_minuto_total;
  const costoFallas = fallas * mundo.costo_por_falla;

  return {
    cuadras,
    makespanCuadras,
    minutos,
    fallas,
    costoTotal: costoCuadras + costoVehiculos + costoTiempo + costoFallas,
    costoCuadras,
    costoVehiculos,
    costoTiempo,
    costoFallas,
  };
}

// ============================================================================
// 2. ALGORITMO DE ASIGNACIÓN (CLUSTERIZACIÓN POR CERCANÍA GEOGRÁFICA)
// ============================================================================

/**
 * Agrupa los pedidos en 'k' clusters (vehículos) usando K-Means con distancia Manhattan
 * y balanceo de carga para evitar rutas desproporcionadas.
 */
export function clusterizarPedidos(pedidos, cantidadVehiculos, mundo) {
  if (!pedidos || pedidos.length === 0) return [];
  if (cantidadVehiculos <= 1) return [[...pedidos]];

  const k = Math.min(cantidadVehiculos, pedidos.length);
  const deposito = { x: mundo.deposito_x, y: mundo.deposito_y };

  // 1. Inicializar centroides eligiendo puntos alejados entre sí (estilo K-Means++)
  const centroides = [];
  let masLejano = pedidos[0];
  let maxDist = -1;
  for (const p of pedidos) {
    const d = calcularDistancia(deposito, p);
    if (d > maxDist) {
      maxDist = d;
      masLejano = p;
    }
  }
  centroides.push({ x: masLejano.x, y: masLejano.y });

  while (centroides.length < k) {
    let mejorCandidato = pedidos[0];
    let mayorDistanciaMinima = -1;

    for (const p of pedidos) {
      let distMinACentroide = Infinity;
      for (const c of centroides) {
        const d = calcularDistancia(p, c);
        if (d < distMinACentroide) distMinACentroide = d;
      }
      if (distMinACentroide > mayorDistanciaMinima) {
        mayorDistanciaMinima = distMinACentroide;
        mejorCandidato = p;
      }
    }
    centroides.push({ x: mejorCandidato.x, y: mejorCandidato.y });
  }

  // 2. Iterar para ajustar los clusters (máximo 15 iteraciones)
  let clusters = Array.from({ length: k }, () => []);
  const cupoMaximo = Math.ceil(pedidos.length / k) + 2;

  for (let iter = 0; iter < 15; iter++) {
    clusters = Array.from({ length: k }, () => []);

    for (const pedido of pedidos) {
      const opciones = centroides
        .map((c, idx) => ({ idx, dist: calcularDistancia(pedido, c) }))
        .sort((a, b) => a.dist - b.dist);

      let asignado = false;
      for (const op of opciones) {
        if (clusters[op.idx].length < cupoMaximo) {
          clusters[op.idx].push(pedido);
          asignado = true;
          break;
        }
      }
      if (!asignado) {
        clusters[opciones[0].idx].push(pedido);
      }
    }

    let cambio = false;
    for (let i = 0; i < k; i++) {
      if (clusters[i].length === 0) continue;
      const sumaX = clusters[i].reduce((acc, p) => acc + p.x, 0);
      const sumaY = clusters[i].reduce((acc, p) => acc + p.y, 0);
      const nuevoX = Math.round(sumaX / clusters[i].length);
      const nuevoY = Math.round(sumaY / clusters[i].length);

      if (centroides[i].x !== nuevoX || centroides[i].y !== nuevoY) {
        centroides[i] = { x: nuevoX, y: nuevoY };
        cambio = true;
      }
    }

    if (!cambio) break;
  }

  return clusters.filter((c) => c.length > 0);
}

// ============================================================================
// 3. HEURÍSTICA DE RUTEO (VECINO MÁS CERCANO + 2-OPT)
// ============================================================================

/**
 * Ordena las paradas visitando siempre el pedido más cercano no visitado (usando Manhattan)
 */
export function vecinoMasCercano(pedidosVehiculo, mundo) {
  const noVisitados = [...pedidosVehiculo];
  const rutaOrdenada = [];
  let posicionActual = { x: mundo.deposito_x, y: mundo.deposito_y };

  while (noVisitados.length > 0) {
    let distanciaMinima = Infinity;
    let indiceMasCercano = -1;

    for (let i = 0; i < noVisitados.length; i++) {
      const d = calcularDistancia(posicionActual, noVisitados[i]);
      if (d < distanciaMinima) {
        distanciaMinima = d;
        indiceMasCercano = i;
      }
    }

    posicionActual = noVisitados[indiceMasCercano];
    rutaOrdenada.push(posicionActual);
    noVisitados.splice(indiceMasCercano, 1);
  }

  return rutaOrdenada;
}

/**
 * Aplica cruces 2-Opt para desenredar caminos y reducir las cuadras recorridas
 */
export function optimizar2Opt(rutaPedidos, mundo) {
  if (!rutaPedidos || rutaPedidos.length <= 2) return [...(rutaPedidos ?? [])];

  let mejorRuta = [...rutaPedidos];
  let mejorDistancia = calcularCuadrasRuta(mejorRuta, mundo);
  let huboMejora = true;

  while (huboMejora) {
    huboMejora = false;

    for (let i = 0; i < mejorRuta.length - 1; i++) {
      for (let k = i + 1; k < mejorRuta.length; k++) {
        const nuevaRuta = [
          ...mejorRuta.slice(0, i),
          ...mejorRuta.slice(i, k + 1).reverse(),
          ...mejorRuta.slice(k + 1),
        ];

        const nuevaDistancia = calcularCuadrasRuta(nuevaRuta, mundo);

        if (nuevaDistancia < mejorDistancia) {
          mejorDistancia = nuevaDistancia;
          mejorRuta = nuevaRuta;
          huboMejora = true;
        }
      }
    }
  }

  return mejorRuta;
}

// ============================================================================
// 4. DECISIÓN DE FLOTA Y MOTOR PRINCIPAL (UNE MÉTRICAS + RUTEO)
// ============================================================================

/**
 * Genera las rutas para una cantidad específica de vehículos y calcula sus métricas
 */
export function generarSolucionParaFlota(pedidos, mundo, cantidadVehiculos) {
  const clusters = clusterizarPedidos(pedidos, cantidadVehiculos, mundo);

  const rutas = clusters.map((cluster, index) => {
    const rutaInicial = vecinoMasCercano(cluster, mundo);
    const rutaOptimizada = optimizar2Opt(rutaInicial, mundo);

    return {
      vehiculo_id: index + 1,
      pedidos: rutaOptimizada.map((pedido) => pedido.id),
    };
  });

  const metricas = calcularMetricas(rutas, pedidos, mundo);

  return {
    cantidadVehiculos: rutas.length,
    rutas,
    metricas,
  };
}

/**
 * Evalúa experimentalmente de 1 a maxVehiculos y elige la flota que minimiza el costoTotal
 */
export function optimizarRuteo(pedidos, mundo, maxVehiculos = 5) {
  const limiteFlota = mundo.max_vehiculos ?? maxVehiculos;
  let mejorSolucion = null;
  const historialExperimentos = [];

  for (let v = 1; v <= limiteFlota; v++) {
    const solucionActual = generarSolucionParaFlota(pedidos, mundo, v);
    historialExperimentos.push(solucionActual);

    if (
      !mejorSolucion ||
      solucionActual.metricas.costoTotal < mejorSolucion.metricas.costoTotal
    ) {
      mejorSolucion = solucionActual;
    }
  }

  return {
    mejorFlota: mejorSolucion.cantidadVehiculos,
    rutas: mejorSolucion.rutas,
    metricas: mejorSolucion.metricas,
    comparativaFlota: historialExperimentos.map((exp) => ({
      vehiculos: exp.cantidadVehiculos,
      cuadras: exp.metricas.cuadras,
      makespanCuadras: exp.metricas.makespanCuadras,
      minutos: exp.metricas.minutos,
      costoVehiculos: exp.metricas.costoVehiculos,
      costoTotal: exp.metricas.costoTotal,
    })),
  };
}