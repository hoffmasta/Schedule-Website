const counter = document.getElementById("count-text")
const countDown = document.getElementById("count-down")
let counterMode = 0 //0 = days, 1 = hours
let countdownRequestId = 0;
let lastDisplayedCountdown = "";
let selectedCountdownCacheKey = "";
let selectedCountdownCache = null;
let millisecondAnimationFrame = 0;

function displayCountdown(time, value) {
  const displayKey = `${time}|${value}`;
  if (displayKey === lastDisplayedCountdown) return;
  lastDisplayedCountdown = displayKey;
  counter.classList.toggle("compact", value.length > 18);
  counter.classList.toggle("very-compact", value.length > 28);
  counter.innerHTML = time;
}

function stopMillisecondAnimation() {
  if (!millisecondAnimationFrame) return;
  cancelAnimationFrame(millisecondAnimationFrame);
  millisecondAnimationFrame = 0;
}

function animateCountdownMilliseconds(targetDate) {
  stopMillisecondAnimation();
  const millisecondPart = counter.querySelector(".countdown-milliseconds");
  if (!millisecondPart) return;

  const renderMilliseconds = () => {
    const remaining = Math.max(0, targetDate.getTime() - Date.now());
    millisecondPart.textContent = `.${String(remaining % 1000).padStart(3, "0")}`;
    millisecondAnimationFrame = requestAnimationFrame(renderMilliseconds);
  };
  renderMilliseconds();
}

async function getSelectedCountdown() {
  const customMode = localStorage.getItem("countdownMode") === "custom";
  const customDate = localStorage.getItem("customCountdownDate") || "";
  const customLabel = localStorage.getItem("customCountdownLabel") || "";
  const cacheKey = `${window.selectedCSVOption}|${customMode}|${customDate}|${customLabel}|${isSpanishEnabled()}`;
  if (cacheKey === selectedCountdownCacheKey) return selectedCountdownCache;

  if (customMode && customDate) {
    const targetDate = new Date(customDate);
    if (!Number.isNaN(targetDate.getTime())) {
      selectedCountdownCacheKey = cacheKey;
      selectedCountdownCache = {
        date: targetDate,
        value: customLabel || "Custom Countdown"
      };
      return selectedCountdownCache;
    }
  }

  const selectedRow = loadDatabaseText("Data/CountDownToDate.csv", "countdown")
    .split(/\r?\n/)
    .map(row => row.trim())
    .filter(Boolean)
    .map(parseDelimitedRow)
    .filter(rowMatchesSelectedSchedule)
    .find(columns => columns[0]?.trim() === String(window.selectedCSVOption).trim());
  const targetDate = selectedRow?.[3] && selectedRow[4]
    ? new Date(`${selectedRow[3]} ${selectedRow[4]}`)
    : null;

  if (!targetDate || Number.isNaN(targetDate.getTime())) {
    selectedCountdownCacheKey = cacheKey;
    selectedCountdownCache = null;
    return null;
  }

  selectedCountdownCacheKey = cacheKey;
  selectedCountdownCache = {
    date: targetDate,
    value: getLocalizedCsvValue(selectedRow, 0, 5) || "Select a countdown"
  };
  return selectedCountdownCache;
}
function getCountdownParts(difference) {
  const totalSeconds = difference / 1000;
  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const days = Math.floor(totalSeconds / 86400);

  return {
    days,
    totalHours,
    hours: totalHours - days * 24,
    minutes: totalMinutes - totalHours * 60,
    seconds: Math.floor(totalSeconds) - totalMinutes * 60
  };
}

async function calculateTimeToEndHours(requestId) {
  const selectedCountdown = await getSelectedCountdown()
  if (!selectedCountdown) return

  const { totalHours, minutes, seconds } = getCountdownParts(selectedCountdown.date.getTime() - Date.now());

  const value = selectedCountdown.value;
  if (requestId !== countdownRequestId) return;
  const time = `${totalHours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}<br>${value}`;
  displayCountdown(time, value);
}
async function calculateTimeToEndDays(requestId) {
  const selectedCountdown = await getSelectedCountdown()
  if (!selectedCountdown) return

  const { days, hours, minutes, seconds } = getCountdownParts(selectedCountdown.date.getTime() - Date.now());

  const value = selectedCountdown.value;
  if (requestId !== countdownRequestId) return;
  const time = isSpanishEnabled()
    ? `${days} días y ${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} horas<br>${value}`
    : `${days} days and ${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} hours<br>${value}`;
  displayCountdown(time, value);
}
async function calculateTimeToEndMilliseconds(requestId) {
  const selectedCountdown = await getSelectedCountdown();
  if (!selectedCountdown) return;

  const totalMilliseconds = Math.max(0, selectedCountdown.date.getTime() - Date.now());
  const { days, totalHours, hours, minutes, seconds } = getCountdownParts(totalMilliseconds);
  const milliseconds = totalMilliseconds % 1000;

  const value = selectedCountdown.value;
  if (requestId !== countdownRequestId) return;
  const clock = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}<span class="countdown-milliseconds">.${milliseconds.toString().padStart(3, "0")}</span>`;
  const totalHoursClock = `${totalHours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}<span class="countdown-milliseconds">.${milliseconds.toString().padStart(3, "0")}</span>`;
  const displayedClock = counterMode === 1 ? totalHoursClock : clock;
  const time = isSpanishEnabled()
    ? counterMode === 1 ? `${displayedClock} horas<br>${value}` : `${days} días y ${displayedClock} horas<br>${value}`
    : counterMode === 1 ? `${displayedClock} hours<br>${value}` : `${days} days and ${displayedClock} hours<br>${value}`;
  displayCountdown(time, value);
  animateCountdownMilliseconds(selectedCountdown.date);
}
function calculateTimeToEnd(){
  const requestId = ++countdownRequestId;
  const hasCustomSelection = localStorage.getItem("countdownMode") === "custom"
    && Boolean(localStorage.getItem("customCountdownDate"));
  const hasSelection = hasCustomSelection || Boolean(String(window.selectedCSVOption || "").trim())
  countDown.style.display = hasSelection ? "" : "none"
  if (!hasSelection) {
    stopMillisecondAnimation();
    return
  }

  if (window.timeControlMode === 2) {
    calculateTimeToEndMilliseconds(requestId);
    return;
  }

  stopMillisecondAnimation();

  switch (counterMode) {
    case 0:
      calculateTimeToEndDays(requestId)
      break
    case 1:
      calculateTimeToEndHours(requestId)
  }
}
counter.onclick = () => {
  //toggle days to hours and visa-versa
  if (counterMode == 0) {
    counterMode = 1
  } else if (counterMode == 1) {
    counterMode = 0
  }
  counter.classList.remove("mode-change");
  void counter.offsetWidth;
  counter.classList.add("mode-change");
  calculateTimeToEnd()
}