import prisma from '../../models/db.js';
import { EmbedBuilder } from 'discord.js';
import formatNumber from '../../utils/formatNumber.js';

export default {
  name: 'daily',
  aliases: ['diario'],
  desc: 'Reclamá tu recompensa diaria de Godeanos',
  run: async (client, message, args) => {
    const equipo = await prisma.equipo.findUnique({
      where: { userID: message.author.id }
    });

    if (!equipo) {
      return message.reply('❌ **No tenés un club registrado!** Usá `ar!registro <nombre>` para crear uno.');
    }

    const now = message.createdTimestamp;
    const cooldownAmount = 24 * 60 * 60 * 1000; // 24 hs en milisegundos

    // Verifica si ya reclamó y si fue hace menos de 24 hs
    if (equipo.ultimoDaily && (now - equipo.ultimoDaily.getTime()) < cooldownAmount) {
      const timeLeft = cooldownAmount - (now - equipo.ultimoDaily.getTime());
      const hours = Math.floor(timeLeft / (1000 * 60 * 60)); // horas restantes
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      return message.reply(`⏳ **Ya reclamaste tu daily!** Podés volver a hacerlo en **${hours}h ${minutes}m**.`);
    }

    // Calcula recompensa aleatoria entre 10000 y 20000
    const recompensa = Math.floor(Math.random() * (20000 - 10000 + 1)) + 10000;

    const updatedEquipo = await prisma.equipo.update({
      where: { userID: message.author.id },
      data: {
        dinero: { increment: recompensa },
        ultimoDaily: new Date(now)
      }
    });

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('📅 ¡Recompensa Diaria!')
      .setDescription(`Reclamaste tu recompensa diaria de **$GDS ${formatNumber(recompensa)}**.\n\n💵 **Nuevo saldo:** $GDS ${formatNumber(updatedEquipo.dinero)}`)
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
