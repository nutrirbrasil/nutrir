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
      "A primeira resposta está na sua cabeça... literalmente, e não é dentro",
    password: "SHELDON",
  },
  {
    prompt:
      "Vamos continuar no quarto, já que ainda estamos na cama vamos continuar por algo fácil e que está a seu alcance, na verdade você está deitado nele.",
    password: "MOANINHAMOAZEDA",
  },
  {
    prompt:
      "Agora vamos precisar levantar para ir em busca do tesouro, lave o rosto para acordar e vamos a caça...",
    password: "MAMÃE",
  },
  {
    prompt:
      "Essa fui eu (MOA) que escondi mãe, o pai e o mano não sabem onde está...",
    password: "AMAR",
  },
  {
    prompt:
      "Dessa vez fui eu quem escondi mamãe (Sheldon), aproveitei pra fazer um caguinho junto",
    password: "ADMIRAR",
  },
  {
    prompt:
      "Tava fedorento, não imaginei que o Sheldon fosse esconder ali. Melhor lavar a mão né?.",
    password: "VOCÊ",
  },
  {
    prompt:
      "Uma pausa só para te lembrar que tem um monte de roupas ali no meu sofá, daqui a pouco vai surgir coisas ali...",
    password: "MUNDO",
  },
  {
    prompt:
      "O próximo passo talvez seja um pouco mais complexo, talvez você precise usar o computador",
    password: "TANTO",
  },
  {
    prompt:
      "Como eu disse, é complexo, tome um café antes de continuar...",
     password: "UM",
  },
  {
    prompt:
      "Agora vamos continuar, a senha passada estava errada. Eu falei que era complexo, e falei para usar o computador, não apenas abrir! Volte lá, a resposta está no computador",
    password: "BUNDALÃO",
  },
  {
    prompt:
      "A senha está errada de novo, pode estar mais escondida no computador, talvez em algum arquivo ou até mesmo no email",
    password: "ANO",
  },
  {
    prompt:
      "Ainda está errada, você olhou no meu email, que tal procurar no seu?",
    password: "JANEIRO",
  },
  {
    prompt:
      "Agora sim! Finalmente, foi cansativo, que tal descansar um pouco, olhando a vista dessa janela... fico me perguntando o que Sheldon pensa quando está deitado na caminha dele, as vezes sinto que esconde coisas lá...",
    password: "AMO",
  },
  {
    prompt:
      "Não é que ele esconde mesmo! Por essa eu e a Moa não esperavamos, se ele esconde na caixinha e na caminha, então imagina o que será que ele esconde na coisa que ele mais gosta (tirando você).",
    password: "EXTRAORDINARIA",
  },
  {
    prompt:
      "Eu vi que essa semana o Sheldon estava mexendo na casinha dele que ele nunca mais tinha mexido, comportamento estranho, não? Será que ele escondeu mais alguma coisa lá?.",
    password: "PENSAR",
  },
  {
    prompt:
      "Essa noite eu escutei um barulho lá fora, alguém estava mexendo no carrudo, será que foi o Sheldon e a Moa? Acho que eles estavam escondendo alguma coisa lá dentro...",
    last: true,
  },
];

export const bonus = {
  title: "Você achou o nosso presente mamãe, mas ainda falta o do papai!",
  hint: "A sua segunda caneca está em outro lugar. É um presente meu junto com o Patachu, Capivaruda e Hello Kitty",
  button: "Encontrei o segundo presente",
};

export const finale = {
  title: "Feliz aniversário, meu amor!",
  message:
    "Te amo mais do que tudo. Que venham mais muitos aniversários ao seu lado. Eu te amo, Bilu. Feliz aniversário!",
};
