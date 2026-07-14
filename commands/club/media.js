import prisma from '../../models/db.js';
import { EmbedBuilder } from 'discord.js';
import { calcularMedia, plantillaCompleta } from '../../utils/calcularMedia.js';

export default {
  name: 'media',
  aliases: ['overall', 'ovr'],
  desc: 'Ver la media (overall) de tu plantilla',
  run: async (client, message) => {
    const equipo = await prisma.equipo.findUnique({
      where: { userID: message.author.id },
      include: {
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

    // Mapear jugadores a un array de 5 posiciones
    const equipoArray = Array(5).fill(null);
    equipo.jugadores.forEach(ej => {
      if (ej.posicion >= 1 && ej.posicion <= 5) {
        equipoArray[ej.posicion - 1] = ej.jugador;
      }
    });

    const completa = plantillaCompleta(equipoArray);
    const media = calcularMedia(equipoArray);

    const embed = new EmbedBuilder()
      .setColor(client.color)
      .setTitle(`📊 Media de ${equipo.nombreEq}`)
      .setFooter({ text: `Club del pelotudo de ${message.author.username}` })
      .setTimestamp();

    // Construir la lista de jugadores con su media
    let desc = '';
    equipoArray.forEach((slot, i) => {
      if (slot && slot.nombre && slot.media != null) {
        desc += `**Pos ${i + 1}:** ${slot.nombre} — ⭐ **${slot.media}**\n`;
      } else {
        desc += `**Pos ${i + 1}:** ❌ *Vacía*\n`;
      }
    });

    desc += '\n───────────────────\n';

    if (media !== null) {
      // Emoji según rango de media
      let mediaEmoji = '⚪';
      if (media >= 90) mediaEmoji = '🔴';
      else if (media >= 85) mediaEmoji = '🟡';
      else if (media >= 80) mediaEmoji = '🟢';
      else if (media >= 75) mediaEmoji = '🔵';

      desc += `${mediaEmoji} **Media Total: ${media}**\n`;
    } else {
      desc += '❌ **No tenés jugadores en la plantilla.**\n';
    }

    if (!completa) {
      desc += '\n⚠️ *Tu plantilla no está completa. Necesitás 5 jugadores en campo para duelear.*';
    } else {
      desc += '\n✅ *Plantilla completa. ¡Listo para duelear!*';
    }

    embed.setDescription(desc);

    return message.reply({ embeds: [embed] });
  }
};

