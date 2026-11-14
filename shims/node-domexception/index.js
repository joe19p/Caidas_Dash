// Node 22 trae DOMException global; el paquete original solo lo devolvía.
module.exports = globalThis.DOMException;
