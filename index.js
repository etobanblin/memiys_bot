const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');
const axios = require('axios'); // Используем axios для загрузки изображений

// Токен бота (указан напрямую)
const BOT_TOKEN = '8011558643:AAFc3P3Brnhb1bSWcp7IwyVD45_EFO7XVmM';

// Папка с мемами
const MEME_FOLDER = 'memes'; // Убедитесь, что эта папка существует и содержит мемы

// Папка для временных файлов
const TEMP_FOLDER = 'temp'; // Папка для хранения загруженных изображений
if (!fs.existsSync(TEMP_FOLDER)) {
    fs.mkdirSync(TEMP_FOLDER);
}

// Шрифт для демотиватора
const DEMOTIVATOR_FONT = 'Arial'; // Используем системный шрифт

// Инициализация бота
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Хранение состояния пользователя
const userState = {};

// Создание клавиатуры с кнопками
const menuKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: '📸 Мем дня' }, { text: '🔮 Гадание по мему' }],
            [{ text: '🎲 Рандомный вайб' }, { text: '🖼️ Создать демотиватор' }],
        ],
        resize_keyboard: true,
    },
};

// Получение случайного мема
function getRandomMeme() {
    try {
        const memes = fs.readdirSync(MEME_FOLDER);
        return memes.length > 0 ? path.join(MEME_FOLDER, memes[Math.floor(Math.random() * memes.length)]) : null;
    } catch (e) {
        console.error(`Ошибка при получении мема: ${e}`);
        return null;
    }
}

// Получение мема для гадания
function getFortuneMeme() {
    const predictions = [
        'Сегодня твой день!', 'Остерегайся странных котов 🐱', 'Твой успех зависит от мемов!',
        'Скоро будет веселье!', 'Избегай скучных людей.',
    ];
    const memePath = getRandomMeme();
    return memePath ? { memePath, prediction: predictions[Math.floor(Math.random() * predictions.length)] } : null;
}

async function createDemotivator(imagePath, text = 'Демотиватор', subtext = 'Подпись') {
    try {
        const img = await loadImage(imagePath);
        const canvas = createCanvas(550, 650);
        const ctx = canvas.getContext('2d');

        // Черный фон
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, 550, 650);

        // Белая рамка вокруг изображения
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(25, 25, 500, 500);

        // Изображение
        ctx.drawImage(img, 30, 30, 490, 490);

        // Текст (белый и жирный)
        ctx.font = 'bold 40px Arial'; // Жирный шрифт
        ctx.fillStyle = 'white'; // Белый цвет текста
        ctx.textAlign = 'center';
        ctx.fillText(text, 275, 550); // Позиция текста

        // Подпись (белый и жирный)
        ctx.font = 'bold 20px Arial'; // Жирный шрифт
        ctx.fillStyle = 'white'; // Белый цвет текста
        ctx.fillText(subtext, 275, 590); // Позиция подписи

        // Сохранение
        const outputPath = path.join(TEMP_FOLDER, 'demotivator.jpg');
        const out = fs.createWriteStream(outputPath);
        const stream = canvas.createJPEGStream();
        stream.pipe(out);

        return new Promise((resolve) => {
            out.on('finish', () => resolve(outputPath));
        });
    } catch (e) {
        console.error(`Ошибка при создании демотиватора: ${e}`);
        return null;
    }
}

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Привет! Выбери функцию:', menuKeyboard);
});

// "Мем дня"
bot.onText(/📸 Мем дня/, async (msg) => {
    const chatId = msg.chat.id;
    const memePath = getRandomMeme();
    if (memePath) {
        try {
            await bot.sendPhoto(chatId, memePath, { caption: '📸 Вот твой мем дня!' });
        } catch (e) {
            console.error(`Ошибка при отправке мема: ${e}`);
            bot.sendMessage(chatId, '😢 Произошла ошибка при отправке мема.');
        }
    } else {
        bot.sendMessage(chatId, '😢 Мемов пока нет!');
    }
});

// "Гадание по мему"
bot.onText(/🔮 Гадание по мему/, async (msg) => {
    const chatId = msg.chat.id;
    const fortune = getFortuneMeme();
    if (fortune) {
        try {
            await bot.sendPhoto(chatId, fortune.memePath, { caption: `🔮 ${fortune.prediction}` });
        } catch (e) {
            console.error(`Ошибка при отправке мема для гадания: ${e}`);
            bot.sendMessage(chatId, '😢 Произошла ошибка при отправке мема.');
        }
    } else {
        bot.sendMessage(chatId, '😢 Мемов пока нет!');
    }
});

// "Рандомный вайб"
bot.onText(/🎲 Рандомный вайб/, async (msg) => {
    const chatId = msg.chat.id;
    const memePath = getRandomMeme();
    if (memePath) {
        try {
            await bot.sendPhoto(chatId, memePath, { caption: '🎲 Вайб дня! Как тебе?' });
        } catch (e) {
            console.error(`Ошибка при отправке мема: ${e}`);
            bot.sendMessage(chatId, '😢 Произошла ошибка при отправке мема.');
        }
    } else {
        bot.sendMessage(chatId, '😢 Мемов пока нет!');
    }
});

// "Создать демотиватор"
bot.onText(/🖼️ Создать демотиватор/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Отправь мне изображение, чтобы создать демотиватор.');
    userState[chatId] = { step: 'waiting_for_image' };
});

// Обработчик изображений
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;

    if (userState[chatId] && userState[chatId].step === 'waiting_for_image') {
        // Получаем файл изображения
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const filePath = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath.file_path}`;

        // Сохраняем изображение во временную папку
        const imagePath = path.join(TEMP_FOLDER, `${fileId}.jpg`);
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        fs.writeFileSync(imagePath, response.data);

        // Сохраняем путь к изображению в состоянии пользователя
        userState[chatId].imagePath = imagePath;
        userState[chatId].step = 'waiting_for_text';

        // Запрашиваем текст для демотиватора
        bot.sendMessage(chatId, 'Отлично! Теперь отправь текст для демотиватора.');
    }
});

// Обработчик текста
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    // Проверяем, ожидаем ли мы текст от пользователя
    if (userState[chatId] && userState[chatId].step === 'waiting_for_text') {
        const text = msg.text;

        // Создаем демотиватор
        const demotivatorPath = await createDemotivator(userState[chatId].imagePath, text, 'Подпись');
        if (demotivatorPath) {
            try {
                // Отправляем демотиватор пользователю
                await bot.sendPhoto(chatId, demotivatorPath, { caption: '🖼️ Ваш демотиватор готов!' });
            } catch (e) {
                console.error(`Ошибка при отправке демотиватора: ${e}`);
                bot.sendMessage(chatId, '😢 Произошла ошибка при отправке демотиватора.');
            }
        } else {
            bot.sendMessage(chatId, '😢 Не удалось создать демотиватор.');
        }

        // Очищаем состояние пользователя
        delete userState[chatId];
    }
});

// Запуск бота
console.log('Бот запущен и работает...');