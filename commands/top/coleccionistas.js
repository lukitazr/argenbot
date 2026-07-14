import prisma from '../../models/db.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
  name: 'top-coleccionistas',
  aliases: ['coleccionistas'],
  run: async (client, message, args, prefix) => {
    // 1. Obtener todos los equipos de la DB
    const equipos = await prisma.equipo.findMany({
      include: {
        jugadores: true
      }
    });

    if (equipos.length === 0) {
      return message.reply('❌ **No hay equipos registrados en la base de datos!**');
    }

    // 2. Calcular total de cartas de cada uno (plantilla + reserva)
    const equiposConColeccion = equipos.map(eq => {
      const squadCardsCount = eq.jugadores.filter(j => j.posicion >= 1 && j.posicion <= 5).length;
      const reserveCardsCount = eq.jugadores.filter(j => j.posicion === 0).length;
      const totalCards = squadCardsCount + reserveCardsCount;
      return {
        nombreEq: eq.nombreEq,
        userID: eq.userID,
        totalCards: totalCards,
        squadCardsCount: squadCardsCount,
        reserveCardsCount: reserveCardsCount
      };
    });

    // 3. Ordenar de mayor a menor cantidad de cartas
    equiposConColeccion.sort((a, b) => b.totalCards - a.totalCards);

    // 4. Parámetros de paginación
    const itemsPerPage = 10;
    let page = 0;
    const totalPages = Math.ceil(equiposConColeccion.length / itemsPerPage);

    const generarEmbedYPáginas = async (paginaActual) => {
      const start = paginaActual * itemsPerPage;
      const end = start + itemsPerPage;
      const sliceEquipos = equiposConColeccion.slice(start, end);

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

        desc += `${medal}**${eq.nombreEq}** (de @${username}) — 📦 **${eq.totalCards}** cartas ` +
          `*(👕 ${eq.squadCardsCount} plantilla, 🗂️ ${eq.reserveCardsCount} reserva)*\n`;
      }

      const embed = new EmbedBuilder()
        .setColor(client.color || '#00ffcc')
        .setTitle('🏆 Top Coleccionistas - Cartas Totales en el Club')
        .setDescription(desc || '*No hay equipos en esta página.*')
        .setFooter({ text: `Página ${paginaActual + 1} de ${totalPages} • Total equipos: ${equiposConColeccion.length}` })
        .setTimestamp();

      return embed;
    };

    const generarFilaBotones = (paginaActual) => {
      if (totalPages <= 1) return [];

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev_page_coleccionistas')
          .setLabel('⬅️ Anterior')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(paginaActual === 0),
        new ButtonBuilder()
          .setCustomId('next_page_coleccionistas')
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

      if (interaction.customId === 'prev_page_coleccionistas') {
        page--;
      } else if (interaction.customId === 'next_page_coleccionistas') {
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

