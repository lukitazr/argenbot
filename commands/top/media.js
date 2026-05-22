import Equipo from '../../models/Equipo.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
  name: 'top-media',
  run: async (client, message, args, prefix) => {
    // 1. Obtener todos los equipos de la DB
    const equipos = await Equipo.find({});

    if (equipos.length === 0) {
      return message.reply('❌ **No hay equipos registrados en la base de datos!**');
    }

    // 2. Calcular promedio de media de la plantilla para cada uno
    const equiposConMedia = equipos.map(eq => {
      const active = (eq.equipo || []).filter(c => c && c.nombre && typeof c.media === 'number');
      const promedio = active.length > 0 ? (active.reduce((sum, c) => sum + c.media, 0) / active.length) : 0;
      return {
        nombreEq: eq.nombreEq,
        userN: eq.userN,
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

    const generarEmbedYPáginas = (paginaActual) => {
      const start = paginaActual * itemsPerPage;
      const end = start + itemsPerPage;
      const sliceEquipos = equiposConMedia.slice(start, end);

      let desc = '';
      sliceEquipos.forEach((eq, idx) => {
        const rankingPos = start + idx;
        let medal = '';
        if (rankingPos === 0) medal = '🥇 ';
        else if (rankingPos === 1) medal = '🥈 ';
        else if (rankingPos === 2) medal = '🥉 ';
        else medal = `\`#${rankingPos + 1}\` `;

        desc += `${medal}**${eq.nombreEq}** (de @${eq.userN}) — ⭐ **${eq.promedio.toFixed(1)}** promedio (${eq.activeCount}/5 jugadores)\n`;
      });

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

    const embedInicial = generarEmbedYPáginas(page);
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
        embeds: [generarEmbedYPáginas(page)],
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
