import prisma from '../../models/db.js';
import { EmbedBuilder } from 'discord.js';
import formatNumber from '../../utils/formatNumber.js';

export default {
  name: 'registro',
  aliases: ['registrar', 'crear'],
  desc: 'Registra tu club con un nombre personalizado',
  run: async (client, message, args) => {
    const nombreEq = args.join(' ').trim();

    if (!nombreEq) {
      return message.reply('❌ **Debes especificar un nombre para tu club!**\nUso: `ar!registro <nombre del club>`');
    }

    if (nombreEq.length > 40) {
      return message.reply('❌ **El nombre del club no puede superar los 40 caracteres!**');
    }

    // Verificar si el usuario ya tiene un club
    const existente = await prisma.equipo.findUnique({
      where: { userID: message.author.id }
    });
    if (existente) {
      return message.reply(`❌ **Ya tenés un club registrado!** Tu club es: **${existente.nombreEq}**`);
    }

    // Verificar si el nombre de club ya existe
    const nombreExistente = await prisma.equipo.findUnique({
      where: { nombreEq }
    });
    if (nombreExistente) {
      return message.reply('❌ **Ese nombre de club ya está registrado por otro usuario!**');
    }

    // Buscar el pack inicial 'Gordos Comunes'
    const packGordos = await prisma.pack.findUnique({
      where: { nombre: 'Gordos Comunes' }
    });

    const nuevoEquipo = await prisma.equipo.create({
      data: {
        nombreEq,
        userID: message.author.id,
        dinero: 10000,
        packs_dis: packGordos ? {
          create: [
            { packId: packGordos.id },
            { packId: packGordos.id }
          ]
        } : undefined
      }
    });

    const embed = new EmbedBuilder()
      .setColor(client.color)
      .setTitle('⚽ Club Registrado!')
      .setDescription(`Tu club **${nombreEq}** ha sido creado exitosamente!`)
      .addFields(
        { name: '💰 Balance', value: `$GDS ${formatNumber(nuevoEquipo.dinero)}`, inline: true },
        { name: '📦 Pack Inicial', value: 'Gordos Comunes x2', inline: true },
        { name: '👥 Jugadores', value: 'Ninguno aún (y si flaco, mirá si te vamos a regalar todo...)', inline: true }
      )
      .setFooter({ text: `Club de ${message.author.username}` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
}
