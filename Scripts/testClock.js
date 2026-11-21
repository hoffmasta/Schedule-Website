// Local-only schedule testing: use ?debugSchedule=1&testTime=2026-11-23T09:59:50.
const scheduleTestParams = new URLSearchParams(window.location.search);
var scheduleTestingEnabled = false; // Set to false to disable the debug clock.
const scheduleDebugRequested = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    && scheduleTestParams.get("debugSchedule") === "1";
var scheduleTestDate = null;
var scheduleTestStartedAt = 0;

function setScheduleTestDate(date) {
    scheduleTestDate = new Date(date);
    scheduleTestStartedAt = Date.now();
    if (typeof testDate !== "undefined") {
        testDate = new Date(scheduleTestDate);
    }
}

function getScheduleNow() {
    if (!scheduleTestDate) return new Date();
    return new Date(scheduleTestDate.getTime() + Date.now() - scheduleTestStartedAt);
}

const testTime = scheduleTestParams.get("testTime");
if (scheduleTestingEnabled && scheduleDebugRequested && testTime) {
    const normalizedTestTime = testTime.replace(/(T| )\d{2}:\d{2}$/, "$&:00");
    const parsedTestTime = new Date(normalizedTestTime);
    if (!Number.isNaN(parsedTestTime.getTime())) {
        setScheduleTestDate(parsedTestTime);
        console.log("Using advancing schedule test time:", scheduleTestDate);
    } else {
        console.warn("Invalid testTime. Use a value like 2026-11-23T09:59:50.");
    }
}
