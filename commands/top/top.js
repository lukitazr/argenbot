import { EmbedBuilder } from 'discord.js';
import topMedia from './media.js';
import topMillonarios from './millonarios.js';
import topColeccionistas from './coleccionistas.js';

export default {
  name: 'top',
  aliases: ['ranking', 'leaderboard', 'tops'],
  desc: 'Ver los rankings de los mejores equipos del servidor',
  run: async (client, message, args, prefix) => {
    const subcommand = args[0]?.toLowerCase();

    if (!subcommand) {
      const embed = new EmbedBuilder()
        .setColor(client.color || '#00ffcc')
        .setTitle('🏆 Rankings del Servidor (Tops)')
        .setDescription(`Usá el comando con alguno de los siguientes subcomandos:\n\n` +
          `• \`${prefix}top media\` (o \`promedio\`) - Equipos ordenados por promedio de media en su plantilla activa.\n` +
          `• \`${prefix}top millonarios\` (o \`dinero\`, \`plata\`) - Equipos ordenados por dinero disponible.\n` +
          `• \`${prefix}top coleccionistas\` (o \`cartas\`, \`coleccion\`) - Equipos ordenados por total de cartas en su club.`)
        .setFooter({ text: 'ArgenBot • Rankings' })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    if (subcommand === 'media' || subcommand === 'promedio') {
      return topMedia.run(client, message, args.slice(1), prefix);
    } else if (subcommand === 'millonarios' || subcommand === 'dinero' || subcommand === 'plata') {
      return topMillonarios.run(client, message, args.slice(1), prefix);
    } else if (subcommand === 'coleccionistas' || subcommand === 'cartas' || subcommand === 'coleccion') {
      return topColeccionistas.run(client, message, args.slice(1), prefix);
    } else {
      return message.reply(`❌ **Subcomando no válido!** Usá \`media\`, \`millonarios\` o \`coleccionistas\`. Ejemplo: \`${prefix}top media\``);
    }
  }
};
