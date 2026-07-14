import prisma from '../../models/db.js';
import { EmbedBuilder } from 'discord.js';
import formatNumber from '../../utils/formatNumber.js';

export default {
  name: 'godeanos',
  aliases: ['addmoney', 'addgodeanos'],
  desc: 'Agrega Godeanos al balance de tu club.',
  permisos: ["Administrator"],
  run: async (client, message, args) => {
    const amount = parseFloat(args[0]);
    if (isNaN(amount) || amount <= 0) {
      return message.reply('❌ **Monto inválido!** Uso: `ar!godeanos <monto>`');
    }

    const equipo = await prisma.equipo.findUnique({
      where: { userID: message.author.id }
    });

    if (!equipo) {
      return message.reply('❌ **No tenés un club registrado!** Usá `ar!registro <nombre>` para crear uno.');
    }

    const updated = await prisma.equipo.update({
      where: { id: equipo.id },
      data: { dinero: { increment: amount } }
    });

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('💰 Godeanos Añadidos')
      .setDescription(`Se agregaron **$GDS ${formatNumber(amount)}** a tu club.\n💵 **Saldo nuevo:** $GDS ${formatNumber(updated.dinero)}`)
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
