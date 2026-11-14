/** Entrada de la web app: entrega Index.html (todo el cliente integrado por el build) con los datos de arranque. */

function doGet() {
  forgetTables_();
  let email;
  try { email = normalizeEmail_(Session.getActiveUser().getEmail()); } catch (error) { email = ''; }
  const boot = { environment: APP_BUILD_ENVIRONMENT, email };
  // La vista general va en la misma página: abre sin otra llamada. Si falla, el cliente la pide como siempre.
  try { boot.overview = overviewData_(); } catch (error) { console.warn(`Vista general no incluida al abrir: ${error && error.message}`); }
  // "<" escapado: el JSON no puede cerrar la etiqueta script aunque un valor lo contenga.
  const script = `<script>globalThis.APP_BOOT=${JSON.stringify(boot).replace(/</g, '\\u003c')};</script>`;
  // Con función: en un texto de reemplazo, «$'» o «$&» de un nombre se interpretarían y dañarían la página.
  const html = HtmlService.createHtmlOutputFromFile('Index').getContent().replace('<head>', () => `<head>${script}`);
  return HtmlService
    .createHtmlOutput(html)
    .setTitle(APP.TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Comprueba de punta a punta servidor, despliegue y usuario. */
function getServerInfo() {
  return runApi_(() => {
    const email = normalizeEmail_(Session.getActiveUser().getEmail());
    assert_(email, 'USER_NOT_IDENTIFIED');
    return {
      email,
      environment: APP_BUILD_ENVIRONMENT,
      configured: Boolean(PropertiesService.getScriptProperties().getProperty(APP.PROPERTIES.SPREADSHEET_ID)),
      serverTime: isoDateTime_()
    };
  }, 'getServerInfo');
}
