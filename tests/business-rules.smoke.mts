import { appointmentService } from '../src/services/appointmentService';
import { mockAppointments } from '../src/mocks/appointments';
import { generateTimeSlots } from '../src/utils/slotGenerator';

const results: string[] = [];
const check = (name: string, ok: boolean) => results.push(`${ok ? 'PASS' : 'FAIL'} - ${name}`);

const occupied = mockAppointments.find((a) => a.status !== 'cancelado')!;
const base = { providerId: 'prov-1', serviceId: 'svc-1', clientName: 'Teste', date: occupied.date, time: occupied.time };

// 1. horário já ocupado deve ser rejeitado
try { await appointmentService.create(base); check('rejeita horário ocupado', false); }
catch { check('rejeita horário ocupado', true); }

// 2. horário livre é aceito; segunda tentativa no mesmo horário é rejeitada
const free = { ...base, time: '17:30' };
const created = await appointmentService.create(free);
check('aceita horário livre', created.status === 'agendado');
try { await appointmentService.create(free); check('rejeita agendamento duplo', false); }
catch { check('rejeita agendamento duplo', true); }

// 3. cancelar libera o horário
await appointmentService.updateStatus(created.id, 'cancelado');
try { await appointmentService.create(free); check('cancelado libera o horário', true); }
catch { check('cancelado libera o horário', false); }

// 4. slots com ocupados marcados como indisponíveis
const day = await appointmentService.listByProviderAndDate('prov-1', occupied.date);
const slots = generateTimeSlots({
  periods: [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }],
  slotIntervalMinutes: 30,
  occupiedTimes: day.filter((a) => a.status !== 'cancelado').map((a) => a.time),
});
check('almoço 12:00-14:00 não gera horários', !slots.some((s) => s.time >= '12:00' && s.time < '14:00'));
check('horário ocupado vem indisponível', slots.find((s) => s.time === occupied.time)?.available === false);
check('total 16 horários (2 períodos de 4h /30min)', slots.length === 16);

const s25 = generateTimeSlots({ periods: [{ start: '10:00', end: '12:15' }], slotIntervalMinutes: 25 }).map((s) => s.time).join(',');
check('25min: 10:00,10:25,10:50,11:15,11:40,12:05', s25 === '10:00,10:25,10:50,11:15,11:40,12:05');
const s15 = generateTimeSlots({ periods: [{ start: '10:00', end: '11:00' }], slotIntervalMinutes: 15 }).map((s) => s.time).join(',');
check('15min: 10:00,10:15,10:30,10:45', s15 === '10:00,10:15,10:30,10:45');

// 5. sobreposição de períodos não duplica horários
const overlap = generateTimeSlots({ periods: [{ start: '08:00', end: '10:00' }, { start: '09:00', end: '11:00' }], slotIntervalMinutes: 30 });
check('períodos sobrepostos sem duplicar', overlap.length === new Set(overlap.map((s) => s.time)).size);

console.log(results.join('\n'));
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
