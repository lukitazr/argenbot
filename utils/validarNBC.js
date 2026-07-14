/**
 * Valida una plantilla de 5 jugadores contra los requisitos de un desafío SBC.
 * @param {Array} jugadores - Array de 5 objetos Jugador (de la tabla global)
 * @param {Object} requisitos - Objeto parseado del JSON de requisitos
 * @returns {{ valido: boolean, errores: string[], progreso: string[] }}
 */
export default function validarSbc(jugadores, requisitos) {
  const errores = [];
  const progreso = [];

  // Filtrar slots vacíos
  const llenos = jugadores.filter(j => j !== null && j !== undefined);

  // Validar 5 slots llenos
  if (llenos.length < 5) {
    errores.push(`Faltan ${5 - llenos.length} jugador(es) por colocar`);
    progreso.push(`📋 Jugadores: ${llenos.length}/5`);
  } else {
    progreso.push(`✅ Jugadores: 5/5`);
  }

  // Media mínima del equipo
  if (requisitos.mediaMinima && llenos.length > 0) {
    const promedio = llenos.reduce((sum, j) => sum + j.media, 0) / llenos.length;
    if (promedio < requisitos.mediaMinima) {
      errores.push(`Media del equipo: ${promedio.toFixed(1)} (necesitás ${requisitos.mediaMinima})`);
      progreso.push(`❌ Media equipo: ${promedio.toFixed(1)}/${requisitos.mediaMinima}`);
    } else {
      progreso.push(`✅ Media equipo: ${promedio.toFixed(1)}/${requisitos.mediaMinima}`);
    }
  }

  // Media mínima individual
  if (requisitos.mediaMinIndividual && llenos.length > 0) {
    const bajas = llenos.filter(j => j.media < requisitos.mediaMinIndividual);
    if (bajas.length > 0) {
      errores.push(`${bajas.length} carta(s) con media menor a ${requisitos.mediaMinIndividual}: ${bajas.map(j => `${j.nombre} (${j.media})`).join(', ')}`);
      progreso.push(`❌ Media individual >= ${requisitos.mediaMinIndividual}: ${llenos.length - bajas.length}/${llenos.length} cumplen`);
    } else {
      progreso.push(`✅ Media individual >= ${requisitos.mediaMinIndividual}`);
    }
  }

  // Tipo requerido
  if (requisitos.tipoRequerido) {
    const { tipo, cantidad } = requisitos.tipoRequerido;
    const count = llenos.filter(j => {
      const tLower = tipo.toLowerCase();
      if (tLower === 'especial' || tLower === 'especiales') {
        return !j.dir.toLowerCase().includes('/normales/');
      }
      return j.tipo.toLowerCase().includes(tLower) || j.dir.toLowerCase().includes(`/${tLower}/`) || j.dir.toLowerCase().includes(`/${tLower}s/`);
    }).length;
    if (count < cantidad) {
      errores.push(`Necesitás ${cantidad} carta(s) de tipo "${tipo}", tenés ${count}`);
      progreso.push(`❌ Tipo "${tipo}": ${count}/${cantidad}`);
    } else {
      progreso.push(`✅ Tipo "${tipo}": ${count}/${cantidad}`);
    }
  }

  // País requerido
  if (requisitos.paisRequerido) {
    const { pais, cantidad } = requisitos.paisRequerido;
    const count = llenos.filter(j => j.pais.toLowerCase() === pais.toLowerCase()).length;
    if (count < cantidad) {
      errores.push(`Necesitás ${cantidad} carta(s) de ${pais}, tenés ${count}`);
      progreso.push(`❌ País "${pais}": ${count}/${cantidad}`);
    } else {
      progreso.push(`✅ País "${pais}": ${count}/${cantidad}`);
    }
  }

  // País no requerido (exclusión)
  if (requisitos.paisNoRequerido) {
    const { pais, cantidad } = requisitos.paisNoRequerido;
    const count = llenos.filter(j => j.pais.toLowerCase() !== pais.toLowerCase()).length;
    if (count < cantidad) {
      errores.push(`Necesitás ${cantidad} carta(s) que NO sean de ${pais}, tenés ${count}`);
      progreso.push(`❌ No de ${pais}: ${count}/${cantidad}`);
    } else {
      progreso.push(`✅ No de ${pais}: ${count}/${cantidad}`);
    }
  }

  // Grupo requerido (conjunto de nombres válidos)
  if (requisitos.grupoRequerido) {
    const { grupo, jugadores: nombresValidos, cantidad } = requisitos.grupoRequerido;
    const nombresLower = nombresValidos.map(n => n.toLowerCase());
    const count = llenos.filter(j => nombresLower.includes(j.nombre.toLowerCase())).length;
    if (count < cantidad) {
      errores.push(`Necesitás ${cantidad} carta(s) del grupo "${grupo}", tenés ${count}`);
      progreso.push(`❌ Grupo "${grupo}": ${count}/${cantidad}`);
    } else {
      progreso.push(`✅ Grupo "${grupo}": ${count}/${cantidad}`);
    }
  }

  // Jugador obligatorio
  if (requisitos.jugadorObligatorio) {
    const nombre = requisitos.jugadorObligatorio.toLowerCase();
    const tiene = llenos.some(j => j.nombre.toLowerCase() === nombre);
    if (!tiene) {
      errores.push(`Necesitás incluir a "${requisitos.jugadorObligatorio}"`);
      progreso.push(`❌ Jugador obligatorio: ${requisitos.jugadorObligatorio}`);
    } else {
      progreso.push(`✅ Jugador obligatorio: ${requisitos.jugadorObligatorio}`);
    }
  }

  return {
    valido: errores.length === 0,
    errores,
    progreso
  };
}
