import prisma from '../../models/db.js';
import { EmbedBuilder } from 'discord.js';
import formatNumber from '../../utils/formatNumber.js';
import obtenerEmojiPais from '../../utils/obtenerEmojiPais.js';

export default {
  name: 'canjear',
  aliases: ['abrir', 'open'],
  desc: 'Canjea un pack disponible en tu club y obtené un jugador',
  run: async (client, message, args) => {
    const nombrePack = args.join(' ').trim();

    if (!nombrePack) {
      return message.reply('❌ **Debes especificar el nombre del pack!**\nUso: `ar!canjear <nombre del pack>`');
    }

    const equipo = await prisma.equipo.findUnique({
      where: { userID: message.author.id },
      include: {
        packs_dis: {
          include: {
            pack: true
          }
        },
        jugadores: {
          include: {
            jugador: true
          }
        }
      }
    });

    if (!equipo) {
      return message.reply('❌ **No tenés un club registrado!** Usá `ar!registro <nombre>` para crear uno.');
    }

    // Buscar el pack en los packs disponibles del usuario
    const packIndex = equipo.packs_dis.findIndex(
      ep => ep.pack.nombre.toLowerCase() === nombrePack.toLowerCase()
    );

    if (packIndex === -1) {
      return message.reply(`❌ **No tenés el pack "${nombrePack}" disponible!** Usá \`ar!packs\` para ver tus packs.`);
    }

    const ep = equipo.packs_dis[packIndex];
    const packInfo = ep.pack;

    // Buscar jugadores elegibles según el tipo del pack
    let tipoPack = packInfo.tipo;
    if (!tipoPack) tipoPack = 'normal';

    let jugadoresElegibles;
    if (tipoPack === 'todos') {
      jugadoresElegibles = await prisma.jugador.findMany();
    } else if (tipoPack === 'especial') {
      // Filtrar que la dirección de imagen no contenga "normales"
      jugadoresElegibles = await prisma.jugador.findMany({
        where: {
          NOT: {
            dir: {
              contains: '/normales/' || '/nbc/'
            }
          }
        }
      });
    } else {
      let carpetaMatches = tipoPack;
      switch (tipoPack) {
        case 'normal': carpetaMatches = '/normales/'; break;
        case 'heroe': carpetaMatches = '/heroes/'; break;
        case 'icono': carpetaMatches = '/iconos/'; break;
        case 'time_warp': carpetaMatches = '/time_warps/'; break;
        case 'scream': carpetaMatches = '/scream/'; break;
        case 'toty': carpetaMatches = '/toty/'; break;
      }
      jugadoresElegibles = await prisma.jugador.findMany({
        where: {
          dir: {
            contains: carpetaMatches
          }
        }
      });
    }

    if (!jugadoresElegibles || jugadoresElegibles.length === 0) {
      return message.reply('❌ **No hay jugadores disponibles en este pack!**');
    }

    // Aplicar probabilidades dinámicas según el pack
    const jugadoresConPeso = jugadoresElegibles.map(j => {
      let peso = 0;
      switch (packInfo.nombre) {
        case 'Gordos Comunes':
          if (j.media < 77) peso = 70;
          else if (j.media < 86) peso = 25;
          else peso = 5;
          break;
        case 'Gordos Premium':
          if (j.media >= 86) peso = 30;
          else if (j.media >= 82) peso = 50;
          else if (j.media >= 80) peso = 15;
          else peso = 5;
          break;
        case 'Gordos Especiales':
        case 'Heroes de Argentine':
          if (j.media >= 85) peso = 20;
          else peso = 80;
          break;
        case 'Iconos de Argentine':
        case 'Pack Malvado':
        case 'Pack Olvidado':
        case 'Pack MOTY':
          peso = 100;
          break;
        case 'Pack Godeano de Argentine':
          if (j.media >= 90) peso = 60;
          else if (j.media >= 88) peso = 30;
          else if (j.media >= 86) peso = 10;
          else peso = 0;
          break;
        default:
          peso = 10;
      }
      return { ...j, peso };
    });

    const jugadoresPosibles = jugadoresConPeso.filter(j => j.peso > 0);

    if (jugadoresPosibles.length === 0) {
      return message.reply(`❌ **No se encontraron jugadores que cumplan los requisitos del pack ${packInfo.nombre}!**`);
    }

    // Seleccionar 1 jugador basado en las probabilidades
    const pesoTotal = jugadoresPosibles.reduce((sum, j) => sum + j.peso, 0);
    let random = Math.random() * pesoTotal;

    let jugadorSeleccionado = jugadoresPosibles[0];
    for (const j of jugadoresPosibles) {
      random -= j.peso;
      if (random <= 0) {
        jugadorSeleccionado = j;
        break;
      }
    }

    // Añadir jugador a la reserva o descartar si ya existe la carta exacta
    const tieneCartaExacta = equipo.jugadores.some(ej => ej.jugadorId === jugadorSeleccionado.id);

    let isDuplicado = false;
    let isNuevaVersion = false;
    let compensacion = 0;

    const queries = [
      prisma.equipoPack.delete({
        where: { id: ep.id }
      })
    ];

    if (tieneCartaExacta) {
      isDuplicado = true;
      compensacion = Math.floor(jugadorSeleccionado.valor / 2);
      queries.push(
        prisma.equipo.update({
          where: { id: equipo.id },
          data: { dinero: { increment: compensacion } }
        })
      );
    } else {
      isNuevaVersion = equipo.jugadores.some(ej => ej.jugador.nombre.toLowerCase() === jugadorSeleccionado.nombre.toLowerCase());

      queries.push(
        prisma.equipoJugador.create({
          data: {
            equipoId: equipo.id,
            jugadorId: jugadorSeleccionado.id,
            posicion: 0
          }
        })
      );
    }

    await prisma.$transaction(queries);

    // Obtener dinero fresco
    const updatedEquipo = await prisma.equipo.findUnique({
      where: { id: equipo.id }
    });

    let embedColor;
    if (jugadorSeleccionado.media > 75) embedColor = '#FFD700';
    else embedColor = '#bebebe';

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle('🎉 ¡Pack Abierto!')
      .setDescription(`Has obtenido un nuevo jugador del pack **${packInfo.nombre}**!`)
      .addFields(
        { name: '👤 Jugador', value: jugadorSeleccionado.nombre, inline: true },
        { name: '🏷️ Tipo', value: jugadorSeleccionado.tipo, inline: true },
        { name: '⭐ Media', value: `${jugadorSeleccionado.media}`, inline: true },
        { name: '💰 Valor', value: `$GDS ${formatNumber(jugadorSeleccionado.valor)}`, inline: true },
        { name: '🌎 Nacionalidad', value: `${jugadorSeleccionado.pais} ${obtenerEmojiPais(jugadorSeleccionado.pais)}`, inline: true }
      )
      .setTimestamp();

    if (isDuplicado) {
      embed.addFields({ name: '⚠️ Duplicado', value: `Ya tenías esta carta **exacta**, ha sido descartada automaticamente.\n**Compensación:** +$GDS ${formatNumber(compensacion)} al club.`, inline: false });
      embed.setFooter({ text: `Chau carta de mierda | Equipo: ${equipo.nombreEq} | 💰 Saldo: $GDS ${formatNumber(updatedEquipo.dinero)}` });
    } else {
      if (isNuevaVersion) {
        embed.addFields({ name: '✨ ¡Nueva Versión!', value: `Ya tenías a **${jugadorSeleccionado.nombre}** de otro tipo, ¡pero esta versión es nueva! Se añadió a tu reserva.`, inline: false });
      }
      embed.setFooter({ text: `El jugador fue añadido a tu reserva, usá ar!plantilla para ponerlo a laburar!!! (si es que sirve para algo) | Club: ${equipo.nombreEq}` });
    }

    if (jugadorSeleccionado.dir && jugadorSeleccionado.dir.startsWith('http')) {
      embed.setImage(jugadorSeleccionado.dir);
    }

    return message.reply({ embeds: [embed] });
  }
}
