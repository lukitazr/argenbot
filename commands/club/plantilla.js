import prisma from '../../models/db.js';
import { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } from 'discord.js';
import sharp from 'sharp';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import formatNumber from '../../utils/formatNumber.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..');

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/lukitaz-r/assets@main/argenbot';
const TEMPLATE_WIDTH = 700;
const TEMPLATE_HEIGHT = 357;
const CARD_WIDTH = 120;
const CARD_HEIGHT = 168;

const imageBufferCache = new Map();

/**
 * Obtiene la URL de la imagen de una carta.
 * Prioriza CDN URL; si es ruta local, intenta convertir a CDN.
 */
function obtenerImagenUrl(dir) {
  if (!dir) return null;

  // Si ya es una URL CDN, usarla directamente
  if (dir.startsWith('http')) return dir;

  // Intentar convertir ruta local a URL CDN
  // assets/cartas/normales/Aztro_b64.js → cartas/normales/Aztro.png
  let cdnPath = dir
    .replace(/\\/g, '/')
    .replace(/^assets\//, '')
    .replace(/_b64\.js$/, '.png');

  return `${CDN_BASE}/${encodeURI(cdnPath)}`;
}

/**
 * Obtiene la URL del placeholder desde CDN
 */
function obtenerPlaceholderUrl() {
  return `${CDN_BASE}/cartas/placeholder.png`;
}

/**
 * Obtiene la URL del fondo desde CDN o desde fondo.json
 */
function obtenerFondoUrl() {
  const fondoJsonPath = join(rootDir, 'assets', 'fondo.json');
  if (existsSync(fondoJsonPath)) {
    try {
      const fondoMap = JSON.parse(readFileSync(fondoJsonPath, 'utf-8'));
      if (fondoMap['background.png']) return fondoMap['background.png'];
    } catch { /* fallback */ }
  }
  return `${CDN_BASE}/fondo/background.png`;
}

// Posiciones absolutas de las 5 cartas (x, y)
const POSICIONES_CARTAS = [
  { x: 228, y: 0 },
  { x: 366, y: 0 },
  { x: 104, y: 93 },
  { x: 288, y: 185 },
  { x: 490, y: 93 }
];

async function generarImagenPlantilla(equipoArray) {
  const placeholderUrl = obtenerPlaceholderUrl();
  const fondoUrl = obtenerFondoUrl();

  const placeholderBuffer = await obtenerBufferImagen(placeholderUrl);
  const fondoBuffer = await obtenerBufferImagen(fondoUrl);

  const composites = [];

  if (fondoBuffer) {
    const fondoResized = await sharp(fondoBuffer)
      .resize(TEMPLATE_WIDTH, TEMPLATE_HEIGHT, { fit: 'fill' })
      .png()
      .toBuffer();

    composites.push({
      input: fondoResized,
      left: 0,
      top: 0
    });
  }

  const cartasComposites = await Promise.all(equipoArray.map(async (slot, i) => {
    const pos = POSICIONES_CARTAS[i];
    const imageUrl = (slot?.nombre && slot?.dir) ? (obtenerImagenUrl(slot.dir) || placeholderUrl) : placeholderUrl;
    const sourceBuffer = (await obtenerBufferImagen(imageUrl)) || placeholderBuffer;

    if (!sourceBuffer) return null;

    const cardBuffer = await sharp(sourceBuffer)
      .resize(CARD_WIDTH, CARD_HEIGHT, { fit: 'fill' })
      .png()
      .toBuffer();

    return {
      input: cardBuffer,
      left: pos.x,
      top: pos.y
    };
  }));

  composites.push(...cartasComposites.filter(Boolean));

  return sharp({
    create: {
      width: TEMPLATE_WIDTH,
      height: TEMPLATE_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite(composites)
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();
}

async function obtenerBufferImagen(url) {
  if (!url) return null;

  if (imageBufferCache.has(url)) {
    return imageBufferCache.get(url);
  }

  const pending = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) return null;

      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch {
      return null;
    }
  })();

  imageBufferCache.set(url, pending);
  return pending;
}

export default {
  name: 'plantilla',
  aliases: ['equipo', 'squad', 'team'],
  desc: 'Ver tu plantilla y cambiar jugadores en las posiciones',
  run: async (client, message) => {
    let equipo = await prisma.equipo.findUnique({
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

    // Mapear plantilla actual a array de 5 slots
    const equipoArray = Array(5).fill(null);
    equipo.jugadores.forEach(ej => {
      if (ej.posicion >= 1 && ej.posicion <= 5) {
        equipoArray[ej.posicion - 1] = ej.jugador;
      }
    });

    // Generar imagen de la plantilla
    const imageBuffer = await generarImagenPlantilla(equipoArray);
    const attachment = new AttachmentBuilder(imageBuffer, { name: 'plantilla.png' });

    // Crear botones para cada posición
    const row = new ActionRowBuilder();
    for (let i = 0; i < 5; i++) {
        const slot = equipoArray[i];
        const label = (slot && slot.nombre) ? slot.nombre : `Pos ${i + 1}`;
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`pos_${i + 1}`)
            .setLabel(label)
            .setStyle(ButtonStyle.Primary)
        );
    }

    const embed = new EmbedBuilder()
      .setColor(client.color)
      .setTitle(`⚽ Plantilla de ${equipo.nombreEq}`)
      .setDescription('Presioná un botón de posición para cambiar el jugador en esa posición.')
      .setFooter({ text: `Club de ${message.author.username}` })
      .setTimestamp();

    const msg = await message.reply({
      embeds: [embed],
      files: [attachment],
      components: [row]
    });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 120000
    });

    collector.on('collect', async (interaction) => {
      if (interaction.customId.startsWith('pos_')) {
        const posicion = parseInt(interaction.customId.split('_')[1]) - 1;

        // Recargar datos frescos del equipo
        equipo = await prisma.equipo.findUnique({
          where: { userID: message.author.id },
          include: {
            jugadores: {
              include: {
                jugador: true
              }
            }
          }
        });

        // Obtener jugadores en reserva
        const jugadoresReserva = equipo.jugadores.filter(ej => ej.posicion === 0 && !ej.bloqueadoNbc);

        if (jugadoresReserva.length === 0) {
          return interaction.reply({
            content: '❌ **No tenés jugadores en la reserva!** Abrí packs con `ar!canjear <pack>` para obtener jugadores.',
            flags: 64
          });
        }

        let page = 0;
        const totalPages = Math.ceil(jugadoresReserva.length / 25);

        const generarComponentes = (paginaActual) => {
          const start = paginaActual * 25;
          const sliceJugadores = jugadoresReserva.slice(start, start + 25);

          const opciones = sliceJugadores.map(ej => ({
            label: `${ej.jugador.nombre} (${ej.jugador.media})`,
            description: `${ej.jugador.tipo} | Valor: $GDS ${formatNumber(ej.jugador.valor)}`,
            value: ej.id.toString()
          }));

          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`select_pos_${posicion}`)
            .setPlaceholder(`Elegí un jugador (Pág. ${paginaActual + 1}/${totalPages})`)
            .addOptions(opciones);

          const rows = [new ActionRowBuilder().addComponents(selectMenu)];

          if (totalPages > 1) {
            const buttonRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`prev_pos_${posicion}`)
                .setLabel('⬅️ Anterior')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(paginaActual === 0),
              new ButtonBuilder()
                .setCustomId(`next_pos_${posicion}`)
                .setLabel('Siguiente ➡️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(paginaActual === totalPages - 1)
            );
            rows.push(buttonRow);
          }

          return rows;
        };

        await interaction.reply({
          content: `👥 **Seleccioná un jugador para la posición ${posicion + 1}:**`,
          components: generarComponentes(page),
          flags: 64
        });

        // Collector para el select menu y botones de paginación
        const selectCollector = interaction.channel.createMessageComponentCollector({
          filter: (i) => i.user.id === message.author.id && 
            (i.customId === `select_pos_${posicion}` || i.customId === `prev_pos_${posicion}` || i.customId === `next_pos_${posicion}`),
          time: 60000
        });

        selectCollector.on('collect', async (i) => {
          if (i.customId === `prev_pos_${posicion}`) {
            page--;
            await i.update({
              components: generarComponentes(page)
            });
          } else if (i.customId === `next_pos_${posicion}`) {
            page++;
            await i.update({
              components: generarComponentes(page)
            });
          } else if (i.customId === `select_pos_${posicion}`) {
            selectCollector.stop('selected');
            
            const selectInteraction = i;
            await selectInteraction.deferUpdate();

            const eqJugId = parseInt(selectInteraction.values[0]);
            const ejSeleccionado = equipo.jugadores.find(ej => ej.id === eqJugId);

            if (!ejSeleccionado) {
              return selectInteraction.editReply({
                content: '❌ **Jugador no encontrado!**',
                components: []
              });
            }

            const jugadorSeleccionado = ejSeleccionado.jugador;

            // Recalcular plantilla actual array
            const currentArray = Array(5).fill(null);
            equipo.jugadores.forEach(ej => {
              if (ej.posicion >= 1 && ej.posicion <= 5) {
                currentArray[ej.posicion - 1] = ej.jugador;
              }
            });

            // Verificar si ya existe un jugador con el mismo nombre en OTRA posición de la plantilla
            if (currentArray.some((slot, index) => index !== posicion && slot && slot.nombre === jugadorSeleccionado.nombre)) {
              return selectInteraction.editReply({
                content: `❌ **No podés tener a ${jugadorSeleccionado.nombre} más de una vez en tu plantilla**`,
                components: []
              });
            }

            // Si la posición actual tiene un jugador, devolverlo a la reserva
            const actualEnPosicion = equipo.jugadores.find(ej => ej.posicion === posicion + 1);

            const queries = [];
            if (actualEnPosicion) {
              queries.push(prisma.equipoJugador.update({
                where: { id: actualEnPosicion.id },
                data: { posicion: 0 }
              }));
            }

            // Poner el nuevo en la posición
            queries.push(prisma.equipoJugador.update({
              where: { id: eqJugId },
              data: { posicion: posicion + 1 }
            }));

            await prisma.$transaction(queries);

            // Cargar de nuevo todo actualizado
            const equipoActualizado = await prisma.equipo.findUnique({
              where: { userID: message.author.id },
              include: {
                jugadores: {
                  include: {
                    jugador: true
                  }
                }
              }
            });

            const nuevoArray = Array(5).fill(null);
            equipoActualizado.jugadores.forEach(ej => {
              if (ej.posicion >= 1 && ej.posicion <= 5) {
                nuevoArray[ej.posicion - 1] = ej.jugador;
              }
            });

            // Regenerar imagen
            const newImageBuffer = await generarImagenPlantilla(nuevoArray);
            const newAttachment = new AttachmentBuilder(newImageBuffer, { name: 'plantilla.png' });

            const newEmbed = new EmbedBuilder()
              .setColor(client.color)
              .setTitle(`⚽ Plantilla de ${equipoActualizado.nombreEq}`)
              .setDescription(`✅ **${jugadorSeleccionado.nombre}** fue colocado en la posición ${posicion + 1}!`)
              .setFooter({ text: `Club de ${message.author.username}` })
              .setTimestamp();

            // Regenerar fila de botones de posiciones
            const newRow = new ActionRowBuilder();
            for (let i = 0; i < 5; i++) {
              const slot = nuevoArray[i];
              const label = (slot && slot.nombre) ? slot.nombre : `Pos ${i + 1}`;
              newRow.addComponents(
                new ButtonBuilder()
                  .setCustomId(`pos_${i + 1}`)
                  .setLabel(label)
                  .setStyle(ButtonStyle.Primary)
              );
            }

            await selectInteraction.editReply({
              content: `✅ **${jugadorSeleccionado.nombre}** colocado en posición ${posicion + 1}!`,
              components: []
            });

            await msg.edit({
              embeds: [newEmbed],
              files: [newAttachment],
              components: [newRow]
            });
          }
        });

        selectCollector.on('end', async (collected, reason) => {
          if (reason !== 'selected') {
            try {
              await interaction.editReply({
                content: '⏰ **Tiempo agotado!** No seleccionaste ningún jugador.',
                components: []
              });
            } catch (e) { /* ya expiró */ }
          }
        });
      }
    });

    collector.on('end', async () => {
      try {
        await msg.edit({ components: [] });
      } catch (e) { /* mensaje eliminado */ }
    });
  }
}
