import { join } from 'path';


import { createBot, createProvider, createFlow, utils } from '@builderbot/bot';
import { MemoryDB as Database } from '@builderbot/bot';
import { BaileysProvider as Provider } from '@builderbot/provider-baileys';
import path from 'node:path';
import fs from 'node:fs/promises';
import process from 'node:process';
import { addKeyword, EVENTS } from '@builderbot/bot';
import { BaileysProvider } from '@builderbot/provider-baileys';
import { UrlToBase64 } from '@builderbot-plugins/url-to-base64';



import axios from 'axios';

import dotenv from "dotenv";

// Cargar las variables de entorno
dotenv.config();


const apiKey = process.env.OPENAI_API_KEY;

const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
};

const fileToBase64 = async (filePath) => {
    const file = await fs.readFile(filePath);
    return file.toString('base64');
};

 export const analyzeImage = async (base64Image) => {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };

    const payload = {
        model: 'gpt-4o',
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: 'Tu principal funcion es analizar mi  imagen acerca de un recibo de luz, detectar el nombre del cliente , localidad numero de tarifica el numero kwh totales,el monto de mayor y menor del importe y darmelos ,Me debes de contestar con emogis y damdome los datos ordenados al ultimo escribe esto es un testing recuerda   '
                    },
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:image/jpeg;base64,${base64Image}`
                        }
                    }
                ]
            }
        ],
        max_tokens: 300
    };

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, { headers });
        return response.data.choices[0].message.content;
    } catch (error) {
        if (error.response) {
            console.error('Error status:', error.response.status);
            console.error('Error data:', error.response.data);
        } else {
            console.error('Error message:', error.message);
        }
        throw error;
    }
};

const localPaths = [];
let debouncedEndFlow;
let debouncedGoToFlow;
const filePath = path.join(process.cwd(), 'assets');

export const mediaFlow = addKeyword<BaileysProvider>(EVENTS.MEDIA)
.addAction(async(ctx, { provider, queue }) => { 
    await queue.enqueue('processImage', async () => {
        const localPath = await provider.saveFile(ctx, { path: filePath });
        localPaths.push(localPath);
    }, 'imageProcessingTask');

    await queue.processQueue('processImage');
    await queue.clearQueue('processImage');
    queue.clearAndDone('processImage', {fingerIdRef: 'imageProcessingTask'});
})
.addAction(async (_, { extensions, gotoFlow, endFlow }) => {
    if(!debouncedEndFlow && !debouncedGoToFlow){
        debouncedEndFlow = debounce(endFlow, 1500);
        debouncedGoToFlow = debounce(gotoFlow, 1500);
    }

    for(const path of localPaths) {
        const base64Data = await fileToBase64(path);
        
        try {
            const description = await analyzeImage(base64Data);
          
            
             // Eliminar el archivo después de procesarlo
            return debouncedEndFlow(` ${description}`);
        } catch (error) {
            for(const filePath of localPaths) {
                await fs.unlink(filePath);
            }
            localPaths.length = 0;
            return debouncedEndFlow('Hubo un error al analizar la imagen.');
        }
    }

    localPaths.length = 0;
    return debouncedGoToFlow();
});