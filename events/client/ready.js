import prisma from "../../models/db.js";
import seedJugadores from "../../utils/seedJugadores.js";
import seedPacks from "../../utils/seedPacks.js";
import seedSbcs from "../../utils/seedNBCS.js";

export default {
  name: 'clientReady',
  once: true,
  run: async (client) => {
    try {
      await prisma.$connect();
      console.log(`☁ CONECTADO A LA BASE DE DATOS`.green);

      // Seed de jugadores, packs y SBCs
      await seedJugadores();
      await seedPacks();
      await seedSbcs();
    } catch (err) {
      console.log(`☁ ERROR AL CONECTAR A LA BASE DE DATOS`.red);
      console.log(err);
    }

    console.log(`SESIÓN INICIADA COMO ${client.user.tag}`.green);
  }
}

