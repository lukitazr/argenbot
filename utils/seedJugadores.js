import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import prisma from '../models/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Calcula el valor de un jugador basado en su media y tipo
 */
function calcularValor(media, tipo) {
  let base = media * 100;

  // Bonus por tipo de carta
  if (tipo.includes('Icono') || tipo.includes('Argentine Aniversario') || tipo.includes('Twitteros') || tipo.includes('Future Niggas') || tipo.includes('Flashbacks') || tipo.includes('Gordoolimpiadas 2025')) {
    base *= 4
    if (tipo.includes('Usuario del Año')) base *= 2;
    else if (tipo.includes('Aniversario') && tipo.includes('Icono')) base *= 1.5;
  } else if (tipo.includes('Heroes')) {
    base *= 3
    if (tipo.includes('Argentine Aniversario')) base *= 2;
    else if (tipo.includes('Argentine')) base *= 1.5;
  }
  else if (tipo.includes('Usuario del Año')) {
    base *= 6
  }
  else if (tipo.includes('Nominados')) {
    base *= 2
    if (tipo.includes('Usuario del Año')) base *= 1.5
  }
  else if (tipo.includes('Malvados') || tipo.includes('Olvidados')) {
    base *= 1.5
    if (tipo.includes('Momentos')) base *= 2.5;
    else if (tipo.includes('Personajes')) base *= 1.5;
  } else if (tipo.includes('Gordesliga Revivida')) {
    base *= 1.75
    if (tipo.includes('Gordesliga Revivida Final de Temporada')) base *= 3
  } else if (tipo.includes('Oro')) {
    base *= 1.25
    if (tipo.includes('Especial')) base *= 1.25;
    else if (tipo.includes('Común')) base *= 1.1;
  } else if (tipo.includes('Plata')) {
    base *= 1
    if (tipo.includes('Especial')) base *= 1.25;
    else if (tipo.includes('Común')) base *= 1.1;
  } else if (tipo.includes('Bronce')) {
    base *= 0.9
    if (tipo.includes('Especial')) base *= 1.1;
    else if (tipo.includes('Común')) base *= 0.9;
  } else if (tipo.includes('Nigger Building Challenges')) base *= 0

  return Math.round(base);
}

export default async function seedJugadores() {
  try {
    const cartasPath = join(__dirname, '..', 'assets', 'cartas.json');
    const cartasRaw = readFileSync(cartasPath, 'utf-8');
    const cartas = JSON.parse(cartasRaw);

    const existentes = await prisma.jugador.findMany();
    const existentesMap = new Map(existentes.map(j => [`${j.nombre}_${j.tipo}`.toLowerCase(), j]));

    const jugadoresAInsertar = [];

    for (const c of cartas) {
      if (!c.ruta || c.ruta.trim() === '') continue;
      const key = `${c.nombre}_${c.tipo}`.toLowerCase();
      const media = parseInt(c.media);
      const valor = calcularValor(media, c.tipo);
      const pais = c.pais || "Argentina"

      const existente = existentesMap.get(key);
      if (existente) {
        if (existente.media !== media || existente.valor !== valor || existente.dir !== c.ruta || existente.pais !== pais) {
          await prisma.jugador.update({
            where: { id: existente.id },
            data: { media, valor, dir: c.ruta, pais }
          });
        }
      } else {
        jugadoresAInsertar.push({
          nombre: c.nombre,
          tipo: c.tipo,
          dir: c.ruta,
          media: media,
          valor: valor,
          pais: pais,
        });
      }
    }

    if (jugadoresAInsertar.length > 0) {
      await prisma.jugador.createMany({ data: jugadoresAInsertar });
    }
    console.log(`⚽ Catálogo de jugadores sincronizado! (${jugadoresAInsertar.length} nuevos creados)`.green);
  } catch (error) {
    console.error('❌ Error al hacer seed de jugadores:'.red, error);
  }
}


