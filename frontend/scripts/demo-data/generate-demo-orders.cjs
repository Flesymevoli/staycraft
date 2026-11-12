// Generates the demo CSV pair relative to today, avoiding the sample property's own
// bookings. Two goals: the demo works on any day, and no fictional room night overlaps.
// Outputs baseline + update into this directory. Writes only those two files.
const fs = require('node:fs');
const path = require('node:path');

const { createSample } = require('../operator-sample-data.cjs');
const sample = createSample(undefined, { rich: false });
const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date());
const DAY = 86400000;
const shift = (value, offset) => new Date(Date.parse(value) + offset * DAY).toISOString().slice(0, 10);

const rooms = sample.inventory.rooms.filter(room => room.active);
const typesById = new Map(sample.inventory.types.map(type => [type.id, type]));
const roomList = rooms.map(room => ({ number: room.number, typeName: typesById.get(room.typeId).name, price: typesById.get(room.typeId).price, id: room.id }));
const occupied = new Set();
for (const booking of sample.bookings) {
  if (booking.status !== 'confirmed') continue;
  for (let date = booking.arrival; date < booking.departure; date = shift(date, 1)) occupied.add(`${booking.room_id}:${date}`);
}
const conflict = (id, arrival, departure) => {
  for (let date = arrival; date < departure; date = shift(date, 1)) if (occupied.has(`${id}:${date}`)) return true;
  return false;
};
const mark = (id, arrival, departure) => {
  for (let date = arrival; date < departure; date = shift(date, 1)) occupied.add(`${id}:${date}`);
};

// Round-robin over rooms so the demo shows every rate plan, taking the first free slot.
const cursor = { index: 0 };
function freeRoom(arrival, departure) {
  for (let attempt = 0; attempt < roomList.length; attempt++) {
    const room = roomList[(cursor.index + attempt) % roomList.length];
    if (conflict(room.id, arrival, departure)) continue;
    mark(room.id, arrival, departure);
    cursor.index = (cursor.index + attempt + 1) % roomList.length;
    return room;
  }
  throw new Error('no free room for ' + arrival + '..' + departure);
}

const channels = ['携程旅行网', '美团民宿', '飞猪', '抖音生活', '小红书私信'];
const prefixes = ['CTRIP', 'MT', 'FL', 'DY', 'XHS'];
let sequence = 0;
const stampAt = offsetHours => new Date(Date.now() - offsetHours * 3600000).toISOString().replace(/\.\d{3}Z$/, 'Z');

const rows = [];
function add({ arrival, departure, status = 'confirmed', channelIndex, updated, serial, room }) {
  const chosen = room || freeRoom(arrival, departure);
  const nights = Math.round((Date.parse(departure) - Date.parse(arrival)) / DAY);
  const row = { channel: channels[channelIndex], externalId: `${prefixes[channelIndex]}-${serial || String(1000 + ++sequence)}`, arrival, departure, status, total: chosen.price * nights, updated: updated || stampAt(48), typeName: chosen.typeName, roomNumber: chosen.number };
  rows.push(row);
  return row;
}
const line = record => [record.channel, record.externalId, record.typeName, record.roomNumber ?? '', record.arrival, record.departure, record.status, record.total.toFixed(2), 'CNY', record.updated].join(',');

// 16 completed stays across the last ~6 weeks (evidence for the revenue/pace view).
for (let index = 0; index < 16; index++) {
  const offset = -40 + index * 2;
  const arrival = shift(today, offset), departure = shift(arrival, index % 3 === 0 ? 3 : 2);
  add({ arrival, departure, status: 'completed', channelIndex: index % 5, updated: new Date(Date.parse(arrival + 'T09:00:00Z') - 12 * 3600000).toISOString().replace(/\.\d{3}Z$/, 'Z'), serial: `26${offset < -30 ? '08' : offset < -12 ? '09' : '10'}${String(100 + index)}` });
}

// 10 upcoming stays, deliberately leaving open nights around the demo window.
const upcoming = [2, 3, 5, 6, 8, 9, 11, 14, 16, 24];
upcoming.forEach((offset, index) => add({ arrival: shift(today, offset), departure: shift(today, offset + 2), channelIndex: index % 5, updated: stampAt(20 + index), serial: `26${String(1100 + index)}` }));

const header = 'channel,external_id,room_type,room_number,arrival,departure,status,total,currency,source_updated_at';
// Snapshot before the update phase mutates the shared array, so baseline stays a first export.
const baselineRows = rows.map(row => ({ ...row }));
const baselineCsv = [header, ...baselineRows.map(line)].join('\n') + '\n';

// Second export: every row is the latest snapshot; one move, one cancellation, two new stays.
const update = rows.map(row => ({ ...row }));
const moved = update.find(row => row.status === 'confirmed');
let movedArrival = null;
if (moved) {
  const arrival = shift(today, 4), departure = shift(arrival, 2);
  const room = freeRoom(arrival, departure);
  Object.assign(moved, { arrival, departure, total: room.price * 2, typeName: room.typeName, roomNumber: room.number, updated: stampAt(1) });
  movedArrival = arrival;
}
const cancelled = update.filter(row => row.status === 'confirmed')[1];
if (cancelled) { cancelled.status = 'cancelled'; cancelled.updated = stampAt(2); }
for (const offset of [12, 20]) {
  const arrival = shift(today, offset), departure = shift(arrival, 2);
  add({ arrival, departure, channelIndex: 0, updated: stampAt(1), serial: `26${String(2200 + offset)}` });
}
for (const row of rows.slice(baselineRows.length)) update.push(row);

const updateCsv = [header, ...update.map(line)].join('\n') + '\n';
const directory = __dirname;
fs.writeFileSync(path.join(directory, 'orders-baseline.csv'), baselineCsv);
fs.writeFileSync(path.join(directory, 'orders-update.csv'), updateCsv);
module.exports = { today, baselineRows: baselineRows.length, updateRows: update.length, movedExternalId: moved?.externalId, movedArrival, cancelledExternalId: cancelled?.externalId };
