window.selectedCSVOption = "";
const savedCountdown = localStorage.getItem("countdownSelection") || "";
const savedCountdownMode = localStorage.getItem("countdownMode") || "csv";
const setCustomCountdownVisibility = visible => {
    document.querySelectorAll(".custom-countdown-setting").forEach(element => {
        element.hidden = !visible;
    });
};
const formatCountdownLabel = text => text.replace(/(^|[\s-])([\p{L}\p{N}])/gu, (_, separator, character) => separator + character.toUpperCase());
const updateFileInputWrapState = () => {
    document.querySelectorAll("#settingsMenu .settingsContainer:has(> .file-input-control)").forEach(container => {
        const label = container.querySelector(":scope > label");
        if (!label) return;
        const lineHeight = parseFloat(getComputedStyle(label).lineHeight) || 19;
        container.classList.remove("file-input-needs-wrap");
        const needsWrap = label.getBoundingClientRect().height > lineHeight * 1.25;
        container.classList.toggle("file-input-needs-wrap", needsWrap);
    });
};
const resizeDropdown = (s, useLongestOption = false) => {
    if (!s || !s.options || !s.options.length) return;
    const c = document.createElement("canvas").getContext("2d");
    const selectedText = s.options[s.selectedIndex]?.text || s.options[0]?.text || "";
    const longestText = Array.from(s.options).reduce((longest, option) => {
        return option.text.length > longest.length ? option.text : longest;
    }, "");
    const textToMeasure = useLongestOption ? longestText : selectedText;
    const menu = document.getElementById("settingsMenu");
    const maxWidth = Math.max(140, (menu?.clientWidth || 420) * 0.62);
    let fontSize = parseFloat(window.getComputedStyle(s).fontSize) || 16;
    let textWidth;

    do {
        c.font = `${fontSize}px ${window.getComputedStyle(s).fontFamily || "sans-serif"}`;
        textWidth = c.measureText(textToMeasure).width + 35;
        if (textWidth <= maxWidth || fontSize <= 12) break;
        fontSize -= 1;
    } while (fontSize > 12);

    s.style.fontSize = `${fontSize}px`;
    s.style.width = `${Math.min(textWidth, maxWidth)}px`;
};

const resizeAllDropdowns = () => {
    const selects = Array.from(document.querySelectorAll('select'));
    selects.forEach(select => {
        if (!select.closest('#settingsMenu')) return;
        select.style.boxSizing = "border-box";
        resizeDropdown(select);
        select.addEventListener('focus', () => resizeDropdown(select, true));
        select.addEventListener('click', () => resizeDropdown(select, true));
        select.addEventListener('blur', () => resizeDropdown(select), { once: false });
        select.addEventListener('change', () => resizeDropdown(select), { once: false });
    });
};

const resizeFileInput = input => {
    if (!input) return;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const menu = document.getElementById("settingsMenu");
    const maxWidth = Math.max(160, (menu?.clientWidth || 420) * 0.55);
    const text = input.files[0]?.name || "Choose File";
    let fontSize = parseFloat(window.getComputedStyle(input).fontSize) || 16;
    let textWidth;

    do {
        context.font = `${fontSize}px ${window.getComputedStyle(input).fontFamily || "sans-serif"}`;
        textWidth = context.measureText(text).width + 30;
        if (textWidth <= maxWidth || fontSize <= 12) break;
        fontSize -= 1;
    } while (fontSize > 12);

    input.style.fontSize = `${fontSize}px`;
    input.style.width = `${Math.min(textWidth, maxWidth)}px`;
};

const resizeAllFileInputs = () => {
    document.querySelectorAll('#settingsMenu input[type="file"]').forEach(input => {
        resizeFileInput(input);
        input.addEventListener("change", () => resizeFileInput(input));
    });
};

document.addEventListener('DOMContentLoaded', async () => {
    resizeAllDropdowns();
    resizeAllFileInputs();
    updateFileInputWrapState();
    const e = document.getElementById('myDropdown');
    e.style.boxSizing = "border-box";
    const customDate = document.getElementById("custom-countdown-date");
    const customLabel = document.getElementById("custom-countdown-label");
    const saveCustomCountdown = document.getElementById("save-custom-countdown");
    const clearCustomCountdown = document.getElementById("clear-custom-countdown");
    if (customDate) customDate.value = localStorage.getItem("customCountdownDate") || "";
    if (customLabel) customLabel.value = localStorage.getItem("customCountdownLabel") || "";
    const updateCountdownSelection = x => {
        const isCustom = x.target.value === "custom";
        window.selectedCSVOption = isCustom ? "" : x.target.value;
        localStorage.setItem("countdownMode", isCustom ? "custom" : "csv");
        localStorage.setItem("countdownSelection", x.target.value);
        setCustomCountdownVisibility(isCustom);
        resizeDropdown(e);
        if (typeof calculateTimeToEnd === "function") calculateTimeToEnd();
        if (typeof window.restartScheduleTimer === "function") window.restartScheduleTimer();
    };
    e.addEventListener('input', updateCountdownSelection);
    e.addEventListener('change', updateCountdownSelection);
    try {
        const txt = loadDatabaseText('Data/CountDownToDate.csv', 'countdown');
        const rows = txt.split('\n').map(r => r.trim()).filter(Boolean).map(parseDelimitedRow).filter(rowMatchesSelectedSchedule);
        rows.forEach(columns => {
            const value = columns[0]?.trim();
            const label = getLocalizedCsvValue(columns, 0, 5);
            const displayLabel = formatCountdownLabel(label);
            if (value && value !== 'Name') e.insertAdjacentHTML('beforeend', `<option class="optionSettings Mason" value="${value}">${displayLabel}</option>`);
        });
        if (typeof addSettingsTooltips === "function") addSettingsTooltips();
        if (savedCountdownMode === "custom") {
            e.value = "custom";
            window.selectedCSVOption = "";
        } else if (savedCountdown && Array.from(e.options).some(option => option.value === savedCountdown)) {
            e.value = savedCountdown;
            window.selectedCSVOption = savedCountdown;
        } else if (rows.length === 1) {
            const singleValue = rows[0][0]?.trim();
            if (singleValue) {
                e.value = singleValue;
                window.selectedCSVOption = singleValue;
                localStorage.setItem('countdownSelection', singleValue);
            } else {
                e.value = '';
                window.selectedCSVOption = '';
                localStorage.setItem('countdownSelection', '');
            }
        } else {
            e.value = '';
            localStorage.setItem('countdownMode', 'csv');
            window.selectedCSVOption = '';
            localStorage.setItem('countdownSelection', '');
        }
        setCustomCountdownVisibility(e.value === "custom");
        if (typeof calculateTimeToEnd === "function") calculateTimeToEnd();
        if (typeof window.restartScheduleTimer === "function") window.restartScheduleTimer();
        document.getElementById('span')?.addEventListener('change', () => {
            Array.from(e.options).forEach(option => {
                const row = rows.find(r => r[0]?.trim() === option.value);
                if (row) {
                    const label = getLocalizedCsvValue(row, 0, 5);
                    option.textContent = formatCountdownLabel(label);
                }
            });
            resizeAllDropdowns();
            updateFileInputWrapState();
            requestAnimationFrame(updateFileInputWrapState);
        });
        saveCustomCountdown?.addEventListener("click", () => {
            const value = customDate?.value || "";
            if (!value || Number.isNaN(new Date(value).getTime())) return;
            localStorage.setItem("customCountdownDate", value);
            localStorage.setItem("customCountdownLabel", customLabel?.value.trim() || "Custom Countdown");
            localStorage.setItem("countdownMode", "custom");
            e.value = "custom";
            window.selectedCSVOption = "";
            setCustomCountdownVisibility(true);
            if (typeof calculateTimeToEnd === "function") calculateTimeToEnd();
            if (typeof window.restartScheduleTimer === "function") window.restartScheduleTimer();
        });
        clearCustomCountdown?.addEventListener("click", () => {
            localStorage.removeItem("customCountdownDate");
            localStorage.removeItem("customCountdownLabel");
            localStorage.setItem("countdownMode", "csv");
            const restored = savedCountdown && Array.from(e.options).some(option => option.value === savedCountdown) ? savedCountdown : "";
            e.value = restored;
            window.selectedCSVOption = restored;
            localStorage.setItem("countdownSelection", restored);
            setCustomCountdownVisibility(false);
            if (typeof calculateTimeToEnd === "function") calculateTimeToEnd();
            if (typeof window.restartScheduleTimer === "function") window.restartScheduleTimer();
        });
        resizeDropdown(e);
    } catch {}
});
