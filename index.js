const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const axios = require('axios');
const express = require('express');
const { exec } = require('child_process'); // Для вызова Python-скрипта

// Токен вашего бота
const BOT_TOKEN = '8011558643:AAFc3P3Brnhb1bSWcp7IwyVD45_EFO7XVmM';

// Папки
const MEMES_DAY_FOLDER = 'memes_day'; // Папка для мемов дня
const MEMES_VIBE_FOLDER = 'memes_vibe'; // Папка для вайб-мемов
const MEMES_AUGURY_FOLDER = 'memes_augury'; // Папка для гадания по мемам
const TEMP_FOLDER = 'temp'; // Папка для временных файлов
const CONFIG_FOLDER = '.config'; // Папка для конфигураций
const GIT_FOLDER = '.git'; // Папка для Git
const UPM_FOLDER = '.upm'; // Папка для UPM
const NODE_MODULES_FOLDER = 'node_modules'; // Папка для зависимостей Node.js

// Создание папок, если их нет
if (!fs.existsSync(TEMP_FOLDER)) fs.mkdirSync(TEMP_FOLDER);
if (!fs.existsSync(MEMES_DAY_FOLDER)) fs.mkdirSync(MEMES_DAY_FOLDER);
if (!fs.existsSync(MEMES_VIBE_FOLDER)) fs.mkdirSync(MEMES_VIBE_FOLDER);
if (!fs.existsSync(MEMES_AUGURY_FOLDER)) fs.mkdirSync(MEMES_AUGURY_FOLDER);

// Инициализация бота
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Состояние пользователя
const userState = {};

// Инициализация веб-сервера
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Бот работает!');
});

// Используем kill-port для освобождения портов
const killPort = require('kill-port');

// Функция для запуска сервера
async function startServer(port) {
    try {
        // Пытаемся освободить порт перед использованием
        await killPort(port);
        
        const server = app.listen(port, () => {
            console.log(`Веб-сервер запущен на порту ${port}`);
        });
        
        return server;
    } catch (error) {
        console.error(`Ошибка при запуске сервера на порту ${port}: ${error}`);
        // Если не удалось освободить порт, пробуем следующий
        if (port < 3010) { // Ограничиваем до 10 попыток
            console.log(`Пробуем порт ${port + 1}...`);
            return startServer(port + 1);
        } else {
            console.error('Не удалось найти свободный порт после нескольких попыток');
        }
    }
}

// Запускаем сервер на указанном порту
startServer(PORT);

// Клавиатура меню
const menuKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: '📸 Мем дня' }, { text: '🔮 Гадание по мему' }],
            [{ text: '🎲 Рандомный вайб' }, { text: '🖼️ Создать демотиватор' }],
        ],
        resize_keyboard: true,
    },
};

// Функция для получения случайного мема из указанной папки
function getRandomMeme(folder) {
    try {
        const memes = fs.readdirSync(folder);
        return memes.length > 0 ? path.join(folder, memes[Math.floor(Math.random() * memes.length)]) : null;
    } catch (e) {
        console.error(`Ошибка при получении мема из папки ${folder}: ${e}`);
        return null;
    }
}

// Функция для генерации предсказания с помощью Python-скрипта
async function generatePrediction(prompt) {
    return new Promise((resolve, reject) => {
        const pythonScriptPath = path.join(__dirname, 'generate_prediction.py');
        const command = `python3 ${pythonScriptPath} "${prompt}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Ошибка при выполнении Python-скрипта: ${error}`);
                resolve("🔮 Сегодня будет удачный день! 🍀"); // Запасное предсказание
                return;
            }
            if (stderr) {
                console.error(`Ошибка в Python-скрипте: ${stderr}`);
                resolve("🔮 Сегодня будет удачный день! 🍀"); // Запасное предсказание
                return;
            }
            resolve(stdout.trim()); // Возвращаем результат из Python-скрипта
        });
    });
}

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Привет! Выбери функцию:', menuKeyboard);
});

// Обработчик команды "Мем дня"
bot.onText(/📸 Мем дня/, async (msg) => {
    const memePath = getRandomMeme(MEMES_DAY_FOLDER);
    if (memePath) {
        await bot.sendPhoto(msg.chat.id, memePath, { caption: '📸 Вот твой мем дня!', reply_markup: menuKeyboard });
    } else {
        bot.sendMessage(msg.chat.id, '😢 Мемов дня пока нет!', menuKeyboard);
    }
});

// Обработчик команды "Гадание по мему"
bot.onText(/🔮 Гадание по мему/, async (msg) => {
    const memePath = getRandomMeme(MEMES_AUGURY_FOLDER);
    if (memePath) {
        const prediction = await generatePrediction("Сгенерируй забавное предсказание на основе мема.");
        await bot.sendPhoto(msg.chat.id, memePath, { caption: `🔮 ${prediction}`, reply_markup: menuKeyboard });
    } else {
        bot.sendMessage(msg.chat.id, '😢 Мемов для гадания пока нет!', menuKeyboard);
    }
});

// Обработчик команды "Рандомный вайб"
bot.onText(/🎲 Рандомный вайб/, async (msg) => {
    const memePath = getRandomMeme(MEMES_VIBE_FOLDER);
    if (memePath) {
        await bot.sendPhoto(msg.chat.id, memePath, { caption: '🎲 Вот твой вайб!', reply_markup: menuKeyboard });
    } else {
        bot.sendMessage(msg.chat.id, '😢 Вайб-мемов пока нет!', menuKeyboard);
    }
});

// Обработчик команды "Создать демотиватор"
bot.onText(/🖼️ Создать демотиватор/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Отправь мне изображение для демотиватора.', menuKeyboard);
    userState[msg.chat.id] = { step: 'waiting_for_image' };
});

// Обработчик получения фото
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    if (userState[chatId]?.step === 'waiting_for_image') {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const filePath = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath.file_path}`;
        const imagePath = path.join(TEMP_FOLDER, `${fileId}.jpg`);
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        fs.writeFileSync(imagePath, response.data);
        userState[chatId] = { step: 'waiting_for_text', imagePath };
        bot.sendMessage(chatId, 'Теперь отправь текст для демотиватора.', menuKeyboard);
    }
});

// Обработчик текстовых сообщений
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    if (userState[chatId]?.step === 'waiting_for_text') {
        const text = msg.text;
        const demotivatorPath = await createDemotivator(userState[chatId].imagePath, text);
        if (demotivatorPath) {
            await bot.sendPhoto(chatId, demotivatorPath, { caption: '🖼️ Ваш демотиватор готов!', reply_markup: menuKeyboard });
        } else {
            bot.sendMessage(chatId, '😢 Не удалось создать демотиватор.', menuKeyboard);
        }
        delete userState[chatId];
    }
});

// Функция для создания демотиватора
async function createDemotivator(imagePath, text) {
    try {
        const img = await loadImage(imagePath);
        const canvas = createCanvas(550, 650);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, 550, 650);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(25, 25, 500, 500);
        ctx.drawImage(img, 30, 30, 490, 490);
        ctx.font = 'bold 40px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(text, 275, 550);
        const outputPath = path.join(TEMP_FOLDER, 'demotivator.jpg');
        const out = fs.createWriteStream(outputPath);
        const stream = canvas.createJPEGStream();
        stream.pipe(out);
        return new Promise((resolve) => out.on('finish', () => resolve(outputPath)));
    } catch (e) {
        console.error(`Ошибка при создании демотиватора: ${e}`);
        return null;
    }
}

console.log('Бот запущен и работает...');