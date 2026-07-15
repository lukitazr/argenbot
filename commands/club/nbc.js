import prisma from '../../models/db.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } from 'discord.js';
import formatNumber from '../../utils/formatNumber.js';
import validarnbc from '../../utils/validarNBC.js';
import sharp from 'sharp';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..');

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/lukitaz-r/assets@main/argenbot';
const TEMPLATE_WIDTH = 700;
const TEMPLATE_HEIGHT = 357;
const CARD_WIDTH = 120;
const CARD_HEIGHT = 168;

const imageBufferCache = new Map();

function obtenerImagenUrl(dir) {
  if (!dir) return null;
  if (dir.startsWith('http')) return dir;
  let cdnPath = dir
    .replace(/\\/g, '/')
    .replace(/^assets\//, '')
    .replace(/_b64\.js$/, '.png');
  return `${CDN_BASE}/${encodeURI(cdnPath)}`;
}

function obtenerPlaceholderUrl() {
  return `${CDN_BASE}/cartas/placeholder.png`;
}

function obtenerFondoUrl() {
  const fondoJsonPath = join(rootDir, 'assets', 'fondo.json');
  if (existsSync(fondoJsonPath)) {
    try {
      const fondoMap = JSON.parse(readFileSync(fondoJsonPath, 'utf-8'));
      if (fondoMap['background.png']) return fondoMap['background.png'];
    } catch { }
  }
  return `${CDN_BASE}/fondo/background.png`;
}

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
  name: 'nbc',
  aliases: ['desafio', 'desafios', 'challenge', 'nbc'],
  desc: 'NIGGER BUILDING CHALLENGES. Uso: ar!nbc [nombre_nbc]',
  run: async (client, message, args) => {
    const equipo = await prisma.equipo.findUnique({
      where: { userID: message.author.id },
      include: {
        nbcCompletados: true,
        nbcDesafiosCompletados: true,
        nbcSlots: { include: { desafio: true, equipoJugador: { include: { jugador: true } } } },
        jugadores: { where: { posicion: 0, bloqueadoNbc: false }, include: { jugador: true } }
      }
    });

    if (!equipo) {
      return message.reply('❌ **No tenés un club registrado!** Usá `ar!registro <nombre>` para crear uno.');
    }

    const inputNombre = args.join(' ').trim();

    // ─── Sin argumentos: listar nbcs ───
    if (!inputNombre) {
      return listarnbcs(client, message, equipo);
    }

    // ─── Con argumento: mostrar desafíos del nbc ───
    return mostrarnbc(client, message, equipo, inputNombre);
  }
};

// Helper para normalizar acentos y pasar a minúsculas
function normalizarTexto(texto) {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// ─── LISTAR TODOS LOS nbcs ───
async function listarnbcs(client, message, equipo) {
  const nbcs = await prisma.nbc.findMany({
    include: {
      premio: true,
      desafios: {
        include: {
          slots: { where: { equipoId: equipo.id } }
        }
      }
    }
  });

  if (nbcs.length === 0) {
    return message.reply('❌ **No hay desafíos disponibles en este momento.**');
  }

  const completadosIds = new Set(equipo.nbcCompletados.map(c => c.nbcId));
  const desafiosCompletadosIds = new Set(equipo.nbcDesafiosCompletados.map(c => c.desafioId));

  let desc = '';
  for (const nbc of nbcs) {
    const completado = completadosIds.has(nbc.id);
    const totalDesafios = nbc.desafios.length;
    const desafiosCompletados = nbc.desafios.filter(d => desafiosCompletadosIds.has(d.id)).length;

    let estado;
    if (completado) {
      estado = '✅ Completado';
    } else if (desafiosCompletados > 0) {
      estado = `🔄 En progreso (${desafiosCompletados}/${totalDesafios} desafíos)`;
    } else {
      estado = '⬜ Sin empezar';
    }

    desc += `**${nbc.nombre}** — ${estado}\n`;
    desc += `├ 🏆 Premio: **${nbc.premio.nombre}** (⭐ ${nbc.premio.media})\n`;
    desc += `└ 📋 ${totalDesafios} desafío(s)\n\n`;
  }

  const embed = new EmbedBuilder()
    .setColor(client.color || '#FFD700')
    .setTitle('🏆 Nigger Building Challenges')
    .setDescription(desc)
    .setFooter({ text: `Usá el menú de abajo o ar!nbc <nombre> para ver detalles | Club: ${equipo.nombreEq}` })
    .setTimestamp();

  // Construir menú de selección para todos los NBCs
  const selectOptions = nbcs.slice(0, 25).map(nbc => ({
    label: nbc.nombre.substring(0, 100),
    description: `Premio: ${nbc.premio.nombre} (Media ${nbc.premio.media})`,
    value: `nbc_main_select_${nbc.id}`
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('nbc_main_menu')
    .setPlaceholder('Seleccioná un NBC para ver detalles...')
    .addOptions(selectOptions);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  const msg = await message.reply({ embeds: [embed], components: [row] });

  const collector = msg.createMessageComponentCollector({
    filter: (i) => i.user.id === message.author.id && i.customId === 'nbc_main_menu',
    time: 60000
  });

  collector.on('collect', async (interaction) => {
    const selectedValue = interaction.values[0];
    const nbcId = parseInt(selectedValue.replace('nbc_main_select_', ''));
    
    // Obtener los detalles completos del NBC seleccionado
    const selectedNbc = await prisma.nbc.findUnique({
      where: { id: nbcId },
      include: {
        premio: true,
        desafios: {
          include: {
            premioPack: true,
            completados: { where: { equipoId: equipo.id } },
            slots: {
              where: { equipoId: equipo.id },
              include: { equipoJugador: { include: { jugador: true } } }
            }
          }
        },
        completados: { where: { equipoId: equipo.id } }
      }
    });

    if (selectedNbc) {
      collector.stop('selected');
      await interaction.deferUpdate();
      try {
        await msg.delete();
      } catch (e) {}
      await mostrarDesafiosnbc(client, message, equipo, selectedNbc);
    }
  });

  collector.on('end', async (collected, reason) => {
    if (reason !== 'selected') {
      try {
        await msg.edit({ components: [] });
      } catch (e) {}
    }
  });
}

// ─── MOSTRAR DESAFÍOS DE UN nbc ───
async function mostrarnbc(client, message, equipo, nombre) {
  // Traer todos los NBCs con sus relaciones
  const nbcs = await prisma.nbc.findMany({
    include: {
      premio: true,
      desafios: {
        include: {
          premioPack: true,
          completados: { where: { equipoId: equipo.id } },
          slots: {
            where: { equipoId: equipo.id },
            include: { equipoJugador: { include: { jugador: true } } }
          }
        }
      },
      completados: { where: { equipoId: equipo.id } }
    }
  });

  // Filtrar insensible a acentos/tildes y mayúsculas/minúsculas en Javascript
  const queryNormalizada = normalizarTexto(nombre);
  const matches = nbcs.filter(nbc => {
    const nombreNormalizado = normalizarTexto(nbc.nombre);
    return nombreNormalizado.includes(queryNormalizada);
  });

  if (matches.length === 0) {
    return message.reply(`❌ **No se encontró ningún NBC que coincida con "${nombre}".**\nUsá \`ar!nbc\` para ver la lista.`);
  }

  if (matches.length === 1) {
    return mostrarDesafiosnbc(client, message, equipo, matches[0]);
  }

  // Si hay más de un match (ambigüedad), mostramos select menu intermedio
  const selectOptions = matches.slice(0, 25).map(nbc => ({
    label: nbc.nombre.substring(0, 100),
    description: `Premio: ${nbc.premio.nombre} (Media ${nbc.premio.media})`,
    value: `nbc_select_${nbc.id}`
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('nbc_ambiguity_menu')
    .setPlaceholder('Seleccioná el NBC que buscabas...')
    .addOptions(selectOptions);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  const msg = await message.reply({
    content: `🔍 **Se encontraron ${matches.length} desafíos que coinciden con "${nombre}".** Seleccioná uno:`,
    components: [row]
  });

  const collector = msg.createMessageComponentCollector({
    filter: (i) => i.user.id === message.author.id && i.customId === 'nbc_ambiguity_menu',
    time: 60000
  });

  collector.on('collect', async (interaction) => {
    const selectedValue = interaction.values[0];
    const nbcId = parseInt(selectedValue.replace('nbc_select_', ''));
    const selectedNbc = matches.find(m => m.id === nbcId);

    if (selectedNbc) {
      collector.stop('selected');
      await interaction.deferUpdate();
      try {
        await msg.delete();
      } catch (e) {
        // En caso de que ya se haya borrado
      }
      await mostrarDesafiosnbc(client, message, equipo, selectedNbc);
    }
  });

  collector.on('end', async (collected, reason) => {
    if (reason !== 'selected') {
      try {
        await msg.edit({ content: '❌ **Tiempo de espera agotado.**', components: [] });
      } catch (e) {
        // Ignorar si el mensaje fue borrado
      }
    }
  });
}

async function mostrarDesafiosnbc(client, message, equipo, nbc) {
  const yaCompletado = nbc.completados.length > 0;

  if (yaCompletado) {
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle(`✅ ${nbc.nombre} — Completado`)
      .setDescription(`Ya completaste este NBC y obtuviste a **${nbc.premio.nombre}** (⭐ ${nbc.premio.media}).`)
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  let desc = `${nbc.desc}\n\n🏆 **Premio final:** ${nbc.premio.nombre} (⭐ ${nbc.premio.media})\n\n`;

  nbc.desafios.forEach((desafio, i) => {
    const yaEnviado = desafio.completados && desafio.completados.length > 0;
    const slotsDelUsuario = desafio.slots;
    const totalSlots = desafio.cantidadPlantillas * 5;
    const slotsLlenos = slotsDelUsuario.length;

    let estado;
    if (yaEnviado) {
      estado = '✅ Completado';
    } else if (slotsLlenos === 0) {
      estado = '⬜ Sin empezar';
    } else if (slotsLlenos < totalSlots) {
      estado = `🔄 ${slotsLlenos}/${totalSlots} slots`;
    } else {
      estado = `📋 ${slotsLlenos}/${totalSlots} slots (listo para enviar)`;
    }

    const premiosArr = [];
    if (desafio.premioGodeanos > 0) {
      premiosArr.push(`💰 $GDS ${formatNumber(desafio.premioGodeanos)}`);
    }
    if (desafio.premioPack) {
      premiosArr.push(`📦 ${desafio.premioPack.nombre}`);
    }

    desc += `**${i + 1}. ${desafio.nombre}** — ${estado}\n`;
    desc += `└ ${desafio.desc}\n`;
    if (slotsLlenos > 0 && !yaEnviado) {
      const nombresCartas = slotsDelUsuario.map(s => s.equipoJugador.jugador.nombre).join(', ');
      desc += `  └ *Cartas colocadas:* ${nombresCartas}\n`;
    }
    if (premiosArr.length > 0) {
      desc += `  🎁 **Premios:** ${premiosArr.join(' + ')}\n`;
    }
    desc += '\n';
  });

  const embed = new EmbedBuilder()
    .setColor(client.color || '#FFD700')
    .setTitle(`🏆 ${nbc.nombre}`)
    .setDescription(desc)
    .setFooter({ text: `Seleccioná un desafío para trabajar en él | Club: ${equipo.nombreEq}` })
    .setTimestamp();

  const rows = [];
  const desafiosChunks = [];
  for (let i = 0; i < nbc.desafios.length; i += 5) {
    desafiosChunks.push(nbc.desafios.slice(i, i + 5));
  }

  for (const chunk of desafiosChunks) {
    const row = new ActionRowBuilder();
    for (const desafio of chunk) {
      const yaEnviado = desafio.completados && desafio.completados.length > 0;
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`nbc_desafio_${desafio.id}`)
          .setLabel(desafio.nombre.substring(0, 80))
          .setStyle(yaEnviado ? ButtonStyle.Secondary : ButtonStyle.Primary)
      );
    }
    rows.push(row);
  }

  const msg = await message.reply({ embeds: [embed], components: rows });

  const collector = msg.createMessageComponentCollector({
    filter: (i) => i.user.id === message.author.id,
    time: 120000
  });

  collector.on('collect', async (interaction) => {
    if (interaction.customId.startsWith('nbc_desafio_')) {
      collector.stop('selected');
      const desafioId = parseInt(interaction.customId.replace('nbc_desafio_', ''));
      await interaction.deferUpdate();
      await manejarDesafio(client, message, msg, equipo, nbc, desafioId);
    }
  });

  collector.on('end', async (collected, reason) => {
    if (reason !== 'selected') {
      try { await msg.edit({ components: [] }); } catch (e) { }
    }
  });
}

// ─── FLUJO DE DESAFÍO INDIVIDUAL ───
async function manejarDesafio(client, message, msg, equipo, nbc, desafioId) {
  const desafio = await prisma.nbcDesafio.findUnique({
    where: { id: desafioId },
    include: {
      premioPack: true,
      completados: { where: { equipoId: equipo.id } },
      slots: {
        where: { equipoId: equipo.id },
        include: { equipoJugador: { include: { jugador: true } } }
      }
    }
  });

  if (!desafio) return;

  if (desafio.completados && desafio.completados.length > 0) {
    return message.reply({ content: '❌ **Ya completaste este desafío!**' });
  }

  const requisitos = JSON.parse(desafio.requisitos || '{}');
  let plantillaActual = 0;

  async function renderDesafio() {
    const slotsActuales = await prisma.nbcSlot.findMany({
      where: { desafioId: desafio.id, equipoId: equipo.id },
      include: { equipoJugador: { include: { jugador: true } } }
    });

    const plantillas = [];
    for (let p = 0; p < desafio.cantidadPlantillas; p++) {
      const slotsPlantilla = Array(5).fill(null);
      slotsActuales
        .filter(s => s.plantillaIndex === p)
        .forEach(s => {
          if (s.slotIndex >= 0 && s.slotIndex < 5) {
            slotsPlantilla[s.slotIndex] = s;
          }
        });
      plantillas.push(slotsPlantilla);
    }

    const plantillaSlots = plantillas[plantillaActual];
    const jugadoresEnPlantilla = plantillaSlots.map(s => s ? s.equipoJugador.jugador : null);

    const validacion = validarnbc(jugadoresEnPlantilla, requisitos);

    let desc = `**${desafio.nombre}**\n${desafio.desc}\n\n`;

    if (desafio.cantidadPlantillas > 1) {
      desc += `📋 **Plantilla ${plantillaActual + 1} de ${desafio.cantidadPlantillas}**\n\n`;
    }

    desc += '**Progreso:**\n';
    desc += validacion.progreso.join('\n');

    const premiosArr = [];
    if (desafio.premioGodeanos > 0) {
      premiosArr.push(`💰 $GDS ${formatNumber(desafio.premioGodeanos)}`);
    }
    if (desafio.premioPack) {
      premiosArr.push(`📦 ${desafio.premioPack.nombre}`);
    }

    if (premiosArr.length > 0) {
      desc += `\n\n🎁 **Premios:** ${premiosArr.join(' + ')}`;
    }

    const embed = new EmbedBuilder()
      .setColor(validacion.valido ? '#00FF00' : client.color || '#FFD700')
      .setTitle(`🔧 ${nbc.nombre} — ${desafio.nombre}`)
      .setDescription(desc)
      .setImage('attachment://plantilla.png')
      .setFooter({ text: `Club: ${equipo.nombreEq}` })
      .setTimestamp();

    const slotsLlenos = plantillaSlots.filter(s => s !== null).length;
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('nbc_colocar')
        .setLabel('Colocar carta')
        .setStyle(ButtonStyle.Success)
        .setDisabled(slotsLlenos >= 5),
      new ButtonBuilder()
        .setCustomId('nbc_quitar')
        .setLabel('Quitar carta')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(slotsLlenos === 0),
      new ButtonBuilder()
        .setCustomId('nbc_enviar')
        .setLabel('Enviar')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!todasPlantillasListas(plantillas, requisitos, desafio.cantidadPlantillas)),
      new ButtonBuilder()
        .setCustomId('nbc_volver')
        .setLabel('Volver')
        .setStyle(ButtonStyle.Secondary)
    );

    const components = [row];

    if (desafio.cantidadPlantillas > 1) {
      const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('nbc_prev_plantilla')
          .setLabel('◀️ Plantilla anterior')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(plantillaActual === 0),
        new ButtonBuilder()
          .setCustomId('nbc_next_plantilla')
          .setLabel('Plantilla siguiente ▶️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(plantillaActual === desafio.cantidadPlantillas - 1)
      );
      components.push(navRow);
    }

    const imageBuffer = await generarImagenPlantilla(jugadoresEnPlantilla);
    const attachment = new AttachmentBuilder(imageBuffer, { name: 'plantilla.png' });

    return { embed, components, attachment };
  }

  const { embed, components, attachment } = await renderDesafio();
  await msg.edit({ embeds: [embed], components, files: [attachment] });

  const collector = msg.createMessageComponentCollector({
    filter: (i) => i.user.id === message.author.id,
    time: 300000
  });

  collector.on('collect', async (interaction) => {
    if (interaction.customId === 'nbc_prev_plantilla') {
      plantillaActual--;
      const { embed, components, attachment } = await renderDesafio();
      await interaction.update({ embeds: [embed], components, files: [attachment] });
      return;
    }

    if (interaction.customId === 'nbc_next_plantilla') {
      plantillaActual++;
      const { embed, components, attachment } = await renderDesafio();
      await interaction.update({ embeds: [embed], components, files: [attachment] });
      return;
    }

    if (interaction.customId === 'nbc_volver') {
      collector.stop('volver');
      await interaction.deferUpdate();

      const sbcFresco = await prisma.nbc.findUnique({
        where: { id: nbc.id },
        include: {
          premio: true,
          desafios: {
            include: {
              slots: {
                where: { equipoId: equipo.id },
                include: { equipoJugador: { include: { jugador: true } } }
              }
            }
          },
          completados: { where: { equipoId: equipo.id } }
        }
      });
      await mostrarDesafiosnbc(client, message, equipo, sbcFresco);
      return;
    }

    if (interaction.customId === 'nbc_colocar') {
      const equipoFresco = await prisma.equipo.findUnique({
        where: { id: equipo.id },
        include: {
          jugadores: {
            where: { posicion: 0, bloqueadoNbc: false },
            include: { jugador: true }
          }
        }
      });

      const disponibles = equipoFresco.jugadores;

      if (disponibles.length === 0) {
        return interaction.reply({
          content: '❌ **No tenés jugadores disponibles en la reserva!**',
          flags: 64
        });
      }

      const slotsActuales = await prisma.nbcSlot.findMany({
        where: { desafioId: desafio.id, equipoId: equipo.id, plantillaIndex: plantillaActual }
      });
      const ocupados = new Set(slotsActuales.map(s => s.slotIndex));
      let slotLibre = -1;
      for (let i = 0; i < 5; i++) {
        if (!ocupados.has(i)) { slotLibre = i; break; }
      }

      if (slotLibre === -1) {
        return interaction.reply({ content: '❌ **Todos los slots de esta plantilla están llenos!**', flags: 64 });
      }

      let page = 0;
      const totalPages = Math.ceil(disponibles.length / 25);

      const generarComponentes = (paginaActual) => {
        const start = paginaActual * 25;
        const sliceJugadores = disponibles.slice(start, start + 25);

        const opciones = sliceJugadores.map(ej => ({
          label: `${ej.jugador.nombre} (⭐ ${ej.jugador.media})`,
          description: `${ej.jugador.tipo} | ${ej.jugador.pais}`,
          value: ej.id.toString()
        }));

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('nbc_select_colocar')
          .setPlaceholder(`Elegí carta (Pág. ${paginaActual + 1}/${totalPages})`)
          .addOptions(opciones);

        const rows = [new ActionRowBuilder().addComponents(selectMenu)];

        if (totalPages > 1) {
          const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('nbc_prev_colocar')
              .setLabel('⬅️ Anterior')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(paginaActual === 0),
            new ButtonBuilder()
              .setCustomId('nbc_next_colocar')
              .setLabel('Siguiente ➡️')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(paginaActual === totalPages - 1)
          );
          rows.push(buttonRow);
        }

        return rows;
      };

      await interaction.reply({
        content: `📋 **Elegí una carta para el slot ${slotLibre + 1}:**`,
        components: generarComponentes(page),
        flags: 64
      });

      const selectCollector = interaction.channel.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id &&
          (i.customId === 'nbc_select_colocar' || i.customId === 'nbc_prev_colocar' || i.customId === 'nbc_next_colocar'),
        time: 60000
      });

      selectCollector.on('collect', async (i) => {
        if (i.customId === 'nbc_prev_colocar') {
          page--;
          await i.update({
            components: generarComponentes(page)
          });
        } else if (i.customId === 'nbc_next_colocar') {
          page++;
          await i.update({
            components: generarComponentes(page)
          });
        } else if (i.customId === 'nbc_select_colocar') {
          selectCollector.stop('selected');
          const selectInteraction = i;
          await selectInteraction.deferUpdate();

          const eqJugId = parseInt(selectInteraction.values[0]);

          const ej = await prisma.equipoJugador.findUnique({
            where: { id: eqJugId },
            include: { jugador: true }
          });

          if (!ej || ej.bloqueadoNbc) {
            await selectInteraction.editReply({ content: '❌ **Jugador no disponible.**', components: [] });
            return;
          }

          const slotsActuales = await prisma.nbcSlot.findMany({
            where: { desafioId: desafio.id, equipoId: equipo.id, plantillaIndex: plantillaActual },
            include: { equipoJugador: { include: { jugador: true } } }
          });

          if (slotsActuales.some(s => s.equipoJugador.jugador.nombre.toLowerCase() === ej.jugador.nombre.toLowerCase())) {
            await selectInteraction.editReply({
              content: `❌ **No podés tener a ${ej.jugador.nombre} más de una vez en la misma plantilla**`,
              components: []
            });
            return;
          }

          const queries = [];
          if (ej.posicion >= 1 && ej.posicion <= 5) {
            queries.push(prisma.equipoJugador.update({
              where: { id: eqJugId },
              data: { posicion: 0, bloqueadoNbc: true }
            }));
          } else {
            queries.push(prisma.equipoJugador.update({
              where: { id: eqJugId },
              data: { bloqueadoNbc: true }
            }));
          }

          queries.push(prisma.nbcSlot.create({
            data: {
              desafioId: desafio.id,
              equipoId: equipo.id,
              equipoJugadorId: eqJugId,
              plantillaIndex: plantillaActual,
              slotIndex: slotLibre
            }
          }));

          await prisma.$transaction(queries);
          await selectInteraction.editReply({
            content: `✅ **${ej.jugador.nombre}** colocado en slot ${slotLibre + 1}!`,
            components: []
          });

          const { embed, components, attachment } = await renderDesafio();
          await msg.edit({ embeds: [embed], components, files: [attachment] });
        }
      });

      selectCollector.on('end', async (collected, reason) => {
        if (reason !== 'selected') {
          try {
            await interaction.editReply({
              content: '⏰ **Tiempo agotado!** No seleccionaste ningún jugador.',
              components: []
            });
          } catch (e) { }
        }
      });

      return;
    }

    if (interaction.customId === 'nbc_quitar') {
      const slotsActuales = await prisma.nbcSlot.findMany({
        where: { desafioId: desafio.id, equipoId: equipo.id, plantillaIndex: plantillaActual },
        include: { equipoJugador: { include: { jugador: true } } }
      });

      if (slotsActuales.length === 0) {
        return interaction.reply({ content: '❌ **No hay cartas colocadas para quitar.**', flags: 64 });
      }

      const opciones = slotsActuales.map(s => ({
        label: `Slot ${s.slotIndex + 1}: ${s.equipoJugador.jugador.nombre}`,
        description: `⭐ ${s.equipoJugador.jugador.media} | ${s.equipoJugador.jugador.tipo}`,
        value: s.id.toString()
      }));

      const selectRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('nbc_select_quitar')
          .setPlaceholder('Elegí qué carta quitar')
          .addOptions(opciones)
      );

      await interaction.reply({ content: '🗑️ **Elegí qué carta quitar del desafío:**', components: [selectRow], flags: 64 });

      const selectCollector = interaction.channel.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id && i.customId === 'nbc_select_quitar',
        time: 30000,
        max: 1
      });

      selectCollector.on('collect', async (selectInteraction) => {
        await selectInteraction.deferUpdate();
        const slotId = parseInt(selectInteraction.values[0]);
        const slot = slotsActuales.find(s => s.id === slotId);

        if (!slot) {
          await selectInteraction.editReply({ content: '❌ **Slot no encontrado.**', components: [] });
          return;
        }

        await prisma.$transaction([
          prisma.equipoJugador.update({
            where: { id: slot.equipoJugadorId },
            data: { bloqueadoNbc: false }
          }),
          prisma.nbcSlot.delete({ where: { id: slotId } })
        ]);

        await selectInteraction.editReply({
          content: `✅ **${slot.equipoJugador.jugador.nombre}** removido del slot ${slot.slotIndex + 1}!`,
          components: []
        });

        const { embed, components, attachment } = await renderDesafio();
        await msg.edit({ embeds: [embed], components, files: [attachment] });
      });

      return;
    }

    if (interaction.customId === 'nbc_enviar') {
      await interaction.deferUpdate();

      const todosSlots = await prisma.nbcSlot.findMany({
        where: { desafioId: desafio.id, equipoId: equipo.id },
        include: { equipoJugador: { include: { jugador: true } } }
      });

      for (let p = 0; p < desafio.cantidadPlantillas; p++) {
        const slotsPlantilla = Array(5).fill(null);
        todosSlots
          .filter(s => s.plantillaIndex === p)
          .forEach(s => { slotsPlantilla[s.slotIndex] = s.equipoJugador.jugador; });

        const validacion = validarnbc(slotsPlantilla, JSON.parse(desafio.requisitos || '{}'));
        if (!validacion.valido) {
          const embedError = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ No se puede enviar')
            .setDescription(`**Plantilla ${p + 1}** no cumple los requisitos:\n${validacion.errores.join('\n')}`)
            .setTimestamp();
          await msg.edit({ embeds: [embedError], components: [] });

          setTimeout(async () => {
            const { embed, components, attachment } = await renderDesafio();
            await msg.edit({ embeds: [embed], components, files: [attachment] });
          }, 3000);
          return;
        }
      }

      const eqJugIds = todosSlots.map(s => s.equipoJugadorId);
      const slotIds = todosSlots.map(s => s.id);

      const queries = [
        prisma.nbcSlot.deleteMany({ where: { id: { in: slotIds } } }),
        prisma.equipoJugador.deleteMany({ where: { id: { in: eqJugIds } } }),
        prisma.nbcDesafioCompletado.create({
          data: { desafioId: desafio.id, equipoId: equipo.id }
        })
      ];

      if (desafio.premioGodeanos > 0) {
        queries.push(prisma.equipo.update({
          where: { id: equipo.id },
          data: { dinero: { increment: desafio.premioGodeanos } }
        }));
      }

      // Sistema de premioPack para agregar al depósito del club
      if (desafio.premioPackId) {
        queries.push(prisma.equipoPack.create({
          data: { equipoId: equipo.id, packId: desafio.premioPackId }
        }));
      }

      await prisma.$transaction(queries);
      collector.stop('enviado');

      const nbcCompleto = await verificarnbcCompleto(nbc.id, equipo.id, desafio.id);

      if (nbcCompleto) {
        await prisma.$transaction([
          prisma.nbcCompletado.create({
            data: { nbcId: nbc.id, equipoId: equipo.id }
          }),
          prisma.equipoJugador.create({
            data: {
              equipoId: equipo.id,
              jugadorId: nbc.premioId,
              posicion: 0
            }
          })
        ]);

        const listaEntregados = todosSlots.map(s => `• **${s.equipoJugador.jugador.nombre}** (⭐ ${s.equipoJugador.jugador.media} | ${s.equipoJugador.jugador.tipo})`).join('\n');

        const premiosObtenidos = [];
        if (desafio.premioGodeanos > 0) premiosObtenidos.push(`💰 +$GDS ${formatNumber(desafio.premioGodeanos)}`);
        if (desafio.premioPack) premiosObtenidos.push(`📦 +${desafio.premioPack.nombre}`);

        const embedCompleto = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('🏆🎉 ¡NBC COMPLETADO!')
          .setDescription(
            `**¡Completaste el NBC "${nbc.nombre}"!**\n\n` +
            `🎁 Has recibido a **${nbc.premio.nombre}** (⭐ ${nbc.premio.media}) en tu reserva!\n` +
            (premiosObtenidos.length > 0 ? `Recompensas del desafío: ${premiosObtenidos.join(' y ')}\n` : '') +
            `\n**Cartas entregadas:**\n${listaEntregados}`
          )
          .setTimestamp();

        const premioImg = obtenerImagenUrl(nbc.premio.dir);
        if (premioImg) {
          embedCompleto.setImage(premioImg);
        }

        await msg.edit({ embeds: [embedCompleto], components: [] });
      } else {
        const listaEntregados = todosSlots.map(s => `• **${s.equipoJugador.jugador.nombre}** (⭐ ${s.equipoJugador.jugador.media} | ${s.equipoJugador.jugador.tipo})`).join('\n');

        const premiosObtenidos = [];
        if (desafio.premioGodeanos > 0) premiosObtenidos.push(`💰 +$GDS ${formatNumber(desafio.premioGodeanos)}`);
        if (desafio.premioPack) premiosObtenidos.push(`📦 +${desafio.premioPack.nombre}`);

        const embedExito = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('✅ ¡Desafío completado!')
          .setDescription(
            `**"${desafio.nombre}"** completado exitosamente!\n\n` +
            (premiosObtenidos.length > 0 ? `Recompensas del desafío: ${premiosObtenidos.join(' y ')}\n` : '') +
            `\n**Cartas entregadas:**\n${listaEntregados}\n\n` +
            `Seguí completando los demás desafíos para obtener la recompensa final.`
          )
          .setTimestamp();

        await msg.edit({ embeds: [embedExito], components: [] });
      }
    }
  });

  collector.on('end', async (collected, reason) => {
    if (reason !== 'selected' && reason !== 'volver' && reason !== 'enviado') {
      try { await msg.edit({ components: [] }); } catch (e) { }
    }
  });
}

async function verificarnbcCompleto(nbcId, equipoId, desafioRecienCompletadoId) {
  const totalDesafios = await prisma.nbcDesafio.count({
    where: { nbcId }
  });

  const completados = await prisma.nbcDesafioCompletado.count({
    where: {
      equipoId,
      desafio: { nbcId }
    }
  });

  const yaRegistrado = await prisma.nbcDesafioCompletado.findUnique({
    where: {
      desafioId_equipoId: { desafioId: desafioRecienCompletadoId, equipoId }
    }
  });

  const totalCompletados = yaRegistrado ? completados : completados + 1;

  return totalCompletados >= totalDesafios;
}

function todasPlantillasListas(plantillas, requisitos, cantidadPlantillas) {
  for (let p = 0; p < cantidadPlantillas; p++) {
    const jugadores = plantillas[p].map(s => s ? s.equipoJugador.jugador : null);
    const validacion = validarnbc(jugadores, requisitos);
    if (!validacion.valido) return false;
  }
  return true;
}
