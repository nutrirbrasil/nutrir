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
      "Falando em estar deitado nele, agora vamos precisar levantar para ir em busca do tesouro, e talvez fazer uma forcinha porque o terceiro está escondido, mas você também estava deitado nele...",
    password: "MAMÃE",
  },
  {
    prompt:
      "Essa fui eu (MOA) que escondi mãe, o pai e o mano não sabemos onde está...",
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
    password: "TANTO",
  },
  {
    prompt:
      "O próximo passo talvez seja um pouco mais complexo, talvez você precise usar o computador",
    password: "UM",
  },
  {
    prompt:
      "A senha estava errada. Eu falei que era complexo, e falei para usar o computador, não apenas abrir!.",
    password: "BUNDALÃO",
  },
  {
    prompt:
      "A senha está errada de novo, pode estar mais escondida no computador, talvez em algum arquivo ou até mesmo no email",
    password: "ANO",
  },
  {
    prompt:
      "Ainda está errada, você olhou no email dele, que tal procurar no seu?",
    password: "BOLO",
  },
  {
    prompt:
      "Agora sim! Finalmente, foi cansativo, que tal descansar um pouco, olhando a vista dessa janela... fico me perguntando o que Sheldon pensa quando está deitado na caminha dele, as vezes sinto que esconde coisas lá...",
    password: "ANO",
  },
  {
    prompt:
      "Não é que ele esconde mesmo! Por essa eu e a Moa não esperavamos, se ele esconde na caixinha e na caminha, então imagina o que será que ele esconde na coisa que ele mais gosta (tirando você).",
    password: "JANEIRO",
  },
  {
    prompt:
      "Por mim entra o sol de manhã e a lua de noite. Dizem que eu tenho vista para o futuro. Procure atrás da minha cortina.",
    password: "AMO",
  },
  {
    prompt:
      "Sou o lugar mais macio da casa, onde os dias terminam e os sonhos começam. Procure por baixo do meu travesseiro.",
    password: "SONECA",
  },
  {
    prompt:
      "A última charada, a mais importante! O seu presente está onde guardamos as nossas lembranças mais bonitas, com fotos e sorrisos de nós dois. Procure com o coração.",
    last: true,
  },
];

export const bonus = {
  title: "Você achou o seu presente!",
  hint: "Mas a caçada ainda não acabou: a sua segunda caneca está escondido em outro lugar. Aqui vai uma dica extra: ela está em lugar que você já procurou, mas mais bem escondido",
  button: "Encontrei o segundo presente",
};

export const finale = {
  title: "Feliz aniversário, meu amor!",
  message:
    "Você completou a caçada e provou que me conhece (e que me ama) mais do que qualquer charada consegue medir. 16 charadas, 32 anos de vida e uma vida inteira pela frente ao seu lado. Eu te amo, Bilu. Feliz aniversário!",
};
