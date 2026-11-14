/**
 * Pestañas de la hoja y sus columnas. La app solo lee: setupApplication crea las que falten con su cabecera y nunca
 * borra ni reordena nada. EmailSummary_NotSent es la fuente principal (un envío por fila, con sus motivos); los envíos
 * que solo estén en EmailSummary se completan con NotSentData (jobid, asl_cod, suppressedcount).
 */
const SHEETS = Object.freeze({
  SUMMARY_NOT_SENT: 'EmailSummary_NotSent',
  SUMMARY: 'EmailSummary',
  NOT_SENT_DATA: 'NotSentData',
  ASL_CATALOG: 'ASL_Catalog',
  NOT_SENT_CATALOG: 'NotSent_Catalog'
});

const SHEET_HEADERS = Object.freeze({
  EmailSummary_NotSent: ['ClientID', 'ClientName', 'JobID', 'EmailName', 'SendStartTime', 'SendCompleteTime', 'TotalBase', 'Sends',
    'Total NotSent', 'ImplicitDeliveries', 'ImplicitDeliveryRate', 'OverallBounces', 'OverallBounceRate', 'HardBounces', 'HardBounceRate',
    'SoftBounces', 'SoftBounceRate', 'BlockBounces', 'BlockBounceRate', 'TechnicalBounces', 'TechnicalBounceRate', 'UnknownBounces',
    'UnknownBounceRate', 'UniqueOpens', 'CumulativeOpens', 'OpenRate', 'UniqueClicks', 'CumulativeClicks', 'ClickRate', 'UniqueComplaints',
    'CumulativeComplaints', 'ComplaintRate', 'UniqueUnsubscribes', 'CumulativeUnsubscribes', 'UnsubscribeRate'],
  EmailSummary: ['ClientID', 'ClientName', 'JobID', 'EmailName', 'SendStartTime', 'SendCompleteTime', 'Sends', 'ImplicitDeliveries',
    'ImplicitDeliveryRate', 'OverallBounces', 'OverallBounceRate', 'HardBounces', 'HardBounceRate', 'SoftBounces', 'SoftBounceRate',
    'BlockBounces', 'BlockBounceRate', 'TechnicalBounces', 'TechnicalBounceRate', 'UnknownBounces', 'UnknownBounceRate', 'UniqueOpens',
    'CumulativeOpens', 'OpenRate', 'UniqueClicks', 'CumulativeClicks', 'ClickRate'],
  NotSentData: ['Fecha', 'jobid', 'asl_cod', 'suppressedcount'],
  ASL_Catalog: ['ASL_Cod', 'ASL_Name', 'Descripción Corta', 'ASL_Description', 'ASL_AttributionPriority'],
  NotSent_Catalog: ['NS_Cod', 'NS_Name', 'NS_ShortName', 'NS_Description']
});
