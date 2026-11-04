export type Place = {
  prompt: string;
  password?: string;
  last?: boolean;
};

export const opener = {
  prompt: "Para aquecer os motores, resolva esta continha.",
  equation: "(9 × 4 + 8) ÷ 2 + 10 = ?",
  answer: "32",
};

// Cada item é um lugar da casa com um papel escondido. A senha ignora acentos, maiúsculas e espaços.
export const places: Place[] = [
  {
    prompt:
      "Tenho porta, mas nunca saio de casa. Sou fria por fora, mas guardo o que esquenta o seu coração (e a sua barriga). Abra-me com cuidado: tem um papel escondido entre os sabores.",
    password: "BRIGADEIRO",
  },
  {
    prompt:
      "Depois de um dia cansativo, é em mim que você desaba. Já ouvi muitas maratonas de série e muitas risadas. Olhe entre as minhas almofadas.",
    password: "CONFETE",
  },
  {
    prompt:
      "Eu mostro quem você é, mas nunca me canso de ver o seu sorriso. É diante de mim que você se arruma para brilhar. Procure um papel pertinho do meu reflexo.",
    password: "BALAO",
  },
  {
    prompt:
      "Tenho muitas histórias, mas nenhuma é tão bonita quanto a nossa. Procure entre as minhas páginas.",
    password: "VELINHA",
  },
  {
    prompt:
      "Preciso de luz, água e carinho para crescer, assim como o amor. Procure ao lado de quem tem folhas e flores.",
    password: "SERPENTINA",
  },
  {
    prompt:
      "Aqui nascem os cheiros mais gostosos da casa. O fogo trabalha, a fome vai embora e o papel te espera pertinho do meu calor (bem desligado, claro).",
    password: "PARABENS",
  },
  {
    prompt:
      "Por mim você sai e por mim você volta para casa. Onde descansam os seus sapatos, a senha está esperando por você.",
    password: "CHAMPANHE",
  },
  {
    prompt:
      "Toda casa tem uma gaveta de coisas que um dia vamos usar. A senha está escondida na nossa gaveta da bagunça.",
    password: "DESEJO",
  },
  {
    prompt:
      "Eu giro, giro e giro, deixo tudo cheiroso e nunca reclamo. Onde a roupa suja vira roupa limpa, tem um papel escondido.",
    password: "DOCINHO",
  },
  {
    prompt:
      "Aqui a gente divide o pão, as conversas e muitos planos. Olhe por baixo de quem sustenta os nossos jantares.",
    password: "FESTA",
  },
  {
    prompt:
      "Guardo todas as suas roupas, mesmo quando você diz que não tem o que vestir. Procure entre os cabides.",
    password: "BOLO",
  },
  {
    prompt:
      "Sou escura quando durmo e cheia de cor quando acordo. Meu controle sempre some, mas o papel está bem pertinho dele.",
    password: "SORRISO",
  },
  {
    prompt:
      "Sou macia, vivo no chão e já vi muita dança desengonçada e muito carinho no fim de tarde. Levante a minha pontinha e descubra.",
    password: "ESTRELA",
  },
  {
    prompt:
      "Por mim entra o sol de manhã e a lua de noite. Dizem que eu tenho vista para o futuro. Procure atrás da minha cortina.",
    password: "ABRACO",
  },
  {
    prompt:
      "Chovo sem nuvem e faço barulho sem trovão. Quando você entra em mim, sai renovada. Procure pertinho de mim, protegido da água.",
    password: "LUA",
  },
  {
    prompt:
      "Sou o lugar mais macio da casa, onde os dias terminam e os sonhos começam. Procure por baixo do meu travesseiro.",
    password: "SONECA",
  },
  {
    prompt:
      "Em um minutinho eu esquento o que esfriou e faço estourar a pipoca das nossas sessões de filme. Abra a minha portinha (mas não me ligue!).",
    password: "PIPOCA",
  },
  {
    prompt:
      "Eu escuto o barulho da louça e o papo de quem lava. A água corre por mim o dia inteiro. Olhe dentro do armário que fica embaixo de mim.",
    password: "CARINHO",
  },
  {
    prompt:
      "Tenho muitos sabores e um pouquinho de cada coisa que deixa a comida da nossa casa especial. Procure entre os meus potinhos.",
    password: "TEMPERO",
  },
  {
    prompt:
      "Seco o que está molhado com a ajuda do sol e do vento. Olhe pendurado entre as roupas que balançam.",
    password: "SOL",
  },
  {
    prompt:
      "Aqui se trabalha, se planeja e se sonha. Procure embaixo do teclado ou entre os papéis, mas não vale bagunçar.",
    password: "SEGREDO",
  },
  {
    prompt:
      "Fico ao lado da cama e guardo o último pensamento do dia e o primeiro do outro. Abra a minha gaveta.",
    password: "SONHO",
  },
  {
    prompt:
      "Escondo as ferramentas de quem deixa tudo brilhando. Entre as vassouras e os rodos, tem um papel esperando.",
    password: "MAGIA",
  },
  {
    prompt:
      "Sou colorida e cheia de vitaminas, e a nutricionista aqui da casa aprova! Procure por baixo das minhas frutas.",
    password: "FRUTINHA",
  },
  {
    prompt:
      "Recebo tudo o que já foi usado e nunca julgo ninguém. Procure no fundo de mim.",
    password: "RISADA",
  },
  {
    prompt:
      "Sou macia, seco o seu rosto e abraço você depois do banho. Procure entre as minhas dobras.",
    password: "ALEGRIA",
  },
  {
    prompt:
      "Quando você precisa de silêncio, é aqui que se acomoda para ler ou descansar. Olhe por baixo da almofada do seu cantinho favorito.",
    password: "ENCANTO",
  },
  {
    prompt:
      "Fico entre o dia e a noite, entre a sala e o sonho. Procure na minha maçaneta ou bem pertinho dela.",
    password: "AVENTURA",
  },
  {
    prompt:
      "Tenho voz, mas só falo quando você quer. Quantas músicas já dançamos por minha causa? Procure atrás de mim.",
    password: "MUSICA",
  },
  {
    prompt:
      "Recebo quem chega e limpo os pés de quem entra. Levante a minha pontinha e descubra.",
    password: "BEIJO",
  },
  {
    prompt:
      "Seguro casacos de dias frios e guardo abraços de quem chega em casa. Procure no bolso de um dos meus casacos.",
    password: "TESOURO",
  },
  {
    prompt:
      "A última charada, a mais importante! O seu presente está onde guardamos as nossas lembranças mais bonitas, com fotos e sorrisos de nós dois. Procure com o coração.",
    last: true,
  },
];

export const bonus = {
  title: "Você achou o seu presente!",
  hint: "Mas a caçada ainda não acabou: o seu segundo presente está escondido em outro lugar. Aqui vai uma dica extra: ele está no lugar onde a gente se reúne no fim do dia para conversar e rir juntos. Pense no cantinho favorito da casa e vá até lá.",
  button: "Encontrei o segundo presente",
};

export const finale = {
  title: "Feliz aniversário, meu amor!",
  message:
    "Você completou a caçada e provou que me conhece (e que me ama) mais do que qualquer charada consegue medir. 32 charadas para 32 anos, e uma vida inteira pela frente ao seu lado. Eu te amo, Bilu. Feliz aniversário!",
};
