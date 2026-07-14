import prisma from '../../models/db.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import formatNumber from '../../utils/formatNumber.js';

export default {
  name: 'mercado',
  aliases: ['market'],
  desc: 'Mercado de transferencias de cartas (ver, publicar, comprar)',
  run: async (client, message, args) => {
    const accion = args[0] ? args[0].toLowerCase() : null;

    if (!accion || !['ver', 'publicar', 'vender', 'comprar'].includes(accion)) {
      return message.reply(`❌ **Uso incorrecto!** Opciones válidas:
\`ar!mercado ver\` - Ver jugadores en venta
\`ar!mercado publicar <nombre> <precio>\` - Vender un jugador (alias: \`vender\`)
\`ar!mercado comprar <nombre>\` - Comprar el jugador más barato con ese nombre`);
    }

    if (accion === 'ver') {
      const enVenta = await prisma.mercado.findMany({
        orderBy: { precio: 'asc' },
        include: { jugador: true }
      });

      if (enVenta.length === 0) {
        return message.reply('📉 **El mercado está vacío en este momento.**');
      }

      const elementosPorPagina = 10;
      let paginaActual = 0;
      const paginasTotal = Math.ceil(enVenta.length / elementosPorPagina);

      const crearEmbed = async (pagina) => {
        const inicio = pagina * elementosPorPagina;
        const fin = inicio + elementosPorPagina;
        const lista = enVenta.slice(inicio, fin);

        const embed = new EmbedBuilder()
          .setColor(client.color)
          .setTitle('🏪 Mercado de Jugadores')
          .setDescription('Jugadores actualmente a la venta:')
          .setFooter({ text: `Página ${pagina + 1} de ${paginasTotal} | Total: ${enVenta.length} cartas` })
          .setTimestamp();

        let desc = '';
        for (let index = 0; index < lista.length; index++) {
          const item = lista[index];
          const j = item.jugador;

          // Resolver el tag de usuario del vendedor de forma asíncrona
          let vendTag = 'Desconocido';
          try {
            const user = client.users.cache.get(item.vendedorID) || await client.users.fetch(item.vendedorID);
            if (user) vendTag = user.username;
          } catch (e) { }

          desc += `**${inicio + index + 1}. ${j.nombre}** (${j.tipo}) | ${j.media}\n`;
          desc += `💰 Precio: $GDS ${formatNumber(item.precio)} | 👤 Vendedor: ${vendTag}\n\n`;
        }
        embed.setDescription(desc);

        return embed;
      };

      const crearBotones = (pagina) => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('mercado_prev')
            .setLabel('◀️ Anterior')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(pagina === 0),
          new ButtonBuilder()
            .setCustomId('mercado_next')
            .setLabel('Siguiente ▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(pagina === paginasTotal - 1)
        );
      };

      const msg = await message.reply({
        embeds: [await crearEmbed(paginaActual)],
        components: paginasTotal > 1 ? [crearBotones(paginaActual)] : []
      });

      if (paginasTotal <= 1) return;

      const collector = msg.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id,
        time: 60000
      });

      collector.on('collect', async (i) => {
        if (i.customId === 'mercado_prev') {
          paginaActual = Math.max(0, paginaActual - 1);
        } else if (i.customId === 'mercado_next') {
          paginaActual = Math.min(paginasTotal - 1, paginaActual + 1);
        }
        await i.update({
          embeds: [await crearEmbed(paginaActual)],
          components: [crearBotones(paginaActual)]
        });
      });

      collector.on('end', async () => {
        try { await msg.edit({ components: [] }); } catch (e) { }
      });

    } else if (accion === 'publicar' || accion === 'vender') {
      const precioStr = args.pop();
      const precio = parseInt(precioStr);
      const nombreInput = args.slice(1).join(' ').trim().toLowerCase();

      if (!nombreInput || isNaN(precio) || precio <= 0) {
        return message.reply('❌ **Uso incorrecto!** Debe ser: `ar!mercado publicar <nombre_del_jugador> <precio>`\nEjemplo: `ar!mercado publicar tako 5000`');
      }

      const equipo = await prisma.equipo.findUnique({
        where: { userID: message.author.id },
        include: {
          jugadores: {
            where: { posicion: 0, bloqueadoNbc: false },
            include: { jugador: true }
          }
        }
      });

      if (!equipo) return message.reply('❌ **No tenés un club registrado!**');
      if (!equipo.jugadores || equipo.jugadores.length === 0) {
        return message.reply('❌ **No tenés jugadores en tu reserva para vender!**');
      }

      // Buscar TODOS los jugadores que coincidan con el nombre
      const matches = equipo.jugadores.filter(ej => ej.jugador.nombre.toLowerCase() === nombreInput);

      if (matches.length === 0) {
        return message.reply(`❌ **No tenés a "${nombreInput}" en tu reserva!**`);
      }

      const procesarVenta = async (ejId, jugadorData, targetMsg = message) => {
        // Verificar si el jugador sigue en la reserva
        const eqJug = await prisma.equipoJugador.findUnique({
          where: { id: ejId }
        });

        if (!eqJug || eqJug.posicion !== 0) {
          return targetMsg.reply('❌ **Hubo un error al procesar la venta. El jugador ya no está en tu reserva.**');
        }

        // Remover del equipo y crear en mercado en transacción
        await prisma.$transaction([
          prisma.equipoJugador.delete({ where: { id: ejId } }),
          prisma.mercado.create({
            data: {
              vendedorID: message.author.id,
              jugadorId: jugadorData.id,
              precio: precio
            }
          })
        ]);

        const successMsg = `✅ **Has publicado a ${jugadorData.nombre} (${jugadorData.tipo}) por $GDS ${formatNumber(precio)} en el mercado!**`;
        if (targetMsg === message) {
          return message.reply(successMsg);
        } else {
          return targetMsg.editReply({ content: successMsg, components: [], embeds: [] });
        }
      };

      if (matches.length === 1) {
        return procesarVenta(matches[0].id, matches[0].jugador);
      } else {
        // Múltiples versiones encontradas
        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('vender_select')
            .setPlaceholder('Seleccioná qué versión querés vender')
            .addOptions(matches.map(m => ({
              label: `${m.jugador.nombre} (${m.jugador.media})`,
              description: `${m.jugador.tipo} | Valor: $GDS ${formatNumber(m.jugador.valor)}`,
              value: m.id.toString()
            })))
        );

        const embed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('🤔 Múltiples versiones encontradas')
          .setDescription(`Tenés ${matches.length} versiones de **${matches[0].jugador.nombre}**. Seleccioná cuál querés poner a la venta por **$GDS ${formatNumber(precio)}**:`)
          .setFooter({ text: 'Tenés 30 segundos para elegir. APURATE FLACO.' });

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
          await procesarVenta(seleccionadaId, match.jugador, i);
        });

        collector.on('end', async (collected) => {
          if (collected.size === 0) {
            try { await msgMenu.edit({ content: '❌ **Tiempo agotado.** Venta cancelada.', components: [], embeds: [] }); } catch (e) { }
          }
        });
      }

    } else if (accion === 'comprar') {
      const nombreInput = args.slice(1).join(' ').trim().toLowerCase();

      if (!nombreInput) {
        return message.reply('❌ **Debes especificar el nombre del jugador que querés comprar!**\nUso: `ar!mercado comprar <nombre_del_jugador>`');
      }

      const comprador = await prisma.equipo.findUnique({
        where: { userID: message.author.id },
        include: {
          jugadores: {
            include: { jugador: true }
          }
        }
      });
      if (!comprador) return message.reply('❌ **No tenés un club registrado!**');

      // Buscar todos los jugadores con ese nombre en el mercado
      const todasLasPublicaciones = await prisma.mercado.findMany({
        where: {
          jugador: {
            nombre: {
              equals: nombreInput
            }
          }
        },
        orderBy: { precio: 'asc' },
        include: { jugador: true }
      });

      if (todasLasPublicaciones.length === 0) {
        return message.reply(`❌ **No hay ningún jugador llamado "${nombreInput}" en venta!**`);
      }

      const procesarCompra = async (publicacion, targetMsg = message) => {
        if (publicacion.vendedorID === message.author.id) {
          const errMsg = '❌ **No podés comprar tu propia publicación!** Para retirarla, este comando aún no lo soporta directamente, pedile a un admin o vende más barato.';
          return targetMsg === message ? message.reply(errMsg) : targetMsg.editReply({ content: errMsg, components: [], embeds: [] });
        }

        const compradorActualizado = await prisma.equipo.findUnique({
          where: { userID: message.author.id },
          include: {
            jugadores: true
          }
        });

        if (compradorActualizado.dinero < publicacion.precio) {
          const errMsg = `❌ **No tenés suficientes Godeanos!** Cuesta $GDS ${formatNumber(publicacion.precio)} y vos tenés $GDS ${formatNumber(compradorActualizado.dinero)}.`;
          return targetMsg === message ? message.reply(errMsg) : targetMsg.editReply({ content: errMsg, components: [], embeds: [] });
        }

        // Verificar si ya tiene esa carta exacta
        const tieneCarta = compradorActualizado.jugadores.some(ej => ej.jugadorId === publicacion.jugadorId);
        if (tieneCarta) {
          const errMsg = `❌ **Ya tenés a ${publicacion.jugador.nombre} (${publicacion.jugador.tipo}) en tu reserva!**`;
          return targetMsg === message ? message.reply(errMsg) : targetMsg.editReply({ content: errMsg, components: [], embeds: [] });
        }

        // Transferir en transacción
        const queries = [
          // 1. Quitar dinero al comprador
          prisma.equipo.update({
            where: { id: compradorActualizado.id },
            data: { dinero: { decrement: publicacion.precio } }
          }),
          // 2. Dar el jugador al comprador (reserva)
          prisma.equipoJugador.create({
            data: {
              equipoId: compradorActualizado.id,
              jugadorId: publicacion.jugadorId,
              posicion: 0
            }
          }),
          // 3. Eliminar la publicación del mercado
          prisma.mercado.delete({
            where: { id: publicacion.id }
          })
        ];

        // 4. Agregar dinero al vendedor si tiene club registrado
        const vendedor = await prisma.equipo.findUnique({
          where: { userID: publicacion.vendedorID }
        });
        if (vendedor) {
          queries.push(
            prisma.equipo.update({
              where: { id: vendedor.id },
              data: { dinero: { increment: publicacion.precio } }
            })
          );
        }

        await prisma.$transaction(queries);

        // Obtener el nuevo dinero del comprador
        const compradorFinal = await prisma.equipo.findUnique({
          where: { id: compradorActualizado.id }
        });

        // Obtener tag de vendedor para mostrar
        let vendTag = 'Desconocido';
        try {
          const user = client.users.cache.get(publicacion.vendedorID) || await client.users.fetch(publicacion.vendedorID);
          if (user) vendTag = user.username;
        } catch (e) { }

        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('🤝 ¡Traspaso Completado!')
          .setDescription(`Has comprado a **${publicacion.jugador.nombre}** por $GDS ${formatNumber(publicacion.precio)}.`)
          .addFields(
            { name: 'Vendedor', value: vendTag, inline: true },
            { name: 'Tipo', value: publicacion.jugador.tipo, inline: true },
            { name: 'Media', value: `${publicacion.jugador.media}`, inline: true }
          )
          .setFooter({ text: `Club: ${compradorFinal.nombreEq} | Nuevo saldo: $GDS ${formatNumber(compradorFinal.dinero)}` })
          .setTimestamp();

        if (targetMsg === message) {
          return message.reply({ embeds: [embed] });
        } else {
          return targetMsg.editReply({ embeds: [embed], components: [], content: null });
        }
      };

      if (todasLasPublicaciones.length === 1) {
        return procesarCompra(todasLasPublicaciones[0]);
      } else {
        // Múltiples opciones encontradas
        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('comprar_select')
            .setPlaceholder('Elegí cuál querés comprar')
            .addOptions(todasLasPublicaciones.slice(0, 25).map(m => ({
              label: `${m.jugador.nombre} (${m.jugador.media}) - $GDS ${formatNumber(m.precio)}`,
              description: `Tipo: ${m.jugador.tipo}`,
              value: m.id.toString()
            })))
        );

        const embed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle('🛒 Múltiples ofertas encontradas')
          .setDescription(`Hay ${todasLasPublicaciones.length} publicaciones de **${todasLasPublicaciones[0].jugador.nombre}**. Seleccioná cuál querés comprar:`)
          .setFooter({ text: 'Tenés 30 segundos para elegir, DALE FLACO APURATE.' });

        const msgMenu = await message.reply({ embeds: [embed], components: [row] });

        const collector = msgMenu.createMessageComponentCollector({
          filter: (i) => i.user.id === message.author.id,
          time: 30000,
          max: 1
        });

        collector.on('collect', async (i) => {
          await i.deferUpdate();
          const publicacionId = parseInt(i.values[0]);
          const seleccionada = todasLasPublicaciones.find(m => m.id === publicacionId);
          if (!seleccionada) {
            return i.editReply({ content: '❌ **Error: Publicación no encontrada.** Puede que ya haya sido vendida.', components: [], embeds: [] });
          }
          await procesarCompra(seleccionada, i);
        });

        collector.on('end', async (collected) => {
          if (collected.size === 0) {
            try { await msgMenu.edit({ content: '❌ **Tiempo agotado.** Compra cancelada.', components: [], embeds: [] }); } catch (e) { }
          }
        });
      }
    }
  }
}


