const scheduleFile = "Data/MainSchedule.csv";
const specialScheduleFile = "Data/SpecialScheduleDays.csv";
const periodTextFile = "Data/PeriodText.csv";

function showScheduleDataStatus(message) {
	const status = document.getElementById("schedule-upload-status");
	if (!status) return;
	status.textContent = message;
	status.hidden = !message;
	status.dataset.state = message ? "error" : "";
}

function getSelectedScheduleSelection() {
	return (localStorage.getItem("scheduleSelection") || "").trim();
}

function getCsvCampusAndGrade(columns) {
	if (!Array.isArray(columns) || columns.length === 0) return { campus: "", grade: "" };

	const first = (columns[0] || "").trim();
	const second = (columns[1] || "").trim();
	const third = (columns[2] || "").trim();

	if (!first && !second && !third) return { campus: "", grade: "" };
	if (["Name", "Campus"].includes(first)) return { campus: second, grade: third };
	if (["Name", "Campus"].includes(second)) return { campus: third, grade: "" };

	const secondLooksLikeGradeGroup = /school|grade|middle|elementary|junior|senior|freshman|sophomore/i.test(second);
	const thirdLooksLikeDayCode = /^(m|t|w|th|f|hrm|zh|l|normal|school|week|[0-9]+)$/i.test(third);

	if (secondLooksLikeGradeGroup && thirdLooksLikeDayCode) {
		return { campus: first, grade: second };
	}

	if (secondLooksLikeGradeGroup && !thirdLooksLikeDayCode) {
		return { campus: first, grade: second };
	}

	return { campus: second, grade: third };
}

function rowMatchesSelectedSchedule(columns) {
	if (!Array.isArray(columns) || columns.length < 3) return true;

	const selectedValue = getSelectedScheduleSelection();
	const { campus, grade } = getCsvCampusAndGrade(columns);
	if (!selectedValue) return true;

	const selectedCampus = selectedValue.includes(" - ") ? selectedValue.split(" - ")[0].trim() : selectedValue;
	const selectedGrade = selectedValue.includes(" - ") ? selectedValue.split(" - ")[1].trim() : "";

	if (selectedCampus && campus && selectedCampus !== campus) return false;
	if (selectedGrade && grade && selectedGrade !== grade) return false;
	return true;
}

function loadCsvRows(filePath, sheetKey, filterBySchedule = true) {
	const rows = loadDatabaseText(filePath, sheetKey)
		.split(/\r?\n/)
		.map(row => row.trim())
		.filter(Boolean)
		.map(row => row.includes("\t") ? row.split("\t").map(value => value.trim()) : parseDelimitedRow(row));

	return filterBySchedule ? rows.filter(rowMatchesSelectedSchedule) : rows;
}

function buildScheduleFilterOptions() {
	const select = document.getElementById("schedule-selection");
	if (!select) return;

	const csvSources = [
		{ path: scheduleFile, key: "mainSchedule" },
		{ path: "Data/CountDownToDate.csv", key: "countdown" },
		{ path: specialScheduleFile, key: "specialScheduleDays" }
	];

	const options = new Map();
	for (const source of csvSources) {
		try {
			for (const columns of loadCsvRows(source.path, source.key, false)) {
				if (!columns.length || columns[0]?.trim() === "Name" || columns[0]?.trim() === "Campus") continue;
				const { campus, grade } = getCsvCampusAndGrade(columns);
				if (campus && grade) options.set(`${campus} - ${grade}`, `${campus} - ${grade}`);
				else if (campus) options.set(campus, campus);
			}
		} catch {}
	}

	select.innerHTML = "";
	const sortedValues = [...new Set(options.values())].sort();
	if (sortedValues.length > 1) {
		const allOption = document.createElement("option");
		allOption.value = "";
		allOption.textContent = "None";
		select.appendChild(allOption);
	}
	for (const value of sortedValues) {
		const option = document.createElement("option");
		option.value = value;
		option.textContent = value;
		select.appendChild(option);
	}

	const savedValue = getSelectedScheduleSelection();
	if (savedValue && sortedValues.includes(savedValue)) {
		select.value = savedValue;
	} else if (sortedValues.length === 1) {
		select.value = sortedValues[0];
		localStorage.setItem("scheduleSelection", sortedValues[0]);
	} else {
		select.value = "";
		localStorage.setItem("scheduleSelection", "");
	}
	if (typeof updateSettingsLanguage === "function") updateSettingsLanguage();

	select.addEventListener("change", () => {
		localStorage.setItem("scheduleSelection", select.value || "");
		window.location.reload();
	});
}

function downloadScheduleExample() {
	const csv = [
		"Campus,Grade Level Category/Group,Day/s of the Week(M,T,W,Th, and/or F),Week,Hour/Period,Start Time (24 hr),End Time (24 hr)",
		"Vinland,High School,\"M, T, Th\",1,1,8:15:01,8:58",
		"Vinland,High School,\"M, T, Th\",2,1,8:30:00,9:13",
		"Vinland,High School,\"W, F\",1,1,8:59,9:40",
		"Vinland,High School,\"W, F\",2,1,9:10,9:51",
		"Vinland,High School,\"M, T, W, Th, F\",1,HRM,8:15,8:15:01",
		"Vinland,High School,\"M, T, W, Th, F\",2,HRM,8:15,8:15:01"
	].join("\n");

	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = "ScheduleExample.csv";
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

function uploadedCsvLooksValid(text, sheetKey) {
	if (!text.trim()) return false;
	const header = text.split(/\r?\n/, 1)[0].toLowerCase();
	const requiredHeaders = {
		mainSchedule: ["period", "start time", "end time"],
		countdown: ["date", "time"],
		specialScheduleDays: ["date", "hour/period"],
		periodText: ["code", "text"]
	};
	return requiredHeaders[sheetKey].every(value => header.includes(value));
}

function addSettingsTooltips() {
	const settingsMenu = document.getElementById("settingsMenu");
	if (!settingsMenu) return;
	const useSpanish = typeof isSpanishEnabled === "function" && isSpanishEnabled();

	settingsMenu.querySelectorAll("details > summary").forEach(summary => {
		summary.title = useSpanish
			? "Expandir o contraer la configuración de " + summary.textContent.trim()
			: "Expand or collapse the " + summary.textContent.trim() + " settings";
	});

	settingsMenu.querySelectorAll(".settingsContainer").forEach(container => {
		const label = container.querySelector(".setText")?.textContent.trim()
			|| [...container.querySelectorAll("label")].find(item => !item.classList.contains("file-input-button"))?.textContent.trim();
		const control = container.querySelector("input, select, button");
		if (!control) return;
		const name = label || control.textContent.trim() || control.id;
		if (control.matches("input[type='color']")) {
			control.title = useSpanish ? "Elige " + name.toLowerCase() : "Choose the " + name.toLowerCase();
		} else if (control.matches("input[type='file']")) {
			const fileTitle = useSpanish ? "Sube " + name.toLowerCase() : "Upload " + name.toLowerCase();
			control.title = fileTitle;
			container.querySelector(".file-input-button")?.setAttribute("title", fileTitle);
		} else if (control.matches("select")) {
			const selectHelp = {
				"presets": "Choose a visual preset",
				"custom-schedule-sheet": "Choose which schedule data to use",
				"database-source": "Choose where schedule data is loaded from"
			};
			const spanishSelectHelp = {
				"presets": "Elige un preajuste visual",
				"custom-schedule-sheet": "Elige qué datos de horario usar",
				"database-source": "Elige de dónde cargar los datos del horario"
			};
			control.title = useSpanish
				? spanishSelectHelp[control.id] || "Elige " + name.toLowerCase()
				: selectHelp[control.id] || "Choose " + name.toLowerCase();
		} else {
			control.title = useSpanish ? name : name;
		}
	});

	settingsMenu.querySelectorAll("select option").forEach(option => {
		const selectId = option.parentElement?.id;
		const optionHelp = {
			"database-source": {
				local: "Use the CSV files stored in the website folder",
				global: "Use the connected Google Sheet; this data is usually more up to date"
			},
			"custom-schedule-sheet": {
				mainSchedule: "Choose the regular class schedule data",
				countdown: "Choose countdown date data",
				specialScheduleDays: "Choose special school-day data",
				periodText: "Choose period name and description data"
			}
		};
		const spanishOptionHelp = {
			"database-source": {
				local: "Usa los archivos CSV guardados en la carpeta del sitio web",
				global: "Usa la hoja de Google conectada; estos datos suelen estar más actualizados"
			},
			"custom-schedule-sheet": {
				mainSchedule: "Elige los datos del horario normal de clases",
				countdown: "Elige los datos de fechas de cuenta regresiva",
				specialScheduleDays: "Elige los datos de días escolares especiales",
				periodText: "Elige los datos de nombres y descripciones de periodos"
			}
		};
		option.title = useSpanish
			? spanishOptionHelp[selectId]?.[option.value] || "Elige " + option.textContent.trim()
			: optionHelp[selectId]?.[option.value] || "Choose " + option.textContent.trim();
	});
}

document.addEventListener("DOMContentLoaded", () => {
	buildScheduleFilterOptions();
	addSettingsTooltips();
	const updateClearFileButton = input => {
		const button = document.querySelector(`.clear-file-button[data-clear-file="${input.id}"]`);
		const sheetKey = document.getElementById("custom-schedule-sheet")?.value || "mainSchedule";
		const hasSavedFile = input.id === "bg-img"
			? Boolean(localStorage.getItem("bgImage"))
			: Boolean(localStorage.getItem(`customSchedule_${sheetKey}`));
		if (button) button.hidden = !input.files.length && !hasSavedFile;
	};
	document.querySelectorAll("#settingsMenu input[type='file']").forEach(input => {
		updateClearFileButton(input);
		input.addEventListener("change", () => updateClearFileButton(input));
	});

	document.querySelectorAll(".clear-file-button").forEach(button => {
		button.addEventListener("click", () => {
			const input = document.getElementById(button.dataset.clearFile);
			if (!input) return;
			input.value = "";
			button.hidden = true;
			if (input.id === "bg-img") {
				clearBGImg();
				if (typeof updateFileInputNames === "function") {
					updateFileInputNames();
				} else {
					const name = input.closest(".file-input-control")?.querySelector(".file-input-name");
					if (name) {
						name.dataset.fileName = "";
						name.textContent = name.dataset.emptyFileText || "No file selected";
					}
				}
				setBGImageStatus("");
				return;
			}
			const sheetKey = document.getElementById("custom-schedule-sheet")?.value || "mainSchedule";
			localStorage.removeItem(`customSchedule_${sheetKey}`);
			localStorage.removeItem(`customScheduleError_${sheetKey}`);
			window.location.reload();
		});
	});

	const uploadInput = document.getElementById("custom-schedule-file");
	if (uploadInput) {
		const uploadStatus = document.getElementById("schedule-upload-status");
		const sheetSelect = document.getElementById("custom-schedule-sheet");
		const showUploadStatus = message => {
			if (!uploadStatus) return;
			uploadStatus.textContent = message;
			uploadStatus.hidden = !message;
			uploadStatus.dataset.state = message ? "error" : "";
		};
		const selectedSheetKey = sheetSelect?.value || "mainSchedule";
		if (localStorage.getItem(`customScheduleError_${selectedSheetKey}`) === "true") {
			const sourceName = window.databaseSource === "google" ? "Google Sheets" : "the bundled local CSV";
			showUploadStatus(`Upload issue: using ${sourceName} until a valid CSV is uploaded.`);
		}
		uploadInput.addEventListener("change", async () => {
			const file = uploadInput.files[0];
			if (!file) return;
			const sheetKey = sheetSelect?.value || "mainSchedule";
			const supportedKeys = new Set(["mainSchedule", "countdown", "specialScheduleDays", "periodText"]);
			if (!supportedKeys.has(sheetKey) || !/\.csv$/i.test(file.name)) {
				showUploadStatus("Upload issue: choose a valid CSV file for the selected data type.");
				uploadInput.value = "";
				updateClearFileButton(uploadInput);
				return;
			}
			let text;
			try {
				text = await file.text();
			} catch {
				localStorage.removeItem(`customSchedule_${sheetKey}`);
				localStorage.setItem(`customScheduleError_${sheetKey}`, "true");
				showUploadStatus("Upload issue: this CSV could not be read, so fallback data will be used.");
				window.location.reload();
				return;
			}
			if (!uploadedCsvLooksValid(text, sheetKey)) {
				localStorage.removeItem(`customSchedule_${sheetKey}`);
				localStorage.setItem(`customScheduleError_${sheetKey}`, "true");
				showUploadStatus("Upload issue: this CSV does not match the selected type, so fallback data will be used.");
				window.location.reload();
				return;
			}
			localStorage.removeItem(`customScheduleError_${sheetKey}`);
			localStorage.setItem(`customSchedule_${sheetKey}`, text);
			window.location.reload();
		});
	}

	const exampleButton = document.getElementById("download-schedule-example");
	if (exampleButton) {
		exampleButton.addEventListener("click", downloadScheduleExample);
	}

	const scheduleWeekSelector = document.getElementById("schedule-week-selector");
	if (scheduleWeekSelector) {
		const weekKeys = getScheduleWeekKeys();
		const displayWeekKeys = weekKeys.length > 1 ? weekKeys : [];
		scheduleWeekSelector.innerHTML = "<option value=\"auto\">This Week</option>" + displayWeekKeys.map(key => `<option value="${key}">Week ${key}</option>`).join("");
		if (typeof updateSettingsLanguage === "function") updateSettingsLanguage();
		const savedSelection = localStorage.getItem("scheduleWeekSelection") || "auto";
		scheduleWeekSelector.value = ["auto", ...displayWeekKeys].includes(savedSelection) ? savedSelection : "auto";
		scheduleWeekSelector.addEventListener("change", () => {
			localStorage.setItem("scheduleWeekSelection", scheduleWeekSelector.value || "auto");
			window.location.reload();
		});

		const autoWeekOption = scheduleWeekSelector.querySelector("option[value=\"auto\"]");
		const updateAutoWeekOptionLabel = () => {
			if (!autoWeekOption || displayWeekKeys.length === 0) return;
			const activeWeekKey = getCurrentScheduleWeekKey(typeof getScheduleNow === "function" ? getScheduleNow() : new Date());
			autoWeekOption.textContent = `Week ${activeWeekKey}`;
		};
		updateAutoWeekOptionLabel();
		setInterval(updateAutoWeekOptionLabel, 30_000);
	}

	const specialDayMode = document.getElementById("special-day-mode");
	const specialDayDate = document.getElementById("custom-special-day-date");
	const specialDayName = document.getElementById("custom-special-day-name");
	const setSpecialDaySettingVisibility = visible => {
		document.querySelectorAll(".custom-special-day-setting").forEach(element => {
			element.hidden = !visible;
		});
	};
	const hasSavedSpecialDay = Boolean(localStorage.getItem("customSpecialDayDate") && localStorage.getItem("customSpecialDayName"));
	if (specialDayDate) specialDayDate.value = localStorage.getItem("customSpecialDayDate") || "";
	if (specialDayName) specialDayName.value = localStorage.getItem("customSpecialDayName") || "";
	if (specialDayMode) {
		specialDayMode.value = hasSavedSpecialDay ? "custom" : "";
		setSpecialDaySettingVisibility(hasSavedSpecialDay);
		specialDayMode.addEventListener("change", () => {
			setSpecialDaySettingVisibility(specialDayMode.value === "custom");
		});
	}
	document.getElementById("save-custom-special-day")?.addEventListener("click", () => {
		const dateValue = specialDayDate?.value || "";
		const nameValue = specialDayName?.value.trim() || "";
		if (!dateValue || !nameValue || Number.isNaN(new Date(`${dateValue} 00:00:00`).getTime())) return;
		localStorage.setItem("customSpecialDayDate", dateValue);
		localStorage.setItem("customSpecialDayName", nameValue);
		window.location.reload();
	});
	document.getElementById("clear-custom-special-day")?.addEventListener("click", () => {
		localStorage.removeItem("customSpecialDayDate");
		localStorage.removeItem("customSpecialDayName");
		window.location.reload();
	});
});

function isSpanishEnabled() {
	return Boolean(document.getElementById("span")?.checked);
}

function getLocalizedCsvValue(columns, englishIndex, spanishIndex) {
	const englishValue = columns[englishIndex]?.trim() || "";
	const spanishValue = columns[spanishIndex]?.trim() || "";
	return isSpanishEnabled() && spanishValue ? spanishValue : englishValue;
}

function normalizeScheduleTime(value) {
	if (typeof value !== "string" || !/^\d{1,2}:\d{1,2}(:\d{1,2})?$/.test(value.trim())) {
		throw new Error(`Invalid schedule time: ${value ?? "missing value"}`);
	}

	value = value.trim();
	const parts = value.split(":");
	const hour = parts[0].padStart(2, "0");
	const minute = parts[1].padStart(2, "0");
	if (parts.length < 3) return `${hour}:${minute}`;
	return `${hour}:${minute}:${parts[2].padStart(2, "0")}`;
}

function normalizeWeekCode(value) {
	if (typeof value !== "string") return "";
	const trimmed = value.trim();
	if (!trimmed) return "";
	const lowered = trimmed.toLowerCase();
	if (lowered === "week") return "";
	if (/^week\s*[a-z]$/i.test(trimmed)) return trimmed.split(/\s+/).pop().toLowerCase();
	if (/^week\s*\d+$/i.test(trimmed)) return String(Number(trimmed.match(/\d+/)[0]));
	if (/^[a-z]$/i.test(trimmed)) return trimmed.toLowerCase();
	if (/^\d+$/.test(trimmed)) return String(Number(trimmed));
	return lowered;
}

function getScheduleDayColumns(columns, hasWeekColumn = false) {
	if (!Array.isArray(columns) || columns.length === 0) return { days: "", week: "", period: "", start: "", end: "" };

	if (!hasWeekColumn) {
		const hasNameColumn = columns.length >= 7;
		return {
			days: columns[hasNameColumn ? 3 : 2],
			week: "",
			period: columns[hasNameColumn ? 4 : 3],
			start: columns[hasNameColumn ? 5 : 4],
			end: columns[hasNameColumn ? 6 : 5]
		};
	}

	const hasNameColumn = columns.length >= 7;
	const weekAtIndex3 = normalizeWeekCode(columns[3] || "");
	const weekAtIndex4 = normalizeWeekCode(columns[4] || "");

	if (weekAtIndex3 && columns.length >= 7) {
		return {
			days: columns[2],
			week: weekAtIndex3,
			period: columns[4],
			start: columns[5],
			end: columns[6]
		};
	}

	if (weekAtIndex4 && columns.length >= 8) {
		return {
			days: columns[3],
			week: weekAtIndex4,
			period: columns[5],
			start: columns[6],
			end: columns[7]
		};
	}

	return {
		days: columns[hasNameColumn ? 3 : 2],
		week: "",
		period: columns[hasNameColumn ? 4 : 3],
		start: columns[hasNameColumn ? 5 : 4],
		end: columns[hasNameColumn ? 6 : 5]
	};
}

function doesCsvHaveWeekColumn(filePath, sheetKey) {
	const headerLine = loadDatabaseText(filePath, sheetKey).split(/\r?\n/).find(line => line.trim());
	if (!headerLine) return false;
	return parseDelimitedRow(headerLine).some(value => value.trim().toLowerCase() === "week");
}

function assignScheduleToDayGroup(schedules, dayList, period, time) {
	if (["M", "T", "Th"].every(day => dayList.includes(day))) {
		schedules.mtth[period] = time;
	}
	if (dayList.includes("W")) {
		schedules.w[period] = time;
	}
	if (dayList.includes("F")) {
		schedules.f[period] = time;
	}
}

function getScheduleWeekSelection() {
	const select = document.getElementById("schedule-week-selector");
	const saved = localStorage.getItem("scheduleWeekSelection") || "auto";
	const weekKeys = getScheduleWeekKeys();
	const validValues = ["auto", ...weekKeys.filter((key, index) => weekKeys.length > 1 || index === 0 ? true : false)];
	const displayWeekKeys = weekKeys.length > 1 ? weekKeys : [];
	const value = validValues.includes(saved) ? saved : "auto";
	if (select) {
		const options = [...select.options].map(option => option.value);
		if (!options.includes("auto") || !displayWeekKeys.every(key => options.includes(key))) {
			const currentValue = select.value || value;
			select.innerHTML = "<option value=\"auto\">This Week</option>" + displayWeekKeys.map(key => `<option value="${key}">Week ${key}</option>`).join("");
			if (typeof updateSettingsLanguage === "function") updateSettingsLanguage();
			select.value = validValues.includes(currentValue) ? currentValue : value;
		}
		select.value = validValues.includes(select.value) ? select.value : value;
	}
	localStorage.setItem("scheduleWeekSelection", value);
	return value;
}

function loadMainSchedule() {
	const schedules = {
		mtth: {},
		w: {},
		f: {}
	};
	const weekSchedules = {};
	const allWeeksSchedule = { mtth: {}, w: {}, f: {} };
	let hasWeekSpecificRows = false;

	const rows = loadCsvRows(scheduleFile, "mainSchedule");
	const hasWeekColumn = doesCsvHaveWeekColumn(scheduleFile, "mainSchedule");

	for (const row of rows) {
		const columns = row;
		const { days, week, period, start, end } = getScheduleDayColumns(columns, hasWeekColumn);
		if (!days || !period || !start || !end || period === "Hour/Period") continue;

		let time;
		try {
			time = `${normalizeScheduleTime(start)}-${normalizeScheduleTime(end)}`;
		} catch (error) {
			const message = "Schedule issue: a class with an invalid time was skipped.";
			showScheduleDataStatus(message);
			console.warn(`${message} ${error.message}`);
			continue;
		}
		const normalizedPeriod = period;
		const dayList = days.split(",").map(day => day.trim());

		if (week && week !== "all") {
			hasWeekSpecificRows = true;
			if (!weekSchedules[week]) {
				weekSchedules[week] = { mtth: {}, w: {}, f: {} };
			}
			assignScheduleToDayGroup(weekSchedules[week], dayList, normalizedPeriod, time);
			continue;
		}

		assignScheduleToDayGroup(allWeeksSchedule, dayList, normalizedPeriod, time);
		assignScheduleToDayGroup(schedules, dayList, normalizedPeriod, time);
	}

	if (hasWeekSpecificRows) {
		const numericWeekKeys = Object.keys(weekSchedules).filter(key => /^\d+$/.test(key)).map(Number);
		const maxWeekNumber = numericWeekKeys.length ? Math.max(...numericWeekKeys) : 0;
		for (let weekNumber = 1; weekNumber <= maxWeekNumber; weekNumber += 1) {
			const weekKey = String(weekNumber);
			if (!weekSchedules[weekKey]) weekSchedules[weekKey] = { mtth: {}, w: {}, f: {} };
		}

		const orderedWeekKeys = Object.keys(weekSchedules).sort((a, b) => {
			const aNumber = Number.parseInt((a.match(/\d+/) || ["1"])[0], 10) || 1;
			const bNumber = Number.parseInt((b.match(/\d+/) || ["1"])[0], 10) || 1;
			return aNumber - bNumber;
		});
		for (const weekKey of orderedWeekKeys) {
			schedules[weekKey] = {
				mtth: { ...allWeeksSchedule.mtth, ...weekSchedules[weekKey].mtth },
				w: { ...allWeeksSchedule.w, ...weekSchedules[weekKey].w },
				f: { ...allWeeksSchedule.f, ...weekSchedules[weekKey].f }
			};
		}
		const firstWeekKey = orderedWeekKeys[0] || "week1";
		schedules.mtth = { ...(schedules[firstWeekKey]?.mtth || {}) };
		schedules.w = { ...(schedules[firstWeekKey]?.w || {}) };
		schedules.f = { ...(schedules[firstWeekKey]?.f || {}) };
	}

	return schedules;
}

function parseDelimitedRow(row) {
	const columns = [];
	let value = "";
	let quoted = false;

	for (let index = 0; index < row.length; index += 1) {
		const character = row[index];
		if (character === '"') {
			if (quoted && row[index + 1] === '"') {
				value += '"';
				index += 1;
			} else {
				quoted = !quoted;
			}
		} else if (character === "," && !quoted) {
			columns.push(value.trim());
			value = "";
		} else {
			value += character;
		}
	}

	columns.push(value.trim());
	return columns;
}

function loadPeriodTextMap() {
	const periodText = {};
	const periodTextSpanish = {};
	const rows = loadDatabaseText(periodTextFile, "periodText")
		.split(/\r?\n/)
		.map(row => row.trim())
		.filter(Boolean);

	for (const row of rows) {
		const [code, text, spanishText] = parseDelimitedRow(row);
		if (!code || !text || code === "Code") continue;
		periodText[code.toUpperCase()] = text;
		periodTextSpanish[code.toUpperCase()] = (spanishText || text).replace(/^spanish:\s*/i, "");
	}

	return { english: periodText, spanish: periodTextSpanish };
}

function normalizeScheduleDate(value) {
	const parts = value.trim().split("/");
	if (parts.length !== 3) return null;
	return `${Number(parts[0])}/${Number(parts[1])}/${parts[2]}`;
}

function expandScheduleDates(value) {
	const dates = [];

	for (const dateValue of value.split(",")) {
		const range = dateValue.trim().split("-");
		if (range.length > 2) continue;

		const startDate = new Date(`${range[0].trim()} 00:00:00`);
		if (Number.isNaN(startDate.getTime())) continue;

		const endDate = range.length === 2
			? new Date(`${range[1].trim()} 00:00:00`)
			: new Date(startDate);
		if (Number.isNaN(endDate.getTime()) || startDate > endDate) continue;

		for (const date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
			dates.push(normalizeScheduleDate(`${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`));
		}
	}

	return dates;
}

function loadSpecialSchedules() {
	const schedules = {};
	const rows = loadDatabaseText(specialScheduleFile, "specialScheduleDays")
		.split(/\r?\n/)
		.map(row => row.trim())
		.filter(Boolean)
		.map(parseDelimitedRow)
		.filter(rowMatchesSelectedSchedule);

	for (const row of rows) {
		const columns = row;
		const [name, , , dates, period, start, end, dayType] = columns;
		const spanishName = columns[7];
		if (!dates || name === "Name") continue;

		for (const dateKey of expandScheduleDates(dates)) {
			if (name) {
				specialDayTypes[dateKey] = name;
				specialDayTypesSpanish[dateKey] = spanishName || name;
				if (!schedules[dateKey]) schedules[dateKey] = {};
			}
			if (period && ["normal", "normal schedule"].includes(period.trim().toLowerCase())) {
				normalScheduleDates[dateKey] = true;
				continue;
			}
			if (!period || !start || !end) continue;
			let time;
			try {
				time = `${normalizeScheduleTime(start)}-${normalizeScheduleTime(end)}`;
			} catch (error) {
				const message = "Schedule issue: a special day with an invalid time was skipped.";
				showScheduleDataStatus(message);
				console.warn(`${message} ${error.message}`);
				continue;
			}
			if (!schedules[dateKey]) schedules[dateKey] = {};
			schedules[dateKey][period] = time;
		}
	}

	const customDate = localStorage.getItem("customSpecialDayDate");
	const customName = localStorage.getItem("customSpecialDayName");
	if (customDate && customName) {
		const parsedDate = new Date(`${customDate} 00:00:00`);
		if (!Number.isNaN(parsedDate.getTime())) {
			const dateKey = `${parsedDate.getMonth() + 1}/${parsedDate.getDate()}/${parsedDate.getFullYear()}`;
			specialDayTypes[dateKey] = customName;
			specialDayTypesSpanish[dateKey] = customName;
			if (!schedules[dateKey]) schedules[dateKey] = {};
		}
	}

	return schedules;
}

function getScheduleWeekKeys() {
	if (!oshSchedules || typeof oshSchedules !== "object") return ["1"];
	const keys = Object.keys(oshSchedules)
		.filter(key => !["mtth", "w", "f"].includes(key))
		.sort((a, b) => {
			const aValue = Number.parseInt((String(a).match(/\d+/) || ["0"])[0], 10) || 0;
			const bValue = Number.parseInt((String(b).match(/\d+/) || ["0"])[0], 10) || 0;
			if (aValue !== bValue) return aValue - bValue;
			return String(a).localeCompare(String(b));
		});
	return keys.length > 0 ? keys : ["1"];
}

function getIsoWeek(date) {
	const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	const day = utcDate.getUTCDay() || 7;
	utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
	const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
	const weekNumber = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
	return weekNumber;
}

function getCurrentScheduleWeekKey(date) {
	const selectedWeek = getScheduleWeekSelection();
	if (selectedWeek && selectedWeek !== "auto") return selectedWeek;

	const weekKeys = getScheduleWeekKeys();
	if (weekKeys.length <= 1) return weekKeys[0] || "1";
	const cycleLength = weekKeys.length;
	const currentWeekIndex = (getIsoWeek(date) - 1) % cycleLength;
	return weekKeys[currentWeekIndex] || weekKeys[0];
}

function getRegularScheduleForDate(date) {
	const weekKeys = getScheduleWeekKeys();
	const activeWeekKey = weekKeys.length > 1 ? getCurrentScheduleWeekKey(date) : weekKeys[0] || "1";
	const weekSchedule = oshSchedules && (oshSchedules[activeWeekKey] || oshSchedules.weekA || oshSchedules.weekB)
		? oshSchedules[activeWeekKey] || oshSchedules.weekA || oshSchedules.weekB
		: oshSchedules;

	switch (date.getDay()) {
	case 1:
	case 2:
	case 4:
		return weekSchedule?.mtth;
	case 3:
		return weekSchedule?.w;
	case 5:
		return weekSchedule?.f;
	default:
		return undefined;
	}
}

function getScheduleForDate(date) {
	const dateKey = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
	if (normalScheduleDates[dateKey] || specialDayTypes[dateKey] === "School at Home") {
		return getRegularScheduleForDate(date);
	}
	if (Object.prototype.hasOwnProperty.call(specialSchedules, dateKey)) return specialSchedules[dateKey];
	return getRegularScheduleForDate(date);
}

function getSpecialDayType(date) {
	const dateKey = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
	const dayType = specialDayTypes[dateKey];
	if (!dayType) return undefined;
	const localizedDayType = isSpanishEnabled() ? specialDayTypesSpanish[dateKey] : dayType;

	const specialTimes = Object.values(specialSchedules[dateKey] || {});
	if (specialTimes.length === 0) return localizedDayType;

	const currentMinutes = date.getHours() * 60 + date.getMinutes();
	const isWithinSpecialTime = specialTimes.some(time => {
		const [start, end] = time.split("-").map(value => {
			const [hours, minutes] = value.split(":").map(Number);
			return hours * 60 + minutes;
		});
		return currentMinutes >= start && currentMinutes <= end;
	});

	return isWithinSpecialTime ? localizedDayType : undefined;
}

var oshSchedules = loadMainSchedule();
var periodTextMaps = loadPeriodTextMap();
var periodTextMap = periodTextMaps.english;
var periodTextSpanishMap = periodTextMaps.spanish;
var specialDayTypes = {};
var specialDayTypesSpanish = {};
var normalScheduleDates = {};
var specialSchedules = loadSpecialSchedules();
var neenSchedules = oshSchedules;
