import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prefix = 'ar!';

const categoryEmojis = {
  club: '⚽',
  duel: '⚔️',
  economy: '💰',
  info: 'ℹ️',
  top: '🏆',
  admin: '🛡️'
};

const categoryDescriptions = {
  club: 'Gestión de tu club, plantilla, reserva y canjeos',
  duel: 'Duelos, juegos de azar y mujerzuelas (esto último incluido en un DLC)',
  economy: 'Laburo, crimen y sluteo de Godeanos',
  info: 'Tienda, catálogo y utilidades de soporte',
  top: 'Clasificaciones generales',
  admin: 'Herramientas y comandos de administración'
};

export default {
  name: 'help',
  aliases: ['ayuda', 'h', 'comandos'],
  desc: 'Muestra la lista de comandos.',
  permisos: [],
  run: async (client, message, args) => {
    const commandsDir = join(__dirname, '..');
    const categoriesMap = new Map();

    // 1. Indexar los comandos por su carpeta contenedora (categoría)
    for (const category of readdirSync(commandsDir)) {
      const categoryPath = join(commandsDir, category);
      if (!statSync(categoryPath).isDirectory()) continue;

      const files = readdirSync(categoryPath).filter(f => f.endsWith('.js') || f.endsWith('.ts'));
      const categoryCommands = [];

      for (const file of files) {
        try {
          const filePath = `file://${join(categoryPath, file)}`;
          const commandModule = await import(filePath);
          const command = commandModule.default ?? commandModule;

          if (command && command.name) {
            const loaded = client.commands.get(command.name);
            if (loaded) {
              categoryCommands.push(loaded);
            }
          }
        } catch (e) {
          // Ignorar fallos de importación temporal
        }
      }

      if (categoryCommands.length > 0) {
        // Ordenar alfabéticamente por nombre
        categoryCommands.sort((a, b) => a.name.localeCompare(b.name));
        categoriesMap.set(category, categoryCommands);
      }
    }

    // 2. Construir menú de selección
    const selectOptions = [
      {
        label: 'Inicio',
        description: 'Volver a la portada de ayuda',
        value: 'help_home',
        emoji: '🏠'
      }
    ];

    for (const [catName] of categoriesMap) {
      const emoji = categoryEmojis[catName] || '📂';
      const desc = categoryDescriptions[catName] || `Comandos de la categoría ${catName}`;
      selectOptions.push({
        label: catName.charAt(0).toUpperCase() + catName.slice(1),
        description: desc,
        value: `help_category_${catName}`,
        emoji: emoji
      });
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_menu')
      .setPlaceholder('Seleccioná una categoría...')
      .addOptions(selectOptions);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    // Embed Home
    const embedHome = new EmbedBuilder()
      .setColor(client.color || '#FFD700')
      .setTitle('📚 Ayudador de pibes')
      .setDescription(
        `En que te ayudo wachin?\n\n` +
        `El prefijo es **\`${prefix}\`**.\n` +
        `Usá el menú desplegable de abajo para ver la lista de comandos de cada categoría.`
      )
      .setThumbnail(client.user.displayAvatarURL())
      .setTimestamp()
      .setFooter({ text: `Club de ${message.author.username}` });

    const msg = await message.reply({ embeds: [embedHome], components: [row] });

    // Colector de interacción
    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id && i.customId === 'help_menu',
      time: 60000
    });

    collector.on('collect', async (i) => {
      await i.deferUpdate();
      const selected = i.values[0];

      if (selected === 'help_home') {
        await msg.edit({ embeds: [embedHome], components: [row] });
      } else if (selected.startsWith('help_category_')) {
        const cat = selected.replace('help_category_', '');
        const cmds = categoriesMap.get(cat) || [];

        let catDesc = `A continuación se muestran los comandos disponibles para la categoría **${cat.toUpperCase()}**:\n\n`;

        const cmdFields = cmds.map(cmd => {
          let text = `📜 **\`${prefix}${cmd.name}\`**\n`;
          text += `🔹 *Desc:* ${cmd.desc || 'Sin descripción.'}\n`;
          if (cmd.aliases && cmd.aliases.length > 0) {
            text += `🔹 *Aliases:* \`${cmd.aliases.join('\`, \`')}\`\n`;
          }
          if (cmd.permisos && cmd.permisos.length > 0) {
            text += `🔹 *Permisos:* \`${cmd.permisos.join(', ')}\`\n`;
          }
          return text;
        }).join('\n');

        const categoryEmbed = new EmbedBuilder()
          .setColor(client.color || '#FFD700')
          .setTitle(`${categoryEmojis[cat] || '📂'} Categoría: ${cat.toUpperCase()}`)
          .setDescription(catDesc + cmdFields)
          .setThumbnail(client.user.displayAvatarURL())
          .setTimestamp()
          .setFooter({ text: `Club de ${message.author.username}` });

        await msg.edit({ embeds: [categoryEmbed], components: [row] });
      }
    });

    collector.on('end', async () => {
      try {
        await msg.edit({ components: [] });
      } catch (e) {
        // Ignorar si el mensaje fue borrado
      }
    });
  }
};
