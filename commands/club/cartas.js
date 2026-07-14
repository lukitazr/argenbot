import prisma from '../../models/db.js';
import { EmbedBuilder } from 'discord.js';

export default {
  name: 'cartas',
  aliases: ['inventario', 'misjugadores', 'misticos', 'club'],
  desc: 'Ver todas tus cartas (en plantilla y en el club)',
  run: async (client, message, args) => {
    // Permitir ver las cartas de otro usuario
    const targetUser = message.mentions.users.first() || message.author;
    
    const equipo = await prisma.equipo.findUnique({
      where: { userID: targetUser.id },
      include: {
        jugadores: {
          include: {
            jugador: true
          }
        }
      }
    });

    if (!equipo) {
      if (targetUser.id === message.author.id) {
        return message.reply('❌ **No tenés un club registrado!** Usá `ar!registro <nombre>` para crear uno.');
      } else {
        return message.reply(`❌ **${targetUser.username} no tiene un club registrado!**`);
      }
    }

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`🗂️ Cartas de ${equipo.nombreEq}`)
      .setDescription(`Listado completo de las cartas de ${targetUser.username}.`)
      .setTimestamp();

    // 1. Plantilla (posiciones 1 al 5)
    const enPlantilla = equipo.jugadores.filter(ej => ej.posicion >= 1 && ej.posicion <= 5);
    // Ordenamos por posicion para mostrarlos en orden
    enPlantilla.sort((a, b) => a.posicion - b.posicion);
    
    let textoPlantilla = '';
    if (enPlantilla.length > 0) {
      // Creamos un array de 5 elementos vacío para mapear las posiciones 1 a 5
      const slots = Array(5).fill(null);
      enPlantilla.forEach(ej => {
        if (ej.posicion >= 1 && ej.posicion <= 5) {
          slots[ej.posicion - 1] = ej.jugador;
        }
      });

      slots.forEach((j, index) => {
        if (j) {
          textoPlantilla += `**Pos ${index + 1}:** ${j.nombre} — ⭐ ${j.media} [${j.tipo}]\n`;
        } else {
          textoPlantilla += `**Pos ${index + 1}:** *Vacío*\n`;
        }
      });
    } else {
      textoPlantilla = '*No hay jugadores en la plantilla. Equipá uno usando ar!plantilla equipar.*\n';
    }

    embed.addFields({ name: '⚽ En Plantilla', value: textoPlantilla });

    // 2. Reserva / Club
    const reserva = equipo.jugadores.filter(ej => ej.posicion === 0);
    // Ordenar de mayor a menor media
    reserva.sort((a, b) => b.jugador.media - a.jugador.media);

    if (reserva.length > 0) {
      let lineasReserva = reserva.map(ej => `▫️ **${ej.jugador.nombre}** — ⭐ ${ej.jugador.media} [${ej.jugador.tipo}] (ID: ${ej.id})`);
      let textoReserva = '';
      let cortado = false;
      let countMostrados = 0;
      
      for (const linea of lineasReserva) {
        if (textoReserva.length + linea.length + 50 > 1024) {
          cortado = true;
          break;
        }
        textoReserva += linea + '\n';
        countMostrados++;
      }
      
      if (cortado) {
        textoReserva += `*... y ${reserva.length - countMostrados} cartas más.*`;
      }

      embed.addFields({ name: `📦 En el Club / Reserva (${reserva.length})`, value: textoReserva });
    } else {
      embed.addFields({ name: '📦 En el Club / Reserva (0)', value: '*No tenés jugadores extra en el club.*' });
    }

    message.reply({ embeds: [embed] });
  }
};

