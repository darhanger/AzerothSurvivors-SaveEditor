const translations = new Map(Object.entries({
  "Работает в браузере · без загрузки на сервер": "Runs in your browser · no server upload",
  "АРХИВ ПРОГРЕССА / RSE1": "SAVE ARCHIVE / RSE1",
  "Настройте своё сохранение": "Edit your save",
  "Откройте .sav или вставьте строку RSE1. Меняйте прогресс, проверяйте открытый текст и экспортируйте новый файл для импорта в игру.": "Open a .sav file or paste an RSE1 string. Edit progress, inspect the plaintext, and export a new file for the game.",
  "01 / ИМПОРТ": "01 / IMPORT",
  "Загрузить сохранение": "Load a save",
  "Ожидание файла": "Waiting for a file",
  "Выберите файл или перетащите сюда": "Choose a file or drop it here",
  ".sav или .txt, до 2 МБ": ".sav / .txt, up to 2 MB",
  "Или вставьте строку / открытый текст": "Or paste an RSE1 string / plaintext",
  "Открыть вставленный текст": "Open pasted text",
  "Файл читается только на вашем устройстве.": "The file is read only on your device.",
  "02 / РЕДАКТОР": "02 / EDITOR",
  "Прогресс аккаунта": "Account progress",
  "Скопировать RSE1": "Copy RSE1",
  "Скачать .sav": "Download .sav",
  "Зоны": "Zones",
  "Победы и текущая открытая зона хранятся отдельно для каждого класса.": "Cleared zones and the currently unlocked zone are stored per class.",
  "Таланты": "Talents",
  "Опыт класса и ранги талантов. Неизвестный игре ID может быть проигнорирован.": "Class experience and talent ranks. The game may ignore an unknown ID.",
  "Кодекс": "Codex",
  "Кодекс украшений": "Accessory codex",
  "Здесь хранятся увиденные кольца, аксессуары и амулеты. Число 0–4 — записанное качество.": "Discovered rings, trinkets, and amulets. Values 0–4 are the saved quality.",
  "Достижения": "Achievements",
  "Флаги достижений и время получения — отдельные поля сохранения.": "Achievement flags and unlock timestamps use separate save fields.",
  "Предметы и экипировка": "Items and equipment",
  "Список найденных предметов аккаунта и экипировка выбранного класса.": "Account item collection and equipment for the selected class.",
  "Прочее": "Other",
  "Статистика, награды и спутники из известных строк сейва.": "Stats, perks, and pets from known save fields.",
  "Открытый текст": "Plaintext",
  "Правьте любые строки напрямую. Неизвестные поля сохраняются при экспорте.": "Edit any line directly. Unknown fields are preserved on export.",
  "Разделы редактора": "Editor sections",
  "Импорт в игру заменяет текущий прогресс. Сохраните оригинальный файл до проверки результата в игре. Неизвестные строки сохраняются при редактировании через формы.": "Importing into the game replaces current progress. Keep the original file until you verify the result in game. Unknown lines are preserved when editing through forms.",
  "Независимый инструмент для Azeroth Survivors": "Independent tool for Azeroth Survivors",
  "Формат RSE1 · локальная обработка": "RSE1 format · local processing",
  "Класс": "Class",
  "Открытая зона": "Unlocked zone",
  "Не задана": "Not set",
  "неизвестная зона": "unknown zone",
  "Пройденные зоны": "Cleared zones",
  "Игра может требовать согласованности открытой зоны и списка побед. Проверьте результат после импорта.": "The game may require the unlocked zone and cleared zones to agree. Verify the result after import.",
  "Опыт талантов": "Talent experience",
  "Получено очков": "Points earned",
  "Потрачено": "Spent",
  "Свободно": "Available",
  "Потрачено больше очков, чем даёт текущий опыт. Игра может сбросить или отклонить таланты.": "More points are spent than the current experience grants. The game may reset or reject talents.",
  "ID таланта, например imp_wrath": "Talent ID, e.g. imp_wrath",
  "Ожидался ID вида imp_wrath.": "Expected an ID like imp_wrath.",
  "ID талантов извлечены из текущего исполняемого файла игры. Игра задаёт ограничения по максимальному рангу и очкам.": "Talent IDs come from the current game executable. The game enforces rank and point limits.",
  "Обычные амулеты": "Amulets",
  "Легендарные амулеты": "Legendary amulets",
  "Кольца и аксессуары": "Rings and trinkets",
  "Категория": "Category",
  "В этой версии игры есть легендарный амулет Shred друида, которого нет в исходном сейве.": "This game version has a Druid Shred legendary amulet missing from the original save.",
  "Открыть амулет Shred": "Unlock Shred amulet",
  "Скрыт": "Undiscovered",
  "Открыт": "Discovered",
  "Скрыт удаляет запись из кодекса. Значения 0–4 отмечают предмет найденным и задают сохранённое качество: обычное, необычное, редкое, эпическое или легендарное.": "Undiscovered removes the codex entry. Values 0–4 mark it as found and set the saved quality: common, uncommon, rare, epic, or legendary.",
  "ID кодекса, например legendary:shred": "Codex ID, e.g. legendary:shred",
  "ID достижения, например zone:ab": "Achievement ID, e.g. zone:ab",
  "При включении ставится текущее время получения. Некоторые достижения игра может пересчитать по статистике.": "Enabling an achievement sets its unlock time to now. The game may recalculate some achievements from stats.",
  "Поиск по ID предмета": "Search by item ID, class, set, or slot",
  "Предметы аккаунта": "Account items",
  "Показывать": "Show",
  "Выбранный класс": "Selected class",
  "Все классы": "All classes",
  "Числовой ID предмета": "Numeric item ID",
  "ID предмета должен быть числом.": "Item ID must be numeric.",
  "Экипировка класса": "Class equipment",
  "Слот": "Slot",
  "ID предмета": "Item ID",
  "Убрать": "Remove",
  "Установить": "Equip",
  "Введите числовой слот и ID предмета.": "Enter a numeric slot and item ID.",
  "ID найденных предметов взяты из сейва. ID PvP-набора выведены из той же схемы и по умолчанию не отмечены. Слоты и совместимость проверяет игра.": "Collected item IDs come from the provided save. PvP IDs follow the same inferred pattern and are unchecked by default. The game validates slots and compatibility.",
  "Статистика": "Statistics",
  "Награды / перки": "Rewards / perks",
  "ID перка": "Perk ID",
  "Спутники": "Pets",
  "ID спутника": "Pet ID",
  "Применить открытый текст": "Apply plaintext",
  "В тексте не найдено строк формата key|value.": "No key|value lines found in the text.",
  "Открытый текст применён.": "Plaintext applied.",
  "Поля разделены символом |, списки — запятыми. Изменения в этом поле вступают в силу после нажатия кнопки.": "Fields are separated by | and lists by commas. Changes here apply when you click the button.",
  "Файл превышает 2 МБ.": "The file exceeds 2 MB.",
  "Проверяю подпись и читаю сохранение…": "Verifying the signature and reading the save…",
  "RSE1 проверен": "RSE1 verified",
  "Сохранение открыто. Оригинал не изменён.": "Save opened. The original was not changed.",
  "Новая строка RSE1 скопирована в буфер обмена.": "New RSE1 string copied to the clipboard.",
  "Не удалось экспортировать сохранение.": "Could not export the save.",
  "Не удалось загрузить каталог. Откройте страницу через веб-сервер или GitHub Pages.": "Could not load the catalog. Open this page through a web server or GitHub Pages.",
  "ID не должен содержать |, запятую или перевод строки.": "An ID cannot contain |, a comma, or a newline.",
  "Добавить": "Add",
  "Легендарный": "Legendary",
  "Shred · амулет друида": "Shred · Druid amulet",
  "Некорректный Base64 в строке сохранения.": "Invalid Base64 in the save string.",
  "Не удалось прочитать Base64.": "Could not read Base64.",
  "Сохранение слишком короткое.": "The save is too short.",
  "Ожидалась строка RSE1: или открытый текст сохранения.": "Expected an RSE1 string or save plaintext.",
  "Подпись не совпадает: файл повреждён или создан другой версией игры.": "Signature mismatch: the file is damaged or from another game version.",
  "Подпись верна, но текст сохранения не является UTF-8.": "The signature is valid, but the save text is not UTF-8.",
}));
const englishToRussian = new Map([...translations].map(([ru, en]) => [en, ru]));

const classNames = {
  "1": ["Warrior", "Воин"], "2": ["Paladin", "Паладин"],
  "3": ["Hunter", "Охотник"], "4": ["Rogue", "Разбойник"],
  "5": ["Priest", "Жрец"], "7": ["Shaman", "Шаман"],
  "8": ["Mage", "Маг"], "9": ["Warlock", "Чернокнижник"],
  "11": ["Druid", "Друид"],
};

const zoneNames = {
  elwynn: ["Elwynn Forest", "Элвиннский лес"],
  duskwood: ["Duskwood", "Сумеречный лес"],
  wsg: ["Warsong Gulch", "Ущелье Песни Войны"],
  ungoro: ["Un'Goro Crater", "Кратер Ун'Горо"],
  ab: ["Arathi Basin", "Низина Арати"],
  feralas: ["Feralas", "Фералас"],
  arena: ["Gurubashi Arena", "Арена Гурубаши"],
  av: ["Alterac Valley", "Альтеракская долина"],
  brm: ["Blackrock Mountain", "Чёрная гора"],
  aq: ["Ahn'Qiraj", "Ан'Кираж"],
  sm: ["Scarlet Monastery", "Монастырь Алого ордена"],
  naxx: ["Naxxramas", "Наксрамас"],
};

const slotNames = [
  ["Head", "Голова"], ["Shoulder", "Плечи"], ["Chest", "Грудь"],
  ["Waist", "Пояс"], ["Legs", "Ноги"], ["Feet", "Ступни"],
  ["Wrist", "Запястья"], ["Hands", "Кисти"],
  ["Main hand", "Основная рука"], ["Off hand", "Левая рука"],
  ["Ranged", "Дальний бой"],
];
const equipmentSlotIndexes = { 0: 0, 2: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 15: 8, 16: 9, 17: 10 };
const setNames = [
  ["Common", "Обычный"], ["Uncommon", "Необычный"],
  ["Rare", "Редкий"], ["Epic", "Эпический"],
  ["Legendary", "Легендарный"], ["PvP", "PvP"],
];

let language = "en";
try {
  if (localStorage.getItem("save-editor-language") === "ru") language = "ru";
} catch { /* Storage can be unavailable in private browsing. */ }

export function currentLanguage() { return language; }

export function setLanguage(value) {
  language = value === "ru" ? "ru" : "en";
  try { localStorage.setItem("save-editor-language", language); } catch { /* Optional preference. */ }
}

export function t(value) {
  return language === "ru" ? englishToRussian.get(value) || value : translations.get(value) || value;
}

export function localized(english, russian) { return language === "ru" ? russian : english; }
export function className(id) { return classNames[id]?.[language === "ru" ? 1 : 0] || id; }
export function zoneName(id) { return zoneNames[id]?.[language === "ru" ? 1 : 0] || id; }
export function slotName(index) { return slotNames[index]?.[language === "ru" ? 1 : 0] || String(index); }
export function equipmentSlotName(slot) {
  const index = equipmentSlotIndexes[slot];
  return index === undefined ? localized(`Slot ${slot}`, `Слот ${slot}`) : slotName(index);
}
export function setName(index) { return setNames[index]?.[language === "ru" ? 1 : 0] || String(index); }

export function localizeStatic() {
  document.documentElement.lang = language;
  document.title = localized("Azeroth Survivors — Save Editor", "Azeroth Survivors — редактор сохранений");
  document.querySelector('meta[name="description"]').content = localized(
    "Local Azeroth Survivors save editor. Import RSE1, edit progress, and export .sav.",
    "Локальный редактор сохранений Azeroth Survivors. Импорт RSE1, редактирование прогресса и экспорт .sav.",
  );
  for (const element of document.querySelectorAll("[data-i18n]")) element.textContent = t(element.dataset.i18n);
  for (const element of document.querySelectorAll("[data-i18n-placeholder]")) element.placeholder = t(element.dataset.i18nPlaceholder);
  document.querySelector("#save-input").placeholder = localized("RSE1:VnWO…\nor\npick|…", "RSE1:VnWO…\nили\npick|…");
}
