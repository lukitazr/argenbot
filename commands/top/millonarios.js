import prisma from '../../models/db.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import formatNumber from '../../utils/formatNumber.js';

export default {
  name: 'top-millonarios',
  aliases: ['millonarios'],
  run: async (client, message, args, prefix) => {
    // 1. Obtener todos los equipos de la DB ordenados por dinero
    const equipos = await prisma.equipo.findMany({
      orderBy: { dinero: 'desc' }
    });

    if (equipos.length === 0) {
      return message.reply('❌ **No hay equipos registrados en la base de datos!**');
    }

    // 2. Parámetros de paginación
    const itemsPerPage = 10;
    let page = 0;
    const totalPages = Math.ceil(equipos.length / itemsPerPage);

    const generarEmbedYPáginas = async (paginaActual) => {
      const start = paginaActual * itemsPerPage;
      const end = start + itemsPerPage;
      const sliceEquipos = equipos.slice(start, end);

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

        desc += `${medal}**${eq.nombreEq}** (de @${username}) — 💰 **$GDS ${formatNumber(eq.dinero || 0)}**\n`;
      }

      const embed = new EmbedBuilder()
        .setColor(client.color || '#00ffcc')
        .setTitle('🏆 Top Millonarios - Godeanos en las Arcas')
        .setDescription(desc || '*No hay equipos en esta página.*')
        .setFooter({ text: `Página ${paginaActual + 1} de ${totalPages} • Total equipos: ${equipos.length}` })
        .setTimestamp();

      return embed;
    };

    const generarFilaBotones = (paginaActual) => {
      if (totalPages <= 1) return [];

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev_page_millonarios')
          .setLabel('⬅️ Anterior')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(paginaActual === 0),
        new ButtonBuilder()
          .setCustomId('next_page_millonarios')
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

      if (interaction.customId === 'prev_page_millonarios') {
        page--;
      } else if (interaction.customId === 'next_page_millonarios') {
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
