import prisma from '../../models/db.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
  name: 'top-media',
  run: async (client, message, args, prefix) => {
    // 1. Obtener todos los equipos de la DB
    const equipos = await prisma.equipo.findMany({
      include: {
        jugadores: {
          include: {
            jugador: true
          }
        }
      }
    });

    if (equipos.length === 0) {
      return message.reply('❌ **No hay equipos registrados en la base de datos!**');
    }

    // 2. Calcular promedio de media de la plantilla para cada uno
    const equiposConMedia = equipos.map(eq => {
      const active = eq.jugadores.filter(ej => ej.posicion >= 1 && ej.posicion <= 5);
      const promedio = active.length > 0 ? (active.reduce((sum, ej) => sum + ej.jugador.media, 0) / active.length) : 0;
      return {
        nombreEq: eq.nombreEq,
        userID: eq.userID,
        promedio: promedio,
        activeCount: active.length
      };
    });

    // 3. Ordenar de mayor a menor promedio de media
    equiposConMedia.sort((a, b) => b.promedio - a.promedio);

    // 4. Parámetros de paginación
    const itemsPerPage = 10;
    let page = 0;
    const totalPages = Math.ceil(equiposConMedia.length / itemsPerPage);

    const generarEmbedYPáginas = async (paginaActual) => {
      const start = paginaActual * itemsPerPage;
      const end = start + itemsPerPage;
      const sliceEquipos = equiposConMedia.slice(start, end);

      let desc = '';
      for (let idx = 0; idx < sliceEquipos.length; idx++) {
        const eq = sliceEquipos[idx];
        const rankingPos = start + idx;
        let medal = '';
        if (rankingPos === 0) medal = '🥇 ';
        else if (rankingPos === 1) medal = '🥈 ';
        else if (rankingPos === 2) medal = '🥉 ';
        else medal = `\`#${rankingPos + 1}\` `;

        let username = 'Desconocido';
        try {
          const user = client.users.cache.get(eq.userID) || await client.users.fetch(eq.userID);
          if (user) username = user.username;
        } catch (e) {}

        desc += `${medal}**${eq.nombreEq}** (de @${username}) — ⭐ **${eq.promedio.toFixed(1)}** promedio (${eq.activeCount}/5 jugadores)\n`;
      }

      const embed = new EmbedBuilder()
        .setColor(client.color || '#00ffcc')
        .setTitle('🏆 Top Media - Promedio de Plantilla')
        .setDescription(desc || '*No hay equipos en esta página.*')
        .setFooter({ text: `Página ${paginaActual + 1} de ${totalPages} • Total equipos: ${equiposConMedia.length}` })
        .setTimestamp();

      return embed;
    };

    const generarFilaBotones = (paginaActual) => {
      if (totalPages <= 1) return [];

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev_page_media')
          .setLabel('⬅️ Anterior')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(paginaActual === 0),
        new ButtonBuilder()
          .setCustomId('next_page_media')
          .setLabel('Siguiente ➡️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(paginaActual === totalPages - 1)
      );

      return [row];
    };

    const embedInicial = await generarEmbedYPáginas(page);
    const componentesIniciales = generarFilaBotones(page);

    const msg = await message.reply({
      embeds: [embedInicial],
      components: componentesIniciales
    });

    if (totalPages <= 1) return;

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 60000
    });

    collector.on('collect', async (interaction) => {
      await interaction.deferUpdate();

      if (interaction.customId === 'prev_page_media') {
        page--;
      } else if (interaction.customId === 'next_page_media') {
        page++;
      }

      await interaction.editReply({
        embeds: [await generarEmbedYPáginas(page)],
        components: generarFilaBotones(page)
      });
    });

    collector.on('end', async () => {
      try {
        await msg.edit({ components: [] });
      } catch (e) { /* mensaje eliminado */ }
    });
  }
};
