import prisma from '../../models/db.js';
import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import formatNumber from '../../utils/formatNumber.js';

export default {
  name: 'descartar',
  aliases: ['vender'],
  desc: 'Descarta uno o más jugadores de tu club (reserva) por el 50% de su valor. Podés separar los nombres con comas.',
  run: async (client, message, args) => {
    const inputCompleto = args.join(' ').trim();

    if (!inputCompleto) {
      return message.reply('❌ **Debes especificar el nombre del jugador (o nombres separados por comas) que quieres descartar!**\nUso: `ar!descartar <nombre_del_jugador>` o `ar!descartar <nombre1>, <nombre2>`');
    }

    const inputNames = inputCompleto.split(',').map(n => n.trim().toLowerCase()).filter(n => n.length > 0);

    const equipo = await prisma.equipo.findUnique({
      where: { userID: message.author.id },
      include: {
        jugadores: {
          where: { posicion: 0, bloqueadoNbc: false },
          include: { jugador: true }
        }
      }
    });

    if (!equipo) {
      return message.reply('❌ **No tenés un club registrado!** Usá `ar!registro <nombre>` para crear uno.');
    }

    if (!equipo.jugadores || equipo.jugadores.length === 0) {
      return message.reply('❌ **No tenés jugadores en tu reserva para descartar!**');
    }

    // ─── CASO 1: SE DESCARTA UN SOLO NOMBRE E INCLUYE MÚLTIPLES VERSIONES ───
    if (inputNames.length === 1) {
      const targetName = inputNames[0];
      const matches = equipo.jugadores.filter(ej => ej.jugador.nombre.toLowerCase() === targetName);

      if (matches.length === 0) {
        return message.reply(`❌ **No tenés ningún jugador llamado "${targetName}" en tu reserva!**`);
      }

      const procesarDescarteSimple = async (ejId, jugadorData, targetMsg = message) => {
        const eqJug = await prisma.equipoJugador.findUnique({
          where: { id: ejId }
        });

        if (!eqJug) {
          return targetMsg.reply('❌ **Hubo un error al procesar el descarte. El jugador ya no está en tu reserva.**');
        }

        const compensacion = Math.floor(jugadorData.valor / 2);

        await prisma.$transaction([
          prisma.equipoJugador.delete({ where: { id: ejId } }),
          prisma.equipo.update({
            where: { id: equipo.id },
            data: { dinero: { increment: compensacion } }
          })
        ]);

        const updatedEquipo = await prisma.equipo.findUnique({
          where: { id: equipo.id }
        });

        const embed = new EmbedBuilder()
          .setColor('#ff4a4a')
          .setTitle('🗑️ Jugador Descartado')
          .setDescription(`**${jugadorData.nombre}** (${jugadorData.tipo}) ha sido EXPULSADO de tu club. Genio?`)
          .addFields(
            { name: '💰 Valor original', value: `$GDS ${formatNumber(jugadorData.valor)}`, inline: true },
            { name: '💵 Godeanos obtenidos', value: `+$GDS ${formatNumber(compensacion)}`, inline: true }
          )
          .setFooter({ text: `Club: ${updatedEquipo.nombreEq} | Nuevo saldo: $GDS ${formatNumber(updatedEquipo.dinero)}` })
          .setTimestamp();

        if (targetMsg === message) {
          return message.reply({ embeds: [embed] });
        } else {
          return targetMsg.editReply({ embeds: [embed], components: [], content: null });
        }
      };

      if (matches.length === 1) {
        return procesarDescarteSimple(matches[0].id, matches[0].jugador);
      } else {
        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('descartar_select')
            .setPlaceholder('Seleccioná qué versión querés descartar')
            .addOptions(matches.map(m => ({
              label: `${m.jugador.nombre} (${m.jugador.media})`,
              description: `${m.jugador.tipo} | Valor: $GDS ${formatNumber(m.jugador.valor)}`,
              value: m.id.toString()
            })))
        );

        const embed = new EmbedBuilder()
          .setColor('#ff4a4a')
          .setTitle('🤔 Múltiples versiones encontradas')
          .setDescription(`Tenés ${matches.length} versiones de **${matches[0].jugador.nombre}**. Seleccioná cuál querés descartar por el 50% de su valor:`)
          .setFooter({ text: 'Tenés 30 segundos para elegir, dale flaco que se termina el tiempo eh, apurate eh, DALE.' });

        const msgMenu = await message.reply({ embeds: [embed], components: [row] });

        const collector = msgMenu.createMessageComponentCollector({
          filter: (i) => i.user.id === message.author.id,
          time: 30000,
          max: 1
        });

        collector.on('collect', async (i) => {
          await i.deferUpdate();
          const seleccionadaId = parseInt(i.values[0]);
          const match = matches.find(m => m.id === seleccionadaId);
          await procesarDescarteSimple(seleccionadaId, match.jugador, i);
        });

        collector.on('end', async (collected) => {
          if (collected.size === 0) {
            try { await msgMenu.edit({ content: '❌ **Tiempo agotado.** Descarte cancelado.', components: [], embeds: [] }); } catch (e) { }
          }
        });
        return;
      }
    }

    // ─── CASO 2: DESCARTE MÚLTIPLE (BULK) ───
    const descartados = [];
    const noEncontrados = [];
    let totalCompensacion = 0;
    const idsAEliminar = [];

    let disponibles = [...equipo.jugadores];

    for (const name of inputNames) {
      const index = disponibles.findIndex(ej => ej.jugador.nombre.toLowerCase() === name);
      if (index !== -1) {
        const ej = disponibles[index];
        disponibles.splice(index, 1); // Quitar de disponibles

        const compensacion = Math.floor(ej.jugador.valor / 2);
        descartados.push({
          nombre: ej.jugador.nombre,
          tipo: ej.jugador.tipo,
          valor: ej.jugador.valor,
          compensacion
        });
        totalCompensacion += compensacion;
        idsAEliminar.push(ej.id);
      } else {
        noEncontrados.push(name);
      }
    }

    if (descartados.length === 0) {
      return message.reply(`❌ **No se encontró ninguno de los jugadores ingresados en tu reserva!** (${noEncontrados.join(', ')})`);
    }

    await prisma.$transaction([
      prisma.equipoJugador.deleteMany({
        where: { id: { in: idsAEliminar } }
      }),
      prisma.equipo.update({
        where: { id: equipo.id },
        data: { dinero: { increment: totalCompensacion } }
      })
    ]);

    const updatedEquipo = await prisma.equipo.findUnique({
      where: { id: equipo.id }
    });

    let desc = `Has expulsado a **${descartados.length}** jugador(es) de tu reserva.\n\n`;
    desc += descartados.map(d => `• **${d.nombre}** (${d.tipo}) — obtuvo: **+$GDS ${formatNumber(d.compensacion)}**`).join('\n');

    if (noEncontrados.length > 0) {
      desc += `\n\n⚠️ *No se encontraron:* ${noEncontrados.map(n => `"${n}"`).join(', ')}`;
    }

    const embed = new EmbedBuilder()
      .setColor('#ff4a4a')
      .setTitle('🗑️ Descarte Múltiple Exitoso')
      .setDescription(desc)
      .addFields(
        { name: '💵 Total Godeanos Obtenidos', value: `+$GDS ${formatNumber(totalCompensacion)}`, inline: true }
      )
      .setFooter({ text: `Club: ${updatedEquipo.nombreEq} | Nuevo saldo: $GDS ${formatNumber(updatedEquipo.dinero)}` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
