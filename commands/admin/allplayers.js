import prisma from '../../models/db.js';
import { EmbedBuilder } from 'discord.js';

export default {
  name: 'allplayers',
  aliases: ['dar-jugadores', 'dar-todos'],
  desc: 'Otorga todas las cartas del juego al club del admin.',
  permisos: ["Administrator"],
  run: async (client, message, args) => {
    const equipo = await prisma.equipo.findUnique({
      where: { userID: message.author.id }
    });

    if (!equipo) {
      return message.reply('❌ **No tenés un club registrado!** Usá `ar!registro <nombre>` para crear uno.');
    }

    const todosJugadores = await prisma.jugador.findMany();

    if (todosJugadores.length === 0) {
      return message.reply('❌ **No hay jugadores en la base de datos global!**');
    }

    // Agregar todas las cartas a la reserva (posicion: 0)
    const dataAInsertar = todosJugadores.map(j => ({
      equipoId: equipo.id,
      jugadorId: j.id,
      posicion: 0
    }));

    await prisma.equipoJugador.createMany({
      data: dataAInsertar
    });

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('⚽ ¡Cartas Entregadas!')
      .setDescription(`Se agregaron exitosamente **${todosJugadores.length}** cartas a tu reserva.`)
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
