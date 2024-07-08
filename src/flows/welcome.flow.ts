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
import { ChatCompletionMessageParam } from "openai/resources";
import { run} from 'src/openai';
import { analyzeImage } from './media.flow';
import { describe } from 'node:test';





/**
 * Un flujo conversacion que es por defecto cunado no se contgiene palabras claves en otros flujos
 */
export const welcomeFlow= addKeyword<BaileysProvider>(EVENTS.WELCOME)

    
    .addAction(async (ctx, { flowDynamic, state }) => {
        try{
            const newHistory = (state.getMyState()?.history ?? []) as ChatCompletionMessageParam[]
            const name = ctx?.pushName ?? ''
            
    
            console.log(`[HISTORY]:`,newHistory)
            
    
            newHistory.push({
                role: 'user',
                content: ctx.body
                
            })
            
    
            const largeResponse = await run(name, newHistory)

            const chunks = largeResponse.split(/(?<!\d)\.\s+/g);
            for (const chunk of chunks) {
                await flowDynamic(chunk)
            }

            newHistory.push({
                role: 'assistant',
                content: largeResponse
            })
        
            await state.update({history: newHistory})
    
        }catch(err){
            console.log(`[ERROR]:`,err)
        }
    })


