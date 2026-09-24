const fs = require('fs');
const vm = require('vm');
const code = fs.readFileSync('Scripts/mainSchedule.js', 'utf8');
const context = {
  console,
  document: {
    getElementById: () => null,
    addEventListener: () => {}
  },
  window: {
    databaseSource: 'local',
    location: { reload() {} }
  },
  localStorage: {
    getItem: () => '',
    setItem: () => {},
    removeItem: () => {}
  },
  loadDatabaseText: (filePath) => filePath.includes('MainSchedule')
    ? [
        'Campus,Grade Level Category/Group,Day/s of the Week(M,T,W,Th, and/or F),Week,Hour/Period,Start Time (24 hr),End Time (24 hr)',
        'Vinland,High School,"M, T, Th",A,1,8:15,8:58',
        'Vinland,High School,"M, T, Th",B,1,8:30,9:13',
        'Vinland,High School,"W, F",A,1,8:59,9:40',
        'Vinland,High School,"W, F",B,1,9:10,9:51'
      ].join('\n')
    : '',
  isSpanishEnabled: () => false,
  globalThis: null
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(code, context);
const schedules = context.loadMainSchedule();
const firstWeek = new Date('2026-01-05T12:00:00');
const secondWeek = new Date('2026-01-12T12:00:00');
const mondayA = context.getRegularScheduleForDate(firstWeek);
const mondayB = context.getRegularScheduleForDate(secondWeek);
if (!(schedules.weekA && schedules.weekB)) {
  throw new Error('Missing week buckets');
}
if (schedules.weekA.mtth['1'] !== '08:15-08:58') {
  throw new Error('Week A parse failed');
}
if (schedules.weekB.mtth['1'] !== '08:30-09:13') {
  throw new Error('Week B parse failed');
}
if (mondayA['1'] !== '08:15-08:58') {
  throw new Error('Week A selection failed');
}
if (mondayB['1'] !== '08:30-09:13') {
  throw new Error('Week B selection failed');
}
console.log(JSON.stringify({
  weekA: schedules.weekA.mtth['1'],
  weekB: schedules.weekB.mtth['1'],
  selectedA: mondayA['1'],
  selectedB: mondayB['1']
}));
