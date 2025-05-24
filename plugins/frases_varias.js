// plugins/frases_varias.js

// No necesitamos dependencias externas

// --- Listas de Frases ---
const consejos = [
  'Acepta que los cambios son parte natural de la vida, y aprende a adaptarte a ellos.',
  'Nunca dejes de aprender; el conocimiento es una herramienta poderosa.',
  'Cuida de tu salud física y mental, son fundamentales para una vida plena.',
  'Disfruta de las pequeñas cosas, pues son ellas las que dan sentido a la vida.',
  'Aprende a perdonar, tanto a los demás como a ti mismo, para liberar tu corazón.',
  'Valora el tiempo que pasas con tus seres queridos, es el regalo más valioso que puedes dar y recibir.',
  'Sé amable y compasivo con los demás, cada acto de bondad puede marcar la diferencia en sus vidas.',
  'Aprende a decir \'no\' cuando sea necesario, y establece límites saludables.',
  'Encuentra tiempo para hacer lo que te apasiona, pues eso nutre tu alma y te hace sentir vivo.',
  'No te compares con los demás, cada persona tiene su propio camino y ritmo en la vida.',
  'Escucha a tu pareja con empatía y comprensión, la comunicación es la base de una relación sólida.',
  'No tengas miedo de expresar tus sentimientos, la honestidad es esencial en el amor.',
  'Aprende a ceder y a comprometerte, el amor requiere de sacrificio y esfuerzo mutuo.',
  'Sorprende a tu pareja de vez en cuando, mantén viva la chispa del romance.',
  'Respeta la individualidad de tu pareja y permítele crecer como persona.',
  'El amor propio es igual de importante que amar a alguien más; cuídate y valórate.',
  'Recuerda que una relación sana se basa en la confianza mutua y el respeto.',
  'Elige a alguien que te complemente y te haga ser una mejor versión de ti mismo.',
  'El amor verdadero no te hace sentir menos, te hace sentir más.',
  'Amar es un verbo, es una elección diaria que se cultiva con acciones y palabras.',
  'Encuentra un trabajo que te apasione, y nunca sentirás que estás trabajando.',
  'Sé proactivo y toma la iniciativa en tu trabajo, eso será valorado por tus superiores.',
  'Aprende de tus errores y fracasos, son oportunidades para crecer y mejorar.',
  'Mantén una actitud positiva y busca soluciones ante los desafíos laborales.',
  'Cultiva buenas relaciones con tus colegas, el trabajo en equipo es clave para el éxito.',
  'Establece metas claras y realistas, y trabaja con determinación para alcanzarlas.',
  'No tengas miedo de pedir ayuda o buscar mentoría, siempre hay algo nuevo que aprender.',
  'Reconoce y valora tus logros, celebra tus éxitos por pequeños que sean.',
  'Busca un equilibrio entre tu vida laboral y personal, ambos aspectos son importantes.',
  'El trabajo es una parte importante de tu vida, pero no es lo único que define quién eres.',
  'Cree en ti mismo y en tu capacidad para lograr lo que te propongas.',
  'Visualiza tus metas y sueños, imagina cómo te sentirás al alcanzarlos.',
  'Encuentra inspiración en aquellos que han superado obstáculos similares a los tuyos.',
  'Acepta los fracasos como parte del proceso, son oportunidades para aprender y crecer.',
  'Rodéate de personas positivas y que te impulsen hacia adelante.',
  'Mantén una mentalidad abierta y dispuesta a aprender cosas nuevas.',
  'Recuerda por qué empezaste cuando te sientas desmotivado; reconecta con tu propósito.',
  'Divide tus metas en pequeños pasos, eso hará el camino más alcanzable y menos abrumador.',
  'No tengas miedo de perseguir tus sueños, la vida es demasiado corta para vivir con arrepentimientos.',
  'Confía en que, con esfuerzo y perseverancia, puedes lograr todo lo que te propongas.',
  'A veces las cosas más simples pueden traer los momentos más felices.',
  'Recuerda que el fracaso no es el fin, es solo el comienzo de algo mejor.',
  'No te aferres a lo que no puedes cambiar, busca lo que sí puedes mejorar.',
  'La paciencia es una virtud que te traerá grandes recompensas.',
  'Cada desafío es una oportunidad para crecer y aprender.',
  'Haz hoy lo que otros no quieren hacer, y mañana tendrás lo que otros no tienen.',
  'No te olvides de ser agradecido por las pequeñas cosas de la vida.',
  'No busques la perfección, busca la mejora constante.',
  'La verdadera riqueza se mide por la paz interior, no por las posesiones materiales.',
  'Cada día es una nueva oportunidad para ser mejor que ayer.',
  'El trabajo duro supera al talento cuando el talento no trabaja duro.',
  'Sé el cambio que quieres ver en el mundo.',
  'No te preocupes por los fracasos, preocúpate por no intentarlo.',
  'La mente positiva siempre encuentra una forma de superar cualquier dificultad.',
  'Mantén una actitud positiva, incluso en los momentos difíciles.',
  'Aprende a decir "no" cuando sea necesario para cuidar tu bienestar.',
  'Nunca dejes de aprender, cada día es una nueva oportunidad para crecer.',
  'La disciplina es el puente entre las metas y los logros.',
  'Si algo no te está ayudando a crecer, es mejor dejarlo ir.',
  'Cambia tus pensamientos y cambiarás tu vida.',
  'La confianza en ti mismo es la clave para lograr lo que te propones.',
  'Si no puedes hacer grandes cosas, haz pequeñas cosas de manera grandiosa.',
  'No esperes el momento perfecto, haz que el momento sea perfecto.',
  'La adversidad puede ser una bendición disfrazada, si aprendes a verla de esa manera.',
  'Cuando algo no sale como esperabas, recuerda que siempre hay algo que aprender de ello.',
  'Escucha más de lo que hablas, las mejores lecciones se aprenden en silencio.',
  'Rodéate de personas que te inspiren a ser mejor, no de las que te limiten.',
  'La felicidad es un estado mental, no una circunstancia.',
  'Busca lo que te apasiona, y el éxito te seguirá.',
  'La vida no te da lo que deseas, te da lo que trabajas por obtener.',
  'Nunca es tarde para empezar algo nuevo y construir una mejor versión de ti mismo.',
  'La vida no es esperar a que pase la tormenta, sino aprender a bailar bajo la lluvia.',
  'No dejes que el miedo te detenga, tus sueños merecen ser perseguidos.',
  'Toma decisiones que te acerquen a tu mejor versión, no a tu versión más cómoda.',
  'Cada error es una oportunidad para aprender y mejorar.',
  'La verdadera fuerza radica en levantarse después de cada caída.',
  'No te detengas cuando estés cansado, detente cuando hayas terminado.',
  'Sigue adelante, incluso cuando sientas que no tienes fuerzas, porque cada paso te acerca a tu meta.',
  'No pongas límites a tus sueños, ponle acción a tus deseos.',
  'A veces, el mayor obstáculo es la duda que tenemos en nosotros mismos.',
  'Recuerda que los mejores cambios vienen cuando te sientes incómodo.',
  'Nunca te rindas, porque los mejores logros vienen después de las luchas más duras.',
  'Cuida tu mente como cuidas tu cuerpo, lo que piensas puede cambiar tu vida.',
  'Mantén la calma y sigue adelante, la paz interior es la verdadera victoria.',
  'La perseverancia es el combustible que te llevará a la cima del éxito.',
  'Haz siempre lo mejor que puedas, incluso cuando nadie te esté mirando.',
  'A veces, lo que necesitas no es más tiempo, sino hacer mejor uso del tiempo que ya tienes.',
  'No tengas miedo de tomar decisiones difíciles, el futuro lo agradecerá.',
  'La actitud positiva puede hacer más que cualquier esfuerzo físico.',
  'Agradece lo que tienes y trabaja por lo que quieres.',
  'Lo que tienes en este momento es suficiente para comenzar, no esperes tener más.',
  'Los pequeños avances diarios llevan al gran éxito a largo plazo.',
  'La mejor forma de predecir el futuro es crearlo.',
  'Busca lo que te llena, no lo que te distrae.',
  'La motivación te lleva a comenzar, pero el hábito te mantiene en movimiento.',
  'Cambia tu enfoque y verás cómo cambia tu vida.',
  'La vida te pondrá obstáculos, pero son solo oportunidades disfrazadas de retos.',
  'No te compares con los demás, tu único competidor eres tú mismo.',
  'Si te caes, levántate con más fuerza que antes.',
  'La felicidad no es algo que se encuentra, es algo que se construye.',
  'Cada día es una página en el libro de tu vida, asegúrate de que sea un buen capítulo.',
  'No dudes de ti mismo, confía en tus habilidades y toma riesgos.',
  'Los sueños no funcionan a menos que tú lo hagas.',
  'El éxito no es la clave de la felicidad, la felicidad es la clave del éxito.',
  'La vida es un reflejo de tus pensamientos. Si piensas positivo, tu vida será positiva.'
];

const frasesromanticas = [
  'Eres la luz que ilumina mi vida en la oscuridad.',
  'Contigo, cada día es una nueva aventura llena de amor.',
  'Tus ojos son el reflejo del cielo en el que quiero perderme.',
  'Cada latido de mi corazón lleva tu nombre.',
  'En tus brazos encontré el hogar que siempre busqué.',
  'Eres el sueño que nunca quiero despertar.',
  'El amor verdadero es estar juntos en las buenas y en las malas.',
  'No existen distancias cuando dos corazones están unidos.',
  'Tus besos son la melodía que acelera mi corazón.',
  'Amar es ver en ti lo que nadie más puede ver.',
  'En cada latido, te llevo conmigo a todas partes.',
  'El amor que siento por ti es mi fuerza y mi inspiración.',
  'Tus palabras dulces son mi alimento emocional diario.',
  'Eres el regalo más preciado que la vida me ha dado.',
  'El tiempo se detiene cuando estoy junto a ti.',
  'En tu sonrisa encuentro la felicidad que buscaba.',
  'Cada día a tu lado es una historia de amor sin fin.',
  'Nuestro amor es como un cuento de hadas hecho realidad.',
  'Tus abrazos son mi refugio en este mundo caótico.',
  'Eres la razón por la que creo en el destino.',
  'Amar es descubrir cada día algo nuevo que admiro en ti.',
  'Tu amor es el lienzo en blanco donde pinto mi felicidad.',
  'Contigo, el futuro es un camino lleno de promesas y sueños.',
  'Eres el faro que guía mi corazón en la oscuridad.',
  'La magia del amor se encuentra en cada gesto que compartimos.',
  'Nuestro amor es un baile eterno de pasión y ternura.',
  'En tus brazos, el mundo entero desaparece y solo existimos tú y yo.',
  'El amor es el idioma en el que nuestros corazones conversan.',
  'Eres el pedacito que me faltaba para completar mi alma.',
  'Amar es encontrar en ti todo lo que nunca supe que necesitaba.',
  'Tus ojos son la razón por la que mi corazón late más rápido.',
  'Contigo, mi mundo es más brillante y mi vida más hermosa.',
  'Eres el primer pensamiento en mi mente al despertar y el último antes de dormir.',
  'Tu sonrisa ilumina mi día y tu amor da sentido a mi vida.',
  'No te amo por lo que eres, te amo por lo que soy cuando estoy contigo.',
  'Si el amor tuviera una forma, sería tu sonrisa.',
  'Cada vez que pienso en ti, mi corazón sonríe.',
  'Tu amor me ha enseñado lo que es la verdadera felicidad.',
  'Eres el sueño que nunca quiero despertar.',
  'Cada momento contigo es un regalo que atesoro profundamente.',
  'Me haces sentir especial con solo mirarme.',
  'Si fueras una canción, serías mi favorita.',
  'Eres mi sol en los días nublados.',
  'Amar es estar juntos en las buenas y en las malas, y contigo siempre será así.',
  'Tu amor es la medicina que mi alma necesitaba.',
  'Mi lugar favorito es en tus brazos.',
  'El amor no se trata de encontrar a alguien con quien vivir, se trata de encontrar a alguien con quien no puedas vivir sin.',
  'Eres la razón por la que mi corazón late más fuerte.',
  'Lo mejor de mi día es pensar en ti.',
  'Amarte es tan fácil, no puedo evitarlo.',
  'Tus abrazos son mi lugar favorito en este mundo.',
  'Cada día que paso contigo, me doy cuenta de lo afortunado/a que soy.',
  'Eres la mejor parte de mi vida.',
  'Tu amor me completa de una forma que nunca imaginé.',
  'Si pudiera vivir en tu sonrisa, lo haría para siempre.',
  'Cada segundo a tu lado es un regalo.',
  'Tenerte cerca hace que todo a mi alrededor sea más bonito.',
  'Tú eres la melodía que da ritmo a mi vida.',
  'Me haces sentir que todo es posible.',
  'Contigo, cada día es una nueva aventura llena de amor.',
  'Tus ojos son el reflejo de lo que quiero ver para siempre.',
  'No sé cómo lo haces, pero cada día me enamoro más de ti.',
  'Mi vida se ilumina con cada sonrisa tuya.',
  'Eres el amor de mi vida, y mi razón para sonreír.',
  'Si pudiera pedir un deseo, sería estar siempre contigo.',
  'Tú eres mi mejor amigo/a, mi confidente y mi amor eterno.',
  'Nuestro amor es el mejor capítulo de mi vida.',
  'Si fueras un poema, serías el verso más hermoso.',
  'Tu voz es mi sonido favorito.',
  'El amor que siento por ti me llena de paz y felicidad.',
  'Tus abrazos son lo que me da fuerzas para seguir.',
  'Eres el sueño que siempre quise y nunca supe que tenía.',
  'Me haces sentir afortunado/a por amarte.',
  'A tu lado, todo parece más brillante y hermoso.',
  'Tenerte en mi vida es lo mejor que me ha pasado.',
  'Eres mi corazón, mi alegría, mi vida.',
  'Cada beso tuyo es como un cuento de hadas hecho realidad.',
  'Tus palabras son mi consuelo, tu risa es mi felicidad.',
  'Cuando estoy contigo, siento que no hay nada más importante que ese momento.',
  'La vida me dio muchos regalos, pero tú eres el mejor de todos.',
  'El amor no es perfecto, pero contigo se acerca mucho a serlo.',
  'En tus ojos veo un futuro lleno de amor y felicidad.',
  'Amar es estar juntos incluso cuando el mundo se pone en contra.',
  'Contigo, todo lo que antes parecía imposible se vuelve real.',
  'Siempre que estoy contigo, siento que el tiempo se detiene.',
  'Eres la razón por la que mi corazón late más fuerte.',
  'No hay un solo momento en el que no te ame más que antes.',
  'Gracias por hacer de mi vida un lugar mejor solo con tu presencia.',
  'A tu lado soy la mejor versión de mí mismo/a.',
  'Nunca imaginé que el amor podría ser tan grande hasta que llegaste tú.',
  'Contigo a mi lado, todo parece posible.',
  'El amor verdadero no es solo un sentimiento, es una acción diaria, y contigo lo vivo todos los días.',
  'Cada día a tu lado es un nuevo capítulo de nuestro hermoso libro.',
  'El amor se encuentra en las pequeñas cosas, como tu sonrisa.',
  'Nunca supe lo que era el amor hasta que te conocí.',
  'Tu amor es todo lo que necesito para ser feliz.',
  'En tu amor encuentro mi paz y mi alegría.',
  'A tu lado, el mundo se convierte en un lugar mucho mejor.'
];
// --- Fin Listas de Frases ---


module.exports = {
    name: 'frases_varias',
    aliases: ['consejo', 'fraseromantica'], // Los comandos que activan este plugin
    description: 'Envía un consejo o una frase romántica al azar.',
    category: 'Diversión',
    
    async execute(client, message, args) {
        // El primer argumento (si existe) nos dice qué comando se usó realmente
        // Aunque nuestro bot.js pasa los args *después* del comando, necesitamos saber
        // cuál de los alias fue el que disparó la ejecución.
        // Podemos obtenerlo del `message.body` original.
        const prefix = '!'; // Asumiendo que este es tu prefijo
        const commandUsed = message.body.slice(prefix.length).trim().split(/ +/)[0].toLowerCase();

        if (commandUsed === 'consejo') {
            // Seleccionar consejo al azar
            const randomConsejo = consejos[Math.floor(Math.random() * consejos.length)];
            // Formatear mensaje
            const mensajeConsejo = `╭─◆────◈⚘◈─────◆─╮\n\n` +
                                   `    🌟 *Consejo del día* 🌟\n\n` +
                                   `❥ ${randomConsejo}\n\n` +
                                   `╰─◆────◈⚘◈─────◆─╯`;
            // Enviar
            await message.reply(mensajeConsejo);

        } else if (commandUsed === 'fraseromantica') {
            // Seleccionar frase romántica al azar
            const randomFrase = frasesromanticas[Math.floor(Math.random() * frasesromanticas.length)];
            // Formatear mensaje
            const mensajeFrase = `╭─◆────◈⚘◈─────◆─╮\n\n` +
                                 `    💖 *Frase romántica* 💖\n\n` +
                                 `❥ ${randomFrase}\n\n` +
                                 `╰─◆────◈⚘◈─────◆─╯`;
            // Enviar
            await message.reply(mensajeFrase);

        } else {
            // Esto no debería pasar si bot.js funciona bien, pero por si acaso
            console.warn(`[Frases Varias] Se llamó a execute con un comando no reconocido: ${commandUsed}`);
            await message.reply("Hubo un error interno con este comando.");
        }
    }
};