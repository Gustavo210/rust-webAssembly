const arquivo = "./target/wasm32-unknown-unknown/release/editor.wasm";

WebAssembly.instantiateStreaming(fetch(arquivo)).then((wasm) => {
  const { instance } = wasm;

  const { subtracao, criar_memoria_inicial, malloc, acumular, memory } =
    instance.exports;

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
});
