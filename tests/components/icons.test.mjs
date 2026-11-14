// Ícono de cada motivo por tipo de regla y de cada familia; los desconocidos toman uno de su origen.
import { test, expect } from 'vitest';
import { motiveIcon, familyIcon } from '@/lib/icons.mjs';

test('motivos por tipo de regla, y los desconocidos por su origen', () => {
  expect(motiveIcon('ASL_NO_OPENERS', 'asl')).toBe('mailEyeOff');
  expect(motiveIcon('ASL_SATURACION_MENSUAL', 'asl')).toBe('mailStack');
  expect(motiveIcon('Exclusion_SoftBounces', 'asl')).toBe('mailBounce');
  expect(motiveIcon('ASL_EXCLUSION_LPDP_NOACEPTADO', 'asl')).toBe('shield');
  expect(motiveIcon('Exclusion_Complaints', 'asl')).toBe('flag');
  expect(motiveIcon('Held', 'blq')).toBe('userBlocked');
  expect(motiveIcon('Unsubscribed Master', 'blq')).toBe('userX');
  expect(motiveIcon('Re-engage no contactables', 'asl')).toBe('mailRefresh');
  expect(motiveIcon('LISTA_NUEVA', 'asl')).toBe('mailFunnel');
  expect(motiveIcon('Estado raro', 'blq')).toBe('shieldX');
});

test('familias', () => {
  expect(familyIcon('Cyber')).toBe('tag');
  expect(familyIcon('Transaccional')).toBe('fileText');
  expect(familyIcon('Otras')).toBe('mail');
});
