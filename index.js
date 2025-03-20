const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const axios = require('axios');
const { exec } = require('child_process');
const BOT_TOKEN = '8011558643:AAFc3P3Brnhb1bSWcp7IwyVD45_EFO7XVmM';

const MEMES_DAY_FOLDER = 'memes_day';
const MEMES_VIBE_FOLDER = 'memes_vibe';
const MEMES_AUGURY_FOLDER = 'memes_augury';
const TEMP_FOLDER = 'temp';

if (!fs.existsSync(TEMP_FOLDER)) fs.mkdirSync(TEMP_FOLDER);
if (!fs.existsSync(MEMES_DAY_FOLDER)) fs.mkdirSync(MEMES_DAY_FOLDER);
if (!fs.existsSync(MEMES_VIBE_FOLDER)) fs.mkdirSync(MEMES_VIBE_FOLDER);
if (!fs.existsSync(MEMES_AUGURY_FOLDER)) fs.mkdirSync(MEMES_AUGURY_FOLDER);


const app = express();
const PORT = process.env.PORT || 3000;


const bot = new TelegramBot(BOT_TOKEN);
const webhookUrl = `https://${process.env.REPL_ID}.id.repl.co/${BOT_TOKEN}`;
bot.setWebHook(webhookUrl);

app.use(express.json());
app.post(`/${BOT_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});


function startServer(port) {
    const server = app.listen(port, '0.0.0.0', () => {
        console.log(`Сервер запущен на порту ${port}`);
        console.log(`Вебхук установлен: ${webhookUrl}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Порт ${port} занят, пробуем порт ${port + 1}`);
            startServer(port + 1);
        } else {
            console.error('Ошибка при запуске сервера:', err);
        }
    });
}

startServer(PORT);


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


async function generatePrediction(prompt) {
    return new Promise((resolve, reject) => {
        const pythonScriptPath = path.join(__dirname, 'generate_prediction.py');
        const command = `python3 ${pythonScriptPath} "${prompt}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Ошибка при выполнении Python-скрипта: ${error}`);
                resolve("🔮 Сегодня будет удачный день! 🍀");
                return;
            }
            if (stderr) {
                console.error(`Ошибка в Python-скрипте: ${stderr}`);
                resolve("🔮 Сегодня будет удачный день! 🍀");
                return;
            }
            resolve(stdout.trim());
        });
    });
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
        const prediction = await generatePrediction("Сгенерируй забавное предсказание на основе мема.");
        await bot.sendPhoto(msg.chat.id, memePath, { caption: `🔮 ${prediction}`, reply_markup: menuKeyboard });
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

console.log('Бот запущен и работает через вебхуки!');