import prisma from '../models/db.js';

export default async function seedNBCS() {
  try {
    const nbcsData = [
      {
        nombre: "Desafío de la Gordura",
        desc: "Completá todos los desafíos para desbloquear la carta exclusiva de Armonia 90 de media.",
        premioNombre: "Armonia NBC",
        premioId: 253, // Definido por ID
        desafios: [
          {
            nombre: "Niggers +82",
            desc: "Entregá una plantilla completa de niggas con media >= 82 y con, mínimo, 2 jugadores Especiales.",
            cantidadPlantillas: 1,
            requisitos: {
              mediaMinima: 82,
              tipoRequerido: { tipo: "Especial", cantidad: 2 },
            },
            premioGodeanos: 15000,
            premioPackNombre: "Pack Gordos Especiales"
          },
          {
            nombre: "Lo que pudo ser...",
            desc: "Entregá una plantilla de niggas con media 85 y con, mínimo, 1 jugador Future Niggas.",
            cantidadPlantillas: 1,
            requisitos: {
              mediaMinima: 85,
              tipoRequerido: { tipo: "Future Niggas", cantidad: 1 },
            },
            premioGodeanos: 25000,
            premioPackNombre: "Pack Gordos Especiales"
          }
        ]
      },
      {
        nombre: "Desafío Energizante",
        desc: "Completá todos los desafíos para desbloquear la carta exclusiva de Monster 91 de media.",
        premioNombre: "Monster NBC",
        premioId: 255,
        desafios: [
          {
            nombre: "Niggers +83",
            desc: "Entregá una plantilla completa de niggas con media >= 83 y con, mínimo, 2 jugadores Especiales.",
            cantidadPlantillas: 1,
            requisitos: {
              mediaMinima: 83,
              tipoRequerido: { tipo: "Especial", cantidad: 2 },
            },
            premioGodeanos: 20000,
            premioPackNombre: "Pack Gordos Especiales"
          },
          {
            nombre: "Team bebidas",
            desc: "Entregá una plantilla de niggas con media 85 y con Birrita entre los 5 elegidos.",
            cantidadPlantillas: 1,
            requisitos: {
              mediaMinima: 85,
              jugadorObligatorio: "Birrita"
            },
            premioGodeanos: 25000,
            premioPackNombre: "Pack Gordos Especiales"
          }
        ]
      },
      {
        nombre: "Desafío Pollo Hervido con Arroz Blanco",
        desc: "Completá todos los desafíos para desbloquear la carta exclusiva de Nicanor 92 de media.",
        premioNombre: "Nicanor 92",
        premioId: 254,
        desafios: [
          {
            nombre: "Niggers +84",
            desc: "Entregá una plantilla completa de niggas con media >= 84 y con, mínimo, 3 jugadores Especiales.",
            cantidadPlantillas: 1,
            requisitos: {
              mediaMinima: 84,
              tipoRequerido: { tipo: "Especial", cantidad: 3 },
            },
            premioGodeanos: 40000,
            premioPackNombre: "Pack Gordos Especiales"
          },
          {
            nombre: "Aburrido +87",
            desc: "Entregá una plantilla de niggas con media 87, solo eso... algo aburrido, no?.",
            cantidadPlantillas: 1,
            requisitos: {
              mediaMinima: 87,
            },
            premioGodeanos: 35000,
            premioPackNombre: "Pack Gordos Especiales"
          }
        ]
      },
      {
        nombre: "Desafío Nostalfag",
        desc: "Completá todos los desafíos para desbloquear la carta exclusiva de Scarmato 93 de media.",
        premioNombre: "Scarmato 93",
        premioId: 256,
        desafios: [
          {
            nombre: "Good ol' times...",
            desc: "Entregá una plantilla completa de niggas con media >= 85 y con Tako Y Riva en el mix del horror.",
            cantidadPlantillas: 1,
            requisitos: {
              mediaMinima: 85,
              grupoRequerido: { grupo: "Tako y Riva", jugadores: ["Tako", "Ryva"], cantidad: 2 }
            },
            premioGodeanos: 50000,
            premioPackNombre: "Pack Gordos Especiales"
          },
          {
            nombre: "Cumpleañitos +88",
            desc: "Entregá una plantilla de niggas con media 88 que contenga no menos de 3 jugadores de Aniversario Argentine.",
            cantidadPlantillas: 1,
            requisitos: {
              mediaMinima: 88,
              tipoRequerido: { tipo: "Aniversario", cantidad: 3 }
            },
            premioGodeanos: 60000,
            premioPackNombre: "Pack Gordos Especiales"
          }
        ]
      },
      {
        nombre: "Desafío Semen Saborizado",
        desc: "Completá todos los desafíos para desbloquear la carta exclusiva de Piña 94 de media.",
        premioNombre: "Piña 94",
        premioId: 257,
        desafios: [
          {
            nombre: "Los 3 chiflados",
            desc: "Entregá una plantilla completa de niggas media >= 86, con Zipix, Winer y/o Tako, con 2 de estos 3 mogolicos sirve.",
            cantidadPlantillas: 1,
            requisitos: {
              mediaMinima: 86,
              grupoRequerido: { grupo: "Zipix, Winer o Tako", jugadores: ["Zipix", "Winer", "Tako"], cantidad: 2 }
            },
            premioGodeanos: 50000,
            premioPackNombre: "Pack Gordos Especiales"
          },
          {
            nombre: "Desafío de mierda po wn",
            desc: "Entregá una plantilla de niggas con media 86 que contenga no menos de 3 jugadores Chilenos, por la chucha weon que me hacen escribir esta cagá.",
            cantidadPlantillas: 1,
            requisitos: {
              mediaMinima: 86,
              paisRequerido: { pais: "Chile", cantidad: 3 }
            },
            premioGodeanos: 60000,
            premioPackNombre: "Pack Gordos Especiales"
          },
        ]
      },
      {
        nombre: "Desafío 404",
        desc: "Completá todos los desafíos para desbloquear la carta exclusiva de ErrorX47 95 de media.",
        premioNombre: "ErrorX47 95",
        premioId: 258,
        desafios: [
          {
            nombre: "Los olds de skype Bv",
            desc: "Entregá una plantilla completa de niggas media >= 89 con mínimo 3 niggas de Skype (Tako, Winer, Trollface, Exploit, Zipix, Riusu, Joaco o Hiro).",
            cantidadPlantillas: 1,
            requisitos: {
              mediaMinima: 89,
              grupoRequerido: { grupo: "Niggas de Skype", jugadores: ["Zipix", "Winer", "Tako", "Trollface", "Exploit", "Lyfer_Riusu!", "Joatrox", "Hiro"], cantidad: 4 }
            },
            premioGodeanos: 70000,
            premioPackNombre: "Pack Gordos Especiales"
          },
          {
            nombre: "Desafío de mierda po wn... 2",
            desc: "Entregá una plantilla de niggas con media >= 88 que contenga no menos de 2 jugadores Chilenos, por la chucha weon que me hacen escribir esta cagá... otra vez.",
            cantidadPlantillas: 1,
            requisitos: {
              mediaMinima: 88,
              paisRequerido: { pais: "Chile", cantidad: 2 }
            },
            premioGodeanos: 80000,
            premioPackNombre: "Pack Gordos Especiales"
          },
        ]
      },
      {
        nombre: "Desafío Oldazo",
        desc: "Completá todos los desafíos para desbloquear la carta exclusiva de Jared 97 de media.",
        premioNombre: "Jared 97",
        premioId: 259,
        desafios: [
          {
            nombre: "Los olds de skype Bv 2: La Venganza",
            desc: "Entregá una plantilla completa de niggas media >= 89 con mínimo 3 niggas de Skype (Tako, Winer, Trollface, Exploit, Zipix, Riusu, Joaco o Hiro).",
            cantidadPlantillas: 1,
            requisitos: {
              mediaMinima: 89,
              grupoRequerido: { grupo: "Niggas de Skype", jugadores: ["Zipix", "Winer", "Tako", "Trollface", "Exploit", "Lyfer_Riusu!", "Joatrox", "Hiro"], cantidad: 3 }
            },
            premioGodeanos: 70000,
            premioPackNombre: "Pack Gordos Especiales"
          },
          {
            nombre: "Desafío Inferior",
            desc: "Entregá una plantilla de niggas con media >= 91 que contenga niggas NO argensirios.",
            cantidadPlantillas: 1,
            requisitos: {
              mediaMinima: 91,
              paisNoRequerido: { pais: "Argentina", cantidad: 5 }
            },
            premioGodeanos: 90000,
            premioPackNombre: "Pack Gordos Especiales"
          },
        ]
      }
    ];

    const existentes = await prisma.nbc.findMany({ include: { desafios: true } });
    const existentesMap = new Map(existentes.map(s => [s.nombre.toLowerCase(), s]));

    for (const nbcData of nbcsData) {
      // Buscar jugador premio por ID
      const jugadorPremio = await prisma.jugador.findUnique({
        where: { id: nbcData.premioId }
      });

      if (!jugadorPremio) {
        console.log(`⚠️ NBC "${nbcData.nombre}": jugador premio con ID "${nbcData.premioId}" (${nbcData.premioNombre}) no encontrado, saltando...`.yellow);
        continue;
      }

      const existente = existentesMap.get(nbcData.nombre.toLowerCase());

      if (existente) {
        // Actualizar descripción y premio del NBC principal si cambiaron
        if (existente.desc !== nbcData.desc || existente.premioId !== jugadorPremio.id) {
          await prisma.nbc.update({
            where: { id: existente.id },
            data: { desc: nbcData.desc, premioId: jugadorPremio.id }
          });
        }

        // Obtener desafíos y completados actuales del NBC
        const desafiosPrevios = await prisma.nbcDesafio.findMany({
          where: { nbcId: existente.id },
          include: {
            completados: true,
            slots: { include: { equipoJugador: true } }
          }
        });

        // Mapas para persistir registros de completitud y cartas colocadas
        const completadosRespaldados = [];
        const slotsRespaldados = [];

        for (const dp of desafiosPrevios) {
          // Respaldar completados por equipo
          for (const comp of dp.completados) {
            completadosRespaldados.push({
              desafioNombre: dp.nombre.toLowerCase(),
              equipoId: comp.equipoId,
              fecha: comp.fecha
            });
          }
          // Respaldar slots colocados por equipo
          for (const slot of dp.slots) {
            slotsRespaldados.push({
              desafioNombre: dp.nombre.toLowerCase(),
              equipoId: slot.equipoId,
              equipoJugadorId: slot.equipoJugadorId,
              plantillaIndex: slot.plantillaIndex,
              slotIndex: slot.slotIndex
            });
          }
        }

        // Eliminar desafíos antiguos (borrado en cascada afectará slots y completados huérfanos)
        await prisma.nbcDesafio.deleteMany({
          where: { nbcId: existente.id }
        });

        // Crear los nuevos desafíos mapeando y restaurando completados y slots respaldados
        for (const desafioData of nbcData.desafios) {
          const requisitosStr = JSON.stringify(desafioData.requisitos || {});

          let premioPackId = null;
          if (desafioData.premioPackNombre) {
            let packObj = await prisma.pack.findUnique({
              where: { nombre: desafioData.premioPackNombre }
            });
            if (!packObj) {
              const limpio = desafioData.premioPackNombre.replace(/^pack\s+/i, '').trim();
              packObj = await prisma.pack.findFirst({
                where: { nombre: { equals: limpio } }
              });
            }
            if (packObj) premioPackId = packObj.id;
          }

          const nuevoDesafio = await prisma.nbcDesafio.create({
            data: {
              nbcId: existente.id,
              nombre: desafioData.nombre,
              desc: desafioData.desc || "",
              cantidadPlantillas: desafioData.cantidadPlantillas || 1,
              requisitos: requisitosStr,
              premioGodeanos: desafioData.premioGodeanos || 0,
              premioPackId: premioPackId
            }
          });

          // Restaurar registros completados asociados al nombre del desafío
          const keyNombre = desafioData.nombre.toLowerCase();
          const completadosAsociados = completadosRespaldados.filter(c => c.desafioNombre === keyNombre);
          if (completadosAsociados.length > 0) {
            await prisma.nbcDesafioCompletado.createMany({
              data: completadosAsociados.map(c => ({
                desafioId: nuevoDesafio.id,
                equipoId: c.equipoId,
                fecha: c.fecha
              })),
              skipDuplicates: true
            });
          }

          // Restaurar slots (cartas colocadas) asociadas al nombre del desafío
          const slotsAsociados = slotsRespaldados.filter(s => s.desafioNombre === keyNombre);
          if (slotsAsociados.length > 0) {
            // Verificar que las cartas no hayan sido borradas de la reserva en el interín
            for (const s of slotsAsociados) {
              const existeJugador = await prisma.equipoJugador.findUnique({
                where: { id: s.equipoJugadorId }
              });
              if (existeJugador) {
                await prisma.nbcSlot.create({
                  data: {
                    desafioId: nuevoDesafio.id,
                    equipoId: s.equipoId,
                    equipoJugadorId: s.equipoJugadorId,
                    plantillaIndex: s.plantillaIndex,
                    slotIndex: s.slotIndex
                  }
                });
              }
            }
          }
        }
      } else {
        // Crear NBC nuevo con desafíos
        const desafiosACrear = [];
        for (const d of nbcData.desafios) {
          let premioPackId = null;
          if (d.premioPackNombre) {
            let packObj = await prisma.pack.findUnique({
              where: { nombre: d.premioPackNombre }
            });
            if (!packObj) {
              const limpio = d.premioPackNombre.replace(/^pack\s+/i, '').trim();
              packObj = await prisma.pack.findFirst({
                where: {
                  nombre: {
                    equals: limpio
                  }
                }
              });
            }
            if (packObj) premioPackId = packObj.id;
          }

          desafiosACrear.push({
            nombre: d.nombre,
            desc: d.desc || "",
            cantidadPlantillas: d.cantidadPlantillas || 1,
            requisitos: JSON.stringify(d.requisitos || {}),
            premioGodeanos: d.premioGodeanos || 0,
            premioPackId: premioPackId
          });
        }

        await prisma.nbc.create({
          data: {
            nombre: nbcData.nombre,
            desc: nbcData.desc || "",
            premioId: jugadorPremio.id,
            desafios: {
              create: desafiosACrear
            }
          }
        });
      }
    }

    const totalNbcs = await prisma.nbc.count();
    console.log(`🏆 NBCs sincronizados! (${totalNbcs} en total)`.green);
  } catch (error) {
    console.error('❌ Error al hacer seed de NBCs:'.red, error);
  }
}
