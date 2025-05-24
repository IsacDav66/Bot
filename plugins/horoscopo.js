// plugins/horoscopo.js

// No necesitamos dependencias externas para esta versión

// Objeto con las frases para cada signo (mantenido del original)
const horoscopos = {
    aries: [
        "Tu energía es contagiosa hoy, úsala sabiamente.", "Una oportunidad inesperada puede cambiar tu rumbo.", "Sé paciente, las recompensas están en camino.",
        "Confía en tu instinto para tomar decisiones rápidas.", "Evita discutir, no todos pensarán como tú.", "Encuentra equilibrio entre tu trabajo y descanso.",
        "La pasión te guiará en este día intenso.", "Acepta el cambio, traerá mejoras a tu vida.", "No te detengas ante los obstáculos, sigue adelante.",
        "Una conversación importante definirá tu día.", "Alguien cercano necesita tu apoyo emocional.", "Cuida tu salud mental, date un respiro.",
        "Ser directo hoy te traerá buenos resultados.", "La honestidad será tu mejor herramienta.", "Hoy es buen día para cerrar ciclos.",
        "Aprende de los errores y sigue avanzando.", "Evita decisiones impulsivas, reflexiona primero.", "Tu carisma atraerá nuevas personas hoy.",
        "Busca soluciones creativas a los problemas.", "Comparte tu entusiasmo, será contagioso."
    ],
    tauro: [
        "Tu paciencia será recompensada hoy.", "Disfruta de los placeres simples de la vida.", "El trabajo duro traerá frutos muy pronto.",
        "Confía en tus capacidades, eres más fuerte de lo que crees.", "Dedica tiempo a tu bienestar físico y mental.", "Valora lo que tienes antes de buscar más.",
        "Hoy es un buen día para ahorrar.", "Escucha antes de juzgar, la empatía es clave.", "Organiza tu día para evitar estrés.",
        "La naturaleza puede darte respuestas que buscas.", "No todo lo que brilla es oro, sé cauteloso.", "Busca estabilidad en tus relaciones personales.",
        "Una propuesta interesante llegará pronto.", "Agradece las pequeñas cosas que pasan hoy.", "Hoy tendrás claridad para resolver un problema viejo.",
        "Tu voz tiene poder, úsala con sabiduría.", "Las buenas acciones regresan, haz el bien.", "Atrévete a salir de la rutina.",
        "Rodéate de personas que te hagan sentir bien.", "Hoy es buen día para poner orden a tus finanzas."
    ],
    geminis: [ // Asegúrate de incluir todos los signos del original
        "Comunica lo que sientes, te sentirás más ligero.", "La curiosidad te llevará a descubrimientos positivos.", "Aprovecha tu versatilidad para resolver retos.",
        "Haz una pausa antes de decidir.", "Hoy conocerás a alguien interesante.", "Evita la dispersión, concéntrate en lo importante.",
        "No temas cambiar de opinión.", "Escucha más, habla menos.", "Tu adaptabilidad será tu mejor aliada hoy.",
        "Explora nuevas formas de expresión.", "Un mensaje inesperado alegrará tu día.", "Atrévete a aprender algo nuevo.",
        "No todos entenderán tu forma de pensar, y está bien.", "Confía en tu agilidad mental.", "Las oportunidades vendrán en forma de preguntas.",
        "Alguien del pasado volverá a buscarte.", "Sé flexible, no todo saldrá como planeas.", "Hoy es un buen día para escribir o crear.",
        "Tu carisma abrirá puertas.", "Las dudas se disiparán si sigues tu intuición."
    ],
    cancer: [
        "Hoy tu sensibilidad será tu fortaleza.", "Escucha a tu corazón, sabe lo que quiere.", "Dedica tiempo a quienes amas.",
        "Tu intuición será especialmente aguda hoy.", "Evita cargar con problemas ajenos.", "Rodéate de personas que te comprendan.",
        "Tu hogar necesita atención, bríndala con amor.", "Hoy puedes sanar heridas del pasado.", "Comparte tu historia, puede ayudar a otros.",
        "La nostalgia será fuerte, pero pasajera.", "Encuentra belleza en lo cotidiano.", "No reprimas tus emociones.",
        "Hoy es ideal para perdonar y avanzar.", "Cierra ciclos que ya no aportan a tu vida.", "Tu protección hacia otros es valiosa, pero cuida también de ti.",
        "Valida tus emociones, son reales.", "No todo es tu responsabilidad.", "Una conversación sincera abrirá caminos.",
        "Haz lo que te dé paz.", "Tu empatía será muy valorada hoy."
    ],
    leo: [
        "Hoy brillarás sin necesidad de esforzarte.", "Tu liderazgo será clave en una situación difícil.", "No temas pedir ayuda si lo necesitas.",
        "Muestra gratitud con quienes te apoyan.", "Un elogio sincero llegará hoy.", "Evita imponer tus ideas, lidera con el ejemplo.",
        "No necesitas validación externa para sentirte valioso.", "Recuerda que el poder está en ti.", "Una oportunidad de destacarte se presenta.",
        "Tus palabras tienen peso, úsalas con cuidado.", "Es momento de reconocer tus logros.", "Tu presencia inspira a otros.",
        "No escondas tu talento, compártelo.", "Hoy es día para disfrutar sin culpa.", "Evita dramatizar, todo se resolverá.",
        "La humildad también te hace grande.", "Sé generoso, pero no te sobrecargues.", "Confía en que mereces lo bueno que te llega.",
        "Un nuevo inicio está por llegar.", "El amor propio será tu mejor guía hoy."
    ],
    virgo: [
        "Hoy todo encajará como esperabas.", "Presta atención a los pequeños detalles.", "Organiza tu espacio y mente.",
        "Confía en tus métodos, funcionan.", "Evita criticarte en exceso.", "Tu disciplina traerá buenos resultados.",
        "Sé más compasivo contigo mismo.", "Los errores son parte del aprendizaje.", "Una rutina saludable mejorará tu energía.",
        "No te sobreexijas, descansa cuando lo necesites.", "La planificación será clave hoy.", "Haz una lista de tus prioridades.",
        "Tu mente práctica será valorada.", "No busques la perfección, busca el progreso.", "Resuelve pendientes acumulados.",
        "Un cambio de hábitos te beneficiará.", "Tu capacidad de análisis será útil hoy.", "Dedica tiempo a ti, no todo es trabajo.",
        "Valida tus logros, por pequeños que parezcan.", "Hoy es buen día para limpiar y soltar lo viejo."
    ],
    libra: [
        "Hoy encontrarás armonía en lo inesperado.", "Evita postergar decisiones importantes.", "Un nuevo equilibrio está en camino.",
        "Escucha ambas partes antes de opinar.", "La belleza está en el contraste.", "Confía en tu sentido de la justicia.",
        "Cuida tu energía emocional.", "Tómate un tiempo para ti hoy.", "Un vínculo afectivo se fortalecerá.",
        "Tu presencia trae paz a otros.", "Hoy es un día ideal para reconciliaciones.", "Valora la estabilidad que tienes.",
        "No temas expresar lo que sientes.", "Toma una decisión basada en el amor.", "Tu intuición sabrá qué es lo correcto.",
        "Evita complacer a todos, piensa en ti.", "Alguien necesitará tu consejo.", "Disfruta del arte o la música para equilibrarte.",
        "Hoy tu diplomacia será esencial.", "Un encuentro casual traerá alegría."
    ],
    escorpio: [
        "Hoy sentirás emociones intensas.", "Confía en tu poder de transformación.", "Aléjate de lo que te quita paz.",
        "Las verdades saldrán a la luz.", "No temas soltar lo que ya no sirve.", "El cambio es necesario, aunque duela.",
        "Una confesión te sorprenderá.", "Escucha más allá de las palabras.", "Tu energía es magnética hoy.",
        "Enfrenta lo oculto con valentía.", "Hoy puedes iniciar una sanación profunda.", "Los secretos se revelan para sanar.",
        "Corta lazos tóxicos sin culpa.", "Toma el control de tu narrativa.", "Hoy es buen día para introspección.",
        "No subestimes tu capacidad de renacer.", "Alguien admira tu fuerza interior.", "Encuentra belleza en lo oscuro.",
        "Tu intuición es poderosa, síguela.", "La transformación empieza desde adentro."
    ],
    sagitario: [
        "Hoy es ideal para aprender algo nuevo.", "Tu espíritu aventurero está en su punto más alto.", "No dejes que la rutina te detenga.",
        "Tu entusiasmo será contagioso.", "Atrévete a hacer lo que siempre quisiste.", "Una conversación te abrirá la mente.",
        "Los viajes cortos te renovarán.", "Comparte tu conocimiento con otros.", "La risa será tu mejor medicina.",
        "Cree en las posibilidades infinitas.", "Hoy es buen día para planear a futuro.", "Tu optimismo atraerá cosas buenas.",
        "Evita prometer más de lo que puedes cumplir.", "Explora nuevas filosofías de vida.", "Abre tu mente, pero también tu corazón.",
        "Una sorpresa agradable te espera.", "Desconéctate un momento y observa el cielo.", "Sigue tu intuición, te llevará lejos.",
        "La aventura empieza dentro de ti.", "Hoy es un buen día para confiar en el universo."
    ],
    capricornio: [
        "Hoy verás los frutos de tu esfuerzo.", "El trabajo silencioso rinde grandes resultados.", "Confía en tu disciplina.",
        "Sé paciente, las recompensas vienen en camino.", "Organiza tu día, verás grandes avances.", "No olvides cuidar de tu salud.",
        "La responsabilidad no es carga si es con propósito.", "Aprende a delegar tareas.", "Busca estabilidad, pero no te cierres al cambio.",
        "Tu sabiduría práctica será valorada hoy.", "Reconoce tu capacidad de liderazgo.", "No te aísles, la conexión también es necesaria.",
        "Hoy es buen día para estructurar tus planes.", "El éxito llegará, pero paso a paso.", "Evita la rigidez, sé más flexible.",
        "Tu constancia es tu superpoder.", "El respeto propio te abre puertas.", "Cuida tus finanzas con inteligencia.",
        "Es un buen día para invertir en ti.", "La montaña es alta, pero la cima vale la pena."
    ],
    acuario: [
        "Hoy surgirán ideas revolucionarias.", "Tu creatividad estará al máximo.", "Rompe con la rutina, atrévete a innovar.",
        "Conéctate con personas que compartan tu visión.", "No temas pensar diferente.", "Tu perspectiva única será necesaria hoy.",
        "Comparte tus ideas, alguien las necesita.", "Evita aislarte, busca comunidad.", "El futuro se construye hoy.",
        "Acepta lo inusual como parte de ti.", "Tu mente abierta será tu guía.", "Explora algo que te intrigue.",
        "Hoy es buen día para experimentar.", "Desapégate de lo obsoleto.", "Tu independencia es una virtud.",
        "Cuida tus emociones, aunque seas racional.", "El cambio será positivo si confías.", "Una conversación encenderá tu chispa creativa.",
        "Reinventa algo que dabas por perdido.", "Hoy tu autenticidad será un faro."
    ],
    piscis: [
        "Hoy tu intuición será tu guía.", "Dedica tiempo al arte o la meditación.", "No ignores tus emociones.",
        "Un sueño revelará una verdad.", "La compasión será tu mejor herramienta.", "Alguien necesitará tu consuelo.",
        "Confía en el fluir de la vida.", "Tu sensibilidad será valiosa hoy.", "Haz espacio para lo espiritual.",
        "Escucha tu voz interior.", "Hoy es ideal para sanar heridas.", "Busca el amor en los detalles pequeños.",
        "Evita absorber la energía de otros.", "Rodéate de belleza y tranquilidad.", "Hoy puedes ayudar sin esperar nada.",
        "No temas sentir intensamente.", "Un mensaje del universo llegará a ti.", "Sigue tu corazón sin miedo.",
        "Encuentra paz en la soledad.", "Tu alma necesita descanso, bríndalo."
    ]
};

// Lista de signos válidos para mostrar en el mensaje de error
const signosValidos = Object.keys(horoscopos).join(', ');

module.exports = {
    name: 'horoscopo',
    aliases: ['horoscopo', 'horóscopo', 'signo'], // Comandos para activarlo
    description: 'Obtén una predicción aleatoria para tu signo zodiacal.',
    category: 'Diversión',
    async execute(client, message, args) {
        // Verificar si se proporcionó un signo
        if (args.length === 0) {
            await message.reply(`Por favor, indica tu signo zodiacal después del comando.\nEjemplo: \`!horoscopo aries\`\n\nSignos disponibles: ${signosValidos}`);
            return;
        }

        // Obtener el signo del primer argumento, limpiar y poner en minúsculas
        const signo = args[0].trim().toLowerCase();

        // Verificar si el signo existe en nuestro objeto
        if (horoscopos[signo]) {
            // Obtener el array de predicciones para ese signo
            const predicciones = horoscopos[signo];
            // Elegir un índice aleatorio
            const randomIndex = Math.floor(Math.random() * predicciones.length);
            // Seleccionar la predicción
            const prediccion = predicciones[randomIndex];

            // Formatear el mensaje de respuesta
            const nombreSigno = signo.charAt(0).toUpperCase() + signo.slice(1); // Poner primera letra en mayúscula
            const mensaje = `🔮 *Horóscopo de ${nombreSigno}* 🔮\n\n${prediccion}`;

            // Enviar la respuesta
            await message.reply(mensaje);
        } else {
            // Si el signo no es válido, enviar mensaje de error
            await message.reply(`"${args[0]}" no es un signo zodiacal válido.\n\nIntenta con uno de estos: ${signosValidos}`);
        }
    }
};