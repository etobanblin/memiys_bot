require('dotenv').config(); // Подключаем dotenv
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const axios = require('axios');

// Токен  берется из .env
const BOT_TOKEN = process.env.TOKEN;

if (!BOT_TOKEN) {
    console.error("Ошибка: не найден токен! Проверь .env файл.");
    process.exit(1);
}

const MEMES_DAY_FOLDER = 'memes_day';
const MEMES_VIBE_FOLDER = 'memes_vibe';
const MEMES_AUGURY_FOLDER = 'memes_augury';
const TEMP_FOLDER = 'temp';

if (!fs.existsSync(TEMP_FOLDER)) fs.mkdirSync(TEMP_FOLDER);
if (!fs.existsSync(MEMES_DAY_FOLDER)) fs.mkdirSync(MEMES_DAY_FOLDER);
if (!fs.existsSync(MEMES_VIBE_FOLDER)) fs.mkdirSync(MEMES_VIBE_FOLDER);
if (!fs.existsSync(MEMES_AUGURY_FOLDER)) fs.mkdirSync(MEMES_AUGURY_FOLDER);

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const app = express();
const port = process.env.PORT || 3000; 

// Проверка на главной странице
app.get('/', (req, res) => {
  res.send('Bot is running');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const menuKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: '📸 Мем дня' }, { text: '🔮 Гадание по мему' }],
            [{ text: '🎲 Рандомный вайб' }, { text: '🖼️ Создать демотиватор' }],
        ],
        resize_keyboard: true,
    },
};
function getRandomMeme(folder) {
    try {
        const memes = fs.readdirSync(folder);
        return memes.length > 0 ? path.join(folder, memes[Math.floor(Math.random() * memes.length)]) : null;
    } catch (e) {
        console.error(`Ошибка при получении мема из папки ${folder}: ${e}`);
        return null;
    }
}
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Привет! Выбери функцию:', menuKeyboard);
});

bot.onText(/📸 Мем дня/, async (msg) => {
    const memePath = getRandomMeme(MEMES_DAY_FOLDER);
    if (memePath) {
        await bot.sendPhoto(msg.chat.id, memePath, { caption: '📸 Вот твой мем дня!', reply_markup: menuKeyboard });
    } else {
        bot.sendMessage(msg.chat.id, '😢 Мемов дня пока нет!', menuKeyboard);
    }
});

bot.onText(/🔮 Гадание по мему/, async (msg) => {
    const memePath = getRandomMeme(MEMES_AUGURY_FOLDER);
    if (memePath) {
        await bot.sendPhoto(msg.chat.id, memePath, { caption: '🔮 Вот твоё гадание по мему!', reply_markup: menuKeyboard });
    } else {
        bot.sendMessage(msg.chat.id, '😢 Мемов для гадания пока нет!', menuKeyboard);
    }
});

bot.onText(/🎲 Рандомный вайб/, async (msg) => {
    const memePath = getRandomMeme(MEMES_VIBE_FOLDER);
    if (memePath) {
        await bot.sendPhoto(msg.chat.id, memePath, { caption: '🎲 Вот твой вайб!', reply_markup: menuKeyboard });
    } else {
        bot.sendMessage(msg.chat.id, '😢 Вайб-мемов пока нет!', menuKeyboard);
    }
});

const userState = {};

bot.onText(/🖼️ Создать демотиватор/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Отправь мне изображение для демотиватора.', menuKeyboard);
    userState[msg.chat.id] = { step: 'waiting_for_image' };
});

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

        ctx.font = 'bold 40px "Times New Roman"';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';

        const maxWidth = 500; 
        const lineHeight = 50;
        const yOffset = 560;

        let words = text.split(' ');
        let line = '';
        let y = yOffset;

        for (let i = 0; i < words.length; i++) {
            let testLine = line + words[i] + ' ';
            let metrics = ctx.measureText(testLine);
            let testWidth = metrics.width;

            if (testWidth > maxWidth && i > 0) {
                ctx.fillText(line, 275, y);
                line = words[i] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }

        ctx.fillText(line, 275, y);

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


console.log('Бот запущен и работает через long-polling!');
console.log('Бот запущен и работает через long-polling!');

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Бот работает!');
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});

