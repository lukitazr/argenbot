import prisma from '../../models/db.js';
import { EmbedBuilder } from 'discord.js';

export default {
  name: 'dar-packs',
  aliases: ['addpacks', 'giftpacks'],
  desc: 'Otorga una cantidad de sobres específicos a tu club.',
  permisos: ["Administrator"],
  run: async (client, message, args) => {
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount <= 0) {
      return message.reply('❌ **Cantidad inválida!** Uso: `ar!dar-packs <cantidad> <nombre_pack>`');
    }

    const packNombre = args.slice(1).join(' ').trim();
    if (!packNombre) {
      return message.reply('❌ **Especificá el nombre del pack!** Uso: `ar!dar-packs <cantidad> <nombre_pack>`');
    }

    const pack = await prisma.pack.findFirst({
      where: { nombre: { equals: packNombre } }
    });

    if (!pack) {
      const packParcial = await prisma.pack.findFirst({
        where: { nombre: { contains: packNombre } }
      });
      if (!packParcial) {
        return message.reply(`❌ **No se encontró ningún sobre con el nombre "${packNombre}".**`);
      }
      return entregarPacks(message, packParcial, amount);
    }

    return entregarPacks(message, pack, amount);
  }
};

async function entregarPacks(message, pack, amount) {
  const equipo = await prisma.equipo.findUnique({
    where: { userID: message.author.id }
  });

  if (!equipo) {
    return message.reply('❌ **No tenés un club registrado!** Usá `ar!registro <nombre>` para crear uno.');
  }

  const dataAInsertar = Array(amount).fill(null).map(() => ({
    equipoId: equipo.id,
    packId: pack.id
  }));

  await prisma.equipoPack.createMany({
    data: dataAInsertar
  });

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('📦 Sobres Entregados')
    .setDescription(`Se agregaron **${amount}** sobres de **${pack.nombre}** a tu inventario.`)
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}
