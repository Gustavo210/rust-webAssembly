const arquivo = "./editor.wasm";
const input = document.querySelector("input");
const botaoResetarFiltro = document.querySelector("#remover");
const botaoPBFiltroJS = document.querySelector("#preto-e-branco-js");
const botaoPBFiltroWASM = document.querySelector("#preto-e-branco-wasm");

let imagemOriginal = document.getElementById("imagem").src;

input.addEventListener("change", (event) => {
  const arquivo = event.target.files[0];
  const reader = new FileReader();

  const imagem = document.getElementById("imagem");
  imagem.title = arquivo.name;

  reader.onload = function (event) {
    imagem.src = event.target.result;
    imagemOriginal = event.target.result;
  };

  reader.readAsDataURL(arquivo);
});

botaoResetarFiltro.addEventListener("click", () => {
  const imagem = document.getElementById("imagem");
  imagem.src = imagemOriginal;
  console.log("imagemOriginal", imagemOriginal);
});
botaoPBFiltroJS.addEventListener("click", () => {
  const imagem = document.getElementById("imagem");
  const { canvas, contexto } = converteImagemParaCanvas(imagem);
  const base64 = filtroPretoBrancoJS(canvas, contexto);
  imagem.src = base64;
});

function converteImagemParaCanvas(imagem) {
  const canvas = document.createElement("canvas");
  const contexto = canvas.getContext("2d");
  canvas.width = imagem.naturalWidth || imagem.width;
  canvas.height = imagem.naturalHeight || imagem.height;

  contexto.drawImage(imagem, 0, 0);

  return { canvas, contexto };
}

function filtroPretoBrancoJS(canvas, contexto) {
  const dadosDaImagem = contexto.getImageData(
    0,
    0,
    canvas.width,
    canvas.height
  );
  const pixels = dadosDaImagem.data;

  const inicio = performance.now();
  for (var i = 0, n = pixels.length; i < n; i += 4) {
    const filtro = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    pixels[i] = filtro;
    pixels[i + 1] = filtro;
    pixels[i + 2] = filtro;
  }
  const fim = performance.now();
  tempoDaOperacao(inicio, fim, "filtroPretoBrancoJS");

  contexto.putImageData(dadosDaImagem, 0, 0);

  return canvas.toDataURL("image/jpeg");
}
function tempoDaOperacao(inicio, fim, nomeDaOperacao) {
  const performance = document.querySelector("#performance");
  performance.textContent = `Tempo de execução do ${nomeDaOperacao}: ${
    fim - inicio
  }ms`;
}

WebAssembly.instantiateStreaming(fetch(arquivo)).then(({ instance }) => {
  const {
    subtracao,
    criar_memoria_inicial,
    malloc,
    acumular,
    memory,
    filtro_preto_e_branco,
    filtro_vermelho,
    filtro_verde,
    filtro_azul,
    filtro_opacidade,
    filtro_inversao,
  } = instance.exports;
  adicionarFiltro("Preto e branco wasm", "#preto-e-branco-wasm", {
    instance,
    filtro: filtro_preto_e_branco,
  });
  adicionarFiltro("Vermelho wasm", "#vermelho-wasm", {
    instance,
    filtro: filtro_vermelho,
  });
  adicionarFiltro("Verde wasm", "#verde-wasm", {
    instance,
    filtro: filtro_verde,
  });
  adicionarFiltro("Azul wasm", "#azul-wasm", {
    instance,
    filtro: filtro_azul,
  });
  adicionarFiltro("Opacidade wasm", "#opacidade-wasm", {
    instance,
    filtro: filtro_opacidade,
  });
  adicionarFiltro("Inversão wasm", "#inversao-wasm", {
    instance,
    filtro: filtro_inversao,
  });

  criar_memoria_inicial();

  const arrayMemoria = new Uint8Array(memory.buffer, 0);
  console.log("arrayMemoria", arrayMemoria);
  console.log("subtracao(10, 5)", subtracao(10, 5));

  const jsLista = Uint8Array.from([20, 50, 80]);
  const comprimento = jsLista.length;
  const wasmListaPonteiro = malloc(comprimento);

  const wasmLista = new Uint8Array(
    memory.buffer,
    wasmListaPonteiro,
    comprimento
  );
  wasmLista.set(jsLista);

  const somaEntreItensDaLista = acumular(wasmListaPonteiro, comprimento);
  console.log("somaEntreItensDaLista", somaEntreItensDaLista);
  // botaoPBFiltroWASM.addEventListener("click", () => {
  //   const imagem = document.getElementById("imagem");
  //   const { canvas, contexto } = converteImagemParaCanvas(imagem);
  //   const dadosDaImagem = contexto.getImageData(
  //     0,
  //     0,
  //     canvas.width,
  //     canvas.height
  //   );
  //   const buffer = dadosDaImagem.data.buffer;
  //   const u8Array = new Uint8Array(buffer);
  //   const ponteiro = malloc(u8Array.length);

  //   let wasmArray = new Uint8Array(memory.buffer, ponteiro, u8Array.length);

  //   wasmArray.set(u8Array);

  //   const inicio = performance.now();
  //   filtro_preto_e_branco(ponteiro, u8Array.length);
  //   const fim = performance.now();
  //   tempoDaOperacao(inicio, fim, "filtroPretoBrancoWASM");
  //   const width = imagem.naturalWidth || imagem.width;
  //   const height = imagem.naturalHeight || imagem.height;
  //   const novoDadosDaImagem = contexto.createImageData(width, height);
  //   novoDadosDaImagem.data.set(wasmArray);
  //   contexto.putImageData(novoDadosDaImagem, 0, 0);
  //   imagem.src = canvas.toDataURL("image/jpeg");
  // });
});
function executarFiltro(image, processImageFn) {
  const { canvas } = converteImagemParaCanvas(image);
  if (!processImageFn) {
    return canvas.toDataURL();
  }

  if (typeof processImageFn === "function") {
    processImageFn(canvas, canvas.getContext("2d"));
    return canvas.toDataURL("image/jpeg");
  }
}
function adicionarFiltro(text, selector, { instance, filtro }) {
  const button = document.querySelector(selector);
  const imagem = document.getElementById("imagem");
  button.addEventListener("click", () => {
    executarFiltro(imagem, (canvas, context) => {
      const image = document.getElementById("imagem");
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const buffer = imageData.data.buffer;
      const u8Array = new Uint8Array(buffer);
      let wasmClampedPtr = instance.exports.malloc(u8Array.length);
      let wasmClampedArray = new Uint8ClampedArray(
        instance.exports.memory.buffer,
        wasmClampedPtr,
        u8Array.length
      );
      wasmClampedArray.set(u8Array);
      const startTime = performance.now();
      filtro(wasmClampedPtr, u8Array.length);
      const endTime = performance.now();
      tempoDaOperacao(startTime, endTime, text);
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      const newImageData = context.createImageData(width, height);
      newImageData.data.set(wasmClampedArray);
      context.putImageData(newImageData, 0, 0);
      image.src = canvas.toDataURL("image/jpeg");
    });
  });
}
